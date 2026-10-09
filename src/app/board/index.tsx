import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { boardStyle, Stationery } from '@/components/board/stationery';
import { CharacterAvatar, EmptyState, Header, IconButton, PressableScale, Screen, Txt } from '@/components/ui';
import { relativeStamp, shortName } from '@/lib/format';
import { shareForReward } from '@/lib/share';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, hitSlop, space } from '@/theme';

/** Notes the user pinned for their friends, newest first, with each friend's answer underneath. */
export default function BoardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const posts = useAppStore((s) => s.boardPosts);
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const conversations = useAppStore((s) => s.conversations);

  const notes = useMemo(
    () =>
      [...posts]
        .reverse()
        .map((post) => ({ post, character: characters.find((c) => c.id === post.characterId) }))
        .filter((n) => !!n.character),
    [posts, characters],
  );

  const cardW = Math.floor((width - space.lg * 2 - space.md) / 2);
  const cardH = Math.round(cardW * 1.12);
  const write = () => router.push('/board/write');

  return (
    <Screen background={colors.bgPlain}>
      <Header
        title={t('board.title')}
        right={<IconButton icon="add" onPress={write} accessibilityLabel={t('board.write')} />}
      />

      {notes.length === 0 ? (
        <EmptyState title={t('board.empty')} actionLabel={t('board.write')} onAction={write} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.grid}>
          {notes.map(({ post, character }) => {
            const ink = boardStyle(post.style);
            const conversation = conversations.find((c) => c.characterId === character!.id);
            return (
              <View key={post.id} style={{ width: cardW }}>
                <PressableScale scaleTo={0.97} onPress={() => conversation && router.push(`/chat/${conversation.id}`)}>
                  <Stationery id={post.style} width={cardW} height={cardH}>
                    <Txt variant="small" color={ink.ink} lines={post.style === 'heart' ? 3 : 6}>
                      {post.text}
                    </Txt>
                  </Stationery>
                </PressableScale>
                <View style={styles.meta}>
                  <CharacterAvatar character={character!} size={22} />
                  <Txt variant="caption" lines={1} style={styles.flex}>
                    {shortName(displayName(character!, relationships[character!.id]))}
                  </Txt>
                  {post.replied ? (
                    <Ionicons name="chatbubble-ellipses" size={14} color={colors.text} />
                  ) : null}
                  <Txt variant="tiny" color={colors.textFaint}>
                    {relativeStamp(post.createdAt)}
                  </Txt>
                  <PressableScale
                    hitSlop={hitSlop}
                    scaleTo={0.85}
                    accessibilityLabel={t('board.share')}
                    onPress={() => void shareForReward(t('board.shareMessage', { text: post.text }))}>
                    <Ionicons name="share-outline" size={16} color={colors.textSecondary} />
                  </PressableScale>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
    padding: space.lg,
    paddingBottom: space.huge,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs, paddingHorizontal: 2 },
});
