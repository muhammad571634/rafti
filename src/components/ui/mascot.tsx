import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { BRAND, BRAND_ASPECT, type BrandArtName } from '@/assets/brand/registry';

export interface BrandArtProps {
  name: BrandArtName;
  /** Width; height follows the art's own aspect unless `height` is given too. */
  width: number;
  height?: number;
  /** Gentle idle float so Rafti feels alive. */
  bob?: boolean;
  /** Stagger for several bobbing pieces on one screen. */
  delay?: number;
  radius?: number;
  contentFit?: 'contain' | 'cover';
  style?: StyleProp<ViewStyle>;
}

/** One piece of Rafti art from assets/brand, optionally floating. */
export function BrandArt({
  name,
  width,
  height,
  bob = false,
  delay = 0,
  radius = 0,
  contentFit = 'contain',
  style,
}: BrandArtProps) {
  const t = useSharedValue(0);

  useEffect(() => {
    if (!bob) return;
    t.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );
  }, [bob, delay, t]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -t.value * 5 }, { rotate: `${(t.value - 0.5) * 2.4}deg` }],
  }));

  const box = { width, height: height ?? width / BRAND_ASPECT[name] };

  return (
    <Animated.View style={[box, floatStyle, style]} pointerEvents="none">
      <Image source={BRAND[name]} style={[box, { borderRadius: radius }]} contentFit={contentFit} />
    </Animated.View>
  );
}

/** Rafti's sticker face: the app's own mascot mark, square-boxed. */
export function Mascot({
  size = 96,
  bob = false,
  style,
}: {
  size?: number;
  bob?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return <BrandArt name="sticker" width={size} height={size} bob={bob} style={style} />;
}
