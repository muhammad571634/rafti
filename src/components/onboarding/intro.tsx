import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { BRAND } from '@/assets/brand/registry';
import { ICONS } from '@/assets/icons/registry';
import { aurora, isDark } from '@/theme';

/** The intro is 2.5 s. Same keyframes as the canvas `Intro.dc.html` and `sigmazam-motion/src/Intro.tsx`. */
const LENGTH = 2.5;
/** A short hold on the finished logo before onboarding takes over. */
const HOLD_MS = 350;
const START_WAIT_MS = 600;

/** CSS cubic-bezier control points, referenced by index from the keys below. */
const EASES = [
  [0.55, 0, 1, 0.55], // 0 drop
  [0.2, 0.7, 0.4, 1], // 1 settle
  [0.6, 0, 0.8, 0.4], // 2 lift
  [0.2, 0.8, 0.3, 1], // 3 spring out
  [0.65, 0, 0.3, 1], // 4 swing
  [0.3, 0.7, 0.3, 1], // 5 unroll
  [0.42, 0, 0.58, 1], // 6 smooth
  [0.33, 1, 0.68, 1], // 7 out cubic
  [0.5, 1, 0.89, 1], // 8 out quad
];
const DROP = 0;
const SETTLE = 1;
const LIFT = 2;
const SPRING = 3;
const SWING = 4;
const UNROLL = 5;
const SMOOTH = 6;
const OUT3 = 7;
const OUT2 = 8;

/** [seconds, value, easing index into the next key]. */
type Key = number[];

const SHELL_Y: Key[] = [[0, -480], [0.1, -480, DROP], [0.5, 0, SETTLE], [0.62, -28, LIFT], [0.74, 0]];
const SHELL_SX: Key[] = [[0.1, 1, DROP], [0.5, 1.26, SETTLE], [0.62, 0.92, LIFT], [0.74, 1.07, SMOOTH], [0.8125, 1, SMOOTH], [0.92, 1.3, SWING], [1.05, 0.15]];
const SHELL_SY: Key[] = [[0.1, 1, DROP], [0.5, 0.76, SETTLE], [0.62, 1.1, LIFT], [0.74, 0.94, SMOOTH], [0.8125, 1, SMOOTH], [0.92, 1.3, SWING], [1.05, 0.15]];
const SHELL_ROT: Key[] = [[0.74, 0, SMOOTH], [0.8125, -9, SMOOTH], [0.92, 9, SWING], [1.05, 0]];
const SHELL_OP: Key[] = [[0, 0], [0.1, 1], [0.92, 1], [1.05, 0]];
const RING_S: Key[] = [[0.92, 0.3, OUT3], [1.4, 2.6]];
const RING_OP: Key[] = [[0.92, 0], [0.9625, 0.85], [1.4, 0]];
const GLOW_S: Key[] = [[0.875, 0.4, SETTLE], [1, 1], [1.55, 1.6]];
const GLOW_OP: Key[] = [[0.875, 0], [1, 0.9], [1.55, 0]];
const SPARK_P: Key[] = [[0.925, 0, OUT3], [1.6, 1]];
const SPARK_OP: Key[] = [[0.925, 0], [1.05, 1], [1.6, 0]];
const HOP_Y: Key[] = [[0.94, 60, SPRING], [1.2, -36, SMOOTH], [1.3125, 8, OUT2], [1.4, 0]];
const HOP_SX: Key[] = [[0.94, 0, SPRING], [1.2, 1.1, SMOOTH], [1.3125, 1.07, OUT2], [1.4, 1]];
const HOP_SY: Key[] = [[0.94, 0, SPRING], [1.2, 1.16, SMOOTH], [1.3125, 0.91, OUT2], [1.4, 1]];
const HOP_ROT: Key[] = [[0.94, -14, SPRING], [1.2, 7, SMOOTH], [1.3125, -2, OUT2], [1.4, 0]];
const HOP_OP: Key[] = [[0.94, 0], [0.955, 1], [1.4, 1], [1.435, 0]];
const WINK_OP: Key[] = [[1.405, 0], [1.435, 1], [1.95, 1], [2.0625, 0]];
const WINK_SX: Key[] = [[1.405, 0.95], [1.435, 1.07, SMOOTH], [1.525, 1]];
const WINK_SY: Key[] = [[1.405, 1.05], [1.435, 0.93, SMOOTH], [1.525, 1]];
const FLY: Key[] = [[1.62, 0, SWING], [1.95, 1]];
const LOGO_OP: Key[] = [[1.9, 0], [2.05, 1]];
const REVEAL: Key[] = [[2.05, 0, UNROLL], [2.25, 1]];
const LOGO_S: Key[] = [[2.05, 1, UNROLL], [2.25, 1.035, SMOOTH], [2.4, 0.995, SMOOTH], [2.5, 1]];
const TW_S: Key[] = [[2.15, 0, SMOOTH], [2.325, 1, SMOOTH], [2.5, 0.6]];
const TW_OP: Key[] = [[2.15, 0], [2.325, 1], [2.5, 0]];
/** The plain ground (as the launch screen) gives way to the aurora. */
const COVER_OP: Key[] = [[0, 1], [0.3, 0]];

/** CSS cubic-bezier: solve x(u) = x by Newton steps, then return y(u). */
function bezier(p: number[], x: number) {
  'worklet';
  const cx = 3 * p[0];
  const bx = 3 * (p[2] - p[0]) - cx;
  const ax = 1 - cx - bx;
  let u = x;
  for (let i = 0; i < 8; i++) {
    const dx = ((ax * u + bx) * u + cx) * u - x;
    const slope = (3 * ax * u + 2 * bx) * u + cx;
    if (Math.abs(dx) < 1e-4 || slope === 0) break;
    u -= dx / slope;
  }
  u = Math.min(1, Math.max(0, u));
  const cy = 3 * p[1];
  const by = 3 * (p[3] - p[1]) - cy;
  const ay = 1 - cy - by;
  return ((ay * u + by) * u + cy) * u;
}

/** A value along keyframes; flat before the first key and after the last. */
function track(t: number, keys: Key[]) {
  'worklet';
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t <= b[0]) {
      let p = (t - a[0]) / (b[0] - a[0]);
      if (a.length > 2) p = bezier(EASES[a[2]], p);
      return a[1] + (b[1] - a[1]) * p;
    }
  }
  return keys[keys.length - 1][1];
}

const LOGO_W = 330;
/** The G (with the logo's own mascot) sits from 20% to 33.5% of the wordmark. */
const G_LEFT = LOGO_W * 0.2;
const G_RIGHT = LOGO_W * 0.665;
const STAR = 'M.5 0L.62 .38L1 .5L.62 .62L.5 1L.38 .62L0 .5L.38 .38Z';
const SPARKS = [0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
  const r = i % 2 ? 96 : 128;
  const a = (deg * Math.PI) / 180;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r, violet: i % 3 === 1 };
});
const VIOLET = isDark ? '#B9AEFF' : '#9C8CFF';
const GLOW = isDark ? 'rgba(255,190,140,0.55)' : 'rgba(255,214,170,0.95)';

/**
 * First launch only, before onboarding (owner's pick, canvas "Intro", 2026-10-24): a shell drops
 * onto the aurora and pops, Sigmazam springs out, winks, lands on the G and the name unrolls.
 * Tap to skip. Under Reduce Motion it shows the finished logo for a moment instead.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const finished = useRef(false);
  // The timeline waits for the shell to be decoded (at most START_WAIT_MS), so it never drops in blank.
  const [ready, setReady] = useState(false);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    timers.current.forEach(clearTimeout);
    onDone();
  };

  useEffect(() => {
    const id = setTimeout(() => setReady(true), START_WAIT_MS);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
    if (reduceMotion) {
      t.value = LENGTH;
      later(900, finish);
    } else {
      t.value = withTiming(LENGTH, { duration: LENGTH * 1000, easing: Easing.linear });
      if (Platform.OS !== 'web') {
        const tap = (style: Haptics.ImpactFeedbackStyle) => void Haptics.impactAsync(style).catch(() => {});
        later(500, () => tap(Haptics.ImpactFeedbackStyle.Light)); // the shell lands
        later(920, () => tap(Haptics.ImpactFeedbackStyle.Medium)); // the pop
        later(2050, () => tap(Haptics.ImpactFeedbackStyle.Light)); // the logo
      }
      later(LENGTH * 1000 + HOLD_MS, finish);
    }
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
    // Plays once, when ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const cover = useAnimatedStyle(() => ({ opacity: track(t.value, COVER_OP) }));
  const glow = useAnimatedStyle(() => ({ opacity: track(t.value, GLOW_OP), transform: [{ scale: track(t.value, GLOW_S) }] }));
  const ring = useAnimatedStyle(() => ({ opacity: track(t.value, RING_OP), transform: [{ scale: track(t.value, RING_S) }] }));
  const shell = useAnimatedStyle(() => ({
    opacity: track(t.value, SHELL_OP),
    transform: [
      { translateY: track(t.value, SHELL_Y) },
      { scaleX: track(t.value, SHELL_SX) },
      { scaleY: track(t.value, SHELL_SY) },
      { rotate: `${track(t.value, SHELL_ROT)}deg` },
    ],
  }));
  const hop = useAnimatedStyle(() => ({
    opacity: track(t.value, HOP_OP),
    transform: [
      { translateY: track(t.value, HOP_Y) },
      { scaleX: track(t.value, HOP_SX) },
      { scaleY: track(t.value, HOP_SY) },
      { rotate: `${track(t.value, HOP_ROT)}deg` },
    ],
  }));
  const wink = useAnimatedStyle(() => {
    const fly = track(t.value, FLY);
    const shrink = 1 - 0.68 * fly;
    return {
      opacity: track(t.value, WINK_OP),
      transform: [
        { translateX: -77 * fly },
        { translateY: 6 * fly },
        { scaleX: track(t.value, WINK_SX) * shrink },
        { scaleY: track(t.value, WINK_SY) * shrink },
      ],
    };
  });
  const logo = useAnimatedStyle(() => ({ opacity: track(t.value, LOGO_OP), transform: [{ scale: track(t.value, LOGO_S) }] }));
  // The window over the wordmark opens from the G outwards; the art inside stays put.
  const window = useAnimatedStyle(() => {
    const hide = 1 - track(t.value, REVEAL);
    return { left: G_LEFT * hide, width: LOGO_W - (G_LEFT + G_RIGHT) * hide };
  });
  const art = useAnimatedStyle(() => ({ left: -G_LEFT * (1 - track(t.value, REVEAL)) }));
  const twinkle = useAnimatedStyle(() => {
    const s = track(t.value, TW_S);
    return { opacity: track(t.value, TW_OP), transform: [{ scale: s }, { rotate: `${s * 60}deg` }] };
  });

  return (
    <Pressable onPress={finish} accessibilityRole="image" accessibilityLabel="Sigmazam" style={StyleSheet.absoluteFill}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: aurora.base }, cover]} />
      {/* Drawn on a 390 x 844 stage, scaled to the screen's width and centred. */}
      <View
        pointerEvents="none"
        style={[styles.stage, { left: (width - 390) / 2, top: (height - 844) / 2, transform: [{ scale: width / 390 }] }]}>
        <Animated.View style={[styles.glow, glow]}>
          <Svg width="100%" height="100%">
            <Defs>
              <RadialGradient id="intro-glow" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={GLOW} />
                <Stop offset="0.68" stopColor={GLOW} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#intro-glow)" />
          </Svg>
        </Animated.View>
        <Animated.View style={[styles.ring, ring]} />
        {SPARKS.map((s, i) => (
          <Spark key={i} t={t} dx={s.x} dy={s.y} color={s.violet ? VIOLET : aurora.tint} />
        ))}
        <Animated.View style={[styles.shell, shell]}>
          <Image source={ICONS.shell} style={StyleSheet.absoluteFill} contentFit="contain" onLoad={() => setReady(true)} />
        </Animated.View>
        <Animated.View style={[styles.hop, hop]}>
          <Image source={BRAND.hop} style={StyleSheet.absoluteFill} contentFit="contain" />
        </Animated.View>
        <Animated.View style={[styles.wink, wink]}>
          <Image source={BRAND.wink} style={StyleSheet.absoluteFill} contentFit="contain" />
        </Animated.View>
        <Animated.View style={[styles.logo, logo]}>
          <Animated.View style={[styles.window, window]}>
            <Animated.View style={[styles.logoArt, art]}>
              <Image source={BRAND.logo} style={StyleSheet.absoluteFill} contentFit="contain" />
            </Animated.View>
          </Animated.View>
        </Animated.View>
        {TWINKLES.map((w, i) => (
          <Animated.View key={i} style={[{ position: 'absolute', left: w.left, top: w.top, width: w.size, height: w.size }, twinkle]}>
            <Svg width="100%" height="100%" viewBox="0 0 1 1">
              <Path d={STAR} fill={w.violet ? VIOLET : aurora.tint} />
            </Svg>
          </Animated.View>
        ))}
      </View>
    </Pressable>
  );
}

const TWINKLES = [
  { left: 52, top: 372, size: 14, violet: false },
  { left: 318, top: 368, size: 10, violet: true },
  { left: 262, top: 466, size: 12, violet: false },
];

/** One spark flying out of the pop. */
function Spark({ t, dx, dy, color }: { t: SharedValue<number>; dx: number; dy: number; color: string }) {
  const style = useAnimatedStyle(() => {
    const p = track(t.value, SPARK_P);
    return {
      opacity: track(t.value, SPARK_OP),
      transform: [{ translateX: dx * p }, { translateY: dy * p }, { scale: 0.2 + 0.8 * p }, { rotate: `${90 * p}deg` }],
    };
  });
  return (
    <Animated.View style={[styles.spark, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 1 1">
        <Path d={STAR} fill={color} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: { position: 'absolute', width: 390, height: 844 },
  glow: { position: 'absolute', left: 75, top: 280, width: 240, height: 240 },
  ring: { position: 'absolute', left: 135, top: 340, width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: aurora.tint },
  spark: { position: 'absolute', left: 189, top: 394, width: 12, height: 12 },
  shell: { position: 'absolute', left: 147, top: 352, width: 96, height: 96, transformOrigin: '50% 85%' },
  hop: { position: 'absolute', left: 100, top: 295, width: 190, height: 211, transformOrigin: '50% 88%' },
  wink: { position: 'absolute', left: 95, top: 300, width: 200, height: 200 },
  logo: { position: 'absolute', left: 30, top: 387, width: LOGO_W, height: 70, transformOrigin: '30% 50%' },
  window: { position: 'absolute', top: 0, bottom: 0, overflow: 'hidden' },
  logoArt: { position: 'absolute', top: 0, width: LOGO_W, height: 70 },
});
