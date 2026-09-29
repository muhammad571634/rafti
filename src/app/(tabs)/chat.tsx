import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';

import { CharacterAvatar, EmptyState, PressableScale, Screen, Txt } from '@/components/ui';
import { relativeStamp } from '@/lib/format';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, radius, space, TAB_BAR_HEIGHT } from '@/theme';
import type { Character, Conversation } from '@/types';

export default function ChatListScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const conversations = useAppStore((s) => s.conversations);
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);

  const sorted = useMemo(
    () =>
      [...conversations].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      }),
    [conversations],
  );

  const characterFor = (id: string) => characters.find((c) => c.id === id);

  return (
    <Screen background={colors.bgPlain}>
      <View style={styles.head}>
        <Txt variant="h1">{t('chatList.title')}</Txt>
      </View>

      {sorted.length === 0 ? (
        <EmptyState
          title={t('chatList.empty')}
          hint={t('chatList.emptyHint')}
          actionLabel={t('find.title')}
          onAction={() => router.push('/(tabs)/find')}
        />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + space.xxl }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => {
            const character = characterFor(item.characterId);
            if (!character) return null;
            return (
              <ConversationRow
                conversation={item}
                character={character}
                name={displayName(character, relationships[character.id])}
                onPress={() => router.push(`/chat/${item.id}`)}
              />
            );
          }}
        />
      )}
    </Screen>
  );
}

function ConversationRow({
  conversation,
  character,
  name,
  onPress,
}: {
  conversation: Conversation;
  character: Character;
  name: string;
  onPress: () => void;
}) {
  return (
    <PressableScale style={styles.row} onPress={onPress} scaleTo={0.99}>
      <CharacterAvatar character={character} size={52} />

      <View style={styles.body}>
        <View style={styles.titleRow}>
          {conversation.pinned ? (
            <Ionicons name="pin" size={13} color={colors.primary} style={styles.pin} />
          ) : null}
          <Txt variant="bodyStrong" lines={1} style={styles.name}>
            {name}
          </Txt>
          <Txt variant="caption" color={colors.textFaint}>
            {relativeStamp(conversation.lastMessageAt)}
          </Txt>
        </View>

        <View style={styles.previewRow}>
          <Txt
            variant="small"
            color={conversation.unreadCount > 0 ? colors.textSecondary : colors.textMuted}
            lines={1}
            style={styles.preview}>
            {conversation.lastMessagePreview}
          </Txt>
          {conversation.muted ? (
            <Ionicons name="notifications-off" size={13} color={colors.textFaint} />
          ) : null}
          {conversation.unreadCount > 0 ? (
            <View style={styles.unread}>
              <Txt variant="tiny" color={colors.white}>
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </Txt>
            </View>
          ) : null}
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: colors.surface,
  },
  body: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  pin: { marginRight: -space.xs },
  name: { flex: 1 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  preview: { flex: 1 },
  unread: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginLeft: space.lg + 52 + space.md,
  },
});
