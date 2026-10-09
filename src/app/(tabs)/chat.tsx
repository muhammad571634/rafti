import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import {
  CharacterAvatar,
  EmptyState,
  PressableScale,
  Screen,
  SearchBar,
  Txt,
} from '@/components/ui';
import { relativeStamp } from '@/lib/format';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, radius, space, TAB_BAR_HEIGHT } from '@/theme';
import type { Character, Conversation } from '@/types';

const AVATAR = 56;

/** A conversation joined with its character and the name the user knows them by. */
interface ChatItem {
  conversation: Conversation;
  character: Character;
  name: string;
}

/**
 * Every chat, pinned first: plain rows on the canvas. Search opens from the header's
 * magnifier; the pencil starts a new chat in Find. Unread chats show their last line in
 * ink with an ink count.
 */
export default function ChatListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const conversations = useAppStore((s) => s.conversations);
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);

  /** Pinned chats first, then most recent; chats whose character is gone are dropped. */
  const items = useMemo<ChatItem[]>(() => {
    const byId = new Map(characters.map((c) => [c.id, c]));
    return [...conversations]
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      })
      .flatMap((conversation) => {
        const character = byId.get(conversation.characterId);
        if (!character) return [];
        return [{ conversation, character, name: displayName(character, relationships[character.id]) }];
      });
  }, [conversations, characters, relationships]);

  const needle = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      needle
        ? items.filter(
            ({ conversation, name }) =>
              name.toLowerCase().includes(needle) ||
              conversation.lastMessagePreview.toLowerCase().includes(needle),
          )
        : items,
    [items, needle],
  );

  /** The pin, mute and unread marks are icons only, so the row's label spells them out. */
  const rowLabel = ({ conversation, name }: ChatItem) =>
    [
      conversation.unreadCount > 0
        ? t('a11y.unreadTab', { label: name, count: conversation.unreadCount })
        : name,
      conversation.pinned ? t('chatList.pinned') : null,
      conversation.muted ? t('chatList.muted') : null,
      relativeStamp(conversation.lastMessageAt),
      conversation.lastMessagePreview,
    ]
      .filter(Boolean)
      .join(', ');

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
          onPress={() => router.push('/(tabs)/find')}
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
            keyExtractor={(item) => item.conversation.id}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Txt variant="small" color={colors.textMuted} center style={styles.noResults}>
                {t('chatList.noResults', { query: query.trim() })}
              </Txt>
            }
            renderItem={({ item }) => {
              const { conversation, character, name } = item;
              const unread = conversation.unreadCount > 0;
              return (
                <PressableScale
                  scaleTo={0.98}
                  style={styles.row}
                  accessibilityRole="button"
                  accessibilityLabel={rowLabel(item)}
                  onPress={() => router.push(`/chat/${conversation.id}`)}>
                  <CharacterAvatar character={character} size={AVATAR} />
                  <View style={styles.body}>
                    <View style={styles.line}>
                      <Txt variant="title" lines={1} style={styles.name}>
                        {name}
                      </Txt>
                      {conversation.pinned ? (
                        <Ionicons name="pin-outline" size={13} color={colors.textFaint} />
                      ) : null}
                      <Txt variant="small" color={colors.textMuted}>
                        {relativeStamp(conversation.lastMessageAt)}
                      </Txt>
                    </View>
                    <View style={styles.line}>
                      <Txt
                        variant={unread ? 'bodyStrong' : 'body'}
                        color={unread ? colors.text : colors.textSecondary}
                        lines={1}
                        style={styles.preview}>
                        {conversation.lastMessagePreview}
                      </Txt>
                      {conversation.muted ? (
                        <Ionicons name="notifications-off-outline" size={14} color={colors.textFaint} />
                      ) : unread ? (
                        <View style={styles.badge}>
                          <Txt variant="tiny" color={colors.white} style={styles.badgeText}>
                            {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
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
  list: { paddingHorizontal: space.lg, paddingBottom: TAB_BAR_HEIGHT + space.xxl },
  row: { minHeight: 80, flexDirection: 'row', alignItems: 'center', gap: space.md + 2 },
  body: { flex: 1, gap: 3 },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: { flex: 1 },
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
});
