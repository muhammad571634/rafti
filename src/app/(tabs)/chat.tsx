import { Ionicons } from '@expo/vector-icons';
import { BlurTargetView } from 'expo-blur';
import { useRouter } from 'expo-router';
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
import { AuroraGlass, CharacterAvatar, EmptyState, PressableScale, Screen, SearchBar, SFIcon, Sheet, Txt } from '@/components/ui';
import { relativeStamp, shortName } from '@/lib/format';
import { groupTitle } from '@/lib/group-chat';
import { haptic } from '@/lib/haptics';
import { displayName, useAppStore } from '@/store/use-app-store';
import { aurora, colors, space, systemColors, TAB_BAR_HEIGHT } from '@/theme';
import type { Character, Conversation, GroupChat } from '@/types';

const AVATAR = 56;
const PINNED_AVATAR = 58;
const ROW = 84;
/** One swipe action: a round glyph with its label under it. */
const ACTION = 72;
const ACTION_DOT = 44;
/** The width under a row for this many actions, with the strip's 4 pt inset on each end. */
const actionsWidth = (count: number) => count * ACTION + 8;
const MENU_AVATAR = 36;
/** How many of the chat's last lines the long-press preview shows. */
const PREVIEW_LINES = 3;

type Filter = 'all' | 'unread' | 'groups';
const FILTERS: Filter[] = ['all', 'unread', 'groups'];
/** iOS Messages' swipe colours: indigo hides alerts, blue marks read, red deletes; Pin is the app's accent. */
const MUTE_FILL = systemColors.indigo;
const READ_FILL = systemColors.blue;

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
 * Every chat and group, iOS Messages style, on the aurora: Edit, search and new chat as glass
 * buttons; the large title with All / Unread / Groups right under it; pinned chats as one row of
 * small avatars; then the rest in one solid card. Search opens from the magnifier in place of the
 * title. A row swipes right to mark it read or pin it and left to mute or delete it (iOS Messages),
 * one row open at a time; a long press opens the same actions over a preview of the chat; Edit shows
 * a remove button on every row and an unpin badge on every pinned avatar.
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
  /** The chat a long press opened the menu for. */
  const [held, setHeld] = useState<ChatItem | null>(null);
  const blurTarget = useRef<ViewInstance>(null);

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
  // Searching or filtering, pinned chats are rows like the rest; otherwise they sit on top as avatars.
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
        () => (item.kind === 'chat' ? deleteChat(item.id) : deleteGroup(item.id)),
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
        first={index === 0}
        last={index === rows.length - 1}
        level={levelOf(item)}
        typing={isTyping(item)}
        editing={editing}
        actions={actions}
      />
    ),
    // `levelOf` and `isTyping` read these maps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows.length, relationships, typing, groupTyping, editing, actions],
  );

  return (
    <Screen background="aurora">
      <BlurTargetView ref={blurTarget} style={styles.flex}>
        <View style={styles.topBar}>
          {items.length > 0 && !searching ? (
            <PressableScale scaleTo={0.92} onPress={() => setEditing((v) => !v)} accessibilityRole="button">
              <AuroraGlass style={styles.editButton}>
                <Txt style={[styles.editText, editing && styles.editTextOn]} maxFontSizeMultiplier={1.3}>
                  {editing ? t('common.done') : t('common.edit')}
                </Txt>
              </AuroraGlass>
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
                  accessibilityLabel={t('common.search')}>
                  <AuroraGlass style={styles.roundButton}>
                    <Ionicons name="search" size={19} color={colors.text} />
                  </AuroraGlass>
                </PressableScale>
              ) : null}
              <PressableScale
                scaleTo={0.88}
                onPress={() => setStarting(true)}
                accessibilityRole="button"
                accessibilityLabel={t('chatList.newChat')}>
                <AuroraGlass style={styles.roundButton}>
                  <Svg
                    width={20}
                    height={20}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={colors.text}
                    strokeWidth={1.9}
                    strokeLinecap="round"
                    strokeLinejoin="round">
                    <Path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
                    <Path d="M17.5 3.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />
                  </Svg>
                </AuroraGlass>
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
              tone="aurora"
              autoFocus
              style={styles.search}
            />
            <Pressable onPress={stopSearch} hitSlop={8} accessibilityRole="button">
              <Txt style={styles.cancel}>{t('common.cancel')}</Txt>
            </Pressable>
          </View>
        ) : (
          <Txt accessibilityRole="header" style={styles.title}>
            {t('chatList.title')}
          </Txt>
        )}

        {items.length === 0 ? (
          <EmptyState
            symbol={{ ios: 'bubble.left.and.bubble.right.fill', icon: 'chatbubbles' }}
            title={t('chatList.empty')}
            hint={t('chatList.emptyHint')}
            actionLabel={t('find.title')}
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
                ) : (
                  <View />
                )
              }
              ListHeaderComponentStyle={styles.listTop}
              ListEmptyComponent={
                needle ? (
                  <Txt variant="small" color={aurora.textMuted} center style={styles.noResults}>
                    {t('chatList.noResults', { query: query.trim() })}
                  </Txt>
                ) : filter !== 'all' && !searching ? (
                  <View style={styles.caughtUp}>
                    <Ionicons name={filter === 'unread' ? 'checkmark' : 'people-outline'} size={28} color={aurora.textMuted} />
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

      {/* The pencil: a new chat in Find, a group of 2-3 friends or a stream; an iOS sheet with the
          choices in one grey group, each with a system-colour icon. */}
      <Sheet visible={starting} onClose={() => setStarting(false)} title={t('chatList.newTitle')}>
        <View style={styles.ways}>
          <WayRow
            icon={<SFIcon ios="person.fill" icon="person" size={18} color={colors.white} />}
            fill={colors.primary}
            title={t('group.newChat')}
            hint={t('group.newChatHint')}
            onPress={() => startWith('/(tabs)/find')}
          />
          <WayRow
            icon={<SFIcon ios="person.2.fill" icon="people" size={18} color={colors.white} />}
            fill={GROUP_FILL}
            title={t('group.newGroup')}
            hint={friends < 2 ? t('group.needFriends') : t('group.newGroupHint')}
            disabled={friends < 2}
            onPress={() => startWith('/group/new')}
          />
          {/* Character.AI's Stream: two characters talk while you watch (flows.md D74). */}
          <WayRow
            icon={<SFIcon ios="play.rectangle.fill" icon="tv" size={18} color={colors.white} />}
            fill={STREAM_FILL}
            title={t('streams.title')}
            hint={t('streams.sheetHint')}
            onPress={() => startWith('/streams')}
            last
          />
        </View>
      </Sheet>
    </Screen>
  );
}

/** All / Unread / Groups in one glass track; Unread carries its count while another filter is on. */
function Filters({ value, unread, onChange }: { value: Filter; unread: number; onChange: (f: Filter) => void }) {
  const { t } = useTranslation();
  return (
    <AuroraGlass style={styles.filters}>
      <View style={styles.filtersRow} accessibilityRole="tablist" accessibilityLabel={t('chatList.show')}>
        {FILTERS.map((f) => {
          const on = f === value;
          const count = f === 'unread' && !on ? unread : 0;
          return (
            <PressableScale
              key={f}
              scaleTo={0.97}
              dimOnPress={false}
              onPress={() => onChange(f)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              aria-selected={on}
              style={[styles.filter, on && styles.filterOn]}>
              <Txt style={[styles.filterText, on && styles.filterTextOn]} maxFontSizeMultiplier={1.3}>
                {t(`chatList.${f}`)}
              </Txt>
              {count > 0 ? (
                <View style={styles.filterCount}>
                  <Txt style={styles.filterCountText}>{count > 99 ? '99+' : count}</Txt>
                </View>
              ) : null}
            </PressableScale>
          );
        })}
      </View>
    </AuroraGlass>
  );
}

/** Three dots that rise in turn while a friend writes; still under Reduce Motion. */
function TypingDots() {
  return (
    <View style={styles.dots}>
      {[0, 1, 2].map((i) => (
        <Dot key={i} delay={i * 200} />
      ))}
    </View>
  );
}

function Dot({ delay }: { delay: number }) {
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
  const style = useAnimatedStyle(() => ({ opacity: 0.35 + p.value * 0.65, transform: [{ translateY: -2 * p.value }] }));
  return <Animated.View style={[styles.dot, style]} />;
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

/** A pinned chat in the row on top: a small ringed avatar and its name; dots or a dot when there is news. */
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
        <View style={styles.ring}>
          {item.kind === 'chat' ? (
            <CharacterAvatar character={item.character} size={PINNED_AVATAR} />
          ) : (
            <GroupAvatar members={item.members} size={PINNED_AVATAR} />
          )}
          {typing ? (
            <View style={styles.pinnedTyping} pointerEvents="none">
              <TypingDots />
            </View>
          ) : unread ? (
            <View style={styles.pinnedDot} pointerEvents="none" />
          ) : null}
        </View>
        <Txt style={[styles.pinnedNameText, unread && styles.pinnedNameUnread]} lines={1}>
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
          <Ionicons name="remove" size={14} color={colors.text} />
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
  ink: string;
  onPress: () => void;
}

/**
 * The actions behind a row: round glyphs with a label under them, on the card's own colour. They
 * grow in as the row slides (`progress`), so the reveal follows the finger.
 */
function SwipeActions({ actions, progress }: { actions: SwipeActionSpec[]; progress: SharedValue<number> }) {
  return (
    <View style={styles.actions}>
      {actions.map((action) => (
        <SwipeAction key={action.key} action={action} progress={progress} />
      ))}
    </View>
  );
}

function SwipeAction({ action, progress }: { action: SwipeActionSpec; progress: SharedValue<number> }) {
  const grow = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0, 0.6, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.55, 1], Extrapolation.CLAMP) }],
  }));
  return (
    <Pressable onPress={action.onPress} accessibilityRole="button" accessibilityLabel={action.label} style={styles.action}>
      <Animated.View style={[styles.actionInner, grow]}>
        <View style={[styles.actionDot, { backgroundColor: action.fill }]}>
          <Ionicons name={action.icon} size={21} color={action.ink} />
        </View>
        <Txt style={styles.actionText} lines={1} maxFontSizeMultiplier={1.2}>
          {action.label}
        </Txt>
      </Animated.View>
    </Pressable>
  );
}

/**
 * One chat or group in the list card: swipe right to mark it read or pin it, left to mute or delete
 * it (iOS Messages), hold for the menu; in Edit mode a remove button leads. Memoised: a row redraws
 * only when its own chat, typing or level changes.
 */
const ChatRow = memo(function ChatRow({
  item,
  first,
  last,
  level,
  typing,
  editing,
  actions,
}: {
  item: ChatItem;
  first: boolean;
  last: boolean;
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
    { key: 'read', label: readLabel, icon: unread ? 'mail-open' : 'mail-unread', fill: READ_FILL, ink: colors.white, onPress: act(actions.read) },
    ...(canPin
      ? [{ key: 'pin', label: pinLabel, icon: 'pin' as const, fill: colors.primaryFill, ink: colors.textOnPrimary, onPress: act(actions.pin) }]
      : []),
  ];
  const trailing: SwipeActionSpec[] = [
    {
      key: 'mute',
      label: muteLabel,
      icon: row.muted ? 'notifications' : 'notifications-off',
      fill: MUTE_FILL,
      ink: colors.white,
      onPress: act(actions.mute),
    },
    { key: 'delete', label: t('common.delete'), icon: 'trash', fill: colors.danger, ink: colors.white, onPress: act(actions.remove) },
  ];

  return (
    <SwipeRow
      ref={swipe}
      enabled={!editing}
      leftWidth={actionsWidth(leading.length)}
      rightWidth={actionsWidth(trailing.length)}
      // The list is one rounded card: the first and last rows carry its corners.
      style={[styles.cardRow, first && styles.cardTop, last && styles.cardBottom]}
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
      renderLeft={(progress) => <SwipeActions actions={leading} progress={progress} />}
      renderRight={(progress) => <SwipeActions actions={trailing} progress={progress} />}>
      <View style={styles.row}>
        {/* Beside the row's button, not inside it: a button cannot hold another one. */}
        {editing ? (
          <Pressable
            onPress={() => actions.remove(item)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${t('common.delete')}, ${item.name}`}
            style={styles.removeCell}>
            <Ionicons name="remove-circle" size={24} color={colors.danger} />
          </Pressable>
        ) : null}
        <PressableScale
          scaleTo={0.985}
          style={styles.rowMain}
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
          {editing ? null : <View style={styles.dotCell}>{unread ? <View style={styles.unreadDot} /> : null}</View>}

          {item.kind === 'chat' ? (
            <CharacterAvatar character={item.character} size={AVATAR} />
          ) : (
            <GroupAvatar members={item.members} size={AVATAR} />
          )}

          <View style={[styles.body, !last && styles.separator]}>
            <View style={styles.line}>
              <Txt style={[styles.name, unread && styles.nameUnread]} lines={1}>
                {item.name}
              </Txt>
              {level != null ? (
                <View style={styles.level}>
                  <Ionicons name="heart" size={12} color={colors.bondText} />
                  <Txt style={styles.levelText}>{level}</Txt>
                </View>
              ) : null}
              <View style={styles.meta}>
                {row.muted ? <Ionicons name="notifications-off" size={13} color={aurora.textMuted} /> : null}
                <Txt style={[styles.stamp, unread && styles.stampUnread]}>{relativeStamp(row.lastMessageAt)}</Txt>
                <Ionicons name="chevron-forward" size={14} color={colors.textFaint} />
              </View>
            </View>
            {typing ? (
              <Txt style={styles.typing} lines={1}>
                {t('chatList.typing')}
              </Txt>
            ) : row.lastMessagePreview ? (
              <Txt style={styles.preview} lines={2}>
                {row.lastMessagePreview}
              </Txt>
            ) : null}
          </View>
        </PressableScale>
      </View>
    </SwipeRow>
  );
});

/** iOS indigo: groups, as the system colours a "people" action. */
const GROUP_FILL = systemColors.indigo;
/** iOS purple: streams, something to watch (as Shell history marks them). */
const STREAM_FILL = systemColors.purple;

/** One choice in the pencil's sheet: a coloured icon, the action, a short line, a chevron. */
function WayRow({
  icon,
  fill,
  title,
  hint,
  disabled,
  last,
  onPress,
}: {
  icon: React.ReactNode;
  fill: string;
  title: string;
  hint: string;
  disabled?: boolean;
  last?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityLabel={`${title}, ${hint}`}
      style={({ pressed }) => [styles.way, pressed && styles.wayPressed, disabled && styles.wayOff]}>
      <View style={[styles.wayIcon, { backgroundColor: fill }]}>{icon}</View>
      <View style={[styles.wayBody, !last && styles.wayLine]}>
        <View style={styles.wayText}>
          <Txt style={styles.wayTitle}>{title}</Txt>
          <Txt style={styles.wayHint}>{hint}</Txt>
        </View>
        <Ionicons name="chevron-forward" size={15} color={colors.textFaint} />
      </View>
    </Pressable>
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
  editButton: {
    height: 40,
    paddingHorizontal: space.lg,
    borderRadius: 20,
    justifyContent: 'center',
  },
  editText: {
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.4,
    color: colors.text,
  },
  editTextOn: { fontWeight: '700' },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 2,
    marginHorizontal: space.lg,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.text,
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
    height: 40,
    borderRadius: 20,
    paddingHorizontal: space.md,
    gap: 6,
  },
  cancel: { fontSize: 17, letterSpacing: -0.4, color: colors.primary },
  filters: { height: 36, marginTop: space.sm, marginHorizontal: space.lg, borderRadius: 18, padding: 3 },
  filtersRow: { flex: 1, flexDirection: 'row' },
  filter: { flex: 1, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  filterOn: {
    backgroundColor: aurora.glassOn,
    shadowColor: colors.black,
    shadowOpacity: 0.12,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  filterText: { fontSize: 14, fontWeight: '500', color: colors.text },
  filterTextOn: { fontWeight: '700' },
  filterCount: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: aurora.tint,
  },
  filterCountText: { fontSize: 11, fontWeight: '700', color: colors.white },
  listTop: { paddingTop: space.md, paddingBottom: space.md },
  // Pinned chats: one row of small avatars that scrolls sideways when there are many.
  pinnedRow: { paddingHorizontal: space.lg, gap: space.md },
  pinnedCell: { width: PINNED_AVATAR + 14, alignItems: 'center' },
  pinnedTile: { alignItems: 'center', gap: 5 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: aurora.textMuted },
  // The light ring round a pinned avatar, with a soft shadow under it.
  ring: {
    padding: 2,
    borderRadius: PINNED_AVATAR / 2 + 2,
    backgroundColor: aurora.ring,
    shadowColor: aurora.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  pinnedTyping: {
    position: 'absolute',
    right: -6,
    top: -4,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    justifyContent: 'center',
    backgroundColor: aurora.bubble,
  },
  pinnedDot: {
    position: 'absolute',
    right: 1,
    top: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: aurora.ring,
    backgroundColor: aurora.tint,
  },
  pinnedNameText: {
    maxWidth: PINNED_AVATAR + 14,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: -0.1,
    color: colors.text,
  },
  pinnedNameUnread: { fontWeight: '700' },
  unpinBadge: {
    position: 'absolute',
    top: -2,
    left: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: aurora.card,
  },
  // Solid, so the swipe actions behind a row never show through it.
  cardRow: { marginHorizontal: space.lg, backgroundColor: aurora.card, overflow: 'hidden' },
  cardTop: { borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  cardBottom: { borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  // At least ROW tall: with large text the row grows instead of clipping its lines.
  row: {
    minHeight: ROW,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: aurora.card,
  },
  rowMain: {
    flex: 1,
    minHeight: ROW,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 14,
  },
  dotCell: {
    width: 20,
    height: ROW,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: aurora.tint,
  },
  removeCell: {
    width: 44,
    height: ROW,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
    minHeight: ROW,
    marginLeft: 12,
    paddingVertical: 12,
    justifyContent: 'center',
    gap: 3,
  },
  separator: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: aurora.separator,
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  // The name shrinks first, so the level heart stays right after it and the time at the end.
  name: {
    flexShrink: 1,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: colors.text,
  },
  nameUnread: { fontWeight: '700' },
  meta: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  level: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  levelText: { fontSize: 12, fontWeight: '600', color: colors.bondText },
  stamp: { fontSize: 14, letterSpacing: -0.2, color: aurora.textMuted },
  stampUnread: { color: aurora.tint, fontWeight: '600' },
  preview: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.2,
    color: aurora.textMuted,
  },
  typing: { fontSize: 15, lineHeight: 20, fontWeight: '500', color: aurora.tint },
  actions: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, backgroundColor: aurora.card },
  action: { width: ACTION, height: ROW, alignItems: 'center', justifyContent: 'center' },
  actionInner: { alignItems: 'center', gap: 5 },
  actionDot: {
    width: ACTION_DOT,
    height: ACTION_DOT,
    borderRadius: ACTION_DOT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { maxWidth: ACTION - 4, fontSize: 11, fontWeight: '600', color: aurora.textMuted },
  noResults: { paddingTop: space.xxl, paddingHorizontal: space.lg },
  caughtUp: {
    height: 120,
    marginHorizontal: space.lg,
    borderRadius: 22,
    backgroundColor: aurora.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  caughtUpText: { fontSize: 15, color: aurora.textMuted },
  // iOS sheet choices: one grey group, hairlines between rows.
  ways: { borderRadius: 14, backgroundColor: colors.bg, overflow: 'hidden' },
  way: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.lg },
  wayPressed: { backgroundColor: colors.surfaceAlt },
  wayOff: { opacity: 0.45 },
  wayIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  wayBody: { flex: 1, minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingRight: space.lg },
  wayLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  wayText: { flex: 1, gap: 1 },
  wayTitle: { fontSize: 17, letterSpacing: -0.4 },
  wayHint: { fontSize: 13, color: colors.textSecondary },
});
