import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { GlowCard } from '@/components/ink';
import { MomentShareSheet } from '@/components/share/moment-poster';
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
import { MOMENT_FACE_AT, momentPicture } from './moment-picture';

const GAP = 12;
/** How much of the next card shows, so the row reads as a row. */
const PEEK = 36;
const CARD_MAX = 360;
/** A card is a tall picture (2:3, Character.AI's moments); a card with long words grows taller, never cuts them. */
const CARD_RATIO = 1.5;
/** Dark under the glass on top, clear over the face, dark under the words (white words on a picture, HIG legibility). */
const SCRIM = ['rgba(0,0,0,0.3)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.72)', 'rgba(0,0,0,0.92)'] as const;
const SCRIM_AT = [0, 0.16, 0.3, 0.5, 1] as const;
/** The top of a card stays picture, never words: long words (Russian, German) make the card taller instead (A51 2026-11-17). */
const PICTURE_SHARE = 0.42;
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
  const [sharing, setSharing] = useState<Scene | null>(null);
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
  const minHeight = Math.round(cardWidth * CARD_RATIO);
  if (!waiting && !feed.length) return null;

  return (
    <View style={styles.wrap}>
      <Txt style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.6}>
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
          ? [0, 1].map((i) => <GhostCard key={i} width={cardWidth} height={minHeight} />)
          : feed.map((scene) => (
              <MomentCard
                key={scene.id}
                scene={scene}
                character={character}
                width={cardWidth}
                height={minHeight}
                // Their art on the moments they wrote, and on a stranger's page (the shop window: the art is
                // what sells); the app's and the user's scenes keep their glyph, so a friend's row is not one
                // face repeated.
                art={isWrittenMoment(scene) || !isFriend}
                hue={isWrittenMoment(scene) ? (accent?.strong ?? sceneLook(scene).fill) : sceneLook(scene).fill}
                quote={quotesOpening(scene, modelOn)}
                action={t('scenes.continue')}
                // Written for the two of them this week: the one mark Character.AI's strangers' posts cannot have.
                badge={isWrittenMoment(scene) ? t('scenes.thisWeek') : undefined}
                shareLabel={t('common.share')}
                onPress={() => onContinue(scene)}
                onShare={() => setSharing(scene)}
              />
            ))}
      </ScrollView>
      <MomentShareSheet scene={sharing} character={character} onClose={() => setSharing(null)} />
    </View>
  );
}

/**
 * One moment, as a tall picture (owner 2026-11-17, Character.AI's shape in our look,
 * `docs/prototypes/moment-cards.html`): its own picture, else their drawn still or portrait, else its
 * glyph on its tint; clear glass on top (the mark or glyph, Share); over a dark foot its title, where
 * you both are, the first thing they say in dark glass, and Continue in chat as a glass pill. Every
 * word is shown whole: long words make the card taller and the row follows.
 */
function MomentCard({
  scene,
  character,
  width,
  height,
  art,
  hue,
  quote,
  action,
  badge,
  shareLabel,
  onPress,
  onShare,
}: {
  scene: Scene;
  character: Character;
  width: number;
  height: number;
  art: boolean;
  hue: string;
  quote: boolean;
  action: string;
  badge?: string;
  shareLabel: string;
  onPress: () => void;
  onShare: () => void;
}) {
  const picture = momentPicture(scene, character, width / height, art);
  const look = sceneLook(scene);
  const stretch = picture?.stretch ?? 1;
  return (
    <GlowCard hue={hue} onPress={onPress} accessibilityLabel={`${scene.title}. ${action}`} style={[styles.card, { width, minHeight: height }]} contentStyle={styles.cardBody} lit={false}>
      {picture ? (
        <Image
          source={picture.source}
          contentPosition={picture.position}
          contentFit="cover"
          transition={150}
          recyclingKey={scene.id}
          style={stretch > 1 ? [styles.stretched, { width: width * stretch, left: stretchLeft(width, stretch, MOMENT_FACE_AT, picture.faceX) }] : StyleSheet.absoluteFill}
          accessible={false}
        />
      ) : (
        <>
          <LinearGradient colors={[hue, `${hue}4D`, ink.card]} locations={[0, 0.5, 1]} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={[styles.bigGlyph, { height: height * 0.5 }]} pointerEvents="none">
            <SFIcon ios={look.ios} icon={look.icon} size={64} color={colors.onMedia} />
          </View>
        </>
      )}
      <LinearGradient colors={SCRIM} locations={SCRIM_AT} style={StyleSheet.absoluteFill} pointerEvents="none" />

      <View style={styles.top} pointerEvents="box-none">
        {badge ? (
          <View style={[styles.glassLook, styles.badge, { backgroundColor: `${hue}8C` }]}>
            <SFIcon ios="sparkles" icon="sparkles" size={14} color={colors.onMedia} />
            <Txt style={styles.badgeText} lines={1} maxFontSizeMultiplier={1.2}>
              {badge}
            </Txt>
          </View>
        ) : picture ? (
          <View style={[styles.round, styles.glassLook]}>
            <SFIcon ios={look.ios} icon={look.icon} size={17} color={colors.onMedia} />
          </View>
        ) : (
          <View />
        )}
        {/* Its own button over the card's: a share, never a Continue (HIG: one action per control). */}
        <Pressable onPress={onShare} hitSlop={8} accessibilityRole="button" accessibilityLabel={shareLabel} style={({ pressed }) => [styles.round, styles.glassLook, pressed && styles.pressed]}>
          <SFIcon ios="square.and.arrow.up" icon="share-outline" size={18} color={colors.onMedia} />
        </Pressable>
      </View>

      <View style={{ height: Math.round(height * PICTURE_SHARE) }} />
      <View style={styles.words}>
        <Txt style={styles.cardTitle} maxFontSizeMultiplier={1.5}>
          {scene.title}
        </Txt>
        <Txt style={styles.setting} maxFontSizeMultiplier={1.6}>
          {scene.setting}
        </Txt>
        {quote ? (
          <View style={styles.said}>
            <CharacterAvatar character={character} size={28} />
            <View style={styles.bubble}>
              <Txt style={styles.line} maxFontSizeMultiplier={1.6}>
                {scene.opening}
              </Txt>
            </View>
          </View>
        ) : null}
        {/* The whole card is the button; this is its label, drawn as the glass pill it would be. */}
        <View style={[styles.pill, styles.glassLook]}>
          <SFIcon ios="bubble.left.fill" icon="chatbubble" size={16} color={colors.onMedia} />
          <Txt style={styles.pillText} lines={1} maxFontSizeMultiplier={1.3}>
            {action}
          </Txt>
        </View>
      </View>
    </GlowCard>
  );
}

/** A card's place while the friend writes: the card's own shape, breathing slowly (still with Reduce Motion). */
function GhostCard({ width, height }: { width: number; height: number }) {
  const still = useReducedMotion();
  const glow = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    glow.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [glow, still]);
  const breathing = useAnimatedStyle(() => ({ opacity: 0.55 + glow.value * 0.45 }));
  return (
    <Animated.View style={[styles.ghost, { width, minHeight: height }, breathing]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.words}>
        <View style={[styles.bar, styles.barTitle]} />
        <View style={styles.bar} />
        <View style={[styles.bar, styles.barShort]} />
        <View style={[styles.pill, styles.ghostPill]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 22 },
  title: { ...inkType.cardSmall, marginHorizontal: space.lg + 4, marginBottom: 10 },
  // Cards stretch to the tallest, so the row is one height whatever each card holds.
  row: { paddingHorizontal: space.lg, gap: GAP, alignItems: 'stretch' },
  card: {},
  cardBody: { flex: 1, padding: 0, gap: 0, justifyContent: 'flex-end' },
  stretched: { position: 'absolute', top: 0, bottom: 0 },
  bigGlyph: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', opacity: 0.9 },
  top: { position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  // Clear glass on a picture, never an opaque capsule or a white button (project memory §3).
  glassLook: { backgroundColor: colors.onMediaGlass, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.onMediaHairline },
  round: { width: 40, height: 40, borderRadius: inkRadius.pill, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  badge: { flexShrink: 1, height: 36, borderRadius: inkRadius.pill, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12 },
  badgeText: { ...inkFace('bodyStrong'), fontSize: 13, lineHeight: 17, color: colors.onMedia, flexShrink: 1 },
  words: { padding: 18, gap: 10 },
  cardTitle: { ...inkType.card, fontSize: 24, lineHeight: 29, color: colors.onMedia, ...shadow(6) },
  setting: { ...inkType.sub, color: colors.onMediaSoft, ...shadow(4) },
  said: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 2 },
  // Their line on a picture: dark glass under white words (as the Today card does).
  bubble: { flexShrink: 1, paddingHorizontal: 14, paddingVertical: 10, borderRadius: inkRadius.chip, borderBottomLeftRadius: 6, borderCurve: 'continuous', backgroundColor: colors.onMediaBubble },
  line: { ...inkType.body, color: colors.onMedia },
  pill: { minHeight: 48, marginTop: 4, borderRadius: inkRadius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18 },
  pillText: { ...inkFace('bodyStrong'), color: colors.onMedia, flexShrink: 1 },
  ghost: { overflow: 'hidden', justifyContent: 'flex-end', borderRadius: inkRadius.card, borderCurve: 'continuous', backgroundColor: ink.card, borderWidth: StyleSheet.hairlineWidth, borderColor: ink.edge },
  bar: { height: 14, borderRadius: 7, backgroundColor: ink.raised },
  barTitle: { height: 22, width: '62%', borderRadius: 11, marginBottom: 4 },
  barShort: { width: '78%' },
  ghostPill: { backgroundColor: ink.raised },
});

/** A soft shadow under white words on a picture, so a bright patch never swallows them. */
function shadow(radius: number) {
  return { textShadowColor: colors.onMediaShadow, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: radius };
}
