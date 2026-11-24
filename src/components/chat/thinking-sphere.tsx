import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { ink } from '@/theme/ink';

interface Point3D {
  x: number;
  y: number;
  z: number;
}

const DOT_COUNT = 22;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const SPHERE_POINTS: readonly Point3D[] = Array.from({ length: DOT_COUNT }, (_, i) => {
  const y = 1 - (i / (DOT_COUNT - 1)) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = GOLDEN_ANGLE * i;
  return { x: Math.cos(theta) * r, y, z: Math.sin(theta) * r };
});

const SphereDot = memo(function SphereDot({
  point,
  angle,
  radius,
  dotSize,
  color,
}: {
  point: Point3D;
  angle: SharedValue<number>;
  radius: number;
  dotSize: number;
  color: string;
}) {
  const animStyle = useAnimatedStyle(() => {
    const t = angle.value;
    const cosY = Math.cos(t);
    const sinY = Math.sin(t);
    const cosX = Math.cos(t * 0.5);
    const sinX = Math.sin(t * 0.5);
    const x1 = point.x * cosY - point.z * sinY;
    const z1 = point.x * sinY + point.z * cosY;
    const y2 = point.y * cosX - z1 * sinX;
    const z2 = point.y * sinX + z1 * cosX;
    const depth = (z2 + 1) * 0.5;
    return {
      opacity: 0.2 + depth * 0.8,
      transform: [
        { translateX: x1 * radius },
        { translateY: y2 * radius },
        { scale: 0.52 + depth * 0.68 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: color,
        },
        animStyle,
      ]}
    />
  );
});

export interface ThinkingSphereProps {
  /** Outer box size in pt (default 22). */
  size?: number;
  /** Dot color (defaults to Sigmazam warm brand peach). */
  color?: string;
}

/**
 * 3D rotating Fibonacci dot-matrix sphere rendered 100% on the UI thread via Reanimated worklets.
 * Zero JS-thread frame callbacks, respects Reduce Motion, smooth 60-120fps on Galaxy A51 and iOS.
 */
export const ThinkingSphere = memo(function ThinkingSphere({ size = 22, color = ink.accent }: ThinkingSphereProps) {
  const reducedMotion = useReducedMotion();
  const angle = useSharedValue(0.6);

  useEffect(() => {
    if (reducedMotion) {
      angle.value = 0.6;
      return;
    }
    angle.value = 0;
    angle.value = withRepeat(withTiming(Math.PI * 2, { duration: 4200, easing: Easing.linear }), -1, false);
  }, [angle, reducedMotion]);

  const radius = size * 0.38;
  const dotSize = Math.max(2.2, size * 0.13);

  return (
    <View style={[styles.box, { width: size, height: size }]} pointerEvents="none">
      {SPHERE_POINTS.map((point, i) => (
        <SphereDot key={i} point={point} angle={angle} radius={radius} dotSize={dotSize} color={color} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
  },
});
