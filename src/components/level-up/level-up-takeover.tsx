import { Ionicons } from '@expo/vector-icons';
import { Canvas, Circle, LinearGradient as SkiaGradient, Path, RadialGradient, Skia, vec } from '@shopify/react-native-skia';
import { createAudioPlayer } from 'expo-audio';
import { Image } from 'expo-image';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { characterImage } from '@/components/ui/avatar';
import { PressableScale } from '@/components/ui/pressable-scale';
import { phrase } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { tierForLevel } from '@/mock/user';
import type { LevelUpEvent } from '@/store/use-app-store';
import { fonts, night, palette } from '@/theme';
import type { Character } from '@/types';

import { easeOut, seg, spring } from './motion';

/*
 "Closer", the Ink way (owner approved the prototype docs/prototypes/closer-ink.html, 2026-11-13):
 the relationship's level-up on a black ground, serif words and one ring in the brand's peach.

 The level rolls over to the new number beside the title. The ring draws round
 their face with a bright spark at its tip while the face fades in. When the ring closes, three
 things land on the same instant (HIG Feedback, Playing haptics): a soft echo of the ring, the chime
 (earshot mallet/up4, its top note on the close) and one success tap. Their new stage arrives,
 then the chapter this level opens ("Read it": back to the chat, where they tell it),
 else the new names a new stage brings, and the button rises on a spring. The ring then breathes
 slowly, like Today's. Reduced motion: everything fades in, the ring shown full.
*/

// The timeline, in seconds.
const ROLL_AT = 0.2;
const ROLL_FOR = 0.42;
const RING_AT = 0.55;
const RING_FOR = 1.1;
const CLOSE = RING_AT + RING_FOR;
const SOUND_AT = CLOSE - 0.34; // the chime's loudest note lands on the close
const FACE_AT = RING_AT + 0.3;
const FACE_FOR = 0.9;
const ECHO_FOR = 0.7;
const STAGE_AT = CLOSE + 0.15;
const NOTE_AT = CLOSE + 0.3;
const WORDS_IN = 0.4;
const CTA_AT = CLOSE + 0.55;
const END = CTA_AT + 1;
const BREATH_MS = 4000;
const LEAVE_MS = 280;
const REDUCED_FADE = 0.3;
const CTA_STIFFNESS = 200;
const CTA_DAMPING = 22;
const SLIDE = 10;
const CTA_SLIDE = 36;

const RING = 236;
const RING_W = 5;
const R = RING / 2 - 8;
const FACE = 160;
const SPARK = 12;
const GLOW = 460;
const NUM = 116; // the prototype's 96 on a 340-wide phone, at a real phone's width
const MARGIN = 24;
const CTA_HEIGHT = 54;

/** The ring, starting at twelve o'clock. */
const RING_PATH = (() => {
  const b = Skia.PathBuilder.Make();
  b.addArc({ x: RING / 2 - R, y: RING / 2 - R, width: R * 2, height: R * 2 }, -90, 359.9);
  return b.build();
})();

const { colors } = night;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => Array.from(p)[0]?.toUpperCase() ?? '').join('') || '?';
}

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
  const { width } = useWindowDimensions();
  const clock = useSharedValue(0);
  const breath = useSharedValue(0);
  const leave = useSharedValue(0);

  // The ring wears the brand's peach, the same on every friend (owner, 2026-11-13).
  const accent = palette.apricot500;
  const accentLight = palette.apricot300;
  const face = characterImage(character);
  const [faceFailed, setFaceFailed] = useState(false);
  const tier = tierForLevel(event.level);
  // A chapter of their story that this level opens, else the new names a new stage brings.
  const chapter = character.arc?.beats.find((b) => b.atLevel === event.level);
  const note = chapter ? phrase(chapter.title) : event.level === tier.from && tier.labels.length ? t('levelUp.unlocked') : null;
  const ringSize = Math.min(RING, width - MARGIN * 2);
  const ringScale = ringSize / RING;

  useEffect(() => {
    clock.set(withTiming(END, { duration: END * 1000, easing: Easing.linear, reduceMotion: ReduceMotion.Never }));
    if (!reduced) {
      breath.set(withDelay((CLOSE + ECHO_FOR) * 1000, withRepeat(withTiming(1, { duration: BREATH_MS / 2, easing: Easing.inOut(Easing.sin) }), -1, true)));
    }
    // The chime, timed so its top note lands on the close; it follows the phone's silent switch.
    const chime = createAudioPlayer(require('@/assets/sounds/level-up.wav'));
    chime.volume = 0.8;
    const timers = [setTimeout(() => chime.play(), SOUND_AT * 1000), setTimeout(() => haptic.success(), CLOSE * 1000)];
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimation(clock);
      cancelAnimation(breath);
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

  /* ------------------------------------------------------------ the head */
  const rootStyle = useAnimatedStyle(() => ({ opacity: 1 - leave.get() }));
  const roll = useDerivedValue(() => (reduced ? seg(clock.get(), 0, REDUCED_FADE) : easeOut(seg(clock.get(), ROLL_AT, ROLL_AT + ROLL_FOR))));
  const oldNumber = useAnimatedStyle(() => ({ opacity: 1 - roll.get(), transform: [{ translateY: reduced ? 0 : -NUM * roll.get() }] }));
  const newNumber = useAnimatedStyle(() => ({ opacity: roll.get(), transform: [{ translateY: reduced ? 0 : NUM * (1 - roll.get()) }] }));
  const headWords = useAnimatedStyle(() => ({ opacity: easeOut(seg(clock.get(), 0, reduced ? REDUCED_FADE : 0.35)) }));

  /* ------------------------------------------------------------ the ring */
  const ringEnd = useDerivedValue(() => (reduced ? 1 : easeOut(seg(clock.get(), RING_AT, CLOSE))));
  const sparkStyle = useAnimatedStyle(() => {
    const t = clock.get();
    if (reduced || t < RING_AT) return { opacity: 0 };
    const a = -Math.PI / 2 + ringEnd.get() * Math.PI * 2;
    return {
      opacity: t < CLOSE ? 1 : 1 - seg(t, CLOSE, CLOSE + 0.25),
      transform: [{ translateX: RING / 2 + R * Math.cos(a) - SPARK / 2 }, { translateY: RING / 2 + R * Math.sin(a) - SPARK / 2 }],
    };
  });
  const faceStyle = useAnimatedStyle(() => {
    const p = reduced ? seg(clock.get(), 0, REDUCED_FADE) : easeOut(seg(clock.get(), FACE_AT, FACE_AT + FACE_FOR));
    return { opacity: p, transform: [{ scale: reduced ? 1 : 0.9 + 0.1 * p }] };
  });
  const echoStyle = useAnimatedStyle(() => {
    const e = seg(clock.get(), CLOSE, CLOSE + ECHO_FOR);
    return { opacity: reduced || e <= 0 || e >= 1 ? 0 : (1 - e) * 0.7, transform: [{ scale: 1 + 0.22 * easeOut(e) }] };
  });
  const breatheStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.022 * breath.get() }] }));
  const glowStyle = useAnimatedStyle(() => {
    const t = clock.get();
    const on = reduced ? 0.6 * seg(t, 0, REDUCED_FADE) : 0.35 * seg(t, 0.1, 0.8) + 0.45 * seg(t, CLOSE, CLOSE + 0.5);
    return { opacity: on - 0.08 * breath.get() };
  });

  /* ------------------------------------------------------------ the words */
  const rise = (at: number) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => {
      const p = reduced ? seg(clock.get(), 0, REDUCED_FADE) : easeOut(seg(clock.get(), at, at + WORDS_IN));
      return { opacity: p, transform: [{ translateY: reduced ? 0 : (1 - p) * SLIDE }] };
    });
  const stageStyle = rise(STAGE_AT);
  const noteStyle = rise(NOTE_AT);
  const ctaStyle = useAnimatedStyle(() => {
    const t = clock.get();
    const into = reduced ? seg(t, 0, REDUCED_FADE) : Math.min(1, spring(t - CTA_AT, CTA_STIFFNESS, CTA_DAMPING));
    return { opacity: Math.min(1, into * 3), transform: [{ translateY: reduced ? 0 : (1 - into) * CTA_SLIDE }] };
  });

  const cta = chapter ? t('levelUp.readIt') : t('onboarding.continue');

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <Animated.View style={[styles.fill, styles.ground, rootStyle]}>
        <View style={[styles.fill, { paddingTop: insets.top + 20 }]}>
          {/* the head: who, what happened, the level rolling over */}
          <View style={styles.head}>
            <Animated.View style={[styles.headWords, headWords]}>
              <Text style={styles.title} numberOfLines={2} maxFontSizeMultiplier={1.4}>
                {t('levelUp.closer', { name: characterName })}
              </Text>
              {/* Only a story level says more; "{name} feels closer" would repeat the title (owner, 2026-11-13). */}
              {chapter ? (
                <Text style={styles.subtitle} numberOfLines={2} maxFontSizeMultiplier={1.4}>
                  {t('levelUp.newPage')}
                </Text>
              ) : null}
            </Animated.View>
            <View style={styles.numberBox} accessible accessibilityLabel={t('home.hero.level', { level: event.level })}>
              <Animated.Text style={[styles.number, oldNumber]} maxFontSizeMultiplier={1}>
                {Math.max(0, event.level - 1)}
              </Animated.Text>
              <Animated.Text style={[styles.number, newNumber]} maxFontSizeMultiplier={1}>
                {event.level}
              </Animated.Text>
            </View>
          </View>

          {/* their face inside the ring */}
          <View style={styles.middle}>
            <View style={{ width: ringSize, height: ringSize }}>
              <Animated.View pointerEvents="none" style={[styles.glow, { left: ringSize / 2 - GLOW / 2, top: ringSize / 2 - GLOW / 2 }, glowStyle]}>
                <Canvas style={{ width: GLOW, height: GLOW }}>
                  <Circle cx={GLOW / 2} cy={GLOW / 2} r={GLOW / 2}>
                    <RadialGradient c={vec(GLOW / 2, GLOW / 2)} r={GLOW / 2} colors={[`${accent}57`, `${accentLight}1A`, `${accent}00`]} positions={[0, 0.55, 1]} />
                  </Circle>
                </Canvas>
              </Animated.View>
              <View style={[styles.ringBox, { transform: [{ scale: ringScale }] }]}>
                <Animated.View style={[StyleSheet.absoluteFill, breatheStyle]}>
                  <Canvas style={StyleSheet.absoluteFill}>
                    <Circle cx={RING / 2} cy={RING / 2} r={R} style="stroke" strokeWidth={RING_W} color="rgba(255,255,255,0.08)" />
                    <Path path={RING_PATH} style="stroke" strokeWidth={RING_W} strokeCap="round" start={0} end={ringEnd}>
                      <SkiaGradient start={vec(0, 0)} end={vec(RING, RING)} colors={[accent, accentLight]} />
                    </Path>
                  </Canvas>
                </Animated.View>
                <Animated.View pointerEvents="none" style={[styles.echo, { borderColor: accentLight }, echoStyle]} />
                <Animated.View style={[styles.face, faceStyle]}>
                  {/* No picture (or it fails to load): their initial in white on a dark disc; only the ring wears the peach (owner). */}
                  <ExpoLinearGradient colors={['#2C2C2E', '#1C1C1E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, styles.mono]}>
                    <Text style={styles.monoText} maxFontSizeMultiplier={1}>
                      {initials(characterName)}
                    </Text>
                  </ExpoLinearGradient>
                  {face != null && !faceFailed ? (
                    <Image source={typeof face === 'string' ? { uri: face } : face} contentFit="cover" style={StyleSheet.absoluteFill} onError={() => setFaceFailed(true)} />
                  ) : null}
                </Animated.View>
                <Animated.View pointerEvents="none" style={[styles.spark, { boxShadow: `0 0 12px 4px ${accentLight}CC` }, sparkStyle]} />
              </View>
            </View>

            <Animated.View style={[styles.wordsRow, stageStyle]}>
              <Text style={styles.stage} numberOfLines={2} maxFontSizeMultiplier={1.4}>
                {phrase(event.levelTitle)}
              </Text>
            </Animated.View>
            {note ? (
              <Animated.View style={[styles.noteRow, noteStyle]}>
                <Ionicons name={chapter ? 'book-outline' : 'heart-outline'} size={16} color={colors.textSecondary} />
                <Text style={styles.note} numberOfLines={2} maxFontSizeMultiplier={1.4}>
                  {note}
                </Text>
              </Animated.View>
            ) : null}
          </View>

          <Animated.View style={[styles.foot, { paddingBottom: insets.bottom + 20 }, ctaStyle]}>
            <PressableScale onPress={close} scaleTo={0.97} accessibilityRole="button" accessibilityLabel={cta} style={styles.cta}>
              <Text style={styles.ctaLabel} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                {cta}
              </Text>
            </PressableScale>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  ground: { backgroundColor: '#000' },
  head: { marginHorizontal: MARGIN, flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingBottom: 8 },
  headWords: { flex: 1, minWidth: 0, paddingBottom: 4 },
  title: { fontFamily: fonts.serif, fontSize: 26, lineHeight: 31, letterSpacing: -0.4, color: '#fff' },
  subtitle: { marginTop: 4, fontSize: 14, lineHeight: 19, color: 'rgba(235,235,245,0.62)' },
  // The big number's foot lines up with the title's last line (no rule under them: owner, 2026-11-13).
  numberBox: { height: NUM * 0.92, minWidth: 64, marginBottom: -8, overflow: 'hidden', alignItems: 'flex-end' },
  number: {
    position: 'absolute',
    right: 0,
    bottom: -NUM * 0.12 + 1,
    fontFamily: fonts.serif,
    fontSize: NUM,
    lineHeight: NUM * 1.04,
    letterSpacing: -2,
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: MARGIN },
  glow: { position: 'absolute' },
  ringBox: { position: 'absolute', left: 0, top: 0, width: RING, height: RING, transformOrigin: 'top left' },
  echo: { position: 'absolute', left: RING / 2 - R, top: RING / 2 - R, width: R * 2, height: R * 2, borderRadius: R, borderWidth: 2 },
  face: {
    position: 'absolute',
    left: (RING - FACE) / 2,
    top: (RING - FACE) / 2,
    width: FACE,
    height: FACE,
    borderRadius: FACE / 2,
    overflow: 'hidden',
    backgroundColor: '#1C1C1E',
  },
  mono: { alignItems: 'center', justifyContent: 'center' },
  monoText: { fontFamily: fonts.serif, fontSize: 56, lineHeight: 66, color: '#fff' },
  spark: { position: 'absolute', left: 0, top: 0, width: SPARK, height: SPARK, borderRadius: SPARK / 2, backgroundColor: '#fff' },
  wordsRow: { alignSelf: 'stretch', alignItems: 'center' },
  stage: { fontFamily: fonts.serifItalic, fontSize: 22, lineHeight: 28, textAlign: 'center', color: '#fff' },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '100%', marginTop: -8 },
  note: { flexShrink: 1, fontSize: 14, lineHeight: 19, color: 'rgba(235,235,245,0.62)' },
  foot: { paddingHorizontal: MARGIN, paddingTop: 12 },
  cta: { height: CTA_HEIGHT, borderRadius: CTA_HEIGHT / 2, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  ctaLabel: { fontSize: 16, lineHeight: 20, fontWeight: '600', color: '#000' },
});
