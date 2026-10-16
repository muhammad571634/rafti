import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { BondChip } from '@/components/bond-chip';
import { GroupAvatar } from '@/components/group-avatar';
import { CharacterAvatar, Divider, EmptyState, PressableScale, Screen, SearchBar, Sheet, Txt } from '@/components/ui';
import { relativeStamp, shortName } from '@/lib/format';
import { groupTitle } from '@/lib/group-chat';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, radius, shadows, space, TAB_BAR_HEIGHT } from '@/theme';
import type { Character, Conversation, GroupChat } from '@/types';

const AVATAR = 52;
const PINNED_AVATAR = 76;
const ROW = 76;
const ACTION = 66;
const WAY_ICON = 36;
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
 * Every chat and group, iOS Messages style (approved prototype, 2026-10-16): Edit and a new-chat
 * button in glass, a large title, an always-on search field, pinned chats as big avatars on top,
 * then plain rows with an unread dot. A row swipes left to Mute, Pin and Delete; Edit shows a
 * remove button on every row and an unpin badge on every pinned avatar.
 */
export default function ChatListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  // The tab bar grows by the phone's bottom inset (home indicator, navigation bar).
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(false);
  const [starting, setStarting] = useState(false);

  const conversations = useAppStore((s) => s.conversations);
  const groups = useAppStore((s) => s.groups);
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const setChatPinned = useAppStore((s) => s.setChatPinned);
  const setChatMuted = useAppStore((s) => s.setChatMuted);
  const deleteChat = useAppStore((s) => s.deleteChat);
  const setGroupMuted = useAppStore((s) => s.setGroupMuted);
  const deleteGroup = useAppStore((s) => s.deleteGroup);
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
  // While searching, pinned chats are rows like the rest; otherwise they sit on top as avatars.
  const pinned = useMemo(() => (needle ? [] : items.filter(isPinned)), [items, needle]);
  const rows = useMemo(
    () =>
      needle
        ? items.filter(
            (item) =>
              item.name.toLowerCase().includes(needle) || rowOf(item).lastMessagePreview.toLowerCase().includes(needle),
          )
        : items.filter((item) => !isPinned(item)),
    [items, needle],
  );

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

  const startWith = (route: '/(tabs)/find' | '/group/new') => {
    setStarting(false);
    router.push(route);
  };

  return (
    <Screen background={colors.bgPlain}>
      <View style={styles.topBar}>
        {items.length > 0 ? (
          <PressableScale
            scaleTo={0.92}
            onPress={() => setEditing((v) => !v)}
            accessibilityRole="button"
            style={[styles.glass, styles.editButton]}>
            <Txt style={[styles.editText, editing && styles.editTextOn]}>
              {editing ? t('common.done') : t('common.edit')}
            </Txt>
          </PressableScale>
        ) : (
          <View />
        )}
        <PressableScale
          scaleTo={0.88}
          onPress={() => setStarting(true)}
          accessibilityRole="button"
          accessibilityLabel={t('chatList.newChat')}
          style={[styles.glass, styles.composeButton]}>
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
          <SearchBar value={query} onChangeText={setQuery} placeholder={t('common.search')} style={styles.search} />

          <FlatList
            data={rows}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
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
                      editing={editing}
                      onPress={() => open(item)}
                      onUnpin={() => togglePin(item)}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.listTop} />
              )
            }
            ListEmptyComponent={
              needle ? (
                <Txt variant="small" color={colors.textMuted} center style={styles.noResults}>
                  {t('chatList.noResults', { query: query.trim() })}
                </Txt>
              ) : null
            }
            renderItem={({ item, index }) => (
              <ChatRow
                item={item}
                last={index === rows.length - 1}
                level={item.kind === 'chat' ? levelOf(item.character.id) : null}
                label={rowLabel(item)}
                editing={editing}
                onPress={() => open(item)}
                onMute={() => toggleMute(item)}
                onPin={() => togglePin(item)}
                onDelete={() => remove(item)}
              />
            )}
          />
        </>
      )}

      {/* The pencil: a new chat in Find, or a group of 2-3 friends (approved prototype). */}
      <Sheet visible={starting} onClose={() => setStarting(false)}>
        <View style={styles.ways}>
          <PressableScale
            scaleTo={1}
            style={styles.way}
            accessibilityRole="button"
            accessibilityLabel={t('group.newChat')}
            onPress={() => startWith('/(tabs)/find')}>
            <View style={styles.wayIcon}>
              <Ionicons name="person-outline" size={19} color={colors.text} />
            </View>
            <View style={styles.wayText}>
              <Txt variant="bodyStrong">{t('group.newChat')}</Txt>
              <Txt variant="small" color={colors.textSecondary}>
                {t('group.newChatHint')}
              </Txt>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </PressableScale>
          <Divider inset={space.lg + WAY_ICON + space.md} />
          <PressableScale
            scaleTo={1}
            style={[styles.way, friends < 2 && styles.wayOff]}
            disabled={friends < 2}
            accessibilityRole="button"
            accessibilityState={{ disabled: friends < 2 }}
            accessibilityLabel={t('group.newGroup')}
            onPress={() => startWith('/group/new')}>
            <View style={styles.wayIcon}>
              <Ionicons name="people-outline" size={19} color={colors.text} />
            </View>
            <View style={styles.wayText}>
              <Txt variant="bodyStrong">{t('group.newGroup')}</Txt>
              <Txt variant="small" color={colors.textSecondary}>
                {friends < 2 ? t('group.needFriends') : t('group.newGroupHint')}
              </Txt>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </PressableScale>
        </View>
      </Sheet>
    </Screen>
  );
}

/** A pinned chat: a big avatar, its name, and the last line in a bubble while it is unread. */
function PinnedTile({
  item,
  label,
  editing,
  onPress,
  onUnpin,
}: {
  item: ChatItem;
  label: string;
  editing: boolean;
  onPress: () => void;
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
        accessibilityRole="button"
        accessibilityLabel={label}
        style={styles.pinnedTile}>
        {unread && row.lastMessagePreview ? (
          <View style={styles.bubbleWrap} pointerEvents="none">
            <View style={styles.bubble}>
              <Txt style={styles.bubbleText} lines={1}>
                {row.lastMessagePreview}
              </Txt>
            </View>
          </View>
        ) : null}
        {item.kind === 'chat' ? (
          <CharacterAvatar character={item.character} size={PINNED_AVATAR} />
        ) : (
          <GroupAvatar members={item.members} size={PINNED_AVATAR} />
        )}
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

/** One chat or group: swipe left for Mute, Pin and Delete; in Edit mode a remove button leads. */
function ChatRow({
  item,
  last,
  level,
  label,
  editing,
  onPress,
  onMute,
  onPin,
  onDelete,
}: {
  item: ChatItem;
  last: boolean;
  level: number | null;
  label: string;
  editing: boolean;
  onPress: () => void;
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
          accessibilityRole="button"
          accessibilityLabel={label}
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
              {level != null ? <BondChip level={level} /> : null}
              <View style={styles.meta}>
                {row.muted ? <Ionicons name="notifications-off" size={13} color={colors.textSecondary} /> : null}
                <Txt style={styles.stamp}>{relativeStamp(row.lastMessageAt)}</Txt>
                <Ionicons name="chevron-forward" size={14} color={colors.textFaint} />
              </View>
            </View>
            <Txt style={styles.preview} lines={2}>
              {row.lastMessagePreview}
            </Txt>
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

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    height: 44,
  },
  glass: {
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassLine,
    ...shadows.glassButton,
  },
  editButton: {
    height: 36,
    paddingHorizontal: space.lg,
    borderRadius: 18,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 10,
    marginHorizontal: space.lg,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.text,
  },
  search: {
    height: 36,
    marginTop: space.sm,
    marginHorizontal: space.lg,
    paddingHorizontal: 10,
    gap: 6,
  },
  listTop: { height: space.sm },
  // Room above the avatars for the unread bubble.
  pinnedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 34,
    paddingTop: 34,
    paddingBottom: 14,
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
    backgroundColor: colors.surfaceAlt,
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
    backgroundColor: colors.primary,
  },
  pinnedNameText: {
    fontSize: 13,
    letterSpacing: -0.1,
    color: colors.text,
    flexShrink: 1,
  },
  unpinBadge: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -PINNED_AVATAR / 2 - 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: colors.bgPlain,
  },
  row: {
    height: ROW,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgPlain,
  },
  rowMain: {
    flex: 1,
    height: ROW,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: space.lg,
  },
  dotCell: {
    width: space.lg,
    height: ROW,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
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
    borderBottomColor: colors.border,
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
  stamp: { fontSize: 15, letterSpacing: -0.2, color: colors.textSecondary },
  preview: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.2,
    color: colors.textSecondary,
  },
  actions: { flexDirection: 'row' },
  action: {
    width: ACTION,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionText: { fontSize: 12, fontWeight: '600' },
  noResults: { paddingTop: space.xxl, paddingHorizontal: space.lg },
  // "Choices in a sheet": one bordered box, rows of equal weight (docs/design-style.md).
  ways: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  way: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 64,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
  },
  wayOff: { opacity: 0.45 },
  wayIcon: {
    width: WAY_ICON,
    height: WAY_ICON,
    borderRadius: 11,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wayText: { flex: 1, gap: 2 },
});
