import { Ionicons } from '@expo/vector-icons';
import { type ReactNode, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Anim, Txt } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { colors, fonts, space } from '@/theme';
import { ink, inkFace, inkRadius } from '@/theme/ink';

/** Calm dark-glass lock fill (shared default for `SealedRow` and `OpenedNote`). */
export const LOCK_BG = 'rgba(9,9,13,0.48)';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);
/**
 * The beats (seen on the A51, 2026-11-07): the lock turns while the card keeps its sealed size;
 * at OPEN_AT the card glides to the note's size (the screen's 320 ms layout glide) with the words
 * still hidden; at WORDS_AT, once the card is nearly there, the words rise, the letter plays and
 * the success haptic lands. Showing words during the glide drew them over the card below.
 */
const OPEN_AT = 340;
const WORDS_AT = OPEN_AT + 400;

function formatLetter(text: string): string {
  const clean = text.trim();
  if (!clean) return '';
  if (/^[“"«「]/.test(clean)) return clean;
  return `“${clean}”`;
}

/**
 * The sealed row: dark-glass lock + "Their note is sealed" + hint.
 */
export function SealedRow({ title, hint, accentColor = ink.accent }: { title: string; hint: string; accentColor?: string }) {
  return (
    <View style={styles.row}>
      <View style={[styles.lock, { borderColor: `${accentColor}52` }]}>
        <Ionicons name="lock-closed" size={17} color={accentColor} />
      </View>
      <View style={styles.flex}>
        <Txt style={styles.sealed}>{title}</Txt>
        <Txt style={styles.muted}>{hint}</Txt>
      </View>
    </View>
  );
}

/**
 * Their note, opened (our own motion, iOS manner, 2026-11-07, upgraded to Ink Night+): on swap
 * (`reveal`), the friend-accent dark-glass lock turns open with a spring, the sealed row lifts away,
 * the optional friend attribution header + editorial serif words rise while an accent rim breathes
 * once around the card, and the love-letter Lottie plays above them; one success haptic lands with
 * the words. Reduced motion: a plain crossfade. Opened earlier: header + serif letter directly.
 */
export function OpenedNote({
  text,
  sealedTitle,
  sealedHint,
  reveal,
  accentColor = ink.accent,
  header,
}: {
  text: string;
  sealedTitle: string;
  sealedHint: string;
  reveal: boolean;
  accentColor?: string;
  header?: ReactNode;
}) {
  const reduced = useReducedMotion();
  const [sealGone, setSealGone] = useState(!reveal);
  const [open, setOpen] = useState(!reveal);
  const [letter, setLetter] = useState(false);

  const unlock = useSharedValue(reveal ? 0 : 1);
  const sealOut = useSharedValue(reveal ? 0 : 1);
  const words = useSharedValue(reveal ? 0 : 1);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (!reveal) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (reduced) {
      unlock.set(1);
      sealOut.set(withTiming(1, { duration: 200 }));
      words.set(withTiming(1, { duration: 260 }));
      setOpen(true);
      timers.push(setTimeout(haptic.success, 120));
    } else {
      unlock.set(withSpring(1, { duration: 460, dampingRatio: 0.55 }));
      sealOut.set(withDelay(OPEN_AT - 40, withTiming(1, { duration: 260, easing: EASE_OUT })));
      words.set(withDelay(WORDS_AT, withTiming(1, { duration: 440, easing: EASE_OUT })));
      glow.set(
        withDelay(
          WORDS_AT - 80,
          withSequence(withTiming(1, { duration: 260, easing: EASE_OUT }), withTiming(0, { duration: 900, easing: EASE_IN_OUT })),
        ),
      );
      timers.push(setTimeout(() => setOpen(true), OPEN_AT));
      timers.push(setTimeout(haptic.success, WORDS_AT));
      timers.push(setTimeout(() => setLetter(true), WORDS_AT));
    }
    timers.push(setTimeout(() => setSealGone(true), reduced ? 240 : OPEN_AT + 300));
    return () => timers.forEach(clearTimeout);
    // Plays once, on the swap that opened it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closedLock = useAnimatedStyle(() => ({
    opacity: 1 - unlock.get(),
    transform: [{ rotate: `${unlock.get() * 14}deg` }, { scale: 1 - unlock.get() * 0.15 }],
  }));
  const openLock = useAnimatedStyle(() => ({
    opacity: Math.min(1, unlock.get() * 1.6),
    transform: [{ rotate: `${(1 - unlock.get()) * -18}deg` }, { scale: 0.85 + unlock.get() * 0.15 }],
  }));
  const seal = useAnimatedStyle(() => ({
    opacity: 1 - sealOut.get(),
    transform: [{ translateY: reduced ? 0 : -8 * sealOut.get() }, { scale: 1 - 0.03 * sealOut.get() }],
  }));
  const body = useAnimatedStyle(() => ({
    opacity: words.get(),
    transform: [{ translateY: reduced ? 0 : 10 * (1 - words.get()) }, { scale: reduced ? 1 : 0.98 + 0.02 * words.get() }],
  }));
  const edge = useAnimatedStyle(() => ({ opacity: glow.get() }));

  return (
    <View>
      {reveal && !reduced ? (
        <Animated.View pointerEvents="none" style={[styles.glow, { borderColor: `${accentColor}77` }, edge]} />
      ) : null}

      {open ? (
        <Animated.View style={body}>
          {header ? <View style={styles.headerWrap}>{header}</View> : null}
          {/* The letter's room is kept from the start, so the card changes size only once. */}
          {reveal ? <View style={styles.letter}>{letter ? <Anim name="loveLetter" size={112} loop={false} /> : null}</View> : null}
          <Txt style={styles.noteText}>{formatLetter(text)}</Txt>
        </Animated.View>
      ) : null}

      {sealGone ? null : (
        // In the flow until the card opens (it holds the sealed size), then laid over the top as it lifts away.
        <Animated.View pointerEvents="none" style={[open ? styles.sealLayer : null, seal]}>
          <View style={styles.row}>
            <View style={[styles.lock, { borderColor: `${accentColor}52` }]}>
              <Animated.View style={[styles.lockIcon, closedLock]}>
                <Ionicons name="lock-closed" size={17} color={accentColor} />
              </Animated.View>
              <Animated.View style={[styles.lockIcon, openLock]}>
                <Ionicons name="lock-open" size={17} color={accentColor} />
              </Animated.View>
            </View>
            <View style={styles.flex}>
              <Txt style={styles.sealed}>{sealedTitle}</Txt>
              <Txt style={styles.muted}>{sealedHint}</Txt>
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lock: {
    width: 38,
    height: 38,
    borderRadius: inkRadius.pill,
    backgroundColor: LOCK_BG,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: { position: 'absolute' },
  sealed: { ...inkFace('subStrong'), color: colors.text },
  muted: { ...inkFace('footnote'), color: ink.text2 },
  headerWrap: { marginBottom: 12 },
  sealLayer: { position: 'absolute', top: 0, left: 0, right: 0 },
  letter: { width: 112, height: 112, alignSelf: 'center', marginTop: -space.sm },
  noteText: {
    fontFamily: fonts.serif,
    fontSize: 17.5,
    lineHeight: 26.5,
    letterSpacing: -0.2,
    color: 'rgba(255,255,255,0.94)',
  },
  glow: {
    position: 'absolute',
    top: -18,
    left: -18,
    right: -18,
    bottom: -18,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    borderWidth: 1.5,
  },
});
