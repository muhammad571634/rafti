import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { type RefObject, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, Pressable, StyleSheet, useWindowDimensions, View, type ViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { REACTION_STICKERS, type ReactionName } from '@/assets/brand/registry';
import { type BubbleAnchor, HeldBubble } from '@/components/chat/message-bubble';
import { ReactionSticker } from '@/components/chat/reaction-sticker';
import { PressableScale, Txt } from '@/components/ui';
import { colors, isDark, shadows, space } from '@/theme';
import type { Message } from '@/types';

const REACTIONS = Object.keys(REACTION_STICKERS) as ReactionName[];
/** Their bubbles start past the avatar column of the chat (12 gutter + 28 avatar + 8 gap). */
const THEIRS_INSET = 36;
/** The reactions capsule, the menu's rows and the room between the lifted bubble and both. */
const REACT_H = 62;
const REACT_W = 6 * 50 + 5 * 2 + 14;
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
  /** The picked sticker, or undefined to take the reaction back. */
  onReact: (message: Message, reaction: ReactionName | undefined) => void;
  onCopy: (message: Message) => void;
  onReport: (message: Message) => void;
  onDelete: (message: Message) => void;
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
  /** The chat's BlurTargetView: what the menu blurs on Android. */
  blurTarget: RefObject<ViewInstance | null>;
}

/**
 * The long-press menu, as an iOS context menu (approved prototypes `Menu.dc.html`, `MenuMine.dc.html`,
 * `ChatRewind.dc.html`): the chat blurs, the mascot reactions sit in a glass capsule (each moving to
 * its feeling) over Copy / Edit or Report, then the destructive group, Rewind to here and Delete, in
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
  onEdit,
  onRewind,
  onPin,
  pinned,
  onWhy,
  blurTarget,
}: MessageMenuProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const screen = useWindowDimensions();
  useBackToClose(!!message, onClose);
  if (!message) return null;
  const mine = message.author === 'me';
  const align = mine ? styles.alignMine : styles.alignTheirs;
  const copy = message.text ? { key: 'copy', label: t('chat.copy'), icon: 'copy-outline' as const, onPress: () => onCopy(message) } : null;
  const edit = mine && onEdit ? { key: 'edit', label: t('chat.edit'), icon: 'create-outline' as const, onPress: () => onEdit(message) } : null;
  const pin = onPin
    ? { key: 'pin', label: pinned ? t('chat.unpin') : t('chat.pin'), icon: pinned ? ('pin' as const) : ('pin-outline' as const), onPress: () => onPin(message) }
    : null;
  const why = !mine && onWhy ? { key: 'why', label: t('why.menu'), icon: 'help-circle-outline' as const, onPress: () => onWhy(message) } : null;
  const report = mine ? null : { key: 'report', label: t('safety.report'), icon: 'flag-outline' as const, onPress: () => onReport(message) };
  const firstGroup = (mine ? [copy, edit, pin] : [copy, why, pin, report]).filter((row) => row !== null);

  const reactions = (
    <View style={[styles.glass, styles.reactions]} accessibilityRole="toolbar">
      {REACTIONS.map((name) => {
        const on = message.reaction === name;
        return (
          <PressableScale
            key={name}
            scaleTo={0.85}
            style={[styles.reaction, on && styles.reactionOn]}
            accessibilityRole="button"
            accessibilityLabel={t('chat.react', { name: t(`chat.reactions.${name}`) })}
            accessibilityState={{ selected: on }}
            onPress={() => onReact(message, on ? undefined : name)}>
            <ReactionSticker name={name} style={styles.sticker} />
          </PressableScale>
        );
      })}
    </View>
  );
  const menu = (
    <View style={styles.menu} accessibilityRole="menu">
      {/* First group: yours Copy, Edit, Pin; theirs Copy, Why? (a line they wrote first), Pin, Report. */}
      {firstGroup.map((row, i) => (
        <MenuRow key={row.key} label={row.label} icon={row.icon} onPress={row.onPress} line={i < firstGroup.length - 1} />
      ))}
      <View style={styles.gap} />
      {onRewind ? <MenuRow label={t('chat.rewindToHere')} icon="arrow-undo-outline" danger line onPress={() => onRewind(message)} /> : null}
      <MenuRow label={t('chat.deleteMessage')} icon="trash-outline" danger onPress={() => onDelete(message)} />
    </View>
  );

  // A text line is lifted where it sat (iOS context menus, canvas v1): the stack moves only as far as
  // the screen's edges need, and a very long line is cut to the room left.
  const lifted = anchor && message.kind === 'text' && message.text ? anchor : undefined;
  let layout: { top: number; bubbleH: number; side: number; reactSide: number; menuSide: number } | null = null;
  if (lifted) {
    const menuH = (firstGroup.length + (onRewind ? 2 : 1)) * ROW_H + GROUP_GAP;
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
      <Txt style={styles.rowText} color={tint} lines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
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
  reactions: { height: 62, borderRadius: 31, flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 7 },
  reaction: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  reactionOn: { backgroundColor: colors.primarySoft },
  sticker: { width: 42, height: 42 },
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
  row: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, paddingHorizontal: space.lg },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  rowPressed: { backgroundColor: colors.glassActive },
  // One line: a long label ("Закрепить в Воспоминаниях") shrinks a little rather than wrap.
  rowText: { flexShrink: 1, fontSize: 17, letterSpacing: -0.4 },
  // iOS sets the destructive action apart with a thicker gap.
  gap: { height: space.sm, backgroundColor: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(60,60,67,0.08)' },
});
