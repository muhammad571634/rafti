import { Ionicons } from '@expo/vector-icons';
import { BlurTargetView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { ChatMenu, type ChatMenuTarget } from '@/components/chat/chat-menu';
import { GroupAvatar } from '@/components/group-avatar';
import { AuroraGlass, CharacterAvatar, EmptyState, PressableScale, Screen, SearchBar, SFIcon, Sheet, Txt } from '@/components/ui';
import { relativeStamp, shortName } from '@/lib/format';
import { groupTitle } from '@/lib/group-chat';
import { displayName, useAppStore } from '@/store/use-app-store';
import { aurora, colors, space, TAB_BAR_HEIGHT } from '@/theme';
import type { Character, Conversation, GroupChat } from '@/types';

const AVATAR = 52;
const PINNED_AVATAR = 76;
const ROW = 76;
const ACTION = 66;
const MENU_AVATAR = 36;
/** How many of the chat's last lines the long-press preview shows. */
const PREVIEW_LINES = 3;

type Filter = 'all' | 'unread' | 'groups';
const FILTERS: Filter[] = ['all', 'unread', 'groups'];
/** iOS indigo: the Mute swipe action, as in the approved prototype. */
const MUTE_FILL = '#5856D6';

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

/**
 * Every chat and group, iOS Messages style, on the aurora (canvas "Chats 2", 2026-10-21): Edit, a
 * new-chat button, the search field and the All / Unread / Groups filter in glass over the aurora,
 * pinned chats as big ringed avatars (a typing bubble while the friend writes), then the rest as
 * rows in one solid card. A row swipes left to Mute, Pin and Delete; a long press opens the same
 * actions over a preview of the chat; Edit shows a remove button on every row and an unpin badge
 * on every pinned avatar.
 */
export default function ChatListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  // The tab bar grows by the phone's bottom inset (home indicator, navigation bar).
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  /** The chat a long press opened the menu for. */
  const [held, setHeld] = useState<ChatItem | null>(null);
  const blurTarget = useRef<View>(null);

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
  const messages = useAppStore((s) => s.messages);
  const isTyping = (item: ChatItem) =>
    item.kind === 'chat' ? !!typing[item.id] : (groupTyping[item.id]?.length ?? 0) > 0;
  // The mint level heart, from level 1 (the same rule as the Today chat rows).
  const levelOf = (characterId: string) => {
    const level = relationships[characterId]?.level ?? 0;
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
  const grid = !needle && filter === 'all';
  const pinned = useMemo(() => (grid ? items.filter(isPinned) : []), [items, grid]);
  const rows = useMemo(() => {
    const shown =
      filter === 'unread'
        ? items.filter(isUnread)
        : filter === 'groups'
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
  }, [items, needle, filter, grid]);

  /** The pin, mute and unread marks are icons only, so the row's label spells them out. */
  const rowLabel = (item: ChatItem) => {
    const row = rowOf(item);
    const level = item.kind === 'chat' ? levelOf(item.character.id) : null;
    const name = item.kind === 'group' ? t('group.rowLabel', { name: item.name }) : item.name;
    return [
      row.unreadCount > 0 ? t('a11y.unreadTab', { label: name, count: row.unreadCount }) : name,
      level != null ? t('home.bondLevel', { level }) : null,
      isPinned(item) ? t('chatList.pinned') : null,
      row.muted ? t('chatList.muted') : null,
      relativeStamp(row.lastMessageAt),
      row.lastMessagePreview,
    ]
      .filter(Boolean)
      .join(', ');
  };

  const open = (item: ChatItem) =>
    item.kind === 'chat'
      ? router.push(`/chat/${item.id}`)
      : router.push({ pathname: '/group/[id]', params: { id: item.id } });

  const toggleMute = (item: ChatItem) =>
    item.kind === 'chat' ? setChatMuted(item.id, !item.conversation.muted) : setGroupMuted(item.id, !item.group.muted);

  const togglePin = (item: ChatItem) => {
    if (item.kind === 'chat') setChatPinned(item.id, !item.conversation.pinned);
  };

  const remove = (item: ChatItem) =>
    confirm(
      t('chatList.deleteTitle'),
      item.kind === 'chat' ? t('chatList.deleteBody', { name: item.name }) : t('chatList.deleteGroupBody'),
      t('common.delete'),
      () => (item.kind === 'chat' ? deleteChat(item.id) : deleteGroup(item.id)),
      t('common.cancel'),
    );

  const hold = (item: ChatItem) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setHeld(item);
  };
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
  const heldLines = held ? (messages[held.id] ?? []).filter((m) => m.kind !== 'system').slice(-PREVIEW_LINES) : [];

  const startWith = (route: '/(tabs)/find' | '/group/new') => {
    setStarting(false);
    router.push(route);
  };

  return (
    <Screen background="aurora">
      <BlurTargetView ref={blurTarget} style={styles.flex}>
        <View style={styles.topBar}>
          {items.length > 0 ? (
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
          <PressableScale
            scaleTo={0.88}
            onPress={() => setStarting(true)}
            accessibilityRole="button"
            accessibilityLabel={t('chatList.newChat')}>
            <AuroraGlass style={styles.composeButton}>
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

        <Txt accessibilityRole="header" style={styles.title}>
          {t('chatList.title')}
        </Txt>

        {items.length === 0 ? (
          <EmptyState
            icon="bubbles"
            title={t('chatList.empty')}
            hint={t('chatList.emptyHint')}
            actionLabel={t('find.title')}
            onAction={() => router.push('/(tabs)/find')}
          />
        ) : (
          <>
            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder={t('common.search')}
              tone="aurora"
              style={styles.search}
            />
            <Filters value={filter} unread={unreadChats} onChange={setFilter} />

            <FlatList
              data={rows}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingBottom: TAB_BAR_HEIGHT + insets.bottom + space.xxl,
              }}
              ListHeaderComponent={
                pinned.length > 0 ? (
                  <View style={styles.pinnedGrid}>
                    {pinned.map((item) => (
                      <PinnedTile
                        key={item.id}
                        item={item}
                        label={rowLabel(item)}
                        typing={isTyping(item)}
                        editing={editing}
                        onPress={() => open(item)}
                        onLongPress={() => hold(item)}
                        onUnpin={() => togglePin(item)}
                      />
                    ))}
                  </View>
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
                ) : filter !== 'all' ? (
                  <View style={styles.caughtUp}>
                    <Ionicons name={filter === 'unread' ? 'checkmark' : 'people-outline'} size={28} color={aurora.textMuted} />
                    <Txt style={styles.caughtUpText}>
                      {filter === 'unread' ? t('chatList.caughtUp') : t('chatList.noGroups')}
                    </Txt>
                  </View>
                ) : null
              }
              renderItem={({ item, index }) => (
                <ChatRow
                  item={item}
                  first={index === 0}
                  last={index === rows.length - 1}
                  level={item.kind === 'chat' ? levelOf(item.character.id) : null}
                  label={rowLabel(item)}
                  typing={isTyping(item)}
                  editing={editing}
                  onPress={() => open(item)}
                  onLongPress={() => hold(item)}
                  onMute={() => toggleMute(item)}
                  onPin={() => togglePin(item)}
                  onDelete={() => remove(item)}
                />
              )}
            />
          </>
        )}
      </BlurTargetView>

      <ChatMenu
        target={menuTarget}
        messages={heldLines}
        blurTarget={blurTarget}
        onClose={() => setHeld(null)}
        onPin={() => held && togglePin(held)}
        onToggleRead={() => held && (isUnread(held) ? markRead(held.id) : markUnread(held.id))}
        onMute={() => held && toggleMute(held)}
        onDelete={() => held && remove(held)}
      />

      {/* The pencil: a new chat in Find, or a group of 2-3 friends; an iOS sheet with the
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

/** A pinned chat: a big ringed avatar, its name, and a bubble with the dots or the unread line. */
function PinnedTile({
  item,
  label,
  typing,
  editing,
  onPress,
  onLongPress,
  onUnpin,
}: {
  item: ChatItem;
  label: string;
  typing: boolean;
  editing: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onUnpin: () => void;
}) {
  const { t } = useTranslation();
  const row = rowOf(item);
  const unread = row.unreadCount > 0;
  return (
    <View style={styles.pinnedCell}>
      <PressableScale
        scaleTo={0.94}
        onPress={onPress}
        onLongPress={editing ? undefined : onLongPress}
        delayLongPress={350}
        accessibilityRole="button"
        accessibilityLabel={typing ? `${label}, ${t('chatList.typing')}` : label}
        style={styles.pinnedTile}>
        {typing || (unread && row.lastMessagePreview) ? (
          <View style={styles.bubbleWrap} pointerEvents="none">
            <View style={[styles.bubble, typing && styles.bubbleTyping]}>
              {typing ? (
                <TypingDots />
              ) : (
                <Txt style={styles.bubbleText} lines={1}>
                  {row.lastMessagePreview}
                </Txt>
              )}
            </View>
          </View>
        ) : null}
        <View style={styles.ring}>
          {item.kind === 'chat' ? (
            <CharacterAvatar character={item.character} size={PINNED_AVATAR} />
          ) : (
            <GroupAvatar members={item.members} size={PINNED_AVATAR} />
          )}
        </View>
        <View style={styles.pinnedName}>
          {unread ? <View style={styles.pinnedDot} /> : null}
          <Txt style={styles.pinnedNameText} lines={1}>
            {item.kind === 'chat' ? shortName(item.name) : item.name}
          </Txt>
        </View>
      </PressableScale>
      {editing ? (
        <Pressable
          onPress={onUnpin}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${t('chatList.unpin')}, ${item.name}`}
          style={styles.unpinBadge}>
          <Ionicons name="remove" size={16} color={colors.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** One chat or group in the list card: swipe left for Mute, Pin and Delete, hold for the menu; in Edit mode a remove button leads. */
function ChatRow({
  item,
  first,
  last,
  level,
  label,
  typing,
  editing,
  onPress,
  onLongPress,
  onMute,
  onPin,
  onDelete,
}: {
  item: ChatItem;
  first: boolean;
  last: boolean;
  level: number | null;
  label: string;
  typing: boolean;
  editing: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onMute: () => void;
  onPin: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const swipe = useRef<SwipeableMethods>(null);
  const row = rowOf(item);
  const unread = row.unreadCount > 0;
  const canPin = item.kind === 'chat';
  const pinLabel = isPinned(item) ? t('chatList.unpin') : t('chatList.pin');
  const muteLabel = row.muted ? t('chatList.unmute') : t('chatList.mute');

  // Entering Edit mode closes a row left open by a swipe.
  useEffect(() => {
    if (editing) swipe.current?.close();
  }, [editing]);

  const act = (run: () => void) => () => {
    swipe.current?.close();
    run();
  };

  // A tap on an open row (or the release that ends a drag) closes it instead of opening the chat.
  const opened = useRef(false);
  const draggedAt = useRef(0);
  const press = () => {
    if (Date.now() - draggedAt.current < 400) return;
    if (opened.current) swipe.current?.close();
    else onPress();
  };

  // Swipe actions cannot be reached with a screen reader, so the row offers them too.
  const a11yActions = [
    { name: 'mute', label: muteLabel },
    ...(canPin ? [{ name: 'pin', label: pinLabel }] : []),
    { name: 'delete', label: t('common.delete') },
  ];

  return (
    <ReanimatedSwipeable
      ref={swipe}
      enabled={!editing}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      // The list is one rounded card: the first and last rows carry its corners.
      containerStyle={[styles.cardRow, first && styles.cardTop, last && styles.cardBottom]}
      // Both fire on release, just before the click a mouse drag ends with on web.
      onSwipeableWillOpen={() => {
        opened.current = true;
        draggedAt.current = Date.now();
      }}
      onSwipeableWillClose={() => {
        opened.current = false;
        draggedAt.current = Date.now();
      }}
      renderRightActions={() => (
        <View style={styles.actions}>
          <SwipeAction label={muteLabel} fill={MUTE_FILL} ink={colors.white} onPress={act(onMute)}>
            <Ionicons
              name={row.muted ? 'notifications-outline' : 'notifications-off-outline'}
              size={20}
              color={colors.white}
            />
          </SwipeAction>
          {canPin ? (
            <SwipeAction label={pinLabel} fill={colors.primaryFill} ink={colors.textOnPrimary} onPress={act(onPin)}>
              <Ionicons name="pin-outline" size={20} color={colors.textOnPrimary} />
            </SwipeAction>
          ) : null}
          <SwipeAction label={t('common.delete')} fill={colors.danger} ink={colors.white} onPress={act(onDelete)}>
            <Ionicons name="trash-outline" size={20} color={colors.white} />
          </SwipeAction>
        </View>
      )}>
      <View style={styles.row}>
        {/* Beside the row's button, not inside it: a button cannot hold another one. */}
        {editing ? (
          <Pressable
            onPress={onDelete}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${t('common.delete')}, ${item.name}`}
            style={styles.removeCell}>
            <Ionicons name="remove-circle" size={24} color={colors.danger} />
          </Pressable>
        ) : null}
        <PressableScale
          scaleTo={0.98}
          style={styles.rowMain}
          onPress={press}
          onLongPress={editing ? undefined : onLongPress}
          delayLongPress={350}
          accessibilityRole="button"
          accessibilityLabel={typing ? `${label}, ${t('chatList.typing')}` : label}
          accessibilityActions={a11yActions}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === 'mute') onMute();
            else if (e.nativeEvent.actionName === 'pin') onPin();
            else if (e.nativeEvent.actionName === 'delete') onDelete();
          }}>
          {editing ? null : <View style={styles.dotCell}>{unread ? <View style={styles.unreadDot} /> : null}</View>}

          {item.kind === 'chat' ? (
            <CharacterAvatar character={item.character} size={AVATAR} />
          ) : (
            <GroupAvatar members={item.members} size={AVATAR} />
          )}

          <View style={[styles.body, !last && styles.separator]}>
            <View style={styles.line}>
              <Txt style={styles.name} lines={1}>
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
                <Txt style={styles.stamp}>{relativeStamp(row.lastMessageAt)}</Txt>
                <Ionicons name="chevron-forward" size={14} color={colors.textFaint} />
              </View>
            </View>
            {typing ? (
              <Txt style={styles.typing} lines={1}>
                {t('chatList.typing')}
              </Txt>
            ) : (
              <Txt style={styles.preview} lines={2}>
                {row.lastMessagePreview}
              </Txt>
            )}
          </View>
        </PressableScale>
      </View>
    </ReanimatedSwipeable>
  );
}

function SwipeAction({
  label,
  fill,
  ink,
  onPress,
  children,
}: {
  label: string;
  fill: string;
  ink: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.action, { backgroundColor: fill }]}>
      {children}
      <Txt style={[styles.actionText, { color: ink }]}>{label}</Txt>
    </Pressable>
  );
}

/** iOS indigo: groups, as the system colours a "people" action. */
const GROUP_FILL = '#5856D6';

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
  composeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 6,
    marginHorizontal: space.lg,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.text,
  },
  search: {
    height: 40,
    borderRadius: 20,
    marginTop: 10,
    marginHorizontal: space.lg,
    paddingHorizontal: space.md,
    gap: 6,
  },
  filters: { height: 36, marginTop: space.md, marginHorizontal: space.lg, borderRadius: 18, padding: 3 },
  filtersRow: { flex: 1, flexDirection: 'row' },
  filter: { flex: 1, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  filterOn: {
    backgroundColor: aurora.glassOn,
    shadowColor: '#000000',
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
  filterCountText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  listTop: { paddingBottom: space.lg },
  // Room above the avatars for the unread bubble.
  pinnedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 40,
    paddingTop: 40,
    paddingBottom: 6,
    paddingHorizontal: space.lg,
  },
  pinnedCell: { width: '33.333%', alignItems: 'center' },
  pinnedTile: { alignItems: 'center', gap: 6 },
  bubbleWrap: {
    position: 'absolute',
    top: -28,
    left: -24,
    right: -24,
    alignItems: 'center',
    zIndex: 1,
  },
  bubble: {
    maxWidth: 112,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: aurora.bubble,
    shadowColor: '#3C285A',
    shadowOpacity: 0.14,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  bubbleTyping: { height: 26, paddingVertical: 0, paddingHorizontal: 10, borderRadius: 13, justifyContent: 'center' },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: aurora.textMuted },
  // The light ring round a pinned avatar, with the soft shadow under it.
  ring: {
    padding: 3,
    borderRadius: PINNED_AVATAR / 2 + 3,
    backgroundColor: aurora.ring,
    shadowColor: '#3C285A',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
  },
  bubbleText: { fontSize: 12, lineHeight: 15, color: colors.text },
  pinnedName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: PINNED_AVATAR + 24,
  },
  pinnedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: aurora.tint,
  },
  pinnedNameText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.1,
    color: colors.text,
    flexShrink: 1,
  },
  unpinBadge: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -PINNED_AVATAR / 2 - 4,
    width: 24,
    height: 24,
    borderRadius: 12,
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
  row: {
    height: ROW,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: aurora.card,
  },
  rowMain: {
    flex: 1,
    height: ROW,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 14,
  },
  dotCell: {
    width: 18,
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
    height: ROW,
    marginLeft: space.md,
    justifyContent: 'center',
    gap: 2,
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
    fontWeight: '600',
    letterSpacing: -0.4,
    color: colors.text,
  },
  meta: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  level: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  levelText: { fontSize: 12, fontWeight: '600', color: colors.bondText },
  stamp: { fontSize: 15, letterSpacing: -0.2, color: aurora.textMuted },
  preview: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.2,
    color: aurora.textMuted,
  },
  typing: { fontSize: 15, lineHeight: 20, fontWeight: '500', color: aurora.tint },
  actions: { flexDirection: 'row' },
  action: {
    width: ACTION,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionText: { fontSize: 12, fontWeight: '600' },
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
