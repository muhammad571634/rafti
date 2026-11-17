import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { STILL_EYES_TOP, STILLS } from '@/assets/stills/registry';
import { portraitOf, type Picture } from '@/components/chat/chat-ground';
import { GlowCard } from '@/components/ink';
import { sceneLook } from '@/components/scenes/scene-look';
import { CharacterAvatar, SFIcon, Txt } from '@/components/ui';
import { localized } from '@/i18n/content';
import { currentMoments, isWrittenMoment, momentFeed, quotesOpening } from '@/lib/friend-moments';
import { stretchLeft } from '@/lib/portrait-focus';
import { weekKey } from '@/lib/quiz';
import { officialScenes } from '@/mock/scenes';
import { askFriendMoments, modelIsOn, useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';
import { ink, inkFace, inkRadius, inkType } from '@/theme/ink';
import type { Character, Scene } from '@/types';

import { useFriendAccent } from './kit';

const GAP = 12;
/** How much of the next card shows, so the row reads as a row. */
const PEEK = 36;
const CARD_MAX = 360;
/** The film still on top of a card, as a share of the card's width (16:9). */
const STILL = 0.5625;
/** The words under the still need at least this; the row keeps it while the friend writes, so the page below does not jump. */
const WORDS_MIN_HEIGHT = 236;
/** Where their face sits across the still: the middle, as no words lie on it (only the glyph, in a corner). */
const STILL_FACE_AT = 0.5;
/** The still melts into the card's ground. */
const MELT = [/^#[0-9a-f]{6}$/i.test(ink.card) ? `${ink.card}00` : 'rgba(0,0,0,0)', ink.card] as const;
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
  const stillHeight = Math.round(cardWidth * STILL);
  const minHeight = stillHeight + WORDS_MIN_HEIGHT;
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
        contentContainerStyle={[styles.row, { minHeight }]}>
        {waiting
          ? [0, 1].map((i) => <GhostCard key={i} width={cardWidth} stillHeight={stillHeight} />)
          : feed.map((scene) => (
              <MomentCard
                key={scene.id}
                scene={scene}
                character={character}
                width={cardWidth}
                stillHeight={stillHeight}
                // Their art on the moments they wrote, and on a stranger's page (the shop window: the art is
                // what sells); the app's and the user's scenes keep their glyph, so a friend's row is not one
                // face repeated.
                art={isWrittenMoment(scene) || !isFriend}
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

/**
 * One moment: a film still on top (its own picture, else their art, else its glyph on its tint), then
 * its title, where you both are, the first thing they say, and the way in. Every word sits on the card,
 * none on the picture, so all of it stays readable and is never cut.
 */
function MomentCard({
  scene,
  character,
  width,
  stillHeight,
  art,
  hue,
  quote,
  action,
  onPress,
}: {
  scene: Scene;
  character: Character;
  width: number;
  stillHeight: number;
  art: boolean;
  hue: string;
  quote: boolean;
  action: string;
  onPress: () => void;
}) {
  const picture = momentPicture(scene, character, width / stillHeight, art);
  return (
    <GlowCard hue={hue} onPress={onPress} accessibilityLabel={`${scene.title}. ${action}`} style={[styles.card, { width }]} contentStyle={styles.cardBody} lit={false}>
      <Still scene={scene} picture={picture} width={width} height={stillHeight} hue={hue} />
      <View style={styles.words}>
        {/* Never cut (HIG text rule, 0z258): a long card makes the row taller, the cards stretch to it. */}
        <Txt style={styles.cardTitle} maxFontSizeMultiplier={1.3}>
          {scene.title}
        </Txt>
        <Txt style={styles.setting} maxFontSizeMultiplier={1.3}>
          {scene.setting}
        </Txt>
        {quote ? (
          <View style={styles.said}>
            <CharacterAvatar character={character} size={28} />
            <View style={styles.bubble}>
              <Txt style={styles.line} maxFontSizeMultiplier={1.3}>
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
      </View>
    </GlowCard>
  );
}

/**
 * A moment's picture: its own, else the friend's drawn still for its mood (on any of their cards: it
 * is them in that moment), else their portrait where `art` asks for it, else none (the glyph).
 */
function momentPicture(scene: Scene, character: Character, aspect: number, art: boolean): Picture | undefined {
  if (scene.image) return { source: { uri: scene.image }, position: 'center' };
  const still = scene.still && STILLS[character.id]?.[scene.still];
  if (still != null) return { source: still, position: { left: '50%', top: STILL_EYES_TOP } };
  return art ? portraitOf(character, aspect, STILL_FACE_AT) : undefined;
}

/** The card's top: the picture melting into the card with the glyph as clear glass on its corner, or the glyph large on its tint. */
function Still({ scene, picture, width, height, hue }: { scene: Scene; picture?: Picture; width: number; height: number; hue: string }) {
  const look = sceneLook(scene);
  if (!picture) {
    return (
      <View style={[styles.still, { height }]}>
        <LinearGradient colors={[`${hue}66`, `${hue}10`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={MELT} locations={[0.55, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={styles.stillGlyph}>
          <SFIcon ios={look.ios} icon={look.icon} size={44} color={hue} />
        </View>
      </View>
    );
  }
  const stretch = picture.stretch ?? 1;
  return (
    <View style={[styles.still, { height }]}>
      <Image
        source={picture.source}
        contentPosition={picture.position}
        contentFit="cover"
        transition={150}
        style={stretch > 1 ? [styles.stretched, { width: width * stretch, left: stretchLeft(width, stretch, STILL_FACE_AT, picture.faceX) }] : StyleSheet.absoluteFill}
        accessible={false}
      />
      <LinearGradient colors={MELT} locations={[0.5, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={[styles.glyph, styles.glass]}>
        <SFIcon ios={look.ios} icon={look.icon} size={17} color={colors.onMedia} />
      </View>
    </View>
  );
}

/** A card's place while the friend writes: the card's own shape, breathing slowly (still with Reduce Motion). */
function GhostCard({ width, stillHeight }: { width: number; stillHeight: number }) {
  const still = useReducedMotion();
  const glow = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    glow.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [glow, still]);
  const breathing = useAnimatedStyle(() => ({ opacity: 0.55 + glow.value * 0.45 }));
  return (
    <Animated.View style={[styles.card, styles.ghost, { width }, breathing]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.still, styles.ghostStill, { height: stillHeight }]} />
      <View style={styles.words}>
        <View style={[styles.bar, styles.barTitle]} />
        <View style={styles.bar} />
        <View style={[styles.bar, styles.barShort]} />
        <View style={styles.grow} />
        <View style={[styles.pill, styles.ghostPill]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  wrap: { marginTop: 22 },
  title: { ...inkType.cardSmall, marginHorizontal: space.lg + 4, marginBottom: 10 },
  // Cards stretch to the tallest, so the row is one height whatever each card holds.
  row: { paddingHorizontal: space.lg, gap: GAP, alignItems: 'stretch' },
  card: {},
  cardBody: { flex: 1, padding: 0, gap: 0 },
  words: { flex: 1, paddingHorizontal: 18, paddingTop: 2, paddingBottom: 18, gap: 10 },
  still: { overflow: 'hidden' },
  stretched: { position: 'absolute', top: 0, bottom: 0 },
  stillGlyph: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  glyph: { width: 36, height: 36, borderRadius: inkRadius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: ink.raised },
  // Clear glass on the picture's corner, never an opaque capsule (project memory §3).
  glass: { position: 'absolute', top: 14, left: 14, backgroundColor: colors.onMediaGlass, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.onMediaHairline },
  cardTitle: inkType.card,
  setting: inkType.sub,
  said: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 4 },
  bubble: { flexShrink: 1, paddingHorizontal: 14, paddingVertical: 10, borderRadius: inkRadius.chip, borderBottomLeftRadius: 6, borderCurve: 'continuous', backgroundColor: ink.raised },
  line: inkType.body,
  pill: { minHeight: 48, marginTop: 6, borderRadius: inkRadius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18, backgroundColor: ink.raised },
  pillText: { ...inkFace('bodyStrong'), color: ink.text, flexShrink: 1 },
  ghost: { overflow: 'hidden', borderRadius: inkRadius.card, borderCurve: 'continuous', backgroundColor: ink.card, borderWidth: StyleSheet.hairlineWidth, borderColor: ink.edge },
  bar: { height: 14, borderRadius: 7, backgroundColor: ink.raised },
  barTitle: { height: 22, width: '62%', borderRadius: 11, marginBottom: 4 },
  barShort: { width: '78%' },
  ghostPill: { backgroundColor: ink.raised },
  ghostStill: { backgroundColor: ink.raised, marginBottom: 12 },
});
