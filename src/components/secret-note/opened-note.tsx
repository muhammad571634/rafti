import { Ionicons } from '@expo/vector-icons';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Txt } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { WAX_SHARDS, waxPaletteFor, type WaxPalette, type WaxSealTier, type WaxShardSpec } from '@/lib/wax-seal';
import { colors, fonts } from '@/theme';
import { ink, inkFace, inkRadius, inkWaxSeal } from '@/theme/ink';

/** Calm dark-glass lock fill (shared default for `SealedRow` and `OpenedNote`). */
export const LOCK_BG = ink.photoBadge;

const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);

/**
 * Beats for the Wax Seal Shatter & Envelope Unfold reveal:
 * - 0 ms: wax halves + crumbs + sparks burst outward while the 3D envelope V-flap lifts away.
 * - 140 ms: editorial serif letter + friend header glide upward cleanly as the card resizes.
 * - 760 ms: burst overlay unmounts cleanly (zero idle GPU work after reveal).
 */
const WORDS_AT = 140;
const SHATTER_DONE_AT = 760;

function formatLetter(text: string): string {
  const clean = text.trim();
  if (!clean) return '';
  if (/^[“"«「]/.test(clean)) return clean;
  return `“${clean}”`;
}

/**
 * The sealed row: dark-glass lock + "Their note is sealed" + hint.
 * Exported for backward compatibility with secondary callers.
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
 * Their note, opened (upgraded 2026-11-27 for "Mumlu muhrni sindirib ochish"):
 * Right as the wax seal cracks (`reveal === true`), two fractured wax halves, wax crumbs, and
 * tier-colored sparks burst outward on the UI thread while the 3D envelope V-flap folds away,
 * an accent rim blooms once around the card, and the editorial serif letter glides smoothly up.
 * Reduced motion: calm crossfade without shards. Opened earlier: header + serif letter directly.
 */
export function OpenedNote({
  text,
  reveal,
  accentColor = ink.accent,
  waxTier = 'friend',
  header,
}: {
  text: string;
  sealedTitle?: string;
  sealedHint?: string;
  reveal: boolean;
  accentColor?: string;
  waxTier?: WaxSealTier;
  header?: ReactNode;
}) {
  const reduced = useReducedMotion();
  const pal = useMemo(() => waxPaletteFor(waxTier, accentColor), [waxTier, accentColor]);
  const [showShatter, setShowShatter] = useState(reveal && !reduced);

  const burst = useSharedValue(0);
  const flap = useSharedValue(reveal ? 0 : 1);
  const words = useSharedValue(reveal ? 0 : 1);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (!reveal) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (reduced) {
      words.set(withTiming(1, { duration: 240 }));
      timers.push(setTimeout(haptic.success, 80));
    } else {
      burst.set(withTiming(1, { duration: 640, easing: EASE_OUT }));
      flap.set(withTiming(1, { duration: 480, easing: EASE_OUT }));
      words.set(withDelay(WORDS_AT, withTiming(1, { duration: 440, easing: EASE_OUT })));
      glow.set(
        withSequence(
          withTiming(1, { duration: 240, easing: EASE_OUT }),
          withTiming(0, { duration: 860, easing: EASE_IN_OUT }),
        ),
      );
      timers.push(setTimeout(() => setShowShatter(false), SHATTER_DONE_AT));
    }
    return () => timers.forEach(clearTimeout);
    // Plays once on the swap that broke the seal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const body = useAnimatedStyle(() => ({
    opacity: words.value,
    transform: [
      { translateY: reduced ? 0 : 14 * (1 - words.value) },
      { scale: reduced ? 1 : 0.975 + 0.025 * words.value },
    ],
  }));

  const flapStyle = useAnimatedStyle(() => ({
    opacity: 1 - flap.value,
    transform: [
      { perspective: 640 },
      { translateY: -flap.value * 24 },
      { rotateX: `${flap.value * 145}deg` },
    ],
  }));

  const edge = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <View>
      {reveal && !reduced ? (
        <Animated.View pointerEvents="none" style={[styles.glow, { borderColor: `${pal.accent}88` }, edge]} />
      ) : null}

      <Animated.View style={body}>
        {header ? <View style={styles.headerWrap}>{header}</View> : null}
        <Txt style={styles.noteText}>{formatLetter(text)}</Txt>
      </Animated.View>

      {showShatter ? (
        <View pointerEvents="none" style={styles.shatterLayer}>
          {/* 3D folding envelope V-flap lifting out of the way */}
          <Animated.View style={[styles.flapFold, flapStyle]}>
            <Svg width="100%" height="100%" viewBox="0 0 360 92" preserveAspectRatio="none">
              <Path d="M0,0 L360,0 L180,82 Z" fill={inkWaxSeal.flapTop} />
              <Path d="M0,0 L180,82 L360,0" fill="none" stroke={pal.accent} strokeOpacity={0.5} strokeWidth={1.4} />
            </Svg>
          </Animated.View>

          {/* Flying broken wax halves, crumbs & luminous sparks */}
          <View style={styles.shardOrigin}>
            {WAX_SHARDS.map((spec, idx) => (
              <ShardPiece key={idx} spec={spec} progress={burst} palette={pal} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function ShardPiece({
  spec,
  progress,
  palette,
}: {
  spec: WaxShardSpec;
  progress: SharedValue<number>;
  palette: WaxPalette;
}) {
  const animStyle = useAnimatedStyle(() => {
    const t = progress.value;
    // Slight parabolic gravity arc (`t * t * 34`) for natural physical weight
    const gravity = spec.kind === 'spark' ? 14 : 36;
    const x = spec.dx * t;
    const y = spec.dy * t + t * t * gravity;
    const rot = spec.rotDeg * t;
    const fadeStart = spec.kind === 'spark' ? 0.35 : 0.45;
    const opacity = t < fadeStart ? 1 : Math.max(0, 1 - (t - fadeStart) / (1 - fadeStart));
    const scale = spec.kind === 'spark' ? 1 - t * 0.45 : 1 - t * 0.12;
    return {
      opacity,
      transform: [{ translateX: x }, { translateY: y }, { rotate: `${rot}deg` }, { scale }],
    };
  });

  if (spec.kind === 'halfLeft' || spec.kind === 'halfRight') {
    const isLeft = spec.kind === 'halfLeft';
    return (
      <Animated.View style={[styles.shardAbs, animStyle]}>
        <Svg width={spec.size} height={spec.size * 1.45} viewBox="0 0 32 46">
          <Path
            d={
              isLeft
                ? 'M22,2 A21,21 0 0,0 22,44 L26,31 L18,22 L27,13 Z'
                : 'M10,2 A21,21 0 0,1 10,44 L6,31 L14,22 L5,13 Z'
            }
            fill={palette.mid}
            stroke={palette.rim}
            strokeWidth={1.6}
          />
        </Svg>
      </Animated.View>
    );
  }

  if (spec.kind === 'chunk') {
    return (
      <Animated.View
        style={[
          styles.shardAbs,
          {
            width: spec.size,
            height: spec.size * 0.85,
            borderRadius: spec.size * 0.3,
            backgroundColor: palette.mid,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: palette.rim,
          },
          animStyle,
        ]}
      />
    );
  }

  return (
    <Animated.View
      style={[
        styles.shardAbs,
        {
          width: spec.size,
          height: spec.size,
          borderRadius: spec.size / 2,
          backgroundColor: palette.spark,
        },
        animStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lock: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: LOCK_BG,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealed: { ...inkFace('subStrong'), color: colors.text },
  muted: { ...inkFace('footnote'), color: ink.text2 },
  headerWrap: { marginBottom: 12 },
  noteText: {
    fontFamily: fonts.serif,
    fontSize: 17.5,
    lineHeight: 26.5,
    letterSpacing: -0.2,
    color: ink.text,
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
  shatterLayer: {
    position: 'absolute',
    top: -18,
    left: -18,
    right: -18,
    bottom: -18,
    overflow: 'visible',
  },
  flapFold: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 92,
  },
  shardOrigin: {
    position: 'absolute',
    top: 56,
    left: '50%',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shardAbs: {
    position: 'absolute',
  },
});
