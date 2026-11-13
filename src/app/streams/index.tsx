import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CharacterAvatar, EmptyState, GlassBar, GlassButton, PressableScale, Screen, Txt, useScrolledPast } from '@/components/ui';
import { useFriendName } from '@/hooks/use-friend-name';
import { relativeStamp } from '@/lib/format';
import { groupTitle } from '@/lib/group-chat';
import { isPlaying } from '@/lib/streams';
import { useAppStore } from '@/store/use-app-store';
import { fonts, isDark, space, systemColors, systemGround } from '@/theme';
import type { Character, Stream } from '@/types';

/** The cards' washes in turn (the Ink canvas: coral, blue, violet), the system's own hues. */
const HUES = [systemColors.red, systemColors.blue, systemColors.purple, systemColors.teal, systemColors.orange] as const;

/**
 * Streams (Character.AI's Stream): two characters talk about a topic while the user watches. The
 * Ink look (owner, 2026-11-13, from the canvas frame): one card per stream, newest first, washed in
 * a colour from the left, "Live" with a red dot and "Go on" while it plays (else when it was), the
 * topic in serif with its last word in italic colour, the two faces overlapping. A card opens the
 * stream to watch again or keep it going; "New stream" sits at the bottom, "+" in the bar.
 */
export default function StreamsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const streams = useAppStore((s) => s.streams);
  const characters = useAppStore((s) => s.characters);
  const { scrolled, onScroll } = useScrolledPast(44);

  const startNew = () => router.push('/streams/new');

  return (
    <Screen background={systemGround.ground}>
      <GlassBar
        title={t('streams.title')}
        scrolled={scrolled}
        right={streams.length ? <GlassButton icon="add" accessibilityLabel={t('streams.new')} onPress={startNew} /> : undefined}
      />
      <ScrollView showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
          {t('streams.title')}
        </Text>
        <Txt style={styles.subtitle} maxFontSizeMultiplier={1.3}>
          {t('streams.empty')}
        </Txt>

        {streams.length === 0 ? (
          <EmptyState symbol={{ ios: 'bubble.left.and.bubble.right.fill', icon: 'chatbubbles' }} title={t('streams.emptyHint')} />
        ) : (
          <View style={styles.cards}>
            {streams.map((stream, i) => (
              <StreamCard
                key={stream.id}
                stream={stream}
                characters={characters}
                hue={HUES[i % HUES.length]}
                onPress={() => router.push({ pathname: '/streams/[id]', params: { id: stream.id } })}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.foot, { paddingBottom: insets.bottom + space.md }]}>
        <PressableScale scaleTo={0.97} accessibilityRole="button" onPress={startNew} style={styles.pill}>
          <Txt style={styles.pillText} maxFontSizeMultiplier={1.3}>
            {t('streams.new')}
          </Txt>
        </PressableScale>
      </View>
    </Screen>
  );
}

/** A topic's last word, for the italic accent; none when it has no spaces (Chinese, Japanese, Thai). */
function splitTopic(topic: string): [string, string] {
  const trimmed = topic.trim();
  const at = trimmed.lastIndexOf(' ');
  return at > 0 ? [trimmed.slice(0, at + 1), trimmed.slice(at + 1)] : [trimmed, ''];
}

/** One stream as a card: when (or Live and Go on), the topic, the two faces. */
function StreamCard({ stream, characters, hue, onPress }: { stream: Stream; characters: Character[]; hue: string; onPress: () => void }) {
  const friendName = useFriendName();
  const { t } = useTranslation();
  const pair = stream.characterIds.map((id) => characters.find((c) => c.id === id)).filter((c): c is Character => !!c);
  const names = groupTitle(pair.map((c) => friendName(c, true)));
  const live = isPlaying(stream);
  const [head, tail] = splitTopic(stream.topic);
  return (
    <PressableScale
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={[live ? t('streams.live') : relativeStamp(stream.createdAt), stream.topic, names].join(', ')}
      onPress={onPress}
      style={styles.card}>
      <LinearGradient colors={[`${hue}52`, `${hue}00`]} start={{ x: 0, y: 0.3 }} end={{ x: 0.8, y: 0.7 }} style={StyleSheet.absoluteFill} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          {live ? <View style={styles.liveDot} /> : null}
          <Txt style={styles.when} lines={1}>
            {live ? t('streams.live') : relativeStamp(stream.createdAt)}
          </Txt>
          {live ? (
            <View style={styles.goOn}>
              <Txt style={styles.goOnText} maxFontSizeMultiplier={1.2}>
                {t('streams.goOn')}
              </Txt>
            </View>
          ) : null}
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.topic} numberOfLines={2} maxFontSizeMultiplier={1.3}>
            {head}
            {tail ? <Text style={[styles.topicTail, { color: hue }]}>{tail}</Text> : null}
          </Text>
          <View style={styles.faces}>
            {pair.slice(0, 2).map((c, i) => (
              <View key={c.id} style={[styles.face, i > 0 && styles.faceOver]}>
                <CharacterAvatar character={c} size={40} />
              </View>
            ))}
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },
  title: { marginTop: 4, marginHorizontal: 20, fontFamily: fonts.serif, fontSize: 36, lineHeight: 42, letterSpacing: -0.5, color: systemGround.label },
  subtitle: { marginTop: 2, marginHorizontal: 20, fontSize: 15, color: systemGround.secondaryLabel },
  cards: { marginTop: 18, marginHorizontal: 20, gap: 12 },
  card: {
    minHeight: 120,
    borderRadius: 30,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: systemGround.card,
    ...(isDark ? { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.08)' } : null),
  },
  cardBody: { flex: 1, padding: 18, gap: 18, justifyContent: 'space-between' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: systemColors.red },
  when: { flex: 1, fontSize: 14, color: systemGround.secondaryLabel },
  goOn: { height: 28, paddingHorizontal: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: systemGround.fill },
  goOnText: { fontSize: 14, fontWeight: '600', color: systemGround.label },
  cardBottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  topic: { flex: 1, fontFamily: fonts.serif, fontSize: 21, lineHeight: 26, letterSpacing: -0.2, color: systemGround.label },
  topicTail: { fontFamily: fonts.serifItalic },
  faces: { flexDirection: 'row' },
  face: { borderRadius: 22, borderWidth: 2, borderColor: systemGround.card },
  faceOver: { marginLeft: -12 },
  // The ground behind the button, so cards scrolling under it never show through its edges.
  foot: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: space.sm, backgroundColor: systemGround.ground },
  pill: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: systemGround.label },
  pillText: { fontSize: 16, fontWeight: '600', color: systemGround.ground },
});
