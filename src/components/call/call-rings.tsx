import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

/** Their rings: how far each grows at full loudness, and how bright it is. */
const RINGS = [
  { grow: 0.2, alpha: 0.5 },
  { grow: 0.36, alpha: 0.32 },
  { grow: 0.54, alpha: 0.18 },
];
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/**
 * The avatar on a call, alive (brief 2026-11-15 Step 4): rings that swell with the loudness of their
 * voice (`their`, 0-1), the avatar leaning in and its rim lighting with the user's (`mine`), and a
 * turning arc while their answer is on its way (`thinking`). Levels arrive as shared values, so
 * nothing here re-renders while they talk. Reduced motion keeps the light and drops the movement.
 */
export function CallRings({
  size,
  their,
  mine,
  thinking,
  children,
}: {
  size: number;
  their: SharedValue<number>;
  mine: SharedValue<number>;
  thinking: boolean;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const spin = useSharedValue(0);
  const arc = useSharedValue(0);

  useEffect(() => {
    arc.set(withTiming(thinking ? 1 : 0, { duration: 200, easing: EASE_OUT }));
    if (thinking && !reduced) {
      spin.set(0);
      spin.set(withRepeat(withTiming(360, { duration: 1100, easing: Easing.linear }), -1, false));
    } else cancelAnimation(spin);
  }, [thinking, reduced, arc, spin]);

  const lean = useAnimatedStyle(() => ({ transform: [{ scale: reduced ? 1 : 1 + 0.05 * mine.get() }] }));
  const rim = useAnimatedStyle(() => ({ opacity: mine.get() }));
  const turning = useAnimatedStyle(() => ({ opacity: arc.get(), transform: [{ rotate: `${spin.get()}deg` }] }));
  const circle = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {RINGS.map((ring, i) => (
        <TheirRing key={i} level={their} grow={ring.grow} alpha={ring.alpha} still={reduced} style={circle} />
      ))}
      <Animated.View
        pointerEvents="none"
        style={[styles.arc, { width: size + 18, height: size + 18, borderRadius: (size + 18) / 2 }, turning]}
      />
      <Animated.View style={lean}>
        {children}
        <Animated.View pointerEvents="none" style={[styles.rim, circle, rim]} />
      </Animated.View>
    </View>
  );
}

function TheirRing({
  level,
  grow,
  alpha,
  still,
  style,
}: {
  level: SharedValue<number>;
  grow: number;
  alpha: number;
  still: boolean;
  style: { width: number; height: number; borderRadius: number };
}) {
  const animated = useAnimatedStyle(() => {
    const l = level.get();
    return { opacity: l * alpha, transform: [{ scale: still ? 1 + grow * 0.4 : 1 + grow * l }] };
  });
  return <Animated.View pointerEvents="none" style={[styles.ring, style, animated]} />;
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.55)' },
  // Their answer on its way: a quarter of a thin white circle, turning.
  arc: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: 'transparent',
    borderTopColor: 'rgba(255,255,255,0.9)',
    borderRightColor: 'rgba(255,255,255,0.35)',
  },
  // The user talking: the avatar's rim lights up.
  rim: { position: 'absolute', top: 0, left: 0, borderWidth: 3, borderColor: '#FFFFFF' },
});
