import { Ionicons } from '@expo/vector-icons';
import { memo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { SwipeRow, type SwipeRowMethods } from '@/components/chat/swipe-row';
import { GroupAvatar } from '@/components/group-avatar';
import { InkChip, InkText } from '@/components/ink';
import { CharacterAvatar, PressableScale } from '@/components/ui';
import { relativeStamp, shortName } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { friendAccent, isDark, palette, space, systemColors } from '@/theme';
import { ink, inkRadius } from '@/theme/ink';
import { type ChatItem, type Filter, FILTERS, isPinned, rowOf, type RowActions } from './types';

/**
 * The Chats list's parts (out of `src/app/(tabs)/chat.tsx`, 0z360): the filter pills, the pinned faces,
 * one chat row with its swipe actions and typing dots, and the empty list's ways in. Look unchanged.
 */

/** A row's face (iOS Messages' list size). */
const AVATAR = 48;
const PINNED_AVATAR = 52;
/** The pinned face's ring thickness and inner gap. */
const PINNED_RING = 2;
const PINNED_GAP = 2;
/**
 * One swipe action's slot: a rounded pill inside it, as in iOS 18 Messages (owner's screenshots,
 * 2026-11-11: the flush rectangles clipped "Выключить звук" at their edges).
 */
const ACTION = 92;
const ACTION_GAP = 4;
/** The width under a row for this many actions. */
const actionsWidth = (count: number) => count * ACTION;
const WHITE = '#FFFFFF';
const PINNED_BG = '#14141C';
/**
 * The unread dot in the brand's peach (owner, 2026-11-09: brand colour, not Messages' blue).
 */
const UNREAD = isDark ? palette.apricotCalm : palette.apricot600;

/** iOS Messages' swipe colours: blue marks read, orange pins, indigo hides alerts, red deletes. */
const READ_FILL = systemColors.blue;
const PIN_FILL = systemColors.orange;
const MUTE_FILL = systemColors.indigo;
const DELETE_FILL = systemColors.red;

export function Filters({ value, unread, onChange }: { value: Filter; unread: number; onChange: (f: Filter) => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.filters} accessibilityRole="tablist" accessibilityLabel={t('chatList.show')}>
      {FILTERS.map((f) => (
        <InkChip key={f} label={t(`chatList.${f}`)} on={f === value} count={f === 'unread' ? unread : 0} onPress={() => onChange(f)} />
      ))}
    </View>
  );
}

/** Three dots that rise in turn while a friend writes; still under Reduce Motion. */
function TypingDots({ color, size = 5 }: { color: string; size?: number }) {
  return (
    <View style={[styles.dots, { gap: size * 0.7 }]}>
      {[0, 1, 2].map((i) => (
        <Dot key={i} delay={i * 200} color={color} size={size} />
      ))}
    </View>
  );
}

function Dot({ delay, color, size }: { delay: number; color: string; size: number }) {
  const still = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    p.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(1, { duration: 360 }), withTiming(0, { duration: 360 }), withTiming(0, { duration: 480 })),
        -1,
      ),
    );
  }, [delay, p, still]);
  const style = useAnimatedStyle(() => ({ opacity: 0.35 + p.value * 0.65, transform: [{ translateY: -3 * p.value }] }));
  return <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />;
}

/** The pin, mute and unread marks are icons only, so the row's label spells them out. */
function useRowLabel(item: ChatItem, level: number | null, typing: boolean) {
  const { t } = useTranslation();
  const row = rowOf(item);
  const name = item.kind === 'group' ? t('group.rowLabel', { name: item.name }) : item.name;
  const label = [
    row.unreadCount > 0 ? t('a11y.unreadTab', { label: name, count: row.unreadCount }) : name,
    level != null ? t('home.bondLevel', { level }) : null,
    isPinned(item) ? t('chatList.pinned') : null,
    row.muted ? t('chatList.muted') : null,
    relativeStamp(row.lastMessageAt),
    row.lastMessagePreview,
  ]
    .filter(Boolean)
    .join(', ');
  return typing ? `${label}, ${t('chatList.typing')}` : label;
}

/**
 * A pinned chat as a night friend card (approved Ink+ prototype; neutral since 0z339): ringed avatar with live green dot & unread count badge, short name, and live mood or typing dots.
 */
export function PinnedTile({
  item,
  awake,
  mood,
  typing,
  editing,
  onPress,
  onLongPress,
  onUnpin,
}: {
  item: ChatItem;
  awake: boolean;
  mood?: string;
  typing: boolean;
  editing: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onUnpin: () => void;
}) {
  const { t } = useTranslation();
  const label = useRowLabel(item, null, typing);
  const unreadCount = rowOf(item).unreadCount;
  const unread = unreadCount > 0;
  const accent = item.kind === 'chat' ? friendAccent(item.character.id).strong : systemColors.mint;

  return (
    <View style={styles.pinnedCell}>
      <PressableScale
        scaleTo={0.95}
        onPress={onPress}
        onLongPress={editing ? undefined : onLongPress}
        delayLongPress={350}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={styles.pinnedTile}>
        {/* Neutral card; the friend's hue only on the ring (audit #4: red and orange washes read brown on night). */}
        <View style={styles.pinnedFaceWrap}>
          <View style={[styles.pinnedRing, { borderColor: accent }]}>
            {item.kind === 'chat' ? (
              <CharacterAvatar character={item.character} size={PINNED_AVATAR} />
            ) : (
              <GroupAvatar members={item.members} size={PINNED_AVATAR} ringColor={PINNED_BG} />
            )}
          </View>
          {item.kind === 'chat' && awake ? <View style={styles.pinnedAwake} pointerEvents="none" /> : null}
          {unread ? (
            <View style={styles.pinnedBadge} pointerEvents="none">
              <InkText variant="caption" color={ink.onBadge} style={styles.tabular}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </InkText>
            </View>
          ) : null}
        </View>

        <InkText variant="caption" color={ink.text} lines={1} style={styles.pinnedName}>
          {item.kind === 'chat' ? shortName(item.name) : item.name}
        </InkText>
        {typing ? (
          <View style={styles.pinnedMoodSlot}>
            <TypingDots color={accent} size={5} />
          </View>
        ) : mood ? (
          <InkText variant="caption" color={ink.text3} lines={1} style={styles.pinnedMood}>
            {mood}
          </InkText>
        ) : null}
      </PressableScale>

      {editing ? (
        <PressableScale
          scaleTo={0.9}
          onPress={onUnpin}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${t('chatList.unpin')}, ${item.name}`}
          style={styles.unpinBadge}>
          <Ionicons name="remove" size={14} color={ink.text} />
        </PressableScale>
      ) : null}
    </View>
  );
}

interface SwipeActionSpec {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  fill: string;
  onPress: () => void;
}

/**
 * The actions under a row: rounded coloured pills side by side, each with a little ground around it.
 * The strip fades in as the bubble starts to slide, so a closed bubble's round corners show only
 * ground; the glyphs grow with the slide (`progress`), so the reveal follows the finger.
 */
function SwipeActions({
  actions,
  progress,
  side,
}: {
  actions: SwipeActionSpec[];
  progress: SharedValue<number>;
  side: 'left' | 'right';
}) {
  const fade = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.12], [0, 1], Extrapolation.CLAMP),
  }));
  return (
    <Animated.View style={[styles.actions, side === 'left' ? styles.actionsLeft : styles.actionsRight, fade]}>
      {actions.map((action) => (
        <SwipeAction key={action.key} action={action} progress={progress} />
      ))}
    </Animated.View>
  );
}

function SwipeAction({ action, progress }: { action: SwipeActionSpec; progress: SharedValue<number> }) {
  const grow = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0, 0.6, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.6, 1], Extrapolation.CLAMP) }],
  }));
  return (
    <PressableScale
      scaleTo={0.9}
      onPress={action.onPress}
      accessibilityRole="button"
      accessibilityLabel={action.label}
      style={[styles.action, { backgroundColor: action.fill }]}>
      <Animated.View style={[styles.actionInner, grow]}>
        <Ionicons name={action.icon} size={22} color={WHITE} />
        <InkText variant="caption" color={WHITE} center lines={2}>
          {action.label}
        </InkText>
      </Animated.View>
    </PressableScale>
  );
}

/**
 * One chat or group as its own card (owner, 2026-11-17, from the Tide canvas; was iOS Messages' flat
 * row, pick B of 2026-11-09): the unread dot inside the card's edge, the face, the name with the time,
 * one line of the last message. Swipe right to mark it read or pin it, left to mute or delete it, hold
 * for the menu; in Edit mode a remove button leads.
 * Memoised: a row redraws only when its own chat, typing or level changes.
 */
export const ChatRow = memo(function ChatRow({
  item,
  level,
  awake,
  typing,
  editing,
  actions,
}: {
  item: ChatItem;
  level: number | null;
  awake: boolean;
  typing: boolean;
  editing: boolean;
  actions: RowActions;
}) {
  const { t } = useTranslation();
  const swipe = useRef<SwipeRowMethods>(null);
  const label = useRowLabel(item, level, typing);
  const row = rowOf(item);
  const unread = row.unreadCount > 0;
  const canPin = item.kind === 'chat';
  const accent = item.kind === 'chat' ? friendAccent(item.character.id).strong : systemColors.mint;
  const pinLabel = isPinned(item) ? t('chatList.unpin') : t('chatList.pin');
  const muteLabel = row.muted ? t('chatList.unmute') : t('chatList.mute');
  const readLabel = unread ? t('chatList.read') : t('chatList.unread');

  // Entering Edit mode closes a row left open by a swipe.
  useEffect(() => {
    if (editing) swipe.current?.close();
  }, [editing]);

  const act = (run: (item: ChatItem) => void) => () => {
    swipe.current?.close();
    haptic.tap();
    run(item);
  };

  // A tap on an open row (or the release that ends a drag) closes it instead of opening the chat.
  const opened = useRef(false);
  const draggedAt = useRef(0);
  const press = () => {
    if (Date.now() - draggedAt.current < 400) return;
    if (opened.current) swipe.current?.close();
    else actions.open(item);
  };
  const pressAvatar = () => {
    if (Date.now() - draggedAt.current < 400) return;
    if (opened.current) swipe.current?.close();
    else actions.openProfile(item);
  };

  // Swipe actions cannot be reached with a screen reader, so the row offers them too.
  const a11yActions = [
    { name: 'read', label: readLabel },
    ...(canPin ? [{ name: 'pin', label: pinLabel }] : []),
    { name: 'mute', label: muteLabel },
    { name: 'delete', label: t('common.delete') },
  ];

  const leading: SwipeActionSpec[] = [
    { key: 'read', label: readLabel, icon: unread ? 'mail-open' : 'mail-unread', fill: READ_FILL, onPress: act(actions.read) },
    ...(canPin ? [{ key: 'pin', label: pinLabel, icon: 'pin' as const, fill: PIN_FILL, onPress: act(actions.pin) }] : []),
  ];
  const trailing: SwipeActionSpec[] = [
    {
      key: 'mute',
      label: muteLabel,
      icon: row.muted ? 'notifications' : 'notifications-off',
      fill: MUTE_FILL,
      onPress: act(actions.mute),
    },
    { key: 'delete', label: t('common.delete'), icon: 'trash', fill: DELETE_FILL, onPress: act(actions.remove) },
  ];

  return (
    <View style={styles.rowWrap}>
      {/* Beside the bubble, not inside it: a button cannot hold another one. */}
      {editing ? (
        <PressableScale
          scaleTo={0.9}
          onPress={() => actions.remove(item)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`${t('common.delete')}, ${item.name}`}
          style={styles.removeCell}>
          <Ionicons name="remove-circle" size={26} color={ink.danger} />
        </PressableScale>
      ) : null}
      <SwipeRow
        ref={swipe}
        enabled={!editing}
        leftWidth={actionsWidth(leading.length)}
        rightWidth={actionsWidth(trailing.length)}
        style={styles.swipe}
        onOpenStart={() => swipe.current && actions.opening(swipe.current)}
        // Both fire on release, just before the click a mouse drag ends with on web.
        onWillOpen={() => {
          opened.current = true;
          draggedAt.current = Date.now();
          if (swipe.current) actions.opening(swipe.current);
          haptic.selection();
        }}
        onWillClose={() => {
          opened.current = false;
          draggedAt.current = Date.now();
          if (swipe.current) actions.closed(swipe.current);
        }}
        renderLeft={(progress) => <SwipeActions actions={leading} progress={progress} side="left" />}
        renderRight={(progress) => <SwipeActions actions={trailing} progress={progress} side="right" />}>
        <View style={styles.row}>
          {/* Tapping the avatar opens Character Profile directly; sibling of row body so buttons never nest. */}
          <PressableScale
            scaleTo={0.93}
            disabled={editing}
            onPress={pressAvatar}
            onLongPress={editing ? undefined : () => actions.hold(item)}
            delayLongPress={350}
            accessibilityRole="button"
            accessibilityLabel={item.name}
            style={styles.avatarTap}>
            <View style={[styles.avatarRing, { borderColor: unread ? accent : ink.edge }]}>
              {item.kind === 'chat' ? (
                <CharacterAvatar character={item.character} size={AVATAR} />
              ) : (
                <GroupAvatar members={item.members} size={AVATAR} ringColor={ink.card} />
              )}
            </View>
            {item.kind === 'chat' && awake ? <View style={styles.rowAwake} pointerEvents="none" /> : null}
          </PressableScale>

          <PressableScale
            scaleTo={0.99}
            dimOnPress={false}
            style={styles.body}
            onPress={press}
            onLongPress={editing ? undefined : () => actions.hold(item)}
            delayLongPress={350}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityActions={a11yActions}
            onAccessibilityAction={(e) => {
              const name = e.nativeEvent.actionName;
              if (name === 'read') actions.read(item);
              else if (name === 'pin') actions.pin(item);
              else if (name === 'mute') actions.mute(item);
              else if (name === 'delete') actions.remove(item);
            }}>
            <View style={styles.line}>
              <InkText variant="bodyStrong" lines={1} style={styles.name}>
                {item.name}
              </InkText>
              {level != null ? (
                <View style={styles.levelPill}>
                  <InkText variant="caption" color={accent} style={styles.tabular}>
                    {t('home.hero.level', { level })}
                  </InkText>
                </View>
              ) : null}
              {row.muted ? <Ionicons name="notifications-off" size={13} color={ink.text3} /> : null}
              <View style={styles.spacer} />
              <InkText variant="footnote" color={unread ? ink.text2 : ink.text3} style={styles.tabular}>
                {relativeStamp(row.lastMessageAt)}
              </InkText>
            </View>

            <View style={styles.previewRow}>
              {typing ? (
                <View style={styles.typing}>
                  <InkText variant="footnote" color={accent}>
                    {t('chatList.typing')}
                  </InkText>
                  <TypingDots color={accent} size={5} />
                </View>
              ) : row.lastMessagePreview ? (
                <InkText variant="sub" color={unread ? 'rgba(255,255,255,0.88)' : ink.text2} lines={1} style={styles.previewText}>
                  {row.lastMessagePreview}
                </InkText>
              ) : (
                <View style={styles.previewText} />
              )}
              {unread ? <View style={styles.unreadDot} /> : null}
            </View>
          </PressableScale>
        </View>
      </SwipeRow>
    </View>
  );
});

/** One choice in the pencil's sheet: a tile in a deep Ink tint, an icon box, the action and a line. */
export function WayTile({
  icon,
  tint,
  title,
  badge,
  hint,
  disabled,
  onPress,
}: {
  icon: React.ReactNode;
  tint: string;
  title: string;
  badge?: string;
  hint: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      scaleTo={0.97}
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, badge, hint].filter(Boolean).join(', ')}
      style={[styles.way, { backgroundColor: tint }, disabled && styles.wayOff]}>
      <View style={styles.wayIcon}>{icon}</View>
      <View style={styles.wayText}>
        <View style={styles.wayTitleRow}>
          <InkText variant="bodyStrong">{title}</InkText>
          {badge ? (
            <View style={styles.live}>
              <InkText variant="caption" color={WHITE} style={styles.liveText}>
                {badge}
              </InkText>
            </View>
          ) : null}
        </View>
        <InkText variant="footnote">{hint}</InkText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  filters: { marginTop: space.sm, marginHorizontal: space.lg, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // Pinned chats: glowing night friend cards scrolling sideways cleanly.
  pinnedCell: { width: 102 },
  pinnedTile: {
    alignItems: 'center',
    gap: 5,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: PINNED_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    overflow: 'hidden',
  },
  pinnedFaceWrap: { position: 'relative' },
  pinnedRing: {
    padding: PINNED_GAP,
    borderWidth: PINNED_RING,
    borderRadius: inkRadius.pill,
  },
  pinnedAwake: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 13,
    height: 13,
    borderRadius: inkRadius.pill,
    backgroundColor: systemColors.green,
    borderWidth: 2,
    borderColor: PINNED_BG,
  },
  pinnedBadge: {
    position: 'absolute',
    right: -3,
    top: -3,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: inkRadius.pill,
    borderWidth: 2,
    borderColor: PINNED_BG,
    backgroundColor: ink.badge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinnedName: { maxWidth: '100%' },
  pinnedMood: { maxWidth: '100%', fontSize: 11, lineHeight: 14, fontWeight: '500' },
  pinnedMoodSlot: { height: 14, justifyContent: 'center' },
  unpinBadge: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: 22,
    height: 22,
    borderRadius: inkRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ink.card,
    borderWidth: 2,
    borderColor: ink.ground,
  },
  tabular: { fontVariant: ['tabular-nums'] },
  dots: { flexDirection: 'row', alignItems: 'center' },
  // Each chat is its own card (owner, 2026-11-17): the gutter and the gap sit outside the swipe.
  rowWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: space.lg, marginBottom: 10 },
  removeCell: { width: 36, marginRight: 4, alignItems: 'center', justifyContent: 'center' },
  swipe: { flex: 1 },
  // Opaque, so the swipe actions under it never show through a closed card.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: inkRadius.row,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    backgroundColor: ink.card,
  },
  avatarTap: { position: 'relative' },
  avatarRing: { padding: 1.5, borderWidth: 1.5, borderRadius: inkRadius.pill },
  rowAwake: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: inkRadius.pill,
    backgroundColor: systemColors.green,
    borderWidth: 2,
    borderColor: ink.card,
  },
  unreadDot: { width: 10, height: 10, borderRadius: inkRadius.pill, backgroundColor: UNREAD },
  body: { flex: 1, minWidth: 0, gap: 4, minHeight: AVATAR, justifyContent: 'center' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1 },
  levelPill: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: inkRadius.pill,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  spacer: { flex: 1, minWidth: 6 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewText: { flex: 1, minWidth: 0 },
  typing: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  actions: { flex: 1, flexDirection: 'row', overflow: 'hidden' },
  actionsLeft: {},
  actionsRight: {},
  action: {
    width: ACTION - ACTION_GAP * 2,
    marginHorizontal: ACTION_GAP,
    marginVertical: ACTION_GAP + 2,
    paddingHorizontal: space.xs,
    borderRadius: inkRadius.chip,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionInner: { alignItems: 'center', gap: 3 },
  // The pencil's sheet: three tiles in deep Ink tints.
  way: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: inkRadius.field, borderCurve: 'continuous' },
  wayOff: { opacity: 0.45 },
  wayIcon: {
    width: 48,
    height: 48,
    borderRadius: inkRadius.chip,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ink.raised,
  },
  wayText: { flex: 1, gap: 2 },
  wayTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  live: { paddingHorizontal: 6, borderRadius: inkRadius.pill, justifyContent: 'center', backgroundColor: ink.danger },
  liveText: { textTransform: 'uppercase' },
});
