import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect } from 'react';
import { Platform, type StyleProp, StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { aurora, isDark } from '@/theme';

/** Where each blob sits (fractions of the screen) and how it drifts. */
const BLOBS = [
  { x: -0.35, y: -0.12, size: 1.35, dx: 40, dy: 30, ms: 18000 },
  { x: 0.42, y: 0.1, size: 1.4, dx: -50, dy: 40, ms: 22000 },
  { x: -0.25, y: 0.5, size: 1.3, dx: 30, dy: -50, ms: 26000 },
  { x: 0.4, y: 0.78, size: 1.25, dx: -36, dy: -30, ms: 20000 },
] as const;

/**
 * The aurora ground: four soft colour fields drifting very slowly behind the content. Each field
 * is a radial gradient that fades to nothing, which reads like a heavy blur without the cost of
 * one. The drift stops when the phone asks for reduced motion.
 */
export function AuroraBackground() {
  const { width, height } = useWindowDimensions();
  const still = useReducedMotion();
  return (
    <View style={[StyleSheet.absoluteFill, styles.base]} pointerEvents="none">
      {BLOBS.map((b, i) => (
        <Blob
          key={i}
          color={aurora.blobs[i]}
          left={b.x * width}
          top={b.y * height}
          size={b.size * width}
          dx={b.dx}
          dy={b.dy}
          ms={b.ms}
          still={still}
        />
      ))}
    </View>
  );
}

function Blob({
  color,
  left,
  top,
  size,
  dx,
  dy,
  ms,
  still,
}: {
  color: string;
  left: number;
  top: number;
  size: number;
  dx: number;
  dy: number;
  ms: number;
  still: boolean;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    t.value = withRepeat(withTiming(1, { duration: ms, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [still, ms, t]);
  const drift = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(t.value, [0, 1], [0, dx]) },
      { translateY: interpolate(t.value, [0, 1], [0, dy]) },
      { scale: interpolate(t.value, [0, 1], [1, 1.08]) },
    ],
  }));
  const id = `aurora-${color.slice(1)}`;
  return (
    <Animated.View style={[styles.blob, { left, top, width: size, height: size }, drift]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={isDark ? 0.95 : 0.9} />
            <Stop offset="0.45" stopColor={color} stopOpacity={0.5} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

/** Real Liquid Glass where the phone has it (iOS 26+), checked once. */
const nativeGlass = Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

/**
 * A control's glass on the aurora: the system's Liquid Glass on iOS 26+, elsewhere a see-through
 * fill with a bright top rim and a fine dark edge. For controls only, never for content
 * (HIG Materials). `on` marks the selected state (the current tab, a pressed toggle).
 */
export function AuroraGlass({
  children,
  style,
  on,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  on?: boolean;
}) {
  if (nativeGlass) {
    return (
      <GlassView style={style} glassEffectStyle="regular" isInteractive tintColor={on ? aurora.glassOn : undefined}>
        {children}
      </GlassView>
    );
  }
  return <View style={[styles.glass, on && styles.glassOn, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: { backgroundColor: aurora.base, overflow: 'hidden' },
  blob: { position: 'absolute' },
  glass: {
    backgroundColor: aurora.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: aurora.glassEdge,
    borderTopColor: aurora.glassRim,
    shadowColor: '#3C285A',
    shadowOpacity: isDark ? 0.4 : 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  glassOn: { backgroundColor: aurora.glassOn },
});
