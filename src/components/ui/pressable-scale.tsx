import * as Haptics from 'expo-haptics';
import { Pressable, PressableProps, Platform, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** How far down it presses. 1 = no movement. */
  scaleTo?: number;
  haptic?: boolean;
  dimOnPress?: boolean;
}

/** Every tappable surface in the app uses this so press feedback stays consistent. */
export function PressableScale({
  style,
  scaleTo = 0.96,
  haptic = false,
  dimOnPress = true,
  onPressIn,
  onPressOut,
  disabled,
  accessibilityRole = 'button',
  accessibilityState,
  children,
  ...rest
}: PressableScaleProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * (1 - scaleTo) }],
    opacity: dimOnPress ? 1 - pressed.value * 0.15 : 1,
  }));

  const a11y = {
    accessibilityRole,
    accessibilityState: { disabled: !!disabled, ...accessibilityState },
  };

  // A disabled control renders as a plain Pressable: the animated style owns opacity
  // and would paint over a static fade, leaving a disabled button looking enabled.
  if (disabled) {
    return (
      <Pressable disabled {...a11y} style={[style, styles.disabled]} {...rest}>
        {children}
      </Pressable>
    );
  }

  return (
    <AnimatedPressable
      {...a11y}
      onPressIn={(e) => {
        pressed.value = withSpring(1, { damping: 22, stiffness: 420 });
        if (haptic && Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = withTiming(0, { duration: 140 });
        onPressOut?.(e);
      }}
      style={[style, animatedStyle]}
      {...rest}>
      {children as React.ReactNode}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.45 },
});
