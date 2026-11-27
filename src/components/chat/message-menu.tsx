import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { type RefObject, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, type LayoutChangeEvent, Pressable, StyleSheet, useWindowDimensions, View, type ViewInstance } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { REACTS, type React as ReactionName } from '@/ai/react';
import { type BubbleAnchor, HeldBubble } from '@/components/chat/message-bubble';
import { ReactionGlyph } from '@/components/ink';
import { PressableScale, Txt } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { dockIndexFromX, dockWaveTransform } from '@/lib/reaction-motion';
import { sharedReactionSound } from '@/lib/reaction-sound';
import { colors, isDark, shadows, space } from '@/theme';
import { ink, inkPeachGlass, inkRadius, inkReaction } from '@/theme/ink';
import type { Message } from '@/types';

const REACTIONS: readonly ReactionName[] = REACTS;
/** Their bubbles start past the avatar column of the chat (12 gutter + 28 avatar + 8 gap). */
const THEIRS_INSET = 36;
/** The reactions capsule, the menu's rows and the room between the lifted bubble and both. */
const REACT_H = 62;
const REACT_W = 6 * 50 + 5 * 2 + 14;
/** A reaction symbol in the capsule. */
const GLYPH = 28;
const MENU_W = 280;
const ROW_H = 44;
const GROUP_GAP = 8;
const GAP = 10;
const EDGE = 12;

export interface MessageMenuProps {
  /** The held message; null hides the menu. */
  message: Message | null;
  /** Where the held bubble sits: a text line is lifted there, reactions over it, the menu under it. */
  anchor?: BubbleAnchor;
  onClose: () => void;
  /** The picked reaction, or undefined to take it back. */
  onReact: (message: Message, reaction: ReactionName | undefined) => void;
  onCopy: (message: Message) => void;
  onReport: (message: Message) => void;
  onDelete: (message: Message) => void;
  /** Answer this line: its quote goes over the field (`canReplyTo`). */
  onReply?: (message: Message) => void;
  /** Given only for your newest text: it opens in the field to change (iOS Messages Edit). */
  onEdit?: (message: Message) => void;
  /** Given only for their lines before your newest message (`canRewindTo`). */
  onRewind?: (message: Message) => void;
  /** Pins a text line to Memories, or with `pinned` takes it back (one-to-one chats only). */
  onPin?: (message: Message) => void;
  /** The held line is already pinned: the item reads Unpin. */
  pinned?: boolean;
  /** Given only for their lines written first (a reach key): Why? says what started it. */
  onWhy?: (message: Message) => void;
  /** Given only on their newest reply while they may go on: Continue (», `src/lib/chat-steer.ts`). */
  onContinue?: () => void;
  /** Given only on their newest reply that can be voted on: Bad reply (👎; 👍 is any happy reaction). */
  onRateDown?: () => void;
  /** Their newest reply already has a 👎: the item's thumb is filled and a tap takes it back. */
  ratedDown?: boolean;
  /** The chat's BlurTargetView: what the menu blurs on Android. */
  blurTarget: RefObject<ViewInstance | null>;
}

/**
 * The long-press menu, as an iOS context menu (approved prototypes `Menu.dc.html`, `MenuMine.dc.html`,
 * `ChatRewind.dc.html`): the chat blurs, the six reactions (our own symbols, §6.5) sit in a glass capsule over
 * Continue and Bad reply (their newest reply only, 0z269), then Copy / Edit or Report, then the destructive group, Rewind to here and Delete, in
 * red at the end (HIG Context menus). Items that do not apply are left out, not dimmed. It appears at
 * once; a tap outside closes it.
 */
export function MessageMenu({
  message,
  anchor,
  onClose,
  onReact,
  onCopy,
  onReport,
  onDelete,
  onReply,
  onEdit,
  onRewind,
  onPin,
  pinned,
  onWhy,
  onContinue,
  onRateDown,
  ratedDown,
  blurTarget,
}: MessageMenuProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const screen = useWindowDimensions();
  // The menu's real height once drawn: a row that wraps (Russian, German) makes it taller than the estimate.
  const [menuDrawn, setMenuDrawn] = useState(0);
  useBackToClose(!!message, onClose);
  if (!message) return null;
  const mine = message.author === 'me';
  const align = mine ? styles.alignMine : styles.alignTheirs;
  const reply = onReply ? { key: 'reply', label: t('chat.reply'), icon: 'return-up-back-outline' as const, onPress: () => onReply(message) } : null;
  const copy = message.text ? { key: 'copy', label: t('chat.copy'), icon: 'copy-outline' as const, onPress: () => onCopy(message) } : null;
  const edit = mine && onEdit ? { key: 'edit', label: t('chat.edit'), icon: 'create-outline' as const, onPress: () => onEdit(message) } : null;
  const pin = onPin
    ? { key: 'pin', label: pinned ? t('chat.unpin') : t('chat.pin'), icon: pinned ? ('pin' as const) : ('pin-outline' as const), onPress: () => onPin(message) }
    : null;
  const why = !mine && onWhy ? { key: 'why', label: t('why.menu'), icon: 'help-circle-outline' as const, onPress: () => onWhy(message) } : null;
  const report = mine ? null : { key: 'report', label: t('safety.report'), icon: 'flag-outline' as const, onPress: () => onReport(message) };
  const firstGroup = (mine ? [reply, copy, edit, pin] : [reply, copy, why, pin, report]).filter((row) => row !== null);
  // Their newest reply (owner's "chat calm" pick A, 0z269): what used to sit under it, Continue and 👎, leads the menu.
  const steer = mine
    ? []
    : [
        onContinue ? { key: 'continue', label: t('chat.continue'), icon: 'play-forward-outline' as const, onPress: onContinue } : null,
        onRateDown
          ? { key: 'rateDown', label: t('chat.rateDown'), icon: ratedDown ? ('thumbs-down' as const) : ('thumbs-down-outline' as const), onPress: onRateDown }
          : null,
      ].filter((row) => row !== null);

  const reactions = (
    <ReactionDock
      current={message.reaction}
      onPick={(name) => {
        const on = message.reaction === name;
        haptic.selection();
        onReact(message, on ? undefined : name);
      }}
    />
  );
  const menu = (
    <View
      style={styles.menu}
      accessibilityRole="menu"
      onLayout={(e) => {
        const h = Math.ceil(e.nativeEvent.layout.height);
        if (Math.abs(h - menuDrawn) > 1) setMenuDrawn(h);
      }}>
      {steer.map((row, i) => (
        <MenuRow key={row.key} label={row.label} icon={row.icon} onPress={row.onPress} line={i < steer.length - 1} />
      ))}
      {steer.length ? <View style={styles.gap} /> : null}
      {/* First group: yours Reply, Copy, Edit, Pin; theirs Reply, Copy, Why? (a line they wrote first), Pin, Report. */}
      {firstGroup.map((row, i) => (
        <MenuRow key={row.key} label={row.label} icon={row.icon} onPress={row.onPress} line={i < firstGroup.length - 1} />
      ))}
      <View style={styles.gap} />
      {/* Not red since 0z286: a rewind keeps the later lines as a branch, nothing is lost. */}
      {onRewind ? <MenuRow label={t('chat.rewindToHere')} icon="arrow-undo-outline" line onPress={() => onRewind(message)} /> : null}
      <MenuRow label={t('chat.deleteMessage')} icon="trash-outline" danger onPress={() => onDelete(message)} />
    </View>
  );

  // A text line is lifted where it sat (iOS context menus, canvas v1): the stack moves only as far as
  // the screen's edges need, and a very long line is cut to the room left.
  const lifted = anchor && message.kind === 'text' && message.text ? anchor : undefined;
  let layout: { top: number; bubbleH: number; side: number; reactSide: number; menuSide: number } | null = null;
  if (lifted) {
    const menuH = Math.max(menuDrawn, (steer.length + firstGroup.length + (onRewind ? 2 : 1)) * ROW_H + GROUP_GAP * (steer.length ? 2 : 1));
    const room = screen.height - insets.top - insets.bottom - EDGE * 2;
    const bubbleH = Math.max(ROW_H, Math.min(lifted.height, room - REACT_H - menuH - GAP * 2));
    const stackH = REACT_H + GAP + bubbleH + GAP + menuH;
    const top = Math.min(Math.max(lifted.y - REACT_H - GAP, insets.top + EDGE), screen.height - insets.bottom - EDGE - stackH);
    // Mine measure from the right edge, theirs from the left; both stay on the screen.
    const side = mine ? screen.width - (lifted.x + lifted.width) : lifted.x;
    const fit = (width: number) => Math.max(EDGE, Math.min(side, screen.width - EDGE - width));
    layout = { top, bubbleH, side, reactSide: fit(REACT_W), menuSide: fit(MENU_W) };
  }

  return (
    // An overlay inside the chat, not a Modal: a separate window would sit outside the blur target.
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')}>
        <BlurView
          intensity={28}
          tint={isDark ? 'dark' : 'light'}
          // Android blurs only with a native method and the screen's BlurTargetView.
          blurMethod="dimezisBlurView"
          blurReductionFactor={2}
          blurTarget={blurTarget}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.dim} />
      </Pressable>

      {lifted && layout ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <View style={[styles.at, { top: layout.top }, mine ? { right: layout.reactSide } : { left: layout.reactSide }]}>{reactions}</View>
          <View
            pointerEvents="none"
            style={[styles.at, styles.lifted, { top: layout.top + REACT_H + GAP, width: lifted.width, maxHeight: layout.bubbleH }, mine ? { right: layout.side } : { left: layout.side }]}>
            <HeldBubble message={message} />
          </View>
          <View style={[styles.at, { top: layout.top + REACT_H + GAP + layout.bubbleH + GAP }, mine ? { right: layout.menuSide } : { left: layout.menuSide }]}>{menu}</View>
        </View>
      ) : (
        <View style={[styles.stack, align]} pointerEvents="box-none">
          {reactions}
          <View style={!mine && styles.inset}>{menu}</View>
        </View>
      )}
    </View>
  );
}

/**
 * Interactive macOS-Dock style reaction scrubber inside MessageMenu:
 * supports both single tap and one-finger horizontal slide magnification (focused gem lifts
 * 1.54×, neighbors wave gently, floating frosted emotion label appears above, micro-ticks click).
 */
function ReactionDock({
  current,
  onPick,
}: {
  current: string | undefined;
  onPick: (name: ReactionName) => void;
}) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const activeIdx = useSharedValue(-1);
  const widthSV = useSharedValue(REACT_W);
  const [hovered, setHovered] = useState<ReactionName | null>(null);

  const notifyHover = useCallback((idx: number) => {
    if (idx < 0 || idx >= REACTIONS.length) {
      setHovered(null);
      return;
    }
    setHovered(REACTIONS[idx]);
    haptic.selection();
    sharedReactionSound().hoverTick();
  }, []);

  const commitIndex = useCallback(
    (idx: number) => {
      setHovered(null);
      if (idx >= 0 && idx < REACTIONS.length) onPick(REACTIONS[idx]);
    },
    [onPick],
  );

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const w = e.nativeEvent.layout.width;
      if (w > 0) widthSV.value = w;
    },
    [widthSV],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-5, 5])
        .onBegin((e) => {
          'worklet';
          const idx = dockIndexFromX(e.x, widthSV.value, 7, REACTIONS.length);
          if (idx !== activeIdx.value) {
            activeIdx.value = idx;
            scheduleOnRN(notifyHover, idx);
          }
        })
        .onUpdate((e) => {
          'worklet';
          const idx = dockIndexFromX(e.x, widthSV.value, 7, REACTIONS.length);
          if (idx !== activeIdx.value) {
            activeIdx.value = idx;
            scheduleOnRN(notifyHover, idx);
          }
        })
        .onEnd(() => {
          'worklet';
          const picked = activeIdx.value;
          activeIdx.value = -1;
          scheduleOnRN(commitIndex, picked);
        })
        .onFinalize(() => {
          'worklet';
          if (activeIdx.value !== -1) {
            activeIdx.value = -1;
            scheduleOnRN(notifyHover, -1);
          }
        }),
    [widthSV, activeIdx, notifyHover, commitIndex],
  );

  return (
    <View style={styles.dockWrap}>
      {hovered ? (
        <View pointerEvents="none" style={[styles.hoverPill, { borderColor: inkReaction[hovered] }]}>
          <Txt style={[styles.hoverPillText, { color: inkReaction[hovered] }]} lines={1}>
            {t(`chat.reactions.${hovered}`)}
          </Txt>
        </View>
      ) : null}
      <GestureDetector gesture={pan}>
        <View onLayout={onLayout} style={[styles.glass, styles.reactions]} accessibilityRole="toolbar">
          {REACTIONS.map((name, index) => (
            <DockSlot
              key={name}
              name={name}
              index={index}
              selected={current === name}
              activeIdx={activeIdx}
              reduced={reduced}
              label={t('chat.react', { name: t(`chat.reactions.${name}`) })}
              onPress={() => onPick(name)}
            />
          ))}
        </View>
      </GestureDetector>
    </View>
  );
}

function DockSlot({
  name,
  index,
  selected,
  activeIdx,
  reduced,
  label,
  onPress,
}: {
  name: ReactionName;
  index: number;
  selected: boolean;
  activeIdx: SharedValue<number>;
  reduced: boolean;
  label: string;
  onPress: () => void;
}) {
  const enter = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    enter.value = withDelay(index * 28, withSpring(1, { damping: 14, stiffness: 280 }));
  }, [enter, index, reduced]);

  const animStyle = useAnimatedStyle(() => {
    const wave = reduced ? { scale: 1, translateY: 0, translateX: 0 } : dockWaveTransform(index, activeIdx.value);
    const springCfg = { damping: 16, stiffness: 320 };
    return {
      opacity: enter.value,
      transform: [
        { translateX: withSpring(wave.translateX, springCfg) },
        { translateY: withSpring(wave.translateY + (1 - enter.value) * 14, springCfg) },
        { scale: withSpring(wave.scale * (0.65 + 0.35 * enter.value), springCfg) },
      ],
    };
  }, [index, reduced]);

  return (
    <Animated.View style={animStyle}>
      <PressableScale
        scaleTo={0.86}
        style={[styles.reaction, selected && styles.reactionOn]}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        onPress={onPress}>
        <ReactionGlyph name={name} color={inkReaction[name]} size={GLYPH} />
      </PressableScale>
    </Animated.View>
  );
}

/** Android's back button closes the open menu instead of leaving the chat. */
export function useBackToClose(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [open, onClose]);
}

function MenuRow({
  label,
  icon,
  danger,
  line,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  danger?: boolean;
  line?: boolean;
  onPress: () => void;
}) {
  const tint = danger ? colors.danger : colors.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="menuitem"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, line && styles.rowLine, pressed && styles.rowPressed]}>
      {/* A long label (Russian "Закрепить в Воспоминаниях") wraps to a second line, never shrinks (HIG Typography, owner 2026-11-16). */}
      <Txt style={styles.rowText} color={tint} lines={2}>
        {label}
      </Txt>
      <Ionicons name={icon} size={19} color={tint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 10 },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.10)' },
  stack: { flex: 1, justifyContent: 'center', paddingHorizontal: space.md, gap: space.sm + 2 },
  alignMine: { alignItems: 'flex-end' },
  alignTheirs: { alignItems: 'flex-start' },
  glass: {
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassLine,
    ...shadows.raised,
  },
  dockWrap: { alignItems: 'center' },
  hoverPill: {
    position: 'absolute',
    top: -36,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.elevated,
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 4,
  },
  hoverPillText: { fontSize: 12, fontWeight: '600' },
  reactions: { height: 62, borderRadius: 31, flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 7 },
  reaction: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  reactionOn: { backgroundColor: inkPeachGlass.flat, borderWidth: 1, borderColor: inkPeachGlass.rim },
  inset: { marginLeft: THEIRS_INSET },
  at: { position: 'absolute' },
  // The held line, lifted a little off the blur.
  // No shadow: Android draws elevation through a see-through bubble as a pale box.
  lifted: { overflow: 'hidden', borderRadius: 19 },
  menu: {
    width: MENU_W,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: isDark ? 'rgba(37,37,39,0.96)' : 'rgba(249,249,249,0.97)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassLine,
  },
  row: { minHeight: ROW_H, paddingVertical: space.xs + 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, paddingHorizontal: space.lg },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  rowPressed: { backgroundColor: colors.glassActive },
  // One line: a long label ("Закрепить в Воспоминаниях") shrinks a little rather than wrap.
  rowText: { flexShrink: 1, fontSize: 17, letterSpacing: -0.4 },
  // iOS sets the destructive action apart with a thicker gap.
  gap: { height: space.sm, backgroundColor: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(60,60,67,0.08)' },
});
