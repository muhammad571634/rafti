import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { EASE_IN_OUT, EASE_OUT, MOON_SIZE, type MoonPlace, slowFor } from './night-motion';

type Place = { x: number; y: number; s: number };

export interface NightMoonProps {
  place: MoonPlace;
  places: Record<MoonPlace, Place>;
  /** 0 a thin crescent, 1 the full moon: the first run's progress. */
  phase: number;
  quiet: boolean;
}

const M = MOON_SIZE;
/** The dark side slides off the disc as the phase grows (the SVG prototype's shade circle, in pixels). */
const shadeX = (phase: number) => -28 - 129 * phase;

/**
 * The moon: a lit disc whose dark side slides away one answer at a time, and that travels between
 * the intro's centre, the header (where it is the progress) and the gift's halo. Transforms only.
 */
export const NightMoon = memo(function NightMoon({ place, places, phase, quiet }: NightMoonProps) {
  const reduce = useReducedMotion();
  const p = places[place];
  const x = useSharedValue(p.x);
  const y = useSharedValue(p.y);
  const s = useSharedValue(p.s);
  const o = useSharedValue(place === 'gone' ? 0 : 1);
  const shade = useSharedValue(shadeX(phase));
  const glow = useSharedValue(place === 'header' ? 0.5 : 1);

  useEffect(() => {
    const cfg = { duration: reduce ? 0 : 760 * slowFor(quiet), easing: EASE_IN_OUT };
    x.set(withTiming(p.x, cfg));
    y.set(withTiming(p.y, cfg));
    s.set(withTiming(p.s, cfg));
    o.set(withTiming(place === 'gone' ? 0 : 1, { duration: reduce ? 200 : 520, easing: EASE_OUT }));
    glow.set(withTiming(place === 'header' ? 0.5 : 1, { duration: 600 }));
  }, [p.x, p.y, p.s, place, reduce, quiet, x, y, s, o, glow]);

  useEffect(() => {
    shade.set(withTiming(shadeX(phase), { duration: reduce ? 0 : 900 * slowFor(quiet), easing: EASE_OUT }));
  }, [phase, reduce, quiet, shade]);

  const body = useAnimatedStyle(() => ({
    opacity: o.get(),
    transform: [{ translateX: x.get() - M / 2 }, { translateY: y.get() - M / 2 }, { scale: s.get() }],
  }));
  const shadeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shade.get() }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.get() }));

  return (
    <Animated.View pointerEvents="none" style={[styles.moon, body]}>
      <Animated.View style={[styles.glow, glowStyle]}>
        <Svg width={M * 2.2} height={M * 2.2}>
          <Defs>
            <RadialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#FFF4E1" stopOpacity={0.22} />
              <Stop offset="0.45" stopColor="#FFF4E1" stopOpacity={0.07} />
              <Stop offset="1" stopColor="#FFF4E1" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={M * 1.1} cy={M * 1.1} r={M * 1.1} fill="url(#moonGlow)" />
        </Svg>
      </Animated.View>
      {/* The disc clips its own dark side; filled from the first frame (Android drops the corners of a view that gains its fill later). */}
      <View collapsable={false} style={styles.disc}>
        <LinearGradient colors={['#FFF8EC', '#F1E6D3', '#D9CDB8']} start={{ x: 0.2, y: 0.15 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={[styles.crater, { left: 82, top: 44, width: 18, height: 18 }]} />
        <View style={[styles.crater, { left: 46, top: 78, width: 26, height: 26 }]} />
        <View style={[styles.crater, { left: 92, top: 82, width: 12, height: 12 }]} />
        <Animated.View style={[styles.shade, shadeStyle]} />
      </View>
    </Animated.View>
  );
});

/** Our features round the moon, as the ring the owner picked for the first screen (0z161), without its words. */
const ICONS = [
  { d: 'M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 3.5v-3.5H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5z', c: '#7FD3FF' },
  { d: 'M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5.5a2 2 0 0 1 2-2z', c: '#52D9A2' },
  { d: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z', c: '#FF6B81' },
  { d: 'M12 6a7 7 0 1 1 0 14a7 7 0 1 1 0-14zM12 9.5V13l2.5 1.5M5.5 4 3 6.5M18.5 4 21 6.5', c: '#FFC94D' },
  { d: 'M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z', c: '#B9AEFF' },
  { d: 'M12 3.5a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0v-5a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v3.5', c: '#6CC4FF' },
  { d: 'M4 8h3l1.5-2.5h7L17 8h3v11H4zM12 10a3.5 3.5 0 1 1 0 7a3.5 3.5 0 1 1 0-7z', c: '#FF8A3D' },
  { d: 'M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6zM18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z', c: '#FFE08A' },
];
const RING = 118;
const TAU = Math.PI * 2;

/**
 * The eight feature icons orbiting the moon on the intro. One shared angle drives all of them; on
 * Start they fly outward and fade, as stars would, and come back if the user returns to the intro.
 */
export const MoonOrbit = memo(function MoonOrbit({ visible, cx, cy, quiet }: { visible: boolean; cx: number; cy: number; quiet: boolean }) {
  const reduce = useReducedMotion();
  const angle = useSharedValue(0);
  const r = useSharedValue(visible ? RING : RING * 2.5);
  const a = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    if (reduce || !visible) {
      cancelAnimation(angle);
      return;
    }
    const from = angle.get();
    angle.set(withRepeat(withTiming(from + TAU, { duration: (quiet ? 104000 : 52000), easing: Easing.linear }), -1, false));
    return () => cancelAnimation(angle);
  }, [visible, quiet, reduce, angle]);

  useEffect(() => {
    const d = reduce ? 200 : (visible ? 700 : 620) * slowFor(quiet);
    r.set(withTiming(visible ? RING : RING * 2.5, { duration: reduce ? 0 : d, easing: EASE_OUT }));
    a.set(withTiming(visible ? 1 : 0, { duration: d, easing: EASE_OUT }));
  }, [visible, quiet, reduce, r, a]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {ICONS.map((icon, i) => (
        <OrbitIcon key={i} index={i} d={icon.d} color={icon.c} angle={angle} r={r} a={a} cx={cx} cy={cy} />
      ))}
    </View>
  );
});

function OrbitIcon({ index, d, color, angle, r, a, cx, cy }: { index: number; d: string; color: string; angle: SharedValue<number>; r: SharedValue<number>; a: SharedValue<number>; cx: number; cy: number }) {
  const style = useAnimatedStyle(() => {
    const th = angle.get() + (index / ICONS.length) * TAU;
    // The lower half is nearer: a touch bigger and brighter, so the ring reads as tilted.
    const depth = (Math.sin(th) + 1) / 2;
    return {
      opacity: a.get() * (0.55 + depth * 0.45),
      transform: [{ translateX: cx + Math.cos(th) * r.get() - 22 }, { translateY: cy + Math.sin(th) * r.get() * 0.92 - 22 }, { scale: 0.86 + depth * 0.2 }],
    };
  });
  return (
    <Animated.View style={[styles.orb, style]}>
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path d={d} stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  moon: { position: 'absolute', left: 0, top: 0, width: M, height: M },
  glow: { position: 'absolute', left: -M * 0.6, top: -M * 0.6 },
  disc: { position: 'absolute', left: M * 0.04, top: M * 0.04, width: M * 0.92, height: M * 0.92, borderRadius: M * 0.46, overflow: 'hidden', backgroundColor: '#F1E6D3' },
  crater: { position: 'absolute', borderRadius: 99, backgroundColor: 'rgba(0,0,0,0.05)' },
  // A touch lighter than the sky: the dark side's earthshine.
  shade: { position: 'absolute', left: -2, top: -8, width: M * 0.94, height: M * 0.94, borderRadius: M * 0.47, backgroundColor: '#14151F' },
  orb: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
});
