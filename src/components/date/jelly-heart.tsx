import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { ClipPath, Defs, Path, Rect } from 'react-native-svg';

import { haptic } from '@/lib/haptics';
import { jellyHeartFill } from '@/lib/polaroid-motion';
import { createPolaroidSound, type PolaroidSound } from '@/lib/polaroid-sound';
import { colors, systemColors } from '@/theme';

const HEART_PATH =
  'M12 20.6C12 20.6 3.2 14.9 3.2 8.9C3.2 5.7 5.6 3.4 8.4 3.4C10.2 3.4 11.4 4.4 12 5.6C12.6 4.4 13.8 3.4 15.6 3.4C18.4 3.4 20.8 5.7 20.8 8.9C20.8 14.9 12 20.6 12 20.6Z';

export interface JellyHeartProps {
  hearts: number;
  maxHearts: number;
  size?: number;
}

/**
 * Tactile Liquid Jelly Heart meter for Date rounds.
 * Elastic squash-and-stretch pop + rising liquid fill + floating rose sparks + warm chime
 * whenever the player earns hearts. Respects Reduced Motion and quiet night hours.
 */
export function JellyHeart({ hearts, maxHearts, size = 24 }: JellyHeartProps) {
  const reduced = useReducedMotion();
  const prevRef = useRef(hearts);
  const soundRef = useRef<PolaroidSound | null>(null);

  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);
  const sparkY = useSharedValue(0);
  const sparkOp = useSharedValue(0);

  useEffect(() => {
    const sound = createPolaroidSound();
    soundRef.current = sound;
    return () => {
      sound.dispose();
      soundRef.current = null;
    };
  }, []);

  useEffect(() => {
    const gained = hearts > prevRef.current;
    prevRef.current = hearts;
    if (!gained) return;

    haptic.tap();
    soundRef.current?.heart();

    if (reduced) return;

    scaleX.value = withSequence(
      withTiming(1.28, { duration: 110, easing: Easing.out(Easing.quad) }),
      withTiming(0.86, { duration: 110, easing: Easing.inOut(Easing.quad) }),
      withTiming(1.08, { duration: 100, easing: Easing.inOut(Easing.quad) }),
      withTiming(1, { duration: 140, easing: Easing.out(Easing.cubic) }),
    );
    scaleY.value = withSequence(
      withTiming(0.78, { duration: 110, easing: Easing.out(Easing.quad) }),
      withTiming(1.18, { duration: 110, easing: Easing.inOut(Easing.quad) }),
      withTiming(0.94, { duration: 100, easing: Easing.inOut(Easing.quad) }),
      withTiming(1, { duration: 140, easing: Easing.out(Easing.cubic) }),
    );
    sparkY.value = 0;
    sparkOp.value = 1;
    sparkY.value = withTiming(-24, { duration: 680, easing: Easing.out(Easing.cubic) });
    sparkOp.value = withSequence(
      withTiming(1, { duration: 180 }),
      withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) }),
    );

    return () => {
      cancelAnimation(scaleX);
      cancelAnimation(scaleY);
      cancelAnimation(sparkY);
      cancelAnimation(sparkOp);
    };
  }, [hearts, reduced, scaleX, scaleY, sparkY, sparkOp]);

  const ratio = jellyHeartFill(hearts, maxHearts);
  const fillH = ratio * 24;
  const fillY = 24 - fillH;

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: scaleX.value }, { scaleY: scaleY.value }],
  }));

  const sparkStyle = useAnimatedStyle(() => ({
    opacity: sparkOp.value,
    transform: [{ translateY: sparkY.value }, { scale: 0.7 + sparkOp.value * 0.35 }],
  }));

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Animated.View style={heartStyle}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Defs>
            <ClipPath id="jellyHeartClip">
              <Path d={HEART_PATH} />
            </ClipPath>
          </Defs>
          <Path d={HEART_PATH} fill={systemColors.pink} fillOpacity={0.2} />
          <Rect x={0} y={fillY} width={24} height={fillH + 2} fill={systemColors.pink} clipPath="url(#jellyHeartClip)" />
          {/* Glossy jelly specular highlight */}
          <Path d="M6.4 8.2C6.4 6.9 7.3 6 8.5 6" stroke={colors.white} strokeWidth={1.6} strokeLinecap="round" strokeOpacity={0.55} fill="none" />
          <Path d={HEART_PATH} stroke={systemColors.pink} strokeWidth={1.6} fill="none" />
        </Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.spark, sparkStyle]}>
        <Svg width={10} height={10} viewBox="0 0 24 24">
          <Path d={HEART_PATH} fill={systemColors.pink} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spark: {
    position: 'absolute',
    top: -4,
  },
});
