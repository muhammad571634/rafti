import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { BRAND } from '@/assets/brand/registry';
import { Txt } from '@/components/ui';

/** A four-point sparkle, drawn in a 10×10 box. */
const SPARKLE = 'M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z';

/** Where the sparkles twinkle and the Zzz start, as fractions of the art (canvas "BedtimeMascot"). */
const SPARKLES = [
  { x: 0.78, y: 0.17, s: 0.07, delay: 0, period: 2800 },
  { x: 0.12, y: 0.3, s: 0.05, delay: 900, period: 3400 },
  { x: 0.86, y: 0.62, s: 0.05, delay: 1700, period: 3000 },
  { x: 0.3, y: 0.86, s: 0.06, delay: 2400, period: 3800 },
];
const ZZZ = [
  { text: 'z', size: 0.12, left: 0, delay: 0 },
  { text: 'z', size: 0.15, left: 0.02, delay: 1200 },
  { text: 'Z', size: 0.18, left: 0.04, delay: 2400 },
];
const Z_PERIOD = 3600;

/**
 * The mascot asleep on the moon (canvas "BedtimeMascot", 2026-10-22): one slow breath every 4 s,
 * Zzz rising from its head and the moon's stars twinkling. While a voice whispers (`whispering`)
 * the moon also rocks gently and glows. Under Reduce Motion it stands still.
 */
export function SleepingMascot({ size, whispering }: { size: number; whispering: boolean }) {
  const reduced = useReducedMotion();
  const breath = useSharedValue(0);
  const rock = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    breath.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [breath, reduced]);

  useEffect(() => {
    if (reduced || !whispering) {
      rock.value = withTiming(0, { duration: 400 });
      return;
    }
    rock.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(-1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [rock, reduced, whispering]);

  const radius = Math.round(size * 0.22);
  const breathStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + breath.value * 0.035 }] }));
  const rockStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.abs(rock.value) * size * 0.04 }, { rotate: `${rock.value * 1.5}deg` }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: Math.abs(rock.value) * 0.9 }));

  return (
    <Animated.View style={[{ width: size, height: size }, rockStyle]}>
      {whispering ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.glow, { borderRadius: radius + size * 0.06, margin: -size * 0.06 }, glowStyle]}
        />
      ) : null}
      <Animated.View style={[styles.art, { borderRadius: radius }, breathStyle]}>
        <Image source={BRAND.bedtime} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
        {SPARKLES.map((s, i) => (
          <Sparkle key={i} size={size} spec={s} reduced={reduced} />
        ))}
      </Animated.View>
      <View pointerEvents="none" style={{ position: 'absolute', left: size * 0.6, top: size * 0.3 }}>
        {ZZZ.map((z, i) => (
          <Zee key={i} size={size} spec={z} reduced={reduced} />
        ))}
      </View>
    </Animated.View>
  );
}

function useLoop(delay: number, period: number, reduced: boolean): SharedValue<number> {
  const t = useSharedValue(reduced ? 0.5 : 0);
  useEffect(() => {
    if (reduced) return;
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: period, easing: Easing.linear }), -1));
  }, [delay, period, reduced, t]);
  return t;
}

function Sparkle({ size, spec, reduced }: { size: number; spec: (typeof SPARKLES)[number]; reduced: boolean }) {
  const t = useLoop(spec.delay, spec.period, reduced);
  // Fades in and out once per period, turning a little as it brightens.
  const style = useAnimatedStyle(() => {
    const k = reduced ? 0.8 : Math.sin(t.value * Math.PI);
    return { opacity: k, transform: [{ scale: 0.4 + k * 0.6 }, { rotate: `${k * 45}deg` }] };
  });
  const s = size * spec.s;
  return (
    <Animated.View style={[{ position: 'absolute', left: size * spec.x, top: size * spec.y, width: s, height: s }, style]}>
      <Svg width={s} height={s} viewBox="0 0 10 10">
        <Path d={SPARKLE} fill="#FFF4C9" />
      </Svg>
    </Animated.View>
  );
}

function Zee({ size, spec, reduced }: { size: number; spec: (typeof ZZZ)[number]; reduced: boolean }) {
  const t = useLoop(spec.delay, Z_PERIOD, reduced);
  // Rises up and to the right, growing, visible early and gone by the end.
  const style = useAnimatedStyle(() => {
    const p = t.value;
    const opacity = reduced ? 0.8 : p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
    return {
      opacity,
      transform: [
        { translateX: p * size * 0.14 },
        { translateY: -p * size * 0.34 },
        { scale: 0.6 + p * 0.5 },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: size * spec.left }, style]}>
      <Txt style={[styles.zee, { fontSize: size * spec.size, lineHeight: size * spec.size * 1.1 }]}>{spec.text}</Txt>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  art: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  glow: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(255,214,140,0.28)' },
  zee: {
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
});
