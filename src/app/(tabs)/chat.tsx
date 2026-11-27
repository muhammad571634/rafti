import { BlurTargetView } from 'expo-blur';
import { useLocalSearchParams, useRouter, useScrollToTop } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Platform, ScrollView, StyleSheet, View, type ViewInstance } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatMenu, type ChatMenuTarget } from '@/components/chat/chat-menu';
import { type SwipeRowMethods } from '@/components/chat/swipe-row';
import { GroupAvatar } from '@/components/group-avatar';
import { FriendFaces } from '@/components/friend-faces';
import { InkText, listReorder, PillButton } from '@/components/ink';
import { CharacterAvatar, EmptyState, GlassButton, PressableScale, Screen, SearchBar, SFIcon, Sheet } from '@/components/ui';
import { useReorderOnly } from '@/hooks/use-reorder-only';
import { useTabBlurTarget } from '@/hooks/use-tab-blur-target';
import { chatDrafts } from '@/lib/chat-drafts';
import { forgetNotes } from '@/lib/voice-files';
import { shortName } from '@/lib/format';
import { groupTitle } from '@/lib/group-chat';
import { haptic } from '@/lib/haptics';
import { currentMood, temperamentFor } from '@/lib/reply-engine/mood';
import { awakeAt } from '@/lib/today';
import { displayName, useAppStore } from '@/store/use-app-store';
import { space, TAB_BAR_HEIGHT } from '@/theme';
import { ink, inkRadius, inkTints } from '@/theme/ink';
import { confirmAlert as confirm } from '@/lib/alert';
import { ChatRow, Filters, PinnedTile, WayTile } from '@/components/chat/list/rows';
import { type ChatItem, type Filter, FILTERS, isPinned, isUnread, rowOf, type RowActions } from '@/components/chat/list/types';

const MENU_AVATAR = 36;
/** How many of the chat's last lines the long-press preview shows. */
const PREVIEW_LINES = 3;

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
  listTop: { paddingTop: space.md, paddingBottom: space.md },
  section: { marginHorizontal: space.lg, marginBottom: space.sm, textTransform: 'uppercase', letterSpacing: 0.6 },
  pinnedRow: { paddingHorizontal: space.lg, paddingTop: 2, gap: 10 },
  noResults: { paddingTop: space.xxl, paddingHorizontal: space.lg, alignItems: 'center', gap: space.md },
  caughtUp: {
    marginHorizontal: space.lg,
    paddingVertical: space.xxl,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
  },
  ways: { gap: 10 },
});
