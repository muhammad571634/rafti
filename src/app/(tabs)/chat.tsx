import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { BondChip } from '@/components/bond-chip';
import { GroupAvatar } from '@/components/group-avatar';
import {
  CharacterAvatar,
  Divider,
  EmptyState,
  PressableScale,
  Screen,
  SearchBar,
  Sheet,
  Txt,
} from '@/components/ui';
import { relativeStamp, shortName } from '@/lib/format';
import { groupTitle } from '@/lib/group-chat';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, radius, space, TAB_BAR_HEIGHT } from '@/theme';
import type { Character, Conversation, GroupChat } from '@/types';

const AVATAR = 56;
const WAY_ICON = 36;

/** A row: a one-to-one chat with its character, or a group with its members. */
type ChatItem =
  | { kind: 'chat'; id: string; conversation: Conversation; character: Character; name: string }
  | { kind: 'group'; id: string; group: GroupChat; members: Character[]; name: string };

/** What every row shows, whichever kind it is. */
const rowOf = (item: ChatItem) => (item.kind === 'chat' ? item.conversation : item.group);

/**
 * Every chat and group, pinned first: plain rows on the canvas. Search opens from the
 * header's magnifier; the pencil offers a new chat (Find) or a new group. Unread chats
 * show their last line in ink with an ink count.
 */
export default function ChatListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  // The tab bar grows by the phone's bottom inset (home indicator, navigation bar).
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [starting, setStarting] = useState(false);

  const conversations = useAppStore((s) => s.conversations);
  const groups = useAppStore((s) => s.groups);
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
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
    const pinned = (item: ChatItem) => item.kind === 'chat' && item.conversation.pinned;
    return [...chats, ...rooms].sort((a, b) => {
      if (pinned(a) !== pinned(b)) return pinned(a) ? -1 : 1;
      return new Date(rowOf(b).lastMessageAt).getTime() - new Date(rowOf(a).lastMessageAt).getTime();
    });
  }, [conversations, groups, characters, relationships]);

  // A group is made of friends the user already chats with.
  const friends = useMemo(
    () => new Set(items.flatMap((item) => (item.kind === 'chat' ? [item.character.id] : []))).size,
    [items],
  );

  const needle = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      needle
        ? items.filter(
            (item) =>
              item.name.toLowerCase().includes(needle) ||
              rowOf(item).lastMessagePreview.toLowerCase().includes(needle),
          )
        : items,
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
      item.kind === 'chat' && item.conversation.pinned ? t('chatList.pinned') : null,
      row.muted ? t('chatList.muted') : null,
      relativeStamp(row.lastMessageAt),
      row.lastMessagePreview,
    ]
      .filter(Boolean)
      .join(', ');
  };

  const startWith = (route: '/(tabs)/find' | '/group/new') => {
    setStarting(false);
    router.push(route);
  };

  const toggleSearch = () => {
    if (searching) setQuery('');
    setSearching((v) => !v);
  };

  return (
    <Screen background={colors.bgPlain}>
      <View style={styles.head}>
        <Txt variant="h1" accessibilityRole="header" style={styles.title}>
          {t('chatList.title')}
        </Txt>
        {items.length > 0 ? (
          <HeaderIcon
            kind={searching ? 'close' : 'search'}
            accessibilityLabel={t('common.search')}
            onPress={toggleSearch}
          />
        ) : null}
        <HeaderIcon
          kind="pencil"
          accessibilityLabel={t('chatList.newChat')}
          onPress={() => setStarting(true)}
          style={styles.compose}
        />
      </View>

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
          {searching ? (
            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder={t('common.search')}
              autoFocus
              style={styles.search}
            />
          ) : null}

          <FlatList
            data={visible}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={[styles.list, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + space.xxl }]}
            ListEmptyComponent={
              <Txt variant="small" color={colors.textMuted} center style={styles.noResults}>
                {t('chatList.noResults', { query: query.trim() })}
              </Txt>
            }
            renderItem={({ item }) => {
              const row = rowOf(item);
              const unread = row.unreadCount > 0;
              const level = item.kind === 'chat' ? levelOf(item.character.id) : null;
              return (
                <PressableScale
                  scaleTo={0.98}
                  style={styles.row}
                  accessibilityRole="button"
                  accessibilityLabel={rowLabel(item)}
                  onPress={() =>
                    item.kind === 'chat'
                      ? router.push(`/chat/${item.id}`)
                      : router.push({ pathname: '/group/[id]', params: { id: item.id } })
                  }>
                  {item.kind === 'chat' ? (
                    <CharacterAvatar character={item.character} size={AVATAR} />
                  ) : (
                    <GroupAvatar members={item.members} size={AVATAR} />
                  )}
                  <View style={styles.body}>
                    <View style={styles.line}>
                      <Txt variant="title" lines={1} style={styles.name}>
                        {item.name}
                      </Txt>
                      {level != null ? <BondChip level={level} /> : null}
                      {item.kind === 'chat' && item.conversation.pinned ? (
                        <Ionicons name="pin-outline" size={13} color={colors.textFaint} />
                      ) : null}
                      <Txt variant="small" color={colors.textMuted} style={styles.stamp}>
                        {relativeStamp(row.lastMessageAt)}
                      </Txt>
                    </View>
                    <View style={styles.line}>
                      <Txt
                        variant={unread ? 'bodyStrong' : 'body'}
                        color={unread ? colors.text : colors.textSecondary}
                        lines={1}
                        style={styles.preview}>
                        {row.lastMessagePreview}
                      </Txt>
                      {row.muted ? (
                        <Ionicons name="notifications-off-outline" size={14} color={colors.textFaint} />
                      ) : unread ? (
                        <View style={styles.badge}>
                          <Txt variant="tiny" color={colors.textOnInk} style={styles.badgeText}>
                            {row.unreadCount > 99 ? '99+' : row.unreadCount}
                          </Txt>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </PressableScale>
              );
            }}
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

const GLYPH = 26;
const STROKE = 2.2;

/** The header's search and new-chat glyphs, drawn to match the app-flow prototype. */
function HeaderIcon({
  kind,
  onPress,
  accessibilityLabel,
  style,
}: {
  kind: 'search' | 'close' | 'pencil';
  onPress: () => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <PressableScale
      onPress={onPress}
      hitSlop={6}
      scaleTo={0.88}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.headerIcon, style]}>
      <Svg width={GLYPH} height={GLYPH} viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round">
        {kind === 'search' ? (
          <>
            <Circle cx={11} cy={11} r={6.5} />
            <Path d="M16 16l4 4" />
          </>
        ) : kind === 'close' ? (
          <Path d="M6 6l12 12M18 6L6 18" />
        ) : (
          <>
            <Path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" />
            <Path d="M13.5 6.5l4 4" />
          </>
        )}
      </Svg>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.sm,
  },
  title: { flex: 1, fontSize: 32, lineHeight: 38 },
  headerIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  // Pull the button's padding into the gutter so the glyph lines up with the list's edge.
  compose: { marginRight: -space.sm - 2 },
  search: { marginHorizontal: space.lg, marginBottom: space.sm },
  list: { paddingHorizontal: space.lg },
  row: { minHeight: 80, flexDirection: 'row', alignItems: 'center', gap: space.md + 2 },
  body: { flex: 1, gap: 3 },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  // The name shrinks first, so the level heart stays right after it and the time at the end.
  name: { flexShrink: 1 },
  stamp: { marginLeft: 'auto' },
  preview: { flex: 1 },
  // Unread count in ink, like the rest of the calm-cards selection marks.
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontWeight: '700' },
  noResults: { paddingTop: space.xxl, paddingHorizontal: space.lg },
  // "Choices in a sheet": one bordered box, rows of equal weight (docs/design-style.md).
  ways: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
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
