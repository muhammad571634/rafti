import { Ionicons } from '@expo/vector-icons';
import { BlurTargetView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, useScrollToTop } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Platform, ScrollView, StyleSheet, View, type ViewInstance } from 'react-native';
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

import { ChatMenu, type ChatMenuTarget } from '@/components/chat/chat-menu';
import { SwipeRow, type SwipeRowMethods } from '@/components/chat/swipe-row';
import { GroupAvatar } from '@/components/group-avatar';
import { FriendFaces } from '@/components/friend-faces';
import { InkChip, InkText, listReorder, PillButton } from '@/components/ink';
import { CharacterAvatar, EmptyState, GlassButton, PressableScale, Screen, SearchBar, SFIcon, Sheet } from '@/components/ui';
import { useReorderOnly } from '@/hooks/use-reorder-only';
import { useTabBlurTarget } from '@/hooks/use-tab-blur-target';
import { chatDrafts } from '@/lib/chat-drafts';
import { forgetNotes } from '@/lib/voice-files';
import { relativeStamp, shortName } from '@/lib/format';
import { groupTitle } from '@/lib/group-chat';
import { haptic } from '@/lib/haptics';
import { currentMood, temperamentFor } from '@/lib/reply-engine/mood';
import { awakeAt } from '@/lib/today';
import { displayName, useAppStore } from '@/store/use-app-store';
import { friendAccent, isDark, palette, space, systemColors, TAB_BAR_HEIGHT } from '@/theme';
import { ink, inkRadius, inkTints } from '@/theme/ink';
import type { Character, Conversation, GroupChat } from '@/types';
import { confirmAlert as confirm } from '@/lib/alert';

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
const MENU_AVATAR = 36;
/** How many of the chat's last lines the long-press preview shows. */
const PREVIEW_LINES = 3;
const WHITE = '#FFFFFF';
const PINNED_BG = '#14141C';
/**
 * The unread dot in the brand's peach (owner, 2026-11-09: brand colour, not Messages' blue).
 */
const UNREAD = isDark ? palette.apricotCalm : palette.apricot600;

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

/** The handlers every row shares; stable, so a row re-renders only when its own chat changes. */
interface RowActions {
  open: (item: ChatItem) => void;
  openProfile: (item: ChatItem) => void;
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
 * Every chat and group as iOS Messages draws them, on Apple's white ground (owner's pick B,
 * 2026-11-09, docs/prototypes/chats-apple.html; before, coloured speech bubbles): Edit, search and
 * new chat on top; the big rounded title; All / Unread / Groups as pills; pinned chats as big faces;
 * then one row per chat with a hairline under its text and a brand-peach dot when unread. Search
 * opens from the magnifier in place of the title. A row swipes right to mark it read or pin it and
 * left to mute or delete it, one open at a time; a long press opens the same actions over a preview
 * of the chat; Edit shows a remove button by every row and an unpin badge on every pinned face.
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
  // Tapping this tab again while it is open scrolls back to the top, as on iOS (the tab bar emits
  // tabPress on the current tab too).
  const listRef = useRef<FlatList<ChatItem>>(null);
  useScrollToTop(listRef);
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
  // The friend you talked with last: "All caught up" offers their chat.
  const lastChat = useMemo(
    () =>
      items
        .filter((item): item is Extract<ChatItem, { kind: 'chat' }> => item.kind === 'chat')
        .sort((a, b) => Date.parse(b.conversation.lastMessageAt) - Date.parse(a.conversation.lastMessageAt))[0],
    [items],
  );

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
  const reorderOnly = useReorderOnly(rows.map((r) => r.id));

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
      openProfile: (item) => {
        if (openRow.current) return closeOpenRow();
        if (item.kind === 'chat') router.push(`/character/${item.character.id}`);
        else router.push({ pathname: '/group/[id]/info', params: { id: item.id } });
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

  const awake = awakeAt(new Date().getHours());
  const moodOf = (item: ChatItem): string | undefined => {
    if (item.kind !== 'chat') return undefined;
    const rel = relationships[item.character.id];
    const emotion = currentMood(rel?.mood, temperamentFor(item.character), Date.now()).emotion;
    return t(`chat.mood.${emotion}`);
  };

  const renderItem = useCallback(
    ({ item }: { item: ChatItem }) => (
      <ChatRow
        item={item}
        level={levelOf(item)}
        awake={awake}
        typing={isTyping(item)}
        editing={editing}
        actions={actions}
      />
    ),
    // `levelOf` and `isTyping` read these maps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [relationships, typing, groupTyping, awake, editing, actions],
  );

  return (
    <Screen background={ink.ground}>
      <BlurTargetView ref={blurTarget} style={styles.flex}>
        <View style={styles.topBar}>
          {items.length > 0 && !searching ? (
            <GlassButton label={editing ? t('common.done') : t('common.edit')} onPress={() => setEditing((v) => !v)} />
          ) : (
            <View />
          )}
          {searching ? null : (
            <View style={styles.topRight}>
              {items.length > 0 ? (
                <GlassButton
                  icon="search"
                  accessibilityLabel={t('common.search')}
                  onPress={() => {
                    setEditing(false);
                    setSearching(true);
                  }}
                />
              ) : null}
              <GlassButton icon="create-outline" accessibilityLabel={t('chatList.newChat')} onPress={() => setStarting(true)} />
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
            <PressableScale scaleTo={0.94} onPress={stopSearch} hitSlop={8} accessibilityRole="button">
              <InkText color={ink.accent}>{t('common.cancel')}</InkText>
            </PressableScale>
          </View>
        ) : (
          <InkText variant="display" style={styles.title}>
            {t('chatList.title')}
          </InkText>
        )}

        {items.length === 0 ? (
          // No chat yet: the faces of friends to meet stand there, not a symbol (owner, 2026-11-18).
          <EmptyState
            title={t('chatList.empty')}
            hint={t('chatList.emptyHint')}
            actionLabel={t('common.findSomeone')}
            onAction={() => router.push('/(tabs)/find')}
          />
        ) : (
          <>
            {searching ? null : <Filters value={filter} unread={unreadChats} onChange={setFilter} />}

            <Animated.FlatList
              ref={listRef}
              data={rows}
              // A chat lifted by a new line slides to the top (§8.2.3); filters and search swap at once.
              itemLayoutAnimation={reorderOnly && !searching ? listReorder : undefined}
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
                    <InkText variant="caption" color={ink.text3} accessibilityRole="header" style={styles.section}>
                      {t('chatList.pinned')}
                    </InkText>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.pinnedRow}
                      onScrollBeginDrag={closeOpenRow}>
                      {pinned.map((item) => (
                        <PinnedTile
                          key={item.id}
                          item={item}
                          awake={awake}
                          mood={moodOf(item)}
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
                  <View style={styles.noResults}>
                    <SFIcon ios="magnifyingglass" icon="search" size={44} color={ink.text3} />
                    <InkText variant="sub" center>
                      {t('chatList.noResults', { query: query.trim() })}
                    </InkText>
                  </View>
                ) : filter !== 'all' && !searching ? (
                  // Your friends' faces, one line and one way on (owner, 2026-11-18: no mascot, empty screens too).
                  <View style={styles.caughtUp}>
                    <FriendFaces size={56} />
                    <InkText variant="card" center>
                      {filter === 'unread' ? t('chatList.caughtUp') : t('chatList.noGroups')}
                    </InkText>
                    {filter === 'unread' && lastChat ? (
                      <PillButton
                        kind="accent"
                        size="md"
                        full={false}
                        icon="chatbubble"
                        label={t('diary.chatWith', { name: shortName(lastChat.name) })}
                        onPress={() => router.push(`/chat/${lastChat.id}`)}
                      />
                    ) : filter === 'groups' ? (
                      <PillButton kind="accent" size="md" full={false} icon="people" label={t('group.newGroup')} onPress={() => startWith('/group/new')} />
                    ) : null}
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
            icon={<SFIcon ios="person.fill" icon="person" size={22} color={ink.text} />}
            tint={inkTints[0][0]}
            title={t('group.newChat')}
            hint={t('group.newChatHint')}
            onPress={() => startWith('/(tabs)/find')}
          />
          <WayTile
            icon={<SFIcon ios="person.2.fill" icon="people" size={22} color={ink.text} />}
            tint={inkTints[1][0]}
            title={t('group.newGroup')}
            hint={friends < 2 ? t('group.needFriends') : t('group.newGroupHint')}
            disabled={friends < 2}
            onPress={() => startWith('/group/new')}
          />
          {/* Character.AI's Stream: two characters talk while you watch (flows.md D74). */}
          <WayTile
            icon={<SFIcon ios="play.rectangle.fill" icon="tv" size={22} color={ink.text} />}
            tint={inkTints[3][0]}
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

/** All / Unread / Groups as three Ink chips; Unread carries its count in a red capsule. */
function Filters({ value, unread, onChange }: { value: Filter; unread: number; onChange: (f: Filter) => void }) {
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
 * A pinned chat as a glowing night friend card (approved Ink+ prototype): soft friend-hue wash,
 * ringed avatar with live green dot & unread count badge, short name, and live mood or typing dots.
 */
function PinnedTile({
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
        <LinearGradient
          colors={[`${accent}34`, `${accent}00`]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.78 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
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
const ChatRow = memo(function ChatRow({
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
function WayTile({
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
  title: { marginTop: 2, marginHorizontal: space.lg },
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
    borderRadius: inkRadius.pill,
    paddingHorizontal: space.md,
    gap: 6,
  },
  filters: { marginTop: space.sm, marginHorizontal: space.lg, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  listTop: { paddingTop: space.md, paddingBottom: space.md },
  section: { marginHorizontal: space.lg, marginBottom: space.sm, textTransform: 'uppercase', letterSpacing: 0.6 },
  // Pinned chats: glowing night friend cards scrolling sideways cleanly.
  pinnedRow: { paddingHorizontal: space.lg, paddingTop: 2, gap: 10 },
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
  noResults: { paddingTop: space.xxl, paddingHorizontal: space.lg, alignItems: 'center', gap: space.md },
  caughtUp: {
    marginHorizontal: space.lg,
    paddingVertical: space.xxl,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
  },
  // The pencil's sheet: three tiles in deep Ink tints.
  ways: { gap: 10 },
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
