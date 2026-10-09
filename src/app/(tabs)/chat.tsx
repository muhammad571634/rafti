import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';

import {
  CharacterAvatar,
  CountBadge,
  EmptyState,
  IconButton,
  ListRow,
  Screen,
  SearchBar,
  Txt,
} from '@/components/ui';
import { relativeStamp } from '@/lib/format';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, space, TAB_BAR_HEIGHT } from '@/theme';
import type { Character, Conversation } from '@/types';

const AVATAR = 48;

/** A conversation joined with its character and the name the user knows them by. */
interface ChatItem {
  conversation: Conversation;
  character: Character;
  name: string;
}

/** Every chat, pinned first: plain rows on the canvas, no lines or cards (same look as Today). */
export default function ChatListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [query, setQuery] = useState('');

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

  return (
    <Screen background={colors.bgPlain}>
      <View style={styles.head}>
        <Txt variant="h1" accessibilityRole="header" style={styles.title}>
          {t('chatList.title')}
        </Txt>
        <IconButton
          icon="create-outline"
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
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder={t('common.search')}
            style={styles.search}
          />

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
              return (
                <ListRow
                  size="large"
                  left={<CharacterAvatar character={character} size={AVATAR} />}
                  title={name}
                  titleAccessory={
                    conversation.pinned ? (
                      <Ionicons name="pin-outline" size={13} color={colors.textFaint} />
                    ) : undefined
                  }
                  meta={relativeStamp(conversation.lastMessageAt)}
                  subtitle={conversation.lastMessagePreview}
                  trailing={
                    conversation.muted ? (
                      <Ionicons name="notifications-off-outline" size={14} color={colors.textFaint} />
                    ) : (
                      <CountBadge count={conversation.unreadCount} />
                    )
                  }
                  accessibilityLabel={rowLabel(item)}
                  onPress={() => router.push(`/chat/${conversation.id}`)}
                />
              );
            }}
          />
        </>
      )}
    </Screen>
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
  title: { flex: 1 },
  // Pull the button's padding into the gutter so the glyph lines up with the search bar's edge.
  compose: { marginRight: -space.sm },
  search: { marginHorizontal: space.lg, marginBottom: space.sm },
  list: { paddingBottom: TAB_BAR_HEIGHT + space.xxl },
  noResults: { paddingTop: space.xxl, paddingHorizontal: space.lg },
});
