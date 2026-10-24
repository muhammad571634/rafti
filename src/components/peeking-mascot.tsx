import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { BRAND, BRAND_ASPECT } from '@/assets/brand/registry';
import { haptic } from '@/lib/haptics';

/** Share of the art below the body's flat bottom: the paws that rest on the edge. */
const PAW_DROP = 40 / 540;
/** Room above the art so a hop is not clipped. */
const HEADROOM = 24;

interface PeekingMascotProps {
  /** Width of the art; the height follows its aspect. */
  width?: number;
}

/**
 * The mascot peeking over the top edge of the sheet it sits in: it climbs up from
 * behind the edge when the sheet opens, now and then ducks and pops back up, and hops
 * when tapped. Only the mascot moves; the sheet itself still appears at once. With
 * reduced motion it simply sits there. Place it as the first child of a sheet card.
 */
export function PeekingMascot({ width = 150 }: PeekingMascotProps) {
  const height = width / BRAND_ASPECT.peek;
  const pawDrop = height * PAW_DROP;
  const reduceMotion = useReducedMotion();

  // `rise` lifts the art from below the edge (height = hidden) to rest (0).
  const rise = useSharedValue(reduceMotion ? 0 : height);
  const hop = useSharedValue(0);
  const squash = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    rise.value = withSequence(
      withDelay(180, withSpring(0, { damping: 12, stiffness: 140 })),
      // Every few seconds: duck to the eyes, wait, pop up again.
      withRepeat(
        withSequence(
          withDelay(5200, withTiming(height * 0.42, { duration: 260, easing: Easing.in(Easing.quad) })),
          withDelay(650, withSpring(0, { damping: 11, stiffness: 160 })),
        ),
        -1,
      ),
    );
    squash.value = withDelay(
      420,
      withSequence(withTiming(0.9, { duration: 90 }), withSpring(1, { damping: 8, stiffness: 220 })),
    );
    return () => {
      cancelAnimation(rise);
      cancelAnimation(squash);
    };
  }, [height, reduceMotion, rise, squash]);

  const onTap = () => {
    haptic.tap();
    if (reduceMotion) return;
    hop.value = withSequence(
      withTiming(-HEADROOM + 6, { duration: 130, easing: Easing.out(Easing.quad) }),
      withSpring(0, { damping: 9, stiffness: 200 }),
    );
    squash.value = withSequence(withTiming(1.06, { duration: 130 }), withSpring(1, { damping: 8, stiffness: 220 }));
  };

  const artStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: rise.value + hop.value },
      // Squash from the bottom: shrink in height, a touch wider, anchored at the edge.
      { translateY: (height * (1 - squash.value)) / 2 },
      { scaleY: squash.value },
      { scaleX: 2 - squash.value },
    ],
  }));

  return (
    <View
      pointerEvents="box-none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.clip,
        { width, height: height + HEADROOM, top: -(height - pawDrop) - HEADROOM, marginLeft: -width / 2 },
      ]}>
      <Animated.View style={[styles.art, { width, height }, artStyle]}>
        <Pressable onPress={onTap} style={StyleSheet.absoluteFill}>
          <Image source={BRAND.peek} style={{ width, height }} contentFit="contain" />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Clips the art at its resting bottom, so it rises from behind the sheet's edge.
  clip: { position: 'absolute', left: '50%', overflow: 'hidden', zIndex: 1 },
  art: { position: 'absolute', bottom: 0 },
});
