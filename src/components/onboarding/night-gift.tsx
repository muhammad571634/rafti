import { Image } from 'expo-image';
import { memo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { BRAND } from '@/assets/brand/registry';
import { InkText } from '@/components/ink';
import { ink } from '@/theme/ink';

import { EASE_OUT, slowFor } from './night-motion';

const STAR = 'M.5 0L.62 .38L1 .5L.62 .62L.5 1L.38 .62L0 .5L.38 .38Z';
export const SHELL = 'M12 20.5c-4.6 0-8.2-3.4-8.2-8.3C3.8 7.4 7.4 4 12 4s8.2 3.4 8.2 8.2c0 4.9-3.6 8.3-8.2 8.3zM12 20.5V7.5M12 20.5 8 8.6M12 20.5l4-11.9M12 20.5 5 12.2M12 20.5l7-8.3';
/** The visible disc of the moon in its halo place (MOON_SIZE 140 × scale 1.5 × the disc's 0.92). */
export const HALO_DISC = 193;

/**
 * The brand's one moment of the first run: Sigmazam climbs up out of the full moon (the disc clips
 * it, so it rises from inside), sparks burst, and nothing else happens here.
 */
export const MoonMascot = memo(function MoonMascot({ cx, cy, quiet, hue }: { cx: number; cy: number; quiet: boolean; hue: string }) {
  const reduce = useReducedMotion();
  const rise = useSharedValue(reduce ? 0 : 1);
  const o = useSharedValue(0);
  useEffect(() => {
    const k = slowFor(quiet);
    o.set(withDelay(380 * k, withTiming(1, { duration: 300 })));
    if (!reduce) rise.set(withDelay(380 * k, withSequence(withTiming(-0.04, { duration: 520 * k, easing: EASE_OUT }), withTiming(0, { duration: 220 * k }))));
  }, [quiet, reduce, rise, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.get(), transform: [{ translateY: rise.get() * 130 }] }));
  const w = HALO_DISC * 0.74;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.disc, { left: cx - HALO_DISC / 2, top: cy - HALO_DISC / 2 }]}>
        <Animated.View style={[{ position: 'absolute', left: (HALO_DISC - w) / 2, top: HALO_DISC * 0.13, width: w, height: w * (640 / 443) }, style]}>
          <Image source={BRAND.love} style={StyleSheet.absoluteFill} contentFit="contain" accessibilityLabel="Sigmazam" />
        </Animated.View>
      </View>
      {reduce
        ? null
        : Array.from({ length: quiet ? 5 : 10 }, (_, i) => <Spark key={i} index={i} count={quiet ? 5 : 10} cx={cx} cy={cy} quiet={quiet} color={['#FFE08A', ink.accent, '#FFFFFF', hue][i % 4]} />)}
    </View>
  );
});

function Spark({ index, count, cx, cy, quiet, color }: { index: number; count: number; cx: number; cy: number; quiet: boolean; color: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    const k = slowFor(quiet);
    p.set(withDelay((500 + index * 25) * k, withTiming(1, { duration: (1100 + index * 30) * k, easing: EASE_OUT })));
  }, [index, quiet, p]);
  const a = (index / count) * Math.PI * 2 + 0.3;
  const d = 110 + (index % 3) * 26;
  const big = 0.7 + (index % 2) * 0.6;
  const style = useAnimatedStyle(() => {
    const v = p.get();
    return {
      opacity: v < 0.25 ? v / 0.25 : 1 - (v - 0.25) / 0.75,
      transform: [{ translateX: cx - 6 + Math.cos(a) * d * v }, { translateY: cy - 6 + Math.sin(a) * d * 0.8 * v }, { scale: 0.2 + (big - 0.2) * v }, { rotate: `${90 * v}deg` }],
    };
  });
  return (
    <Animated.View style={[styles.spark, style]}>
      <Svg width={12} height={12} viewBox="0 0 1 1">
        <Path d={STAR} fill={color} />
      </Svg>
    </Animated.View>
  );
}

/** "+100" counting up from nothing (only this text re-renders, about a second's worth of frames). */
export function CountUp({ to, quiet }: { to: number; quiet: boolean }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? to : 0);
  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const start = Date.now() + 160;
    const d = 1000 * slowFor(quiet);
    const tick = () => {
      const k = Math.max(0, Math.min(1, (Date.now() - start) / d));
      setN(Math.round(to * (1 - Math.pow(1 - k, 4))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, quiet, reduce]);
  return (
    <View style={styles.count} accessible accessibilityLabel={`+${to}`}>
      <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
        <Path d={SHELL} stroke={ink.accent} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <InkText variant="numeral">{`+${n}`}</InkText>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: { position: 'absolute', width: HALO_DISC, height: HALO_DISC, borderRadius: HALO_DISC / 2, overflow: 'hidden' },
  spark: { position: 'absolute', left: 0, top: 0, width: 12, height: 12 },
  count: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
});
