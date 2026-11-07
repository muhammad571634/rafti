import { Ionicons } from '@expo/vector-icons';
import { BlurTargetView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Platform, Pressable, ScrollView, StyleSheet, View, type ViewInstance } from 'react-native';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { ChatMenu, type ChatMenuTarget } from '@/components/chat/chat-menu';
import { SwipeRow, type SwipeRowMethods } from '@/components/chat/swipe-row';
import { GroupAvatar } from '@/components/group-avatar';
import { CharacterAvatar, EmptyState, PressableScale, Screen, SearchBar, SFIcon, Sheet, Txt } from '@/components/ui';
import { useTabBlurTarget } from '@/hooks/use-tab-blur-target';
import { chatDrafts } from '@/lib/chat-drafts';
import { forgetNotes } from '@/lib/voice-files';
import { relativeStamp, shortName } from '@/lib/format';
import { groupTitle } from '@/lib/group-chat';
import { haptic } from '@/lib/haptics';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, fonts, friendColor, friendHues, playful, space, systemColors, TAB_BAR_HEIGHT, type Hue } from '@/theme';
import type { Character, Conversation, GroupChat } from '@/types';

/** A face inside a bubble, and the white ring round it. */
const AVATAR = 48;
const AVATAR_RING = 3;
const PINNED_AVATAR = 56;
/** The pinned face's ring in the friend's colour, and the gap of ground inside it. */
const PINNED_RING = 3;
const PINNED_GAP = 2;
/** A bubble's corners, and the strip of actions under it. */
const BUBBLE_RADIUS = 28;
/** The bubble's tail: it hangs below the bubble into the gap before the next one. */
const TAIL_W = 26;
const TAIL_H = 12;
/** Space under each bubble: the tail plus a little air. Padding, so the tail stays inside the list cell. */
const ROW_GAP = TAIL_H + 6;
/** One swipe action: a full-height coloured column with its glyph and label. */
const ACTION = 70;
/** The cream between the actions strip and the bubble once it is open. */
const ACTION_GAP = 6;
/** The width under a row for this many actions, with the gap to the bubble. */
const actionsWidth = (count: number) => count * ACTION + ACTION_GAP;
const MENU_AVATAR = 36;
/** How many of the chat's last lines the long-press preview shows. */
const PREVIEW_LINES = 3;
/** The white ring round faces on a bubble, and the level chip on it. */
const RING = 'rgba(255,255,255,0.85)';
/** The bond's mint heart on a light bubble (white on a deep one). */
const HEART = '#1E9E78';
const WHITE = '#FFFFFF';
const INK = '#1F1A17';

type Filter = 'all' | 'unread' | 'groups';
const FILTERS: Filter[] = ['all', 'unread', 'groups'];
/** iOS Messages' swipe colours: blue marks read, orange pins, indigo hides alerts, red deletes. */
const READ_FILL = systemColors.blue;
const PIN_FILL = systemColors.orange;
const MUTE_FILL = systemColors.indigo;
const DELETE_FILL = systemColors.red;

/** A row: a one-to-one chat with its character, or a group with its members. */
type ChatItem =
  | {
      kind: 'chat';
      id: string;
      conversation: Conversation;
      character: Character;
      name: string;
    }
  | {
      kind: 'group';
      id: string;
      group: GroupChat;
      members: Character[];
      name: string;
    };

/** What every row shows, whichever kind it is. */
const rowOf = (item: ChatItem) => (item.kind === 'chat' ? item.conversation : item.group);
const isPinned = (item: ChatItem) => item.kind === 'chat' && item.conversation.pinned;
const isUnread = (item: ChatItem) => rowOf(item).unreadCount > 0;
/** A friend wears their own hue (the same on Us); a group wears one soft mint. */
const hueOf = (item: ChatItem): Hue => (item.kind === 'chat' ? friendColor(item.character.id) : playful.group);
/** A deep bubble (the blue, every dark-mode hue) takes white marks instead of ink ones. */
const isDeep = (hue: Hue) => hue.ink === WHITE;
const countText = (n: number) => (n > 99 ? '99+' : String(n));

/** Alert.alert is a no-op on web; fall back to the browser's confirm there. */
function confirm(title: string, message: string, action: string, onConfirm: () => void, cancel: string) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancel, style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ]);
}

/** The handlers every row shares; stable, so a row re-renders only when its own chat changes. */
interface RowActions {
  open: (item: ChatItem) => void;
  hold: (item: ChatItem) => void;
  mute: (item: ChatItem) => void;
  pin: (item: ChatItem) => void;
  read: (item: ChatItem) => void;
  remove: (item: ChatItem) => void;
  /** One open row at a time (iOS): a row opening or starting to open closes the one before. */
  opening: (row: SwipeRowMethods) => void;
  closed: (row: SwipeRowMethods) => void;
}

/**
 * Every chat and group as coloured speech bubbles on the playful cream (design-style §10, the
 * approved four-tab prototype): Edit, search and new chat on top; the big rounded title; All /
 * Unread / Groups as pills; pinned chats as faces ringed in their friend's colour; then one bubble
 * per chat in the friend's own hue, tails turning left and right. Search opens from the magnifier
 * in place of the title. A bubble swipes right to mark it read or pin it and left to mute or delete
 * it (iOS Messages), one open at a time; a long press opens the same actions over a preview of the
 * chat; Edit shows a remove button by every bubble and an unpin badge on every pinned face.
 */
export default function ChatListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  // The tab bar grows by the phone's bottom inset (home indicator, navigation bar).
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [editing, setEditing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  // Opened on a filter (Today's "Waiting for you" asks for Unread): apply it once, then forget it.
  const { filter: asked } = useLocalSearchParams<{ filter?: string }>();
  useEffect(() => {
    if (!asked || !(FILTERS as string[]).includes(asked)) return;
    setFilter(asked as Filter);
    setSearching(false);
    router.setParams({ filter: undefined });
  }, [asked, router]);
  /** The chat a long press opened the menu for. */
  const [held, setHeld] = useState<ChatItem | null>(null);
  // On Android the tab bar blurs this same target (one target per screen, never nested).
  const tabTarget = useTabBlurTarget();
  const ownTarget = useRef<ViewInstance>(null);
  const blurTarget = tabTarget ?? ownTarget;

  const conversations = useAppStore((s) => s.conversations);
  const groups = useAppStore((s) => s.groups);
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const setChatPinned = useAppStore((s) => s.setChatPinned);
  const setChatMuted = useAppStore((s) => s.setChatMuted);
  const deleteChat = useAppStore((s) => s.deleteChat);
  const setGroupMuted = useAppStore((s) => s.setGroupMuted);
  const deleteGroup = useAppStore((s) => s.deleteGroup);
  const markRead = useAppStore((s) => s.markRead);
  const markUnread = useAppStore((s) => s.markUnread);
  const typing = useAppStore((s) => s.typing);
  const groupTyping = useAppStore((s) => s.groupTyping);
  // Only the held chat's lines, for the long-press preview: a new message elsewhere leaves the list alone.
  const heldMessages = useAppStore((s) => (held ? s.messages[held.id] : undefined));
  const isTyping = (item: ChatItem) => (item.kind === 'chat' ? !!typing[item.id] : (groupTyping[item.id]?.length ?? 0) > 0);
  // The mint level heart, from level 1 (the same rule as the Today chat rows).
  const levelOf = (item: ChatItem) => {
    const level = item.kind === 'chat' ? (relationships[item.character.id]?.level ?? 0) : 0;
    return level >= 1 ? level : null;
  };

  /** Pinned chats first, then most recent; chats whose character is gone are dropped. */
  const items = useMemo<ChatItem[]>(() => {
    const byId = new Map(characters.map((c) => [c.id, c]));
    const chats = conversations.flatMap((conversation): ChatItem[] => {
      const character = byId.get(conversation.characterId);
      if (!character) return [];
      const name = displayName(character, relationships[character.id]);
      return [{ kind: 'chat', id: conversation.id, conversation, character, name }];
    });
    const rooms = groups.flatMap((group): ChatItem[] => {
      const members = group.memberIds.flatMap((id) => byId.get(id) ?? []);
      if (members.length < 2) return [];
      const name = group.name || groupTitle(members.map((m) => shortName(displayName(m, relationships[m.id]))));
      return [{ kind: 'group', id: group.id, group, members, name }];
    });
    return [...chats, ...rooms].sort((a, b) => {
      if (isPinned(a) !== isPinned(b)) return isPinned(a) ? -1 : 1;
      return new Date(rowOf(b).lastMessageAt).getTime() - new Date(rowOf(a).lastMessageAt).getTime();
    });
  }, [conversations, groups, characters, relationships]);

  // Nothing left to edit: leave Edit mode so the button does not linger as "Done".
  useEffect(() => {
    if (items.length === 0) setEditing(false);
  }, [items.length]);

  // A group is made of friends the user already chats with.
  const friends = useMemo(
    () => new Set(items.flatMap((item) => (item.kind === 'chat' ? [item.character.id] : []))).size,
    [items],
  );

  const needle = query.trim().toLowerCase();
  const unreadChats = items.filter(isUnread).length;
  // Searching or filtering, pinned chats are rows like the rest; otherwise they sit on top as faces.
  const grid = !searching && filter === 'all';
  const pinned = useMemo(() => (grid ? items.filter(isPinned) : []), [items, grid]);
  const rows = useMemo(() => {
    const shown =
      filter === 'unread' && !searching
        ? items.filter(isUnread)
        : filter === 'groups' && !searching
          ? items.filter((item) => item.kind === 'group')
          : grid
            ? items.filter((item) => !isPinned(item))
            : items;
    return needle
      ? shown.filter(
          (item) =>
            item.name.toLowerCase().includes(needle) || rowOf(item).lastMessagePreview.toLowerCase().includes(needle),
        )
      : shown;
  }, [items, needle, filter, grid, searching]);

  // The row that is open now; the next one to open closes it, as in iOS.
  const openRow = useRef<SwipeRowMethods | null>(null);
  const closeOpenRow = useCallback(() => {
    openRow.current?.close();
    openRow.current = null;
  }, []);

  const remove = useCallback(
    (item: ChatItem) =>
      confirm(
        t('chatList.deleteTitle'),
        item.kind === 'chat' ? t('chatList.deleteBody', { name: item.name }) : t('chatList.deleteGroupBody'),
        t('common.delete'),
        () => {
          chatDrafts.forget(item.id);
          void forgetNotes(item.id);
          return item.kind === 'chat' ? deleteChat(item.id) : deleteGroup(item.id);
        },
        t('common.cancel'),
      ),
    [t, deleteChat, deleteGroup],
  );

  const actions = useMemo<RowActions>(
    () => ({
      open: (item) => {
        // With a row open, the first tap anywhere only closes it (iOS).
        if (openRow.current) return closeOpenRow();
        if (item.kind === 'chat') router.push(`/chat/${item.id}`);
        else router.push({ pathname: '/group/[id]', params: { id: item.id } });
      },
      hold: (item) => {
        haptic.lift();
        setHeld(item);
      },
      mute: (item) =>
        item.kind === 'chat' ? setChatMuted(item.id, !item.conversation.muted) : setGroupMuted(item.id, !item.group.muted),
      pin: (item) => {
        if (item.kind === 'chat') setChatPinned(item.id, !item.conversation.pinned);
      },
      read: (item) => (isUnread(item) ? markRead(item.id) : markUnread(item.id)),
      remove,
      opening: (row) => {
        if (openRow.current && openRow.current !== row) openRow.current.close();
        openRow.current = row;
      },
      closed: (row) => {
        if (openRow.current === row) openRow.current = null;
      },
    }),
    [router, closeOpenRow, setChatMuted, setGroupMuted, setChatPinned, markRead, markUnread, remove],
  );

  // Edit mode and search start from a closed list.
  useEffect(() => {
    if (editing || searching) closeOpenRow();
  }, [editing, searching, closeOpenRow]);

  const menuTarget: ChatMenuTarget | null = held
    ? {
        name: held.name,
        subtitle: held.kind === 'chat' ? t('chat.aiCharacter') : t('group.members', { count: held.members.length }),
        avatar:
          held.kind === 'chat' ? (
            <CharacterAvatar character={held.character} size={MENU_AVATAR} />
          ) : (
            <GroupAvatar members={held.members} size={MENU_AVATAR} />
          ),
        canPin: held.kind === 'chat',
        pinned: isPinned(held),
        muted: !!rowOf(held).muted,
        unread: isUnread(held),
      }
    : null;
  const heldLines = useMemo(() => (heldMessages ?? []).filter((m) => m.kind !== 'system').slice(-PREVIEW_LINES), [heldMessages]);

  const startWith = (route: '/(tabs)/find' | '/group/new' | '/streams') => {
    setStarting(false);
    router.push(route);
  };

  const stopSearch = () => {
    setSearching(false);
    setQuery('');
  };

  const renderItem = useCallback(
    ({ item, index }: { item: ChatItem; index: number }) => (
      <ChatRow
        item={item}
        tailRight={index % 2 === 1}
        level={levelOf(item)}
        typing={isTyping(item)}
        editing={editing}
        actions={actions}
      />
    ),
    // `levelOf` and `isTyping` read these maps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [relationships, typing, groupTyping, editing, actions],
  );

  return (
    <Screen background={playful.ground}>
      <BlurTargetView ref={blurTarget} style={styles.flex}>
        <View style={styles.topBar}>
          {items.length > 0 && !searching ? (
            <PressableScale
              scaleTo={0.94}
              onPress={() => setEditing((v) => !v)}
              accessibilityRole="button"
              style={[styles.editPill, editing && styles.editPillOn]}>
              <Txt style={[styles.editText, editing && styles.editTextOn]} maxFontSizeMultiplier={1.3}>
                {editing ? t('common.done') : t('common.edit')}
              </Txt>
            </PressableScale>
          ) : (
            <View />
          )}
          {searching ? null : (
            <View style={styles.topRight}>
              {items.length > 0 ? (
                <PressableScale
                  scaleTo={0.88}
                  onPress={() => {
                    setEditing(false);
                    setSearching(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.search')}
                  style={styles.roundButton}>
                  <Ionicons name="search" size={19} color={playful.ink} />
                </PressableScale>
              ) : null}
              <PressableScale
                scaleTo={0.88}
                onPress={() => setStarting(true)}
                accessibilityRole="button"
                accessibilityLabel={t('chatList.newChat')}
                style={styles.roundButton}>
                <Svg
                  width={20}
                  height={20}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={playful.ink}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <Path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
                  <Path d="M17.5 3.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />
                </Svg>
              </PressableScale>
            </View>
          )}
        </View>

        {searching ? (
          // Search takes the title's place, as an iOS search field does when it becomes active.
          <View style={styles.searchRow}>
            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder={t('common.search')}
              tone="light"
              autoFocus
              style={styles.search}
            />
            <Pressable onPress={stopSearch} hitSlop={8} accessibilityRole="button">
              <Txt style={styles.cancel}>{t('common.cancel')}</Txt>
            </Pressable>
          </View>
        ) : (
          <Txt accessibilityRole="header" style={styles.title} maxFontSizeMultiplier={1.3}>
            {t('chatList.title')}
          </Txt>
        )}

        {items.length === 0 ? (
          <EmptyState
            symbol={{ ios: 'bubble.left.and.bubble.right.fill', icon: 'chatbubbles' }}
            title={t('chatList.empty')}
            hint={t('chatList.emptyHint')}
            actionLabel={t('common.findSomeone')}
            onAction={() => router.push('/(tabs)/find')}
          />
        ) : (
          <>
            {searching ? null : <Filters value={filter} unread={unreadChats} onChange={setFilter} />}

            <FlatList
              data={rows}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              // iOS closes an open row as soon as the list moves.
              onScrollBeginDrag={closeOpenRow}
              initialNumToRender={10}
              windowSize={7}
              removeClippedSubviews={Platform.OS === 'android'}
              contentContainerStyle={{
                paddingBottom: TAB_BAR_HEIGHT + insets.bottom + space.xxl,
              }}
              ListHeaderComponent={
                pinned.length > 0 ? (
                  <View>
                    <Txt accessibilityRole="header" style={styles.section} maxFontSizeMultiplier={1.3}>
                      {t('chatList.pinned')}
                    </Txt>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.pinnedRow}
                      onScrollBeginDrag={closeOpenRow}>
                      {pinned.map((item) => (
                        <PinnedTile
                          key={item.id}
                          item={item}
                          typing={isTyping(item)}
                          editing={editing}
                          onPress={() => actions.open(item)}
                          onLongPress={() => actions.hold(item)}
                          onUnpin={() => actions.pin(item)}
                        />
                      ))}
                    </ScrollView>
                  </View>
                ) : (
                  <View />
                )
              }
              ListHeaderComponentStyle={styles.listTop}
              ListEmptyComponent={
                needle ? (
                  <Txt variant="small" color={colors.textSecondary} center style={styles.noResults}>
                    {t('chatList.noResults', { query: query.trim() })}
                  </Txt>
                ) : filter !== 'all' && !searching ? (
                  <View style={styles.caughtUp}>
                    <Ionicons name={filter === 'unread' ? 'checkmark' : 'people-outline'} size={28} color={colors.textSecondary} />
                    <Txt style={styles.caughtUpText}>
                      {filter === 'unread' ? t('chatList.caughtUp') : t('chatList.noGroups')}
                    </Txt>
                  </View>
                ) : undefined
              }
            />
          </>
        )}
      </BlurTargetView>

      <ChatMenu
        target={menuTarget}
        messages={heldLines}
        blurTarget={blurTarget}
        onClose={() => setHeld(null)}
        onPin={() => held && actions.pin(held)}
        onToggleRead={() => held && actions.read(held)}
        onMute={() => held && actions.mute(held)}
        onDelete={() => held && actions.remove(held)}
      />

      {/* The pencil: a new chat in Find, a group of 2-3 friends or a stream; three big coloured
          tiles, as in the approved prototype. */}
      <Sheet visible={starting} onClose={() => setStarting(false)} title={t('chatList.newTitle')}>
        <View style={styles.ways}>
          <WayTile
            icon={<SFIcon ios="person.fill" icon="person" size={22} color={friendHues[0].ink} />}
            hue={friendHues[0]}
            title={t('group.newChat')}
            hint={t('group.newChatHint')}
            onPress={() => startWith('/(tabs)/find')}
          />
          <WayTile
            icon={<SFIcon ios="person.2.fill" icon="people" size={22} color={friendHues[1].ink} />}
            hue={friendHues[1]}
            title={t('group.newGroup')}
            hint={friends < 2 ? t('group.needFriends') : t('group.newGroupHint')}
            disabled={friends < 2}
            onPress={() => startWith('/group/new')}
          />
          {/* Character.AI's Stream: two characters talk while you watch (flows.md D74). */}
          <WayTile
            icon={<SFIcon ios="play.rectangle.fill" icon="tv" size={22} color={playful.plumInk} />}
            hue={{ fill: playful.plum, ink: playful.plumInk }}
            title={t('streams.title')}
            badge={t('streams.live')}
            hint={t('streams.sheetHint')}
            onPress={() => startWith('/streams')}
          />
        </View>
      </Sheet>
    </Screen>
  );
}

/** All / Unread / Groups as three pills, ink when on; Unread carries its count in a red chip. */
function Filters({ value, unread, onChange }: { value: Filter; unread: number; onChange: (f: Filter) => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.filters} accessibilityRole="tablist" accessibilityLabel={t('chatList.show')}>
      {FILTERS.map((f) => {
        const on = f === value;
        const count = f === 'unread' ? unread : 0;
        return (
          <PressableScale
            key={f}
            scaleTo={0.95}
            dimOnPress={false}
            onPress={() => onChange(f)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            aria-selected={on}
            style={[styles.pill, on && styles.pillOn]}>
            <Txt style={[styles.pillText, on && styles.pillTextOn]} maxFontSizeMultiplier={1.3}>
              {t(`chatList.${f}`)}
            </Txt>
            {count > 0 ? (
              <View style={styles.redCount}>
                <Txt style={styles.redCountText} maxFontSizeMultiplier={1.2}>
                  {countText(count)}
                </Txt>
              </View>
            ) : null}
          </PressableScale>
        );
      })}
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
 * A pinned chat in the row on top: a face ringed in the friend's colour, an ink pin mark (a red dot
 * when there is news, dots while they write) and the name.
 */
function PinnedTile({
  item,
  typing,
  editing,
  onPress,
  onLongPress,
  onUnpin,
}: {
  item: ChatItem;
  typing: boolean;
  editing: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onUnpin: () => void;
}) {
  const { t } = useTranslation();
  const label = useRowLabel(item, null, typing);
  const unread = rowOf(item).unreadCount > 0;
  return (
    <View style={styles.pinnedCell}>
      <PressableScale
        scaleTo={0.94}
        onPress={onPress}
        onLongPress={editing ? undefined : onLongPress}
        delayLongPress={350}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={styles.pinnedTile}>
        <View style={[styles.pinnedRing, { borderColor: hueOf(item).fill }]}>
          {item.kind === 'chat' ? (
            <CharacterAvatar character={item.character} size={PINNED_AVATAR} />
          ) : (
            <GroupAvatar members={item.members} size={PINNED_AVATAR} ringColor={playful.ground} />
          )}
        </View>
        {typing ? (
          <View style={styles.pinnedTyping} pointerEvents="none">
            <TypingDots color={playful.ink} />
          </View>
        ) : unread ? (
          <View style={styles.pinnedDot} pointerEvents="none" />
        ) : editing ? null : (
          <View style={styles.pinMark} pointerEvents="none">
            <Ionicons name="pin" size={11} color={playful.chipOnText} />
          </View>
        )}
        <Txt style={[styles.pinnedName, unread && styles.pinnedNameUnread]} lines={1} maxFontSizeMultiplier={1.3}>
          {item.kind === 'chat' ? shortName(item.name) : item.name}
        </Txt>
      </PressableScale>
      {editing ? (
        <Pressable
          onPress={onUnpin}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${t('chatList.unpin')}, ${item.name}`}
          style={styles.unpinBadge}>
          <Ionicons name="remove" size={14} color={playful.ink} />
        </Pressable>
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
 * The actions under a bubble: full-height coloured columns in one strip with the bubble's corners.
 * The strip fades in as the bubble starts to slide, so a closed bubble's round corners show only
 * cream; the glyphs grow with the slide (`progress`), so the reveal follows the finger.
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
    <Pressable
      onPress={action.onPress}
      accessibilityRole="button"
      accessibilityLabel={action.label}
      style={[styles.action, { backgroundColor: action.fill }]}>
      <Animated.View style={[styles.actionInner, grow]}>
        <Ionicons name={action.icon} size={21} color={WHITE} />
        <Txt style={styles.actionText} lines={1} maxFontSizeMultiplier={1.2} adjustsFontSizeToFit minimumFontScale={0.75}>
          {action.label}
        </Txt>
      </Animated.View>
    </Pressable>
  );
}

/** The bubble's tail: a soft triangle under one corner, in the bubble's own colour. */
function Tail({ color, right }: { color: string; right: boolean }) {
  return (
    <Svg
      width={TAIL_W}
      height={TAIL_H}
      viewBox={`0 0 ${TAIL_W} ${TAIL_H}`}
      style={[styles.tail, right ? styles.tailRight : styles.tailLeft]}
      pointerEvents="none">
      <Path
        fill={color}
        d={
          right
            ? 'M26 0 L0 0 C9 3 17 7 21 12 C21 7 23 3 26 0 Z'
            : 'M0 0 L26 0 C17 3 9 7 5 12 C5 7 3 3 0 0 Z'
        }
      />
    </Svg>
  );
}

/**
 * One chat or group as a speech bubble in the friend's hue: swipe right to mark it read or pin it,
 * left to mute or delete it (iOS Messages), hold for the menu; in Edit mode a remove button leads.
 * Memoised: a bubble redraws only when its own chat, typing or level changes.
 */
const ChatRow = memo(function ChatRow({
  item,
  tailRight,
  level,
  typing,
  editing,
  actions,
}: {
  item: ChatItem;
  tailRight: boolean;
  level: number | null;
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
  const hue = hueOf(item);
  const deep = isDeep(hue);
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
        <Pressable
          onPress={() => actions.remove(item)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`${t('common.delete')}, ${item.name}`}
          style={styles.removeCell}>
          <Ionicons name="remove-circle" size={26} color={colors.danger} />
        </Pressable>
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
        <PressableScale
          scaleTo={0.98}
          dimOnPress={false}
          style={[styles.bubble, { backgroundColor: hue.fill }]}
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
          {item.kind === 'chat' ? (
            <View style={styles.avatarRing}>
              <CharacterAvatar character={item.character} size={AVATAR} />
            </View>
          ) : (
            <GroupAvatar members={item.members} size={AVATAR + AVATAR_RING * 2} ringColor={RING} />
          )}

          <View style={styles.body}>
            <View style={styles.line}>
              <Txt style={[styles.name, { color: hue.ink }]} lines={1} maxFontSizeMultiplier={1.3}>
                {item.name}
              </Txt>
              {level != null ? (
                <View style={[styles.level, deep && styles.levelDeep]}>
                  <Ionicons name="heart" size={10} color={deep ? WHITE : HEART} />
                  <Txt style={[styles.levelText, { color: hue.ink }]} maxFontSizeMultiplier={1.2}>
                    {level}
                  </Txt>
                </View>
              ) : null}
              {row.muted ? <Ionicons name="notifications-off" size={14} color={hue.ink} style={styles.muted} /> : null}
            </View>
            {typing ? (
              <View style={styles.typing}>
                <TypingDots color={hue.ink} size={7} />
              </View>
            ) : row.lastMessagePreview ? (
              <Txt style={[styles.preview, { color: hue.ink }]} lines={2}>
                {row.lastMessagePreview}
              </Txt>
            ) : null}
          </View>

          <View style={styles.end}>
            <Txt style={[styles.stamp, { color: hue.ink }]} maxFontSizeMultiplier={1.3}>
              {relativeStamp(row.lastMessageAt)}
            </Txt>
            {unread ? (
              <View style={[styles.count, { backgroundColor: deep ? WHITE : INK }]}>
                <Txt style={[styles.countText, { color: deep ? INK : WHITE }]} maxFontSizeMultiplier={1.2}>
                  {countText(row.unreadCount)}
                </Txt>
              </View>
            ) : null}
          </View>

          <Tail color={hue.fill} right={tailRight} />
        </PressableScale>
      </SwipeRow>
    </View>
  );
});

/** One choice in the pencil's sheet: a big tile in its own colour, an icon box, the action and a line. */
function WayTile({
  icon,
  hue,
  title,
  badge,
  hint,
  disabled,
  onPress,
}: {
  icon: React.ReactNode;
  hue: Hue;
  title: string;
  badge?: string;
  hint: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const deep = isDeep(hue);
  return (
    <PressableScale
      scaleTo={0.97}
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, badge, hint].filter(Boolean).join(', ')}
      style={[styles.way, { backgroundColor: hue.fill }]}>
      <View style={[styles.wayIcon, deep && styles.wayIconDeep]}>{icon}</View>
      <View style={styles.wayText}>
        <View style={styles.wayTitleRow}>
          <Txt style={[styles.wayTitle, { color: hue.ink }]} maxFontSizeMultiplier={1.3}>
            {title}
          </Txt>
          {badge ? (
            <View style={styles.live}>
              <Txt style={styles.liveText} maxFontSizeMultiplier={1.2}>
                {badge}
              </Txt>
            </View>
          ) : null}
        </View>
        <Txt style={[styles.wayHint, { color: hue.ink }]}>{hint}</Txt>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    height: 44 + space.sm,
  },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  editPill: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    justifyContent: 'center',
    backgroundColor: playful.chip,
  },
  editPillOn: { backgroundColor: playful.chipOn },
  editText: { fontFamily: fonts.playfulBold, fontSize: 15, color: playful.ink },
  editTextOn: { color: playful.chipOnText },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: playful.round,
  },
  title: {
    marginTop: 2,
    marginHorizontal: space.lg,
    fontFamily: fonts.playful,
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.4,
    color: playful.ink,
  },
  searchRow: {
    marginTop: 4,
    marginHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  search: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: space.md,
    gap: 6,
  },
  cancel: { fontSize: 17, letterSpacing: -0.4, color: colors.brandText },
  filters: { marginTop: space.sm, marginHorizontal: space.lg, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: playful.chip,
  },
  pillOn: { backgroundColor: playful.chipOn },
  pillText: { fontFamily: fonts.playfulBold, fontSize: 14, color: playful.ink },
  pillTextOn: { color: playful.chipOnText },
  redCount: {
    minWidth: 20,
    height: 18,
    paddingHorizontal: 6,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: playful.red,
  },
  redCountText: { fontSize: 11, lineHeight: 14, fontWeight: '800', color: WHITE },
  listTop: { paddingTop: space.md, paddingBottom: space.md },
  section: {
    marginHorizontal: space.lg,
    marginBottom: space.sm,
    fontFamily: fonts.playful,
    fontSize: 15,
    color: playful.ink,
  },
  // Pinned chats: one row of ringed faces that scrolls sideways when there are many.
  pinnedRow: { paddingHorizontal: space.lg, paddingTop: 2, gap: 14 },
  pinnedCell: { width: PINNED_AVATAR + (PINNED_RING + PINNED_GAP) * 2, alignItems: 'center' },
  pinnedTile: { alignItems: 'center', gap: 5 },
  pinnedRing: {
    padding: PINNED_GAP,
    borderWidth: PINNED_RING,
    borderRadius: PINNED_AVATAR / 2 + PINNED_GAP + PINNED_RING,
    backgroundColor: playful.ground,
  },
  pinMark: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: playful.chipOn,
  },
  pinnedTyping: {
    position: 'absolute',
    right: -6,
    top: -2,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    justifyContent: 'center',
    backgroundColor: playful.card,
  },
  pinnedDot: {
    position: 'absolute',
    right: 2,
    top: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: playful.ground,
    backgroundColor: playful.red,
  },
  pinnedName: {
    maxWidth: PINNED_AVATAR + 14,
    fontFamily: fonts.playfulBold,
    fontSize: 12,
    color: playful.ink,
  },
  pinnedNameUnread: { fontFamily: fonts.playful },
  unpinBadge: {
    position: 'absolute',
    top: -2,
    left: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: playful.card,
    borderWidth: 2,
    borderColor: playful.ground,
  },
  dots: { flexDirection: 'row', alignItems: 'center' },
  // The gap under a bubble is padding, so its tail stays inside the list cell (Android clips
  // offscreen cells to their bounds).
  rowWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: ROW_GAP },
  removeCell: { width: 40, alignItems: 'center', justifyContent: 'center' },
  // No fill and no clip: the cream shows round the bubble and its tail can hang below.
  swipe: { flex: 1 },
  // No elevation: a shadowed card on Android draws over what follows it (check-in lesson).
  bubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingTop: 14,
    paddingBottom: 16,
    paddingLeft: 14,
    paddingRight: 16,
    borderRadius: BUBBLE_RADIUS,
  },
  avatarRing: { padding: AVATAR_RING, borderRadius: AVATAR / 2 + AVATAR_RING, backgroundColor: RING },
  body: { flex: 1, minWidth: 0, gap: 3, paddingTop: 1 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  // The name shrinks first, so the level heart stays right after it.
  name: { flexShrink: 1, fontFamily: fonts.playful, fontSize: 16, lineHeight: 21 },
  level: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  levelDeep: { backgroundColor: 'rgba(255,255,255,0.25)' },
  levelText: { fontFamily: fonts.playfulBold, fontSize: 11, lineHeight: 14 },
  muted: { opacity: 0.75 },
  preview: { fontSize: 14, lineHeight: 19, letterSpacing: -0.1 },
  typing: { height: 19, justifyContent: 'center', paddingTop: 4 },
  end: { alignItems: 'flex-end', gap: 6, paddingTop: 2 },
  stamp: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  count: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontSize: 12, lineHeight: 15, fontWeight: '800' },
  tail: { position: 'absolute', bottom: -(TAIL_H - 1) },
  tailLeft: { left: 30 },
  tailRight: { right: 36 },
  actions: { flex: 1, flexDirection: 'row', borderRadius: BUBBLE_RADIUS, overflow: 'hidden' },
  actionsLeft: { marginRight: ACTION_GAP },
  actionsRight: { marginLeft: ACTION_GAP },
  action: { width: ACTION, alignItems: 'center', justifyContent: 'center' },
  actionInner: { alignItems: 'center', gap: 4 },
  actionText: { maxWidth: ACTION - 6, fontSize: 11, fontWeight: '700', color: WHITE },
  noResults: { paddingTop: space.xxl, paddingHorizontal: space.lg },
  caughtUp: {
    height: 120,
    marginHorizontal: space.lg,
    borderRadius: BUBBLE_RADIUS,
    backgroundColor: playful.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  caughtUpText: { fontFamily: fonts.playfulBold, fontSize: 15, color: playful.ink },
  // The pencil's sheet: three big coloured tiles.
  ways: { gap: 10 },
  way: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 22 },
  wayIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  wayIconDeep: { backgroundColor: 'rgba(255,255,255,0.14)' },
  wayText: { flex: 1, gap: 2 },
  wayTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wayTitle: { fontFamily: fonts.playful, fontSize: 17, lineHeight: 22 },
  wayHint: { fontSize: 13, lineHeight: 17 },
  live: { paddingHorizontal: 6, height: 18, borderRadius: 6, justifyContent: 'center', backgroundColor: playful.red },
  liveText: { fontSize: 11, lineHeight: 14, fontWeight: '800', color: WHITE, textTransform: 'uppercase' },
});
