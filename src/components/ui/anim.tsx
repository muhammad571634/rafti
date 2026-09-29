import LottieView from 'lottie-react-native';
import { useEffect } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ANIM_SOURCES, type AnimName } from '@/assets/lottie/registry';
import { colors, radius } from '@/theme';

export interface AnimProps {
  name: AnimName;
  size?: number;
  style?: StyleProp<ViewStyle>;
  loop?: boolean;
  autoPlay?: boolean;
  /** Tint applied to the fallback; ignored once a real Lottie is wired up. */
  tint?: string;
  speed?: number;
}

/**
 * Plays the registered Lottie for `name`, or a hand-rolled Reanimated stand-in
 * while that slot is still empty. Screens never need to know which one ran.
 */
export function Anim({
  name,
  size = 96,
  style,
  loop = true,
  autoPlay = true,
  tint = colors.primary,
  speed = 1,
}: AnimProps) {
  const source = ANIM_SOURCES[name];

  if (source) {
    const box = { width: size, height: size };
    // The web build of LottieView ignores `style` and sizes itself from `webStyle`,
    // so the box (and any positioning) lives on a wrapper that works everywhere.
    return (
      <View style={[box, style]} pointerEvents="none">
        <LottieView
          source={source as never}
          autoPlay={autoPlay}
          loop={loop}
          speed={speed}
          style={box}
          webStyle={box}
        />
      </View>
    );
  }

  return <AnimFallback name={name} size={size} tint={tint} style={style} />;
}

function AnimFallback({
  name,
  size,
  tint,
  style,
}: {
  name: AnimName;
  size: number;
  tint: string;
  style?: StyleProp<ViewStyle>;
}) {
  switch (name) {
    case 'typing':
      return <TypingDots size={size} tint={tint} style={style} />;
    case 'voiceWave':
      return <VoiceBars size={size} tint={tint} style={style} />;
    case 'calling':
      return <PulseRings size={size} tint={tint} style={style} />;
    case 'heartBurst':
      return <Pop size={size} tint={tint} style={style} emoji={'\u{1F497}'} />;
    case 'shell':
      return <Pop size={size} tint={tint} style={style} emoji={'\u{1F41A}'} spin />;
    case 'giftBox':
      return <Pop size={size} tint={tint} style={style} emoji={'\u{1F381}'} />;
    case 'confetti':
      return <Pop size={size} tint={tint} style={style} emoji={'\u{2728}'} />;
    case 'levelUp':
    default:
      return <Breathe size={size} style={style} emoji={'\u{1F49E}'} />;
  }
}

/* ── fallbacks ─────────────────────────────────────────────────────────────── */

function TypingDots({ size, tint, style }: { size: number; tint: string; style?: StyleProp<ViewStyle> }) {
  const dot = Math.max(4, size / 10);
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: dot / 2 }, style]}>
      {[0, 1, 2].map((i) => (
        <Dot key={i} index={i} size={dot} tint={tint} />
      ))}
    </View>
  );
}

function Dot({ index, size, tint }: { index: number; size: number; tint: string }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(
      index * 140,
      withRepeat(withSequence(withTiming(1, { duration: 320 }), withTiming(0, { duration: 320 })), -1),
    );
  }, [index, t]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + t.value * 0.65,
    transform: [{ translateY: -t.value * size * 0.6 }],
  }));

  return (
    <Animated.View
      style={[
        { width: size, height: size, borderRadius: size, backgroundColor: tint },
        animatedStyle,
      ]}
    />
  );
}

function VoiceBars({ size, tint, style }: { size: number; tint: string; style?: StyleProp<ViewStyle> }) {
  const barW = Math.max(2, size / 16);
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', height: size * 0.5, gap: barW * 0.8 },
        style,
      ]}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Bar key={i} index={i} width={barW} maxHeight={size * 0.5} tint={tint} />
      ))}
    </View>
  );
}

function Bar({
  index,
  width,
  maxHeight,
  tint,
}: {
  index: number;
  width: number;
  maxHeight: number;
  tint: string;
}) {
  const t = useSharedValue(0.3);

  useEffect(() => {
    t.value = withDelay(
      index * 90,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 380, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.3, { duration: 380, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );
  }, [index, t]);

  const animatedStyle = useAnimatedStyle(() => ({ height: maxHeight * t.value }));

  return (
    <Animated.View
      style={[{ width, borderRadius: radius.pill, backgroundColor: tint }, animatedStyle]}
    />
  );
}

function PulseRings({ size, tint, style }: { size: number; tint: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {[0, 1, 2].map((i) => (
        <Ring key={i} index={i} size={size} tint={tint} />
      ))}
    </View>
  );
}

function Ring({ index, size, tint }: { index: number; size: number; tint: string }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(index * 500, withRepeat(withTiming(1, { duration: 1800 }), -1, false));
  }, [index, t]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - t.value,
    transform: [{ scale: 0.4 + t.value * 0.6 }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size,
          borderWidth: 2,
          borderColor: tint,
        },
        animatedStyle,
      ]}
    />
  );
}

function Pop({
  size,
  emoji,
  style,
  spin = false,
}: {
  size: number;
  tint: string;
  emoji: string;
  style?: StyleProp<ViewStyle>;
  spin?: boolean;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = spin
      ? withRepeat(withTiming(1, { duration: 2400, easing: Easing.linear }), -1)
      : withSpring(1, { damping: 8, stiffness: 140 });
  }, [spin, t]);

  const animatedStyle = useAnimatedStyle(() =>
    spin
      ? { transform: [{ rotateY: `${t.value * 360}deg` }] }
      : { transform: [{ scale: 0.6 + t.value * 0.4 }], opacity: t.value },
  );

  return (
    <Animated.Text style={[{ fontSize: size * 0.7, lineHeight: size }, animatedStyle, style as never]}>
      {emoji}
    </Animated.Text>
  );
}

function Breathe({
  size,
  emoji,
  style,
}: {
  size: number;
  emoji: string;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, [t]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + t.value * 0.06 }, { rotate: `${-3 + t.value * 6}deg` }],
  }));

  return (
    <Animated.Text style={[{ fontSize: size * 0.72, lineHeight: size }, animatedStyle, style as never]}>
      {emoji}
    </Animated.Text>
  );
}
