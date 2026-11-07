import { Ionicons } from '@expo/vector-icons';
import { Canvas, Circle, Group, Path, RadialGradient, Skia, vec } from '@shopify/react-native-skia';
import { createAudioPlayer } from 'expo-audio';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { portraitOf } from '@/components/chat/chat-ground';
import { characterImage } from '@/components/ui/avatar';
import { Txt } from '@/components/ui';
import { phrase } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { tierForLevel } from '@/mock/user';
import type { LevelUpEvent } from '@/store/use-app-store';
import { colors, palette } from '@/theme';
import type { Character } from '@/types';

import { Confetti } from './confetti';
import { easeOut, seg, spring } from './motion';

/*
 "Closer": the relationship's level-up as a moment with the friend, not a badge. Built on Native
 Cook's Level Up Takeover (one clock, the closed-form springs, the sunburst, the confetti physics,
 the shine) and remade around the person:

 The chat dims to their picture, dark and out of focus, with one warm point of light. It bursts:
 the picture comes into focus and the room lights up (the sky parting, after the owner's Pinterest
 reference), their face springs out of the light in a white bezel while the bond's mint ring fills
 around it, a slow sunburst turns behind, hearts and paper fly, four chimes climb (earshot's
 mallet/up4, its top note on the burst) and the phone answers with a success tap. The level rolls
 over to the new number, the stage's name arrives ("More than friends"), then "{name} feels a little
 closer to you", and a chapter of their story when this level opens one. Continue rises on a
 spring; a band of light sweeps the face; a second, smaller burst. Reduced motion: fades, no
 confetti, no turning rays.
*/

// The timeline, in seconds.
const BURST_AT = 0.6;
const SOUND_AT = BURST_AT - 0.34; // the chime's loudest note lands on the burst
const FOCUS_IN = 0.9;
const RING_AT = 0.85;
const RING_FOR = 0.8;
const GLOW_AT = 1.0;
const GLOW_FOR = 0.6;
const ROLL_AT = 1.3;
const TITLE_AT = 1.5;
const TITLE_IN = 0.4;
const CARD_AT = 1.9;
const CTA_AT = 2.5;
const SECOND_BURST_AT = 2.9;
const SECOND_BURST_COUNT = 18;
const SHINE_AT = 3.3;
const SHINE_FOR = 0.6;
const END = 4.2;
const LEAVE_MS = 320;
const REDUCED_FADE = 0.3;
// The face bursts out on a bouncy spring: damping ratio 0.55.
const FACE_STIFFNESS = 220;
const FACE_DAMPING = 16.3;
const FACE_FROM = 0.2;
const CTA_STIFFNESS = 200;
const CTA_DAMPING = 22;
const SLIDE = 16;
const CTA_SLIDE = 40;

const FACE = 152;
const BEZEL = 8;
const RING = FACE + BEZEL * 2 + 22;
const RING_W = 5;
const DOT = 12;
const GLOW = 440;
const RAYS = 14;
const RAY_SIZE = 520;
const RAY_TURN = 0.12; // radians a second
const CTA_HEIGHT = 56;
const MARGIN = 24;

const RAY_PATH = (() => {
  const b = Skia.PathBuilder.Make();
  const c = RAY_SIZE / 2;
  const half = Math.PI / RAYS / 1.6;
  for (let i = 0; i < RAYS; i++) {
    const a = (i / RAYS) * Math.PI * 2;
    b.moveTo(c, c);
    b.lineTo(c + Math.cos(a - half) * c, c + Math.sin(a - half) * c);
    b.lineTo(c + Math.cos(a + half) * c, c + Math.sin(a + half) * c);
    b.close();
  }
  return b.build();
})();

/** The bond's ring, starting at twelve o'clock. */
const RING_PATH = (() => {
  const b = Skia.PathBuilder.Make();
  const r = RING / 2 - RING_W;
  b.addArc({ x: RING / 2 - r, y: RING / 2 - r, width: r * 2, height: r * 2 }, -90, 359.9);
  return b.build();
})();

export interface LevelUpTakeoverProps {
  event: LevelUpEvent | null;
  character: Character;
  characterName: string;
  onClose: () => void;
}

export function LevelUpTakeover({ event, character, characterName, onClose }: LevelUpTakeoverProps) {
  if (!event) return null;
  return <Moment event={event} character={character} characterName={characterName} onClose={onClose} />;
}

function Moment({ event, character, characterName, onClose }: LevelUpTakeoverProps & { event: LevelUpEvent }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const clock = useSharedValue(0);
  const turn = useSharedValue(0);
  const leave = useSharedValue(0);

  const picture = useMemo(() => portraitOf(character, width / height), [character, width, height]);
  const face = characterImage(character);
  const tier = tierForLevel(event.level);
  // A chapter of their story that this level opens, else the new names a new stage brings.
  const chapter = character.arc?.beats.find((b) => b.atLevel === event.level);
  const note = chapter
    ? t('us.momentText.arc', { title: phrase(chapter.title) })
    : event.level === tier.from && tier.labels.length
      ? t('levelUp.unlocked')
      : null;

  const faceY = Math.max(insets.top + 170, height * 0.34);
  const levelTop = faceY + FACE / 2 + BEZEL - 14;
  const titleTop = faceY + RING / 2 + 34;
  const ctaBottom = insets.bottom + 24;

  useEffect(() => {
    clock.set(withTiming(END, { duration: END * 1000, easing: Easing.linear, reduceMotion: ReduceMotion.Never }));
    if (!reduced) turn.set(withRepeat(withTiming(Math.PI * 2, { duration: (Math.PI * 2 * 1000) / RAY_TURN, easing: Easing.linear }), -1, false));
    // The chime, timed so its top note lands on the burst; it follows the phone's silent switch.
    const chime = createAudioPlayer(require('@/assets/sounds/level-up.wav'));
    chime.volume = 0.8;
    const timers = [
      setTimeout(() => chime.play(), SOUND_AT * 1000),
      setTimeout(() => haptic.success(), BURST_AT * 1000),
      setTimeout(() => haptic.selection(), TITLE_AT * 1000),
      setTimeout(() => haptic.tap(), CTA_AT * 1000),
    ];
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimation(clock);
      cancelAnimation(turn);
      chime.remove();
    };
    // Plays once per moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    haptic.tap();
    leave.set(withTiming(1, { duration: LEAVE_MS, easing: Easing.out(Easing.cubic) }, (done) => {
      if (done) scheduleOnRN(onClose);
    }));
  };

  /* ------------------------------------------------------------ the room */
  const rootStyle = useAnimatedStyle(() => ({ opacity: 1 - leave.get() }));
  // Out of focus and dark until the burst, then their picture comes clear and the room lights up.
  const blurStyle = useAnimatedStyle(() => ({ opacity: 1 - easeOut(seg(clock.get(), BURST_AT, BURST_AT + FOCUS_IN)) }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: 0.86 - 0.32 * easeOut(seg(clock.get(), BURST_AT, BURST_AT + FOCUS_IN)) }));
  const dotStyle = useAnimatedStyle(() => {
    const t = clock.get();
    const gone = seg(t, BURST_AT, BURST_AT + 0.2);
    return { opacity: 1 - gone, transform: [{ scale: 1 + 0.25 * Math.sin(t * 9) * (1 - gone) }] };
  });
  const glowStyle = useAnimatedStyle(() => {
    const t = clock.get();
    const on = seg(t, BURST_AT, BURST_AT + 0.3);
    const p = seg(t, GLOW_AT, GLOW_AT + GLOW_FOR);
    return {
      opacity: on * (reduced ? 0.5 : 0.5 + 0.5 * Math.sin(Math.PI * p) * (1 - p) * 2),
      transform: [{ scale: reduced ? 1 : 1 + 0.3 * easeOut(p) }],
    };
  });
  const raysStyle = useAnimatedStyle(() => {
    const p = reduced ? seg(clock.get(), BURST_AT, BURST_AT + REDUCED_FADE) : easeOut(seg(clock.get(), BURST_AT, BURST_AT + 0.6));
    return { opacity: 0.55 * p, transform: [{ scale: reduced ? 1 : 0.6 + 0.4 * p }] };
  });
  const rayTurn = useDerivedValue(() => [{ rotate: turn.get() }]);

  /* ------------------------------------------------------------ the friend */
  const faceStyle = useAnimatedStyle(() => {
    const t = clock.get();
    if (reduced) return { opacity: seg(t, BURST_AT, BURST_AT + REDUCED_FADE) };
    const pop = t < BURST_AT ? 0 : FACE_FROM + (1 - FACE_FROM) * spring(t - BURST_AT, FACE_STIFFNESS, FACE_DAMPING);
    return { opacity: t < BURST_AT ? 0 : 1, transform: [{ scale: pop }] };
  });
  const ringEnd = useDerivedValue(() => easeOut(seg(clock.get(), RING_AT, RING_AT + RING_FOR)));
  const shineStyle = useAnimatedStyle(() => {
    const p = seg(clock.get(), SHINE_AT, SHINE_AT + SHINE_FOR);
    return { opacity: p > 0 && p < 1 ? 1 : 0, transform: [{ translateX: -FACE + p * FACE * 2 }, { rotate: '20deg' }] };
  });
  const oldLevel = useAnimatedStyle(() => {
    const p = reduced ? seg(clock.get(), ROLL_AT, ROLL_AT + REDUCED_FADE) : easeOut(seg(clock.get(), ROLL_AT, ROLL_AT + 0.35));
    return { opacity: 1 - p, transform: [{ translateY: reduced ? 0 : -18 * p }] };
  });
  const newLevel = useAnimatedStyle(() => {
    const p = reduced ? seg(clock.get(), ROLL_AT, ROLL_AT + REDUCED_FADE) : easeOut(seg(clock.get(), ROLL_AT, ROLL_AT + 0.35));
    return { opacity: p, transform: [{ translateY: reduced ? 0 : 18 * (1 - p) }] };
  });
  const chipStyle = useAnimatedStyle(() => ({ opacity: seg(clock.get(), BURST_AT + 0.25, BURST_AT + 0.5) }));

  /* ------------------------------------------------------------ the words */
  const rise = (at: number, by = SLIDE) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => {
      const p = easeOut(seg(clock.get(), at, at + TITLE_IN));
      return { opacity: p, transform: [{ translateY: reduced ? 0 : (1 - p) * by }] };
    });
  const titleStyle = rise(TITLE_AT);
  const subtitleStyle = rise(TITLE_AT + 0.08);
  const noteStyle = rise(CARD_AT);
  const ctaStyle = useAnimatedStyle(() => {
    const t = clock.get();
    const into = reduced ? seg(t, CTA_AT, CTA_AT + REDUCED_FADE) : Math.min(1, spring(t - CTA_AT, CTA_STIFFNESS, CTA_DAMPING));
    return { opacity: Math.min(1, into * 3), transform: [{ translateY: reduced ? 0 : (1 - into) * CTA_SLIDE }] };
  });

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <Animated.View style={[styles.fill, rootStyle]}>
        {/* their picture: dark and blurred, then clear */}
        <View style={[StyleSheet.absoluteFill, styles.ink]} />
        {picture ? (
          <>
            <Image source={picture.source} contentFit="cover" contentPosition={picture.position} style={StyleSheet.absoluteFill} />
            <Animated.View style={[StyleSheet.absoluteFill, blurStyle]}>
              <Image source={picture.source} contentFit="cover" contentPosition={picture.position} blurRadius={30} style={StyleSheet.absoluteFill} />
            </Animated.View>
          </>
        ) : null}
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]} />

        <Animated.View pointerEvents="none" style={[styles.at, { left: width / 2 - GLOW / 2, top: faceY - GLOW / 2 }, glowStyle]}>
          <Canvas style={{ width: GLOW, height: GLOW }}>
            <Circle cx={GLOW / 2} cy={GLOW / 2} r={GLOW / 2}>
              <RadialGradient c={vec(GLOW / 2, GLOW / 2)} r={GLOW / 2} colors={['rgba(255,214,170,0.85)', 'rgba(255,179,122,0.25)', 'rgba(255,179,122,0)']} positions={[0, 0.45, 1]} />
            </Circle>
          </Canvas>
        </Animated.View>

        <Animated.View pointerEvents="none" style={[styles.at, { left: width / 2 - RAY_SIZE / 2, top: faceY - RAY_SIZE / 2 }, raysStyle]}>
          <Canvas style={{ width: RAY_SIZE, height: RAY_SIZE }}>
            <Group transform={rayTurn} origin={vec(RAY_SIZE / 2, RAY_SIZE / 2)}>
              <Path path={RAY_PATH}>
                <RadialGradient c={vec(RAY_SIZE / 2, RAY_SIZE / 2)} r={RAY_SIZE / 2} colors={['rgba(255,240,228,0.9)', 'rgba(255,240,228,0.3)', 'rgba(255,240,228,0)']} positions={[0, 0.45, 1]} />
              </Path>
            </Group>
          </Canvas>
        </Animated.View>

        <Animated.View pointerEvents="none" style={[styles.dot, { left: width / 2 - DOT / 2, top: faceY - DOT / 2 }, dotStyle]} />

        {/* their face in the light, the bond's ring filling round it */}
        <Animated.View pointerEvents="none" style={[styles.at, { left: width / 2 - RING / 2, top: faceY - RING / 2 }, faceStyle]}>
          <Canvas style={{ width: RING, height: RING }}>
            <Circle cx={RING / 2} cy={RING / 2} r={RING / 2 - RING_W} style="stroke" strokeWidth={RING_W} color="rgba(255,255,255,0.22)" />
            <Path path={RING_PATH} style="stroke" strokeWidth={RING_W} strokeCap="round" color={palette.mint400} start={0} end={ringEnd} />
          </Canvas>
          <View style={styles.bezel}>
            <View style={styles.face}>
              {face != null ? (
                <Image source={typeof face === 'string' ? { uri: face } : face} contentFit="cover" style={StyleSheet.absoluteFill} />
              ) : null}
              <Animated.View style={[styles.shine, shineStyle]}>
                <LinearGradient
                  colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            </View>
          </View>
        </Animated.View>

        {/* the level, rolling over to the new number */}
        <Animated.View pointerEvents="none" style={[styles.levelChip, { top: levelTop, left: width / 2 - 36 }, chipStyle]}>
          <Ionicons name="heart" size={12} color={palette.mint500} />
          <View style={styles.levelRoll}>
            <Animated.View style={[styles.levelSlot, oldLevel]}>
              <Txt style={styles.levelText}>{t('home.hero.level', { level: Math.max(0, event.level - 1) })}</Txt>
            </Animated.View>
            <Animated.View style={[styles.levelSlot, newLevel]}>
              <Txt style={styles.levelText}>{t('home.hero.level', { level: event.level })}</Txt>
            </Animated.View>
          </View>
        </Animated.View>

        <Animated.View pointerEvents="none" style={[styles.words, { top: titleTop }, titleStyle]}>
          <Txt style={styles.title} center>
            {phrase(event.levelTitle)}
          </Txt>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.words, { top: titleTop + 48 }, subtitleStyle]}>
          <Txt style={styles.subtitle} center>
            {t('levelUp.subtitle', { name: characterName })}
          </Txt>
        </Animated.View>
        {note ? (
          <Animated.View pointerEvents="none" style={[styles.noteWrap, { top: titleTop + 108 }, noteStyle]}>
            <View style={styles.note}>
              <Ionicons name={chapter ? 'book' : 'heart'} size={15} color={palette.apricot200} />
              <Txt style={styles.noteText} lines={2}>
                {note}
              </Txt>
            </View>
          </Animated.View>
        ) : null}

        <Animated.View style={[styles.ctaSlot, { bottom: ctaBottom }, ctaStyle]}>
          <Pressable style={styles.fill} onPress={close} accessibilityRole="button" accessibilityLabel={t('onboarding.continue')}>
            <LinearGradient colors={[palette.apricot300, palette.apricot400, palette.apricot500]} locations={[0, 0.55, 1]} style={styles.cta}>
              <Txt style={styles.ctaLabel}>{t('onboarding.continue')}</Txt>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {!reduced && <Confetti clock={clock} at={BURST_AT} x={width / 2} y={faceY} />}
        {!reduced && <Confetti clock={clock} at={SECOND_BURST_AT} x={width / 2} y={faceY} count={SECOND_BURST_COUNT} />}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  ink: { backgroundColor: '#0E0B12' },
  scrim: { backgroundColor: '#120C10' },
  at: { position: 'absolute' },
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: palette.apricot300,
    boxShadow: '0 0 18px 6px rgba(255,179,122,0.75)',
  },
  bezel: {
    position: 'absolute',
    left: (RING - FACE) / 2 - BEZEL,
    top: (RING - FACE) / 2 - BEZEL,
    width: FACE + BEZEL * 2,
    height: FACE + BEZEL * 2,
    borderRadius: (FACE + BEZEL * 2) / 2,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 16px 40px rgba(255,140,80,0.35)',
  },
  face: { width: FACE, height: FACE, borderRadius: FACE / 2, overflow: 'hidden', backgroundColor: palette.apricot100 },
  shine: { position: 'absolute', top: -FACE / 2, width: FACE * 0.45, height: FACE * 2 },
  levelChip: {
    position: 'absolute',
    width: 72,
    height: 28,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.white,
    boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
  },
  levelRoll: { height: 18, minWidth: 38, overflow: 'hidden' },
  levelSlot: { position: 'absolute', left: 0, right: 0, height: 18, justifyContent: 'center' },
  levelText: { fontSize: 13, lineHeight: 16, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  words: { position: 'absolute', left: 32, right: 32 },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '900', letterSpacing: -0.5, color: colors.white },
  subtitle: { fontSize: 16, lineHeight: 22, fontWeight: '500', color: 'rgba(255,255,255,0.82)' },
  noteWrap: { position: 'absolute', left: MARGIN, right: MARGIN, alignItems: 'center' },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '100%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  noteText: { flexShrink: 1, fontSize: 15, lineHeight: 20, fontWeight: '600', color: colors.white },
  ctaSlot: {
    position: 'absolute',
    left: MARGIN,
    right: MARGIN,
    height: CTA_HEIGHT,
    borderRadius: CTA_HEIGHT / 2,
    boxShadow: '0 12px 28px rgba(255,138,78,0.45)',
  },
  cta: { flex: 1, borderRadius: CTA_HEIGHT / 2, alignItems: 'center', justifyContent: 'center' },
  ctaLabel: { fontSize: 18, lineHeight: 22, fontWeight: '800', letterSpacing: -0.2, color: palette.peachInk },
});
