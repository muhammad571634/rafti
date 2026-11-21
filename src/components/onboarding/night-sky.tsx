import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { PartOfDay } from '@/lib/night-hour';
import { ink } from '@/theme/ink';

import { EASE_IN_OUT, EASE_OUT, slowFor } from './night-motion';

/** The top of the sky by the hour; it always settles into the Ink ground. */
const SKY: Record<PartOfDay, string> = { morning: '#13223A', afternoon: '#1A1F2C', evening: '#1C1531', night: '#0C0E1D' };
/** How many stars the hour shows (after midnight: few, the quiet hour). */
const STARS: Record<PartOfDay, number> = { morning: 26, afternoon: 30, evening: 54, night: 24 };
/** Extra sky above the screen, so the night can tilt up as the steps go by. */
const OVER = 200;
const TILT = 22;

type Star = { x: number; y: number; r: number; a: number };

/** Seeded, so the same stars come back on every render and every launch. */
function makeStars(count: number, width: number, height: number): Star[][] {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const groups: Star[][] = [[], [], []];
  for (let i = 0; i < count; i++) {
    groups[i % 3].push({ x: rnd() * width, y: rnd() * (height + OVER), r: rnd() < 0.12 ? 1.4 : 0.5 + rnd() * 0.7, a: 0.25 + rnd() * 0.6 });
  }
  return groups;
}

export interface NightSkyProps {
  part: PartOfDay;
  /** 0 on the intro, one more per answer: the night tilts up a little each time. */
  step: number;
  /** The picked friend's hue rising on the horizon, or null before a friend is chosen. */
  dawn: string | null;
  /** The chat is taking over: the stars step back. */
  dim?: boolean;
}

/**
 * The one ground of the whole first run: the hour's sky, three groups of stars that twinkle out of
 * phase (three animated opacities, not one per star), and the friend's colour on the horizon.
 */
export const NightSky = memo(function NightSky({ part, step, dawn, dim }: NightSkyProps) {
  const { width, height } = useWindowDimensions();
  const reduce = useReducedMotion();
  const quiet = part === 'night';
  const groups = useMemo(() => makeStars(STARS[part], width, height), [part, width, height]);

  const tilt = useSharedValue(step * TILT);
  const fade = useSharedValue(1);
  useEffect(() => {
    tilt.set(withTiming(step * TILT, { duration: reduce ? 0 : 900 * slowFor(quiet), easing: EASE_IN_OUT }));
  }, [step, reduce, quiet, tilt]);
  useEffect(() => {
    fade.set(withTiming(dim ? 0.45 : 1, { duration: 700, easing: EASE_OUT }));
  }, [dim, fade]);
  const starsStyle = useAnimatedStyle(() => ({ opacity: fade.get(), transform: [{ translateY: tilt.get() }] }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="sky" cx="50%" cy="0%" rx="120%" ry="60%" fx="50%" fy="0%">
            <Stop offset="0" stopColor={SKY[part]} />
            <Stop offset="0.7" stopColor={ink.ground} />
            <Stop offset="1" stopColor={ink.ground} />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#sky)" />
      </Svg>

      {/* Drawn once into a texture: moving and fading it then costs the GPU nothing to redraw (A51). */}
      <Animated.View renderToHardwareTextureAndroid shouldRasterizeIOS style={[styles.stars, { top: -OVER, height: height + OVER }, starsStyle]}>
        {groups.map((g, i) => (
          <StarGroup key={`${part}-${i}`} stars={g} width={width} height={height + OVER} index={i} quiet={quiet} still={reduce} />
        ))}
      </Animated.View>

      {dawn ? (
        <Animated.View key={dawn} entering={FadeIn.duration(700)} exiting={FadeOut.duration(700)} style={StyleSheet.absoluteFill}>
          <Dawn hue={dawn} width={width} height={height} still={reduce} />
        </Animated.View>
      ) : null}
    </View>
  );
});

function StarGroup({ stars, width, height, index, quiet, still }: { stars: Star[]; width: number; height: number; index: number; quiet: boolean; still: boolean }) {
  const o = useSharedValue(1);
  useEffect(() => {
    if (still) return;
    const d = (1700 + index * 600) * (quiet ? 2.2 : 1);
    o.set(withRepeat(withSequence(withTiming(0.45, { duration: d }), withTiming(1, { duration: d })), -1));
  }, [still, index, quiet, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.get() }));
  return (
    <Animated.View renderToHardwareTextureAndroid shouldRasterizeIOS style={[StyleSheet.absoluteFill, style]}>
      <Svg width={width} height={height}>
        {stars.map((s, i) => (
          <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#FFFFFF" opacity={s.a} />
        ))}
      </Svg>
    </Animated.View>
  );
}

/** The friend's colour coming up from below the screen's edge, as a dawn would. */
function Dawn({ hue, width, height, still }: { hue: string; width: number; height: number; still: boolean }) {
  const y = useSharedValue(still ? 0 : 120);
  useEffect(() => {
    y.set(withTiming(0, { duration: 900, easing: EASE_OUT }));
  }, [y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  const h = Math.round(height * 0.55);
  return (
    <Animated.View style={[styles.dawn, { height: h }, style]}>
      <Svg width={width} height={h}>
        <Defs>
          <RadialGradient id="dawn" cx="50%" cy="100%" rx="80%" ry="100%" fx="50%" fy="100%">
            <Stop offset="0" stopColor={hue} stopOpacity={0.34} />
            <Stop offset="0.55" stopColor={hue} stopOpacity={0.1} />
            <Stop offset="1" stopColor={hue} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={width / 2} cy={h} rx={width * 0.95} ry={h} fill="url(#dawn)" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stars: { position: 'absolute', left: 0, right: 0 },
  dawn: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
