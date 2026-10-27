import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, useId } from 'react';
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

import { aurora, colors, isDark } from '@/theme';

/**
 * The approved canvas draws the aurora as four solid circles under a 46px CSS blur on a
 * 390 x 844 phone. These are the same circles (centre and radius in those points, scaled to the
 * screen) and the same drift.
 */
const BLOBS = [
  { cx: 70, cy: 100, r: 190, dx: 40, dy: 30, ms: 18000 },
  { cx: 330, cy: 320, r: 200, dx: -50, dy: 40, ms: 22000 },
  { cx: 120, cy: 650, r: 180, dx: 30, dy: -50, ms: 26000 },
  { cx: 320, cy: 794, r: 170, dx: -36, dy: -30, ms: 20000 },
] as const;
const DESIGN_W = 390;
const DESIGN_H = 844;
/** How far past the circle's edge the 46px blur still shows colour. */
const BLUR_REACH = 70;

/**
 * The aurora ground: four soft colour fields drifting very slowly behind the content. Each field
 * is a radial gradient shaped like a blurred disc (solid core, soft edge), which reads like the
 * canvas's heavy blur without the cost of one. The drift stops when the phone asks for reduced
 * motion.
 */
export function AuroraBackground() {
  const { width, height } = useWindowDimensions();
  const still = useReducedMotion();
  return (
    <View style={[StyleSheet.absoluteFill, styles.base]} pointerEvents="none">
      {BLOBS.map((b, i) => {
        const size = 2 * (b.r + BLUR_REACH) * (width / DESIGN_W);
        return (
          <Blob
            key={i}
            color={aurora.blobs[i]}
            left={(b.cx / DESIGN_W) * width - size / 2}
            top={(b.cy / DESIGN_H) * height - size / 2}
            size={size}
            dx={b.dx}
            dy={b.dy}
            ms={b.ms}
            still={still}
          />
        );
      })}
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
  // Unique per mount: on web a screen under the stack keeps its SVG, and a repeated id would
  // point this gradient at that hidden copy, which browsers do not paint.
  const id = `aurora-${color.slice(1)}-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Animated.View style={[styles.blob, { left, top, width: size, height: size }, drift]}>
      <Svg width={size} height={size}>
        <Defs>
          {/* A disc of radius r under a 46px blur: solid to ~r-70, half at r, gone at r+70. */}
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={1} />
            <Stop offset="0.45" stopColor={color} stopOpacity={1} />
            <Stop offset="0.6" stopColor={color} stopOpacity={0.86} />
            <Stop offset="0.73" stopColor={color} stopOpacity={0.5} />
            <Stop offset="0.86" stopColor={color} stopOpacity={0.16} />
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
 * `prominent` is a screen's one primary action (iOS's prominent glass): tinted in the brand
 * fill, its glyph in `colors.textOnPrimary`.
 */
export function AuroraGlass({
  children,
  style,
  on,
  prominent,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  on?: boolean;
  prominent?: boolean;
}) {
  if (nativeGlass) {
    const tint = prominent ? colors.primaryFill : on ? aurora.glassOn : undefined;
    return (
      <GlassView style={style} glassEffectStyle="regular" isInteractive tintColor={tint}>
        {children}
      </GlassView>
    );
  }
  return <View style={[styles.glass, on && styles.glassOn, prominent && styles.prominent, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: { backgroundColor: aurora.base, overflow: 'hidden' },
  blob: { position: 'absolute' },
  glass: {
    backgroundColor: aurora.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: aurora.glassEdge,
    borderTopColor: aurora.glassRim,
    shadowColor: aurora.shadow,
    shadowOpacity: isDark ? 0.4 : 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  glassOn: { backgroundColor: aurora.glassOn },
  prominent: { backgroundColor: colors.primaryFill, borderTopColor: aurora.glassEdge },
});
