import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CharacterAvatar, Card, EmptyState, Header, Screen, Txt } from '@/components/ui';
import { relativeStamp } from '@/lib/format';
import { useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';

/** One pinned note per conversation — the latest thing each character said. */
export default function BoardScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const conversations = useAppStore((s) => s.conversations);
  const characters = useAppStore((s) => s.characters);

  const notes = useMemo(
    () =>
      conversations
        .filter((c) => c.lastMessagePreview)
        .map((conversation) => ({
          conversation,
          character: characters.find((c) => c.id === conversation.characterId),
        }))
        .filter((n) => !!n.character)
        .sort(
          (a, b) =>
            new Date(b.conversation.lastMessageAt).getTime() -
            new Date(a.conversation.lastMessageAt).getTime(),
        ),
    [conversations, characters],
  );

  return (
    <Screen>
      <Header title={t('board.title')} subtitle={t('board.subtitle')} />

      {notes.length === 0 ? (
        <EmptyState title={t('board.empty')} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {notes.map(({ conversation, character }) => (
            <Card
              key={conversation.id}
              onPress={() => router.push(`/chat/${conversation.id}`)}
              style={styles.card}>
              <View style={styles.head}>
                <CharacterAvatar character={character!}
                  size={30}
                />
                <Txt variant="smallStrong" style={styles.flex} lines={1}>
                  {character!.name}
                </Txt>
                <Txt variant="tiny" color={colors.textFaint}>
                  {relativeStamp(conversation.lastMessageAt)}
                </Txt>
              </View>

              <Txt variant="body" color={colors.textSecondary} lines={4}>
                {conversation.lastMessagePreview}
              </Txt>
            </Card>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: space.lg, gap: space.md, paddingBottom: space.huge },
  card: { gap: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
