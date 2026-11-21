import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { boardStyle, Stationery } from '@/components/board/stationery';
import { InkIconButton, InkNavBar, InkText } from '@/components/ink';
import { CharacterAvatar, EmptyState, PressableScale, Screen, Txt, useScrolledPast } from '@/components/ui';
import { confirmAction } from '@/lib/confirm';
import { relativeStamp, shortName } from '@/lib/format';
import { shareText } from '@/lib/share';
import { displayName, useAppStore } from '@/store/use-app-store';
import { friendAccent, hitSlop, paperRoom, signature, space } from '@/theme';
import { ink, inkFace, inkGutter, inkRadius } from '@/theme/ink';

const GAP = 14;
const TILTS = ['-1deg', '1.1deg', '-0.7deg', '0.8deg'] as const;

/**
 * Message board (approved Ink Night+ prototype): warm tactile `Stationery` notes pinned onto the
 * quiet dark room (`paperRoom`), sticky Apple HIG nav bar with "+", editorial serif header with
 * tabular count, friend-accent pin dot on top of each paper, and ringed friend avatar below.
 */
export default function BoardScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { scrolled, onScroll } = useScrolledPast(34);

  const posts = useAppStore((s) => s.boardPosts);
  const deleteBoardPost = useAppStore((s) => s.deleteBoardPost);
  const remove = (id: string) =>
    confirmAction({
      title: t('board.deleteTitle'),
      action: t('common.delete'),
      cancel: t('common.cancel'),
      onConfirm: () => deleteBoardPost(id),
    });
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

  const cardW = Math.floor((width - inkGutter * 2 - GAP) / 2);
  const cardH = Math.round(cardW * 1.12);
  const write = () => router.push('/board/write');

  return (
    <Screen background={paperRoom}>
      <InkNavBar
        backLabel={t('common.back')}
        onBack={() => router.back()}
        title={t('board.title')}
        scrolled={scrolled}
        right={<InkIconButton icon="add" size={22} accessibilityLabel={t('board.write')} onPress={write} />}
      />

      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}>
        <View style={styles.titleRow}>
          <InkText variant="display" accessibilityRole="header" style={styles.titleFlex}>
            {t('board.title')}
          </InkText>
          {notes.length > 0 ? (
            <View style={styles.countPill} accessible accessibilityLabel={`${notes.length}`}>
              <InkText variant="caption" color={ink.text2} style={styles.tabular}>
                {notes.length}
              </InkText>
            </View>
          ) : null}
        </View>

        {notes.length === 0 ? (
          <EmptyState title={t('board.empty')} actionLabel={t('board.write')} onAction={write} />
        ) : (
          <View style={styles.grid}>
            {notes.map(({ post, character }, idx) => {
              const paperInk = boardStyle(post.style);
              const conversation = conversations.find((c) => c.characterId === character!.id);
              const name = shortName(displayName(character!, relationships[character!.id]));
              const accent = friendAccent(character!.id).strong;
              const tilt = TILTS[idx % TILTS.length];
              return (
                <View key={post.id} style={{ width: cardW }}>
                  <PressableScale
                    scaleTo={0.97}
                    accessibilityRole="button"
                    accessibilityLabel={`${name}: ${post.text}`}
                    accessibilityActions={[{ name: 'longpress', label: t('board.delete') }]}
                    onAccessibilityAction={() => remove(post.id)}
                    delayLongPress={400}
                    onLongPress={() => remove(post.id)}
                    onPress={() => conversation && router.push(`/chat/${conversation.id}`)}
                    style={[styles.paper, { transform: [{ rotate: tilt }] }]}>
                    <Stationery id={post.style} width={cardW} height={cardH}>
                      <Txt variant="small" color={paperInk.ink} lines={post.style === 'heart' ? 3 : 6}>
                        {post.text}
                      </Txt>
                    </Stationery>
                    <View pointerEvents="none" style={[styles.pinDot, { backgroundColor: accent }]} />
                  </PressableScale>

                  <View style={styles.meta}>
                    <View style={[styles.avatarRing, { borderColor: accent }]}>
                      <CharacterAvatar character={character!} size={22} />
                    </View>
                    <View style={styles.who}>
                      <Txt style={styles.name} lines={1}>
                        {name}
                      </Txt>
                      <Txt style={[styles.when, styles.tabular]} lines={1}>
                        {relativeStamp(post.createdAt)}
                      </Txt>
                    </View>
                    {post.replied ? (
                      <Ionicons name="chatbubble-ellipses" size={14} color={signature.board.strong} />
                    ) : null}
                    <PressableScale
                      hitSlop={hitSlop}
                      scaleTo={0.85}
                      accessibilityRole="button"
                      accessibilityLabel={t('board.share')}
                      onPress={() => void shareText(t('board.shareMessage', { text: post.text }))}>
                      <Ionicons name="share-outline" size={16} color={ink.text2} />
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 2,
    marginHorizontal: inkGutter,
  },
  titleFlex: { flex: 1 },
  countPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: inkRadius.pill,
    backgroundColor: 'rgba(118,118,128,0.20)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    marginBottom: 4,
  },
  tabular: { fontVariant: ['tabular-nums'] },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    paddingHorizontal: inkGutter,
    paddingTop: 18,
  },
  paper: {
    position: 'relative',
    boxShadow: '0px 10px 22px rgba(0,0,0,0.42)',
  },
  pinDot: {
    position: 'absolute',
    top: -4,
    left: '50%',
    marginLeft: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.68)',
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10, paddingHorizontal: 2 },
  avatarRing: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  who: { flex: 1, minWidth: 0 },
  name: { ...inkFace('caption'), color: ink.text },
  when: { ...inkFace('caption'), fontSize: 11, fontWeight: '400', color: ink.text3 },
});
