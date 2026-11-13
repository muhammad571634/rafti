import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { REACTION_STICKERS, type ReactionName } from '@/assets/brand/registry';

interface ReactionStickerProps {
  name: ReactionName;
  /** `loop` keeps moving (the reaction picker); `still` stands quiet (under a message, iOS tapback). */
  play?: 'loop' | 'still';
  /** Size and position; the sticker fills it. */
  style?: StyleProp<ViewStyle>;
}

type Motion = { scale: SharedValue<number>; rotate: SharedValue<number>; lift: SharedValue<number> };

const ease = Easing.inOut(Easing.quad);
const tick = (to: number, duration: number) => withTiming(to, { duration, easing: ease });

/**
 * Each reaction moves the way it feels, a short beat then a rest:
 * love beats like a heart, laugh shakes, wow pops, sad sways slowly, hyped jumps,
 * thumbs gives a cool nod. `lift` is a share of the sticker's height.
 */
function start(name: ReactionName, { scale, rotate, lift }: Motion) {
  const repeat = (beat: number) => withRepeat(beat, -1);
  switch (name) {
    case 'love':
      scale.value = repeat(
        withSequence(tick(1.14, 120), tick(1, 120), tick(1.09, 120), tick(1, 200), withDelay(900, tick(1, 0))),
      );
      break;
    case 'laugh':
      rotate.value = repeat(
        withSequence(tick(-9, 70), tick(9, 90), tick(-7, 90), tick(7, 90), tick(0, 80), withDelay(650, tick(0, 0))),
      );
      lift.value = repeat(withSequence(tick(-0.05, 110), tick(0, 110), tick(-0.05, 110), tick(0, 110), withDelay(650, tick(0, 0))));
      break;
    case 'wow':
      scale.value = repeat(
        withSequence(tick(0.86, 90), withSpring(1.16, { damping: 6, stiffness: 260 }), tick(1, 180), withDelay(1500, tick(1, 0))),
      );
      break;
    case 'sad':
      rotate.value = repeat(withSequence(tick(-4, 1100), tick(4, 1100)));
      lift.value = repeat(withSequence(tick(0.025, 1100), tick(0, 1100)));
      break;
    case 'hyped':
      lift.value = repeat(
        withSequence(
          withTiming(-0.2, { duration: 150, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 150, easing: Easing.in(Easing.quad) }),
          withTiming(-0.14, { duration: 130, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 130, easing: Easing.in(Easing.quad) }),
          withDelay(700, tick(0, 0)),
        ),
      );
      scale.value = repeat(withSequence(tick(1.05, 150), tick(1, 150), tick(1, 260), withDelay(700, tick(1, 0))));
      break;
    case 'thumbs':
      rotate.value = repeat(
        withSequence(tick(-12, 160), withSpring(0, { damping: 7, stiffness: 220 }), withDelay(1400, tick(0, 0))),
      );
      break;
  }
}

/** A chat reaction sticker of the Sigmazam mascot that moves to match its feeling. */
export function ReactionSticker({ name, play = 'loop', style }: ReactionStickerProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const lift = useSharedValue(0);
  const height = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || play === 'still') return;
    start(name, { scale, rotate, lift });
    return () => {
      cancelAnimation(scale);
      cancelAnimation(rotate);
      cancelAnimation(lift);
      scale.value = 1;
      rotate.value = 0;
      lift.value = 0;
    };
  }, [name, play, reduceMotion, scale, rotate, lift]);

  const motion = useAnimatedStyle(() => ({
    transform: [
      { translateY: lift.value * height.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      style={[style, motion]}
      onLayout={(e) => {
        height.value = e.nativeEvent.layout.height;
      }}>
      <Image source={REACTION_STICKERS[name]} style={{ width: '100%', height: '100%' }} contentFit="contain" />
    </Animated.View>
  );
}
