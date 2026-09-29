import * as Haptics from 'expo-haptics';
import { Pressable, PressableProps, Platform, StyleProp, ViewStyle } from 'react-native';
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

  return (
    <AnimatedPressable
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled: !!disabled, ...accessibilityState }}
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
      style={[style, animatedStyle, disabled && { opacity: 0.45 }]}
      {...rest}>
      {children as React.ReactNode}
    </AnimatedPressable>
  );
}
