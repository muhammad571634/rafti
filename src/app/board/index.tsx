import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { boardStyle, Stationery } from '@/components/board/stationery';
import { AuroraGlass, CharacterAvatar, EmptyState, LargeTitle, PressableScale, Screen, Txt } from '@/components/ui';
import { relativeStamp, shortName } from '@/lib/format';
import { shareText } from '@/lib/share';
import { displayName, useAppStore } from '@/store/use-app-store';
import { aurora, colors, hitSlop, space } from '@/theme';

const GAP = space.md;

/**
 * Notes the user pinned for their friends, newest first, with whether the friend answered.
 * iOS look on the aurora (2026-10-22, coded at the owner's word): glass back and "+", a large
 * title, the papers two to a row with who, when and share under each.
 */
export default function BoardScreen() {
  const insets = useSafeAreaInsets();
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

  const cardW = Math.floor((width - space.lg * 2 - GAP) / 2);
  const cardH = Math.round(cardW * 1.12);
  const write = () => router.push('/board/write');

  return (
    <Screen background="aurora">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}>
        <View style={styles.bar}>
          <PressableScale scaleTo={0.9} accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()}>
            <AuroraGlass style={styles.round}>
              <Ionicons name="chevron-back" size={22} color={colors.text} style={styles.backIcon} />
            </AuroraGlass>
          </PressableScale>
          <PressableScale scaleTo={0.9} accessibilityRole="button" accessibilityLabel={t('board.write')} onPress={write}>
            <AuroraGlass style={styles.round}>
              <Ionicons name="add" size={26} color={colors.text} />
            </AuroraGlass>
          </PressableScale>
        </View>
        <LargeTitle>{t('board.title')}</LargeTitle>

        {notes.length === 0 ? (
          <EmptyState title={t('board.empty')} actionLabel={t('board.write')} onAction={write} />
        ) : (
          <View style={styles.grid}>
            {notes.map(({ post, character }) => {
              const ink = boardStyle(post.style);
              const conversation = conversations.find((c) => c.characterId === character!.id);
              const name = shortName(displayName(character!, relationships[character!.id]));
              return (
                <View key={post.id} style={{ width: cardW }}>
                  <PressableScale
                    scaleTo={0.97}
                    accessibilityRole="button"
                    accessibilityLabel={`${name}: ${post.text}`}
                    onPress={() => conversation && router.push(`/chat/${conversation.id}`)}
                    style={styles.paper}>
                    <Stationery id={post.style} width={cardW} height={cardH}>
                      <Txt variant="small" color={ink.ink} lines={post.style === 'heart' ? 3 : 6}>
                        {post.text}
                      </Txt>
                    </Stationery>
                  </PressableScale>
                  <View style={styles.meta}>
                    <CharacterAvatar character={character!} size={22} />
                    <View style={styles.who}>
                      <Txt style={styles.name} lines={1}>
                        {name}
                      </Txt>
                      <Txt style={styles.when} lines={1}>
                        {relativeStamp(post.createdAt)}
                      </Txt>
                    </View>
                    {post.replied ? <Ionicons name="chatbubble-ellipses" size={15} color={aurora.tint} /> : null}
                    <PressableScale
                      hitSlop={hitSlop}
                      scaleTo={0.85}
                      accessibilityRole="button"
                      accessibilityLabel={t('board.share')}
                      onPress={() => void shareText(t('board.shareMessage', { text: post.text }))}>
                      <Ionicons name="share-outline" size={17} color={aurora.textMuted} />
                    </PressableScale>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 44,
    paddingHorizontal: space.lg,
    paddingTop: space.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  backIcon: { marginLeft: -2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingHorizontal: space.lg, paddingTop: 18 },
  // A pinned paper casts a soft shadow on the aurora.
  paper: {
    shadowColor: '#3C285A',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 2 },
  who: { flex: 1, minWidth: 0 },
  name: { fontSize: 13, fontWeight: '600', color: colors.text },
  when: { fontSize: 11, color: aurora.textMuted },
});
