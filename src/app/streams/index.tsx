import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { GlowCard, InkEm, InkScreen, InkText, PillButton } from '@/components/ink';
import { CharacterAvatar, EmptyState, GlassButton } from '@/components/ui';
import { useFriendName } from '@/hooks/use-friend-name';
import { relativeStamp } from '@/lib/format';
import { groupTitle } from '@/lib/group-chat';
import { isPlaying } from '@/lib/streams';
import { useAppStore } from '@/store/use-app-store';
import { systemColors } from '@/theme';
import { ink, inkGutter } from '@/theme/ink';
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
  const { t } = useTranslation();
  const router = useRouter();
  const streams = useAppStore((s) => s.streams);
  const characters = useAppStore((s) => s.characters);

  const startNew = () => router.push('/streams/new');

  return (
    <InkScreen
      title={t('streams.title')}
      subtitle={t('streams.empty')}
      right={streams.length ? <GlassButton icon="add" accessibilityLabel={t('streams.new')} onPress={startNew} /> : undefined}
      footer={<PillButton label={t('streams.new')} onPress={startNew} />}>
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
    </InkScreen>
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
    <GlowCard hue={hue} onPress={onPress} accessibilityLabel={[live ? t('streams.live') : relativeStamp(stream.createdAt), stream.topic, names].join(', ')} style={styles.card} contentStyle={styles.cardBody}>
      <View style={styles.cardTop}>
        {live ? <View style={styles.liveDot} /> : null}
        <InkText variant="footnote" lines={1} style={styles.when}>
          {live ? t('streams.live') : relativeStamp(stream.createdAt)}
        </InkText>
        {live ? (
          <View style={styles.goOn}>
            <InkText variant="subStrong">{t('streams.goOn')}</InkText>
          </View>
        ) : null}
      </View>
      <View style={styles.cardBottom}>
        <InkText variant="cardSmall" lines={2} style={styles.topic}>
          {head}
          {tail ? <InkEm color={hue}>{tail}</InkEm> : null}
        </InkText>
        <View style={styles.faces}>
          {pair.slice(0, 2).map((c, i) => (
            <View key={c.id} style={[styles.face, i > 0 && styles.faceOver]}>
              <CharacterAvatar character={c} size={40} />
            </View>
          ))}
        </View>
      </View>
    </GlowCard>
  );
}

const styles = StyleSheet.create({
  cards: { marginHorizontal: inkGutter, gap: 12 },
  card: { minHeight: 120 },
  cardBody: { flex: 1, justifyContent: 'space-between', gap: 18 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: ink.danger },
  when: { flex: 1 },
  goOn: { minHeight: 28, paddingHorizontal: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: ink.raised },
  cardBottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  topic: { flex: 1 },
  faces: { flexDirection: 'row' },
  face: { borderRadius: 22, borderWidth: 2, borderColor: ink.card },
  faceOver: { marginLeft: -12 },
});
