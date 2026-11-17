import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { GlowCard } from '@/components/ink';
import { sceneLook } from '@/components/scenes/scene-look';
import { CharacterAvatar, SFIcon, Txt } from '@/components/ui';
import { localized } from '@/i18n/content';
import { currentMoments, isWrittenMoment, momentFeed, quotesOpening } from '@/lib/friend-moments';
import { weekKey } from '@/lib/quiz';
import { officialScenes } from '@/mock/scenes';
import { askFriendMoments, modelIsOn, useAppStore } from '@/store/use-app-store';
import { space } from '@/theme';
import { ink, inkFace, inkRadius, inkType } from '@/theme/ink';
import type { Character, Scene } from '@/types';

import { useFriendAccent } from './kit';

const GAP = 12;
/** How much of the next card shows, so the row reads as a row. */
const PEEK = 36;
const CARD_MAX = 360;
/** The row keeps this height while the friend is still writing, so the page below does not jump. */
const CARD_MIN_HEIGHT = 292;
/** A friend still writing after this long: the app's scenes show, and theirs wait for the next visit. */
const WAIT_MS = 12_000;

/**
 * Moments to step into, on a friend's page (`src/lib/friend-moments.ts`): a row of cards, each a small
 * scene with this friend and one action, Continue in chat. A friend's own (written by them for the
 * week, with the first thing they say) come first; the user's scenes and the app's follow. While a
 * friend is writing, two quiet cards hold the room.
 */
export function FriendMoments({ character, isFriend, onContinue }: { character: Character; isFriend: boolean; onContinue: (scene: Scene) => void }) {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const accent = useFriendAccent();
  const own = useAppStore((s) => s.scenes);
  const kept = useAppStore((s) => s.friendMoments[character.id]);
  // Read with the setting so the row follows the Development switch.
  const modelOn = !!useAppStore((s) => s.settings.realAi) && !!modelIsOn();
  const week = useMemo(() => weekKey(new Date()), []);
  const written = currentMoments(kept, week, i18n.language);
  const mayAsk = isFriend && modelOn && written.length === 0;

  const [waiting, setWaiting] = useState(mayAsk);
  // The app's scenes are already on screen: theirs must not swap in under the finger.
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (!mayAsk) return setWaiting(false);
    let alive = true;
    setWaiting(true);
    const timer = setTimeout(() => {
      if (!alive) return;
      setLate(true);
      setWaiting(false);
    }, WAIT_MS);
    void askFriendMoments(character.id).then((scenes) => {
      clearTimeout(timer);
      if (!alive) return;
      // None came (busy, or an older server): the app's scenes stay for this visit.
      if (!scenes) setLate(true);
      setWaiting(false);
    });
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // `mayAsk` turns false once theirs are kept; asking is per friend.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.id, mayAsk]);

  const feed = useMemo(() => momentFeed(late ? [] : written, own, localized('scenes', officialScenes)), [late, written, own]);
  const cardWidth = Math.min(width - space.lg * 2 - PEEK, CARD_MAX);
  if (!waiting && !feed.length) return null;

  return (
    <View style={styles.wrap}>
      <Txt style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
        {t('scenes.title')}
      </Txt>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + GAP}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={styles.row}>
        {waiting
          ? [0, 1].map((i) => <GhostCard key={i} width={cardWidth} />)
          : feed.map((scene) => (
              <MomentCard
                key={scene.id}
                scene={scene}
                character={character}
                width={cardWidth}
                hue={isWrittenMoment(scene) ? (accent?.strong ?? sceneLook(scene).fill) : sceneLook(scene).fill}
                quote={quotesOpening(scene, modelOn)}
                action={t('scenes.continue')}
                onPress={() => onContinue(scene)}
              />
            ))}
      </ScrollView>
    </View>
  );
}

/** One moment: its glyph and title, where you both are, the first thing they say, and the way in. */
function MomentCard({
  scene,
  character,
  width,
  hue,
  quote,
  action,
  onPress,
}: {
  scene: Scene;
  character: Character;
  width: number;
  hue: string;
  quote: boolean;
  action: string;
  onPress: () => void;
}) {
  const look = sceneLook(scene);
  return (
    <GlowCard hue={hue} onPress={onPress} accessibilityLabel={`${scene.title}. ${action}`} style={[styles.card, { width }]} contentStyle={styles.cardBody}>
      <View style={styles.glyph}>
        <SFIcon ios={look.ios} icon={look.icon} size={17} color={hue} />
      </View>
      <Txt style={styles.cardTitle} lines={2} maxFontSizeMultiplier={1.3}>
        {scene.title}
      </Txt>
      <Txt style={styles.setting} lines={quote ? 3 : 6} maxFontSizeMultiplier={1.3}>
        {scene.setting}
      </Txt>
      {quote ? (
        <View style={styles.said}>
          <CharacterAvatar character={character} size={28} />
          <View style={styles.bubble}>
            <Txt style={styles.line} lines={4} maxFontSizeMultiplier={1.3}>
              {scene.opening}
            </Txt>
          </View>
        </View>
      ) : null}
      <View style={styles.grow} />
      {/* The whole card is the button; this is its label, drawn as the pill it would be. */}
      <View style={styles.pill}>
        <SFIcon ios="bubble.left.fill" icon="chatbubble" size={16} color={ink.text} />
        <Txt style={styles.pillText} lines={1} maxFontSizeMultiplier={1.2}>
          {action}
        </Txt>
      </View>
    </GlowCard>
  );
}

/** A card's place while the friend writes: the card's own shape, breathing slowly (still with Reduce Motion). */
function GhostCard({ width }: { width: number }) {
  const still = useReducedMotion();
  const glow = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    glow.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [glow, still]);
  const breathing = useAnimatedStyle(() => ({ opacity: 0.55 + glow.value * 0.45 }));
  return (
    <Animated.View style={[styles.card, styles.ghost, { width }, breathing]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.glyph} />
      <View style={[styles.bar, styles.barTitle]} />
      <View style={styles.bar} />
      <View style={[styles.bar, styles.barShort]} />
      <View style={styles.grow} />
      <View style={[styles.pill, styles.ghostPill]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  wrap: { marginTop: 22 },
  title: { ...inkType.cardSmall, marginHorizontal: space.lg + 4, marginBottom: 10 },
  // Cards stretch to the tallest, so the row is one height whatever each card holds.
  row: { paddingHorizontal: space.lg, gap: GAP, alignItems: 'stretch', minHeight: CARD_MIN_HEIGHT },
  card: { minHeight: CARD_MIN_HEIGHT },
  cardBody: { flex: 1, padding: 18, gap: 10 },
  glyph: { width: 36, height: 36, borderRadius: inkRadius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: ink.raised },
  cardTitle: { ...inkType.card, marginTop: 2 },
  setting: inkType.sub,
  said: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 4 },
  bubble: { flexShrink: 1, paddingHorizontal: 14, paddingVertical: 10, borderRadius: inkRadius.chip, borderBottomLeftRadius: 6, borderCurve: 'continuous', backgroundColor: ink.raised },
  line: inkType.body,
  pill: { minHeight: 48, marginTop: 6, borderRadius: inkRadius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18, backgroundColor: ink.raised },
  pillText: { ...inkFace('bodyStrong'), color: ink.text, flexShrink: 1 },
  ghost: { padding: 18, gap: 12, borderRadius: inkRadius.card, borderCurve: 'continuous', backgroundColor: ink.card, borderWidth: StyleSheet.hairlineWidth, borderColor: ink.edge },
  bar: { height: 14, borderRadius: 7, backgroundColor: ink.raised },
  barTitle: { height: 22, width: '62%', borderRadius: 11, marginBottom: 4 },
  barShort: { width: '78%' },
  ghostPill: { backgroundColor: ink.raised },
});
