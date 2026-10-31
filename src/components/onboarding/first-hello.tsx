import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { AVATARS } from '@/assets/avatars/registry';
import { BRAND } from '@/assets/brand/registry';
import { ICONS } from '@/assets/icons/registry';
import { Anim, glassStyle, Txt } from '@/components/ui';
import { aurora, colors, isDark } from '@/theme';

/**
 * First launch, before onboarding (owner approved the preview `sigmazam-motion/out/first-hello.mp4`,
 * 2026-10-29): in the night, characters light up one by one, people awake for you; they swing in
 * and gather into the shell, it bursts, morning comes, and Sigmazam jumps out and says hello.
 * Same timeline as `sigmazam-motion/src/FirstHello.tsx`. Tap to skip; Reduce Motion shows the end.
 */
const LENGTH = 4.8;
const START_WAIT_MS = 600;
/** Under Reduce Motion the finished frame stays this long. */
const STILL_MS = 1500;
const TEXT_AT = 3.65;
const BURST_AT = 2.55;

/** CSS cubic-bezier control points, referenced by index from the keys below. */
const EASES = [
  [0.2, 0.8, 0.3, 1], // 0 spring out
  [0.65, 0, 0.3, 1], // 1 swing
  [0.42, 0, 0.58, 1], // 2 smooth
  [0.33, 1, 0.68, 1], // 3 out cubic
  [0.5, 1, 0.89, 1], // 4 out quad
  [0.2, 0.7, 0.4, 1], // 5 settle
  [0.34, 1.56, 0.64, 1], // 6 overshoot
];
const SPRING = 0;
const SWING = 1;
const SMOOTH = 2;
const OUT3 = 3;
const OUT2 = 4;
const SETTLE = 5;
const OVER = 6;

/** [seconds, value, easing index into the next key]. */
type Key = number[];

/** The hop from the shell-drop intro, 1.63 s later. */
const H = 1.63;
const HOP_Y: Key[] = [[0.94 + H, 60, SPRING], [1.2 + H, -36, SMOOTH], [1.3125 + H, 8, OUT2], [1.4 + H, 0]];
const HOP_SX: Key[] = [[0.94 + H, 0, SPRING], [1.2 + H, 1.1, SMOOTH], [1.3125 + H, 1.07, OUT2], [1.4 + H, 1]];
const HOP_SY: Key[] = [[0.94 + H, 0, SPRING], [1.2 + H, 1.16, SMOOTH], [1.3125 + H, 0.91, OUT2], [1.4 + H, 1]];
const HOP_ROT: Key[] = [[0.94 + H, -14, SPRING], [1.2 + H, 7, SMOOTH], [1.3125 + H, -2, OUT2], [1.4 + H, 0]];
const HOP_OP: Key[] = [[0.94 + H, 0], [0.955 + H, 1]];
const SHELL_S: Key[] = [[2.18, 0, OVER], [2.42, 1], [BURST_AT, 1, SWING], [2.68, 1.35]];
const SHELL_OP: Key[] = [[2.18, 0], [2.26, 1], [BURST_AT, 1], [2.68, 0]];
const SHELL_ROT: Key[] = [[2.3, 0, SMOOTH], [2.4, -8, SMOOTH], [2.5, 8, SMOOTH], [BURST_AT, 0]];
const RING_S: Key[] = [[BURST_AT, 0.3, OUT3], [3.05, 2.8]];
const RING_OP: Key[] = [[BURST_AT, 0], [2.6, 0.85], [3.05, 0]];
const GLOW_S: Key[] = [[2.15, 0.4, SETTLE], [2.6, 1.2], [3.2, 1.8]];
const GLOW_OP: Key[] = [[2.15, 0], [2.6, 1], [3.2, 0]];
const SPARK_P: Key[] = [[2.56, 0, OUT3], [3.2, 1]];
const SPARK_OP: Key[] = [[2.56, 0], [2.68, 1], [3.2, 0]];
/** The warm flash over the burst hides the night-to-morning mix, which reads grey on its own. */
const FLASH_OP: Key[] = [[2.45, 0, OUT3], [2.62, 1, SMOOTH], [3.25, 0]];
const NIGHT_OP: Key[] = [[2.58, 1, SMOOTH], [3.0, 0]];
/** The splash's plain ground gives way to the night. */
const COVER_OP: Key[] = [[0, 1], [0.35, 0]];
const BUBBLE_S: Key[] = [[3.15, 0.55, OVER], [3.45, 1]];
const BUBBLE_OP: Key[] = [[3.15, 0], [3.3, 1]];

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

/** Centre of the stage, where the lights gather and the shell bursts. */
const CX = 195;
const CY = 390;
const LIGHTS = [
  { x: 70, y: 170, id: 'c_ivy' },
  { x: 300, y: 140, id: 'c_sol' },
  { x: 332, y: 330, id: 'c_kai' },
  { x: 58, y: 420, id: 'c_lyra' },
  { x: 196, y: 236, id: 'c_noah' },
  { x: 318, y: 560, id: 'c_hana' },
  { x: 82, y: 640, id: 'c_theo' },
  { x: 226, y: 712, id: 'c_seren' },
  { x: 150, y: 530, id: 'c_juno' },
];
const STARS = Array.from({ length: 30 }, (_, i) => ({ x: (i * 97.3) % 390, y: (i * 61.7 + 23) % 820, s: 1 + (i % 3) * 0.7, ph: i * 0.37 }));
const NIGHT = '#05060F';
const NIGHT_BLOBS = [
  { cx: 70, cy: 100, r: 230, c: '#0F7F72' },
  { cx: 350, cy: 360, r: 240, c: '#4B32B8' },
  { cx: 120, cy: 740, r: 220, c: '#123A8C' },
  { cx: 340, cy: 830, r: 210, c: '#7A2466' },
];
const STAR = 'M.5 0L.62 .38L1 .5L.62 .62L.5 1L.38 .62L0 .5L.38 .38Z';
const SPARKS = [0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
  const r = i % 2 ? 110 : 145;
  const a = (deg * Math.PI) / 180;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r, violet: i % 3 === 1 };
});
const VIOLET = isDark ? '#B9AEFF' : '#9C8CFF';
const GLOW = isDark ? 'rgba(255,190,140,0.55)' : 'rgba(255,214,170,0.95)';
const FLASH = isDark ? '#3A2A40' : '#FFF6EA';

export function FirstHello({
  onDone,
  atEnd = false,
}: {
  onDone: () => void;
  /** Back from the questions: the last frame at once, not the whole film again. */
  atEnd?: boolean;
}) {
  const { t: say } = useTranslation();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(atEnd ? LENGTH : 0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const finished = useRef(atEnd);
  const [ready, setReady] = useState(false);
  const [typed, setTyped] = useState(atEnd);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    timers.current.forEach(clearTimeout);
    // A tap skips to the last frame, which stays under onboarding's Start button.
    t.value = LENGTH;
    setTyped(true);
    onDone();
  };

  useEffect(() => {
    if (atEnd) return;
    const id = setTimeout(() => setReady(true), START_WAIT_MS);
    return () => clearTimeout(id);
  }, [atEnd]);

  useEffect(() => {
    if (!ready) return;
    const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
    if (reduceMotion) {
      t.value = LENGTH;
      setTyped(true);
      later(STILL_MS, finish);
    } else {
      t.value = withTiming(LENGTH, { duration: LENGTH * 1000, easing: Easing.linear });
      later(TEXT_AT * 1000, () => setTyped(true));
      if (Platform.OS !== 'web') later(BURST_AT * 1000, () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}));
      later(LENGTH * 1000, finish);
    }
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
    // Plays once, when ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const cover = useAnimatedStyle(() => ({ opacity: track(t.value, COVER_OP) }));
  const night = useAnimatedStyle(() => ({ opacity: track(t.value, NIGHT_OP) }));
  const flash = useAnimatedStyle(() => ({ opacity: track(t.value, FLASH_OP) }));
  const glow = useAnimatedStyle(() => ({ opacity: track(t.value, GLOW_OP), transform: [{ scale: track(t.value, GLOW_S) }] }));
  const ring = useAnimatedStyle(() => ({ opacity: track(t.value, RING_OP), transform: [{ scale: track(t.value, RING_S) }] }));
  const shell = useAnimatedStyle(() => ({
    opacity: track(t.value, SHELL_OP),
    transform: [{ scale: track(t.value, SHELL_S) }, { rotate: `${track(t.value, SHELL_ROT)}deg` }],
  }));
  const hop = useAnimatedStyle(() => {
    const landed = 1.4 + H;
    const breathe = t.value > landed ? 1 + 0.018 * Math.sin((t.value - landed) * Math.PI * 1.8) : 1;
    return {
      opacity: track(t.value, HOP_OP),
      transform: [
        { translateY: track(t.value, HOP_Y) },
        { scaleX: track(t.value, HOP_SX) },
        { scaleY: track(t.value, HOP_SY) * breathe },
        { rotate: `${track(t.value, HOP_ROT)}deg` },
      ],
    };
  });
  const bubble = useAnimatedStyle(() => ({ opacity: track(t.value, BUBBLE_OP), transform: [{ scale: track(t.value, BUBBLE_S) }] }));

  const stage = [styles.stage, { left: (width - 390) / 2, top: (height - 844) / 2, transform: [{ scale: width / 390 }] }];

  return (
    <Pressable onPress={finish} accessibilityRole="image" accessibilityLabel={say('onboarding.helloBubble')} style={StyleSheet.absoluteFill}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: NIGHT }, night]}>
        <Svg width="100%" height="100%" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice">
          <Defs>
            {NIGHT_BLOBS.map((b, i) => (
              <RadialGradient key={i} id={`night-${i}`} cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={b.c} stopOpacity={0.6} />
                <Stop offset="1" stopColor={b.c} stopOpacity={0} />
              </RadialGradient>
            ))}
          </Defs>
          {NIGHT_BLOBS.map((b, i) => (
            <Circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill={`url(#night-${i})`} />
          ))}
        </Svg>
        <View style={stage}>
          {STARS.map((s, i) => (
            <Twinkle key={i} t={t} {...s} />
          ))}
        </View>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: aurora.base }, cover]} />

      <View pointerEvents="none" style={stage}>
        {LIGHTS.map((l, i) => (
          <Light key={l.id} t={t} index={i} x={l.x} y={l.y} source={AVATARS[l.id]} />
        ))}
        <Animated.View style={[styles.glow, glow]}>
          <Svg width="100%" height="100%">
            <Defs>
              <RadialGradient id="hello-glow" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={GLOW} />
                <Stop offset="0.68" stopColor={GLOW} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#hello-glow)" />
          </Svg>
        </Animated.View>
        <Animated.View style={[styles.ring, ring]} />
        {SPARKS.map((s, i) => (
          <Spark key={i} t={t} dx={s.x} dy={s.y} color={s.violet ? VIOLET : aurora.tint} />
        ))}
      </View>

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, flash]}>
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="hello-flash" cx="50%" cy="46%" r="75%">
              <Stop offset="0" stopColor={FLASH} />
              <Stop offset="1" stopColor={FLASH} stopOpacity={0.88} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#hello-flash)" />
        </Svg>
      </Animated.View>

      <View pointerEvents="none" style={stage}>
        <Animated.View style={[styles.shell, shell]}>
          <Image source={ICONS.shell} style={StyleSheet.absoluteFill} contentFit="contain" onLoad={() => setReady(true)} />
        </Animated.View>
        <Animated.View style={[styles.hop, hop]}>
          <Image source={BRAND.hop} style={StyleSheet.absoluteFill} contentFit="contain" />
        </Animated.View>
        <Animated.View style={[styles.bubbleRow, bubble]}>
          <View style={styles.bubble}>
            {typed ? (
              <Txt style={styles.bubbleText} lines={2} center accessibilityRole="header">
                {say('onboarding.helloBubble')}
              </Txt>
            ) : (
              <Anim name="typing" size={30} tint={colors.textSecondary} />
            )}
          </View>
        </Animated.View>
      </View>
    </Pressable>
  );
}

/** One character as a warm light: born by a spring, bobbing, then swinging in to the centre. */
function Light({ t, index, x, y, source }: { t: SharedValue<number>; index: number; x: number; y: number; source: number | undefined }) {
  const born = 0.25 + index * 0.12;
  const leave = 1.7 + index * 0.025;
  const dx = CX - x;
  const dy = CY - y;
  const len = Math.hypot(dx, dy) || 1;
  // A curve, not a straight line: each light swings in from its own side.
  const side = index % 2 ? 1 : -1;
  const style = useAnimatedStyle(() => {
    const b = track(t.value, [[born, 0, OVER], [born + 0.45, 1]]);
    const q = track(t.value, [[leave, 0, SWING], [leave + 0.55, 1]]);
    const bend = Math.sin(q * Math.PI) * 46 * side;
    const bob = Math.sin(t.value * 2.4 + index) * 4 * (1 - q);
    return {
      opacity: Math.min(1, b) * (1 - track(t.value, [[leave + 0.4, 0], [leave + 0.55, 1]])),
      transform: [
        { translateX: dx * q + (-dy / len) * bend },
        { translateY: dy * q + (dx / len) * bend + bob },
        { scale: b * (1 - 0.75 * q) },
      ],
    };
  });
  return (
    <Animated.View style={[styles.light, { left: x - 55, top: y - 55 }, style]}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={`light-${index}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="rgb(255,200,140)" stopOpacity={0.75} />
            <Stop offset="0.58" stopColor="rgb(255,170,120)" stopOpacity={0.25} />
            <Stop offset="1" stopColor="rgb(255,170,120)" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#light-${index})`} />
      </Svg>
      <Image source={source} style={styles.face} contentFit="cover" />
      <View style={styles.online} />
    </Animated.View>
  );
}

/** A faint star in the night sky; the night layer's fade takes it away. */
function Twinkle({ t, x, y, s, ph }: { t: SharedValue<number>; x: number; y: number; s: number; ph: number }) {
  const style = useAnimatedStyle(() => ({
    opacity: (0.25 + 0.35 * Math.sin(t.value * 3 + ph)) * track(t.value, [[0, 0], [0.5, 1]]),
  }));
  return <Animated.View style={[styles.star, { left: x, top: y, width: s, height: s }, style]} />;
}

/** One spark flying out of the burst. */
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
  star: { position: 'absolute', borderRadius: 2, backgroundColor: '#FFFFFF' },
  light: { position: 'absolute', width: 110, height: 110 },
  face: {
    position: 'absolute',
    left: 35,
    top: 35,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,236,214,0.95)',
  },
  online: { position: 'absolute', left: 66, top: 66, width: 10, height: 10, borderRadius: 5, backgroundColor: '#34C759', borderWidth: 2, borderColor: NIGHT },
  glow: { position: 'absolute', left: CX - 140, top: CY - 140, width: 280, height: 280 },
  ring: { position: 'absolute', left: CX - 60, top: CY - 60, width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: aurora.tint },
  spark: { position: 'absolute', left: CX - 6, top: CY - 6, width: 12, height: 12 },
  shell: { position: 'absolute', left: CX - 48, top: CY - 48, width: 96, height: 96 },
  hop: { position: 'absolute', left: CX - 95, top: CY - 105, width: 190, height: 211, transformOrigin: '50% 88%' },
  bubbleRow: { position: 'absolute', left: 24, right: 24, top: CY + 128, alignItems: 'center', transformOrigin: '50% 0%' },
  bubble: { ...glassStyle, minHeight: 44, justifyContent: 'center', paddingVertical: 11, paddingHorizontal: 18, borderRadius: 22 },
  // HIG Typography: Callout 16/21.
  bubbleText: { fontSize: 16, lineHeight: 21, fontWeight: '500', color: colors.text },
});
