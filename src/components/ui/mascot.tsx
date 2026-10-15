import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useCallback, useEffect } from 'react';
import { Platform, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

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
  /** Allow playful squash and spring tap interaction with haptic feedback. */
  interactive?: boolean;
  /** Optional press handler when mascot is tapped. */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** A soft radial fade (solid at the centre, clear at `fadeTo`), filling its parent. */
function SoftFade({ id, color, opacity, fadeTo }: { id: string; color: string; opacity: number; fadeTo: number }) {
  return (
    <Svg width="100%" height="100%">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset={fadeTo} stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/** Acoustic sound wave ripple rings radiating from the seashell. */
function ShellRipples({ width, height }: { width: number; height: number }) {
  const wave1 = useSharedValue(0);
  const wave2 = useSharedValue(0);
  const wave3 = useSharedValue(0);

  useEffect(() => {
    const duration = 2800;
    const easing = Easing.bezier(0.15, 0.7, 0.35, 1);
    wave1.value = withRepeat(withTiming(1, { duration, easing }), -1);
    wave2.value = withDelay(900, withRepeat(withTiming(1, { duration, easing }), -1));
    wave3.value = withDelay(1800, withRepeat(withTiming(1, { duration, easing }), -1));
  }, [wave1, wave2, wave3]);

  const style1 = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(wave1.value, [0, 1], [0.35, 2.3]) }],
    opacity: interpolate(wave1.value, [0, 0.25, 0.8, 1], [0, 0.75, 0.28, 0]),
  }));
  const style2 = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(wave2.value, [0, 1], [0.35, 2.3]) }],
    opacity: interpolate(wave2.value, [0, 0.25, 0.8, 1], [0, 0.65, 0.22, 0]),
  }));
  const style3 = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(wave3.value, [0, 1], [0.35, 2.3]) }],
    opacity: interpolate(wave3.value, [0, 0.25, 0.8, 1], [0, 0.55, 0.18, 0]),
  }));

  // Position centered on the pink seashell in rafti-empty.png (~72% X, ~38% Y)
  const shellX = width * 0.72;
  const shellY = height * 0.38;
  const baseSize = Math.max(26, width * 0.22);

  return (
    <View
      style={[
        styles.rippleOrigin,
        {
          left: shellX - baseSize / 2,
          top: shellY - baseSize / 2,
          width: baseSize,
          height: baseSize,
        },
      ]}
      pointerEvents="none"
    >
      <Animated.View style={[styles.rippleRing, styles.mintRing, style1]} />
      <Animated.View style={[styles.rippleRing, styles.pinkRing, style2]} />
      <Animated.View style={[styles.rippleRing, styles.apricotRing, style3]} />
    </View>
  );
}

/** Soft breathing glow aura from the seashell. */
function ShellGlow({
  width,
  height,
  progress,
}: {
  width: number;
  height: number;
  progress: SharedValue<number>;
}) {
  const shellX = width * 0.72;
  const shellY = height * 0.38;
  const glowSize = Math.max(36, width * 0.3);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.35, 0.8]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.95, 1.25]) }],
  }));

  return (
    <Animated.View
      style={[
        styles.shellGlow,
        {
          left: shellX - glowSize / 2,
          top: shellY - glowSize / 2,
          width: glowSize,
          height: glowSize,
        },
        glowStyle,
      ]}
      pointerEvents="none"
    >
      <SoftFade id="raftiShellGlow" color="rgb(251, 113, 133)" opacity={0.55} fadeTo={0.75} />
    </Animated.View>
  );
}

/** Ground shadow that contracts/expands inversely with the float height. */
function GroundShadow({
  width,
  height,
  progress,
}: {
  width: number;
  height: number;
  progress: SharedValue<number>;
}) {
  const shadowWidth = width * 0.77;
  const shadowHeight = Math.max(10, height * 0.065);

  const shadowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.8, 0.45]),
    transform: [{ scaleX: interpolate(progress.value, [0, 1], [1, 0.88]) }],
  }));

  return (
    <Animated.View
      style={[styles.groundShadow, { width: shadowWidth, height: shadowHeight }, shadowStyle]}
      pointerEvents="none"
    >
      <SoftFade id="raftiGroundShadow" color="#000000" opacity={0.14} fadeTo={0.7} />
    </Animated.View>
  );
}

/** One piece of Rafti art from assets/brand, with full 60-120fps Reanimated 3 animation. */
export function BrandArt({
  name,
  width,
  height,
  bob = false,
  delay = 0,
  radius = 0,
  contentFit = 'contain',
  interactive,
  onPress,
  style,
}: BrandArtProps) {
  const isInteractive = interactive ?? (bob && name === 'empty');
  // Shadow, glow and ripples belong to the full Rafti art only, not to cards like Reward or Level up.
  const showAura = bob && name === 'empty';
  const t = useSharedValue(0);

  // Tap spring reaction shared values
  const squashX = useSharedValue(1);
  const squashY = useSharedValue(1);
  const tapJump = useSharedValue(0);

  useEffect(() => {
    if (!bob) {
      // Bedtime pauses the float: stop the loop and settle at rest.
      cancelAnimation(t);
      t.value = 0;
      return;
    }
    t.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );
  }, [bob, delay, t]);

  const handlePress = useCallback(() => {
    if (!isInteractive) return;

    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    // Squash & stretch spring animation
    squashX.value = withSequence(
      withTiming(1.14, { duration: 90 }),
      withSpring(1, { damping: 11, stiffness: 190 }),
    );
    squashY.value = withSequence(
      withTiming(0.88, { duration: 90 }),
      withSpring(1, { damping: 11, stiffness: 190 }),
    );
    tapJump.value = withSequence(
      withTiming(7, { duration: 90 }),
      withSpring(0, { damping: 12, stiffness: 180 }),
    );

    onPress?.();
  }, [isInteractive, onPress, squashX, squashY, tapJump]);

  // Always the same keys: a style that drops `transform` can leave the last one on the view.
  const floatStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -t.value * 7 + tapJump.value },
      { scaleX: (1 + t.value * 0.012) * squashX.value },
      { scaleY: (1 - t.value * 0.012) * squashY.value },
      { rotate: `${(t.value - 0.5) * 1.8 * (bob ? 1 : 0)}deg` },
    ],
  }));

  const boxHeight = height ?? width / BRAND_ASPECT[name];
  const box = { width, height: boxHeight };

  const content = (
    <>
      {showAura ? <GroundShadow width={width} height={boxHeight} progress={t} /> : null}

      <Animated.View style={[box, floatStyle]}>
        {showAura ? (
          <>
            <ShellGlow width={width} height={boxHeight} progress={t} />
            <ShellRipples width={width} height={boxHeight} />
          </>
        ) : null}

        <Image
          source={BRAND[name]}
          style={[box, { borderRadius: radius }]}
          contentFit={contentFit}
        />
      </Animated.View>
    </>
  );

  // `style` sits on the outermost view so callers' margins and alignSelf act on the parent layout.
  if (isInteractive) {
    return (
      <Pressable onPress={handlePress} style={[box, style]}>
        {content}
      </Pressable>
    );
  }

  return (
    <View style={[box, style]} pointerEvents="none">
      {content}
    </View>
  );
}

/** Rafti's sticker face: the app's own mascot mark, square-boxed. */
export function Mascot({
  size = 96,
  bob = false,
  interactive,
  onPress,
  style,
}: {
  size?: number;
  bob?: boolean;
  interactive?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <BrandArt
      name="sticker"
      width={size}
      height={size}
      bob={bob}
      interactive={interactive}
      onPress={onPress}
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  rippleOrigin: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  rippleRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 999,
    borderWidth: 1.5,
  },
  mintRing: {
    borderColor: 'rgba(52, 211, 153, 0.55)',
  },
  pinkRing: {
    borderColor: 'rgba(251, 113, 133, 0.5)',
  },
  apricotRing: {
    borderColor: 'rgba(249, 115, 22, 0.45)',
  },
  shellGlow: {
    position: 'absolute',
    zIndex: 1,
  },
  groundShadow: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 0,
    bottom: -2,
  },
});
