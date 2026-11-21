import { useEffect, useRef, useState } from 'react';
import { type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { cleanReact, type React as ReactionName } from '@/ai/react';
import { haptic } from '@/lib/haptics';
import { ink } from '@/theme/ink';

/**
 * The six chat reactions, our own symbols (audit 2026-11-15 §6.5, owner's pick "3 · Tomchi" (drop) of
 * `docs/prototypes/reactions-apple.html`). Apple has no public Tapback part and SF Symbols are licensed
 * for Apple platforms only, so the glyphs are drawn here by the HIG's custom-symbol rules: one stroke
 * weight, round caps, whole shapes, and Hierarchical rendering (the shape at 30 % of the colour, its
 * outline and features at 100 %). A 24 grid.
 */
const SOFT = 0.3;
const STROKE = 1.9;

const HEART = 'M12 20.3s-7.4-4.5-9.1-9.1C1.6 7.9 3.7 4.6 7 4.6c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.3 0 5.4 3.3 4.1 6.6-1.7 4.6-9.1 9.1-9.1 9.1z';
const TEAR = 'M12 2.8c3.9 4.9 6.4 8.4 6.4 11.6a6.4 6.4 0 0 1-12.8 0c0-3.2 2.5-6.7 6.4-11.6z';
const FLAME = 'M12.6 2.6c.6 3 4.9 5.2 4.9 10.5a5.5 5.5 0 0 1-11 0c0-2.6 1.2-4.3 2.6-5.5.1 1.8 1 2.9 2.1 3.3-.4-3.4.4-6.1 1.4-8.3z';
const CUFF = 'M3.6 10.6h3.1v9.4H3.6z';
const HAND = 'M8.6 20V10.4l3.6-6.1c.3-.5.9-.7 1.4-.5 1 .4 1.5 1.4 1.3 2.5l-.6 3.4h4.5c1.3 0 2.2 1.2 2 2.4l-1.3 6.3c-.2 1-1.1 1.6-2.1 1.6z';

export interface ReactionGlyphProps {
  name: ReactionName;
  color: string;
  size?: number;
}

/** One reaction symbol in one colour, hierarchical. */
export function ReactionGlyph({ name, color, size = 20 }: ReactionGlyphProps) {
  const line = { fill: 'none', stroke: color, strokeWidth: STROKE, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  const soft = { fill: color, fillOpacity: SOFT } as const;
  const shape = (d: string) => (
    <>
      <Path d={d} {...soft} />
      <Path d={d} {...line} />
    </>
  );
  let body;
  switch (name) {
    case 'love':
      body = shape(HEART);
      break;
    case 'laugh':
      body = (
        <>
          <Circle cx={12} cy={12} r={9} {...soft} />
          <Circle cx={12} cy={12} r={9} {...line} />
          <Path d="M7.7 9.5l1.8 1.2-1.8 1.2M16.3 9.5l-1.8 1.2 1.8 1.2" {...line} />
          <Path d="M7.3 14.1h9.4c-.6 2.6-2.5 4.1-4.7 4.1s-4.1-1.5-4.7-4.1z" fill={color} />
        </>
      );
      break;
    case 'wow':
      body = (
        <>
          <Path d="M8.5 4.5v9.5M15.5 4.5v9.5" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
          <Circle cx={8.5} cy={19} r={1.7} fill={color} />
          <Circle cx={15.5} cy={19} r={1.7} fill={color} />
        </>
      );
      break;
    case 'sad':
      // A single tear: a face with a small tear read like laugh at badge size.
      body = (
        <>
          {shape(TEAR)}
          <Path d="M9.3 15.1a2.9 2.9 0 0 0 2.5 2.7" {...line} />
        </>
      );
      break;
    case 'hyped':
      body = (
        <>
          {shape(FLAME)}
          <Path d="M12 20.4a2.6 2.6 0 0 1-2.6-2.6c0-1.6 1.3-2.5 1.9-3.9.8 1.2 3.3 2.1 3.3 3.9a2.6 2.6 0 0 1-2.6 2.6z" {...line} />
        </>
      );
      break;
    case 'thumbs':
      body = (
        <>
          {shape(CUFF)}
          {shape(HAND)}
        </>
      );
      break;
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      {body}
    </Svg>
  );
}

/** The drop's point: a corner rounded less than the rest. */
const POINT = 7;
/** The drop's size on a message, the ground-coloured ring around it, and the glyph in it. */
const DISC = 30;
const RING = 2.5;
const GLYPH = 17;
/** How long Disappear runs before the badge leaves the tree. */
const GONE_MS = 200;

export interface ReactionBadgeProps {
  /** The reaction on the message; anything else (none, an old name) shows nothing. */
  name: string | undefined;
  /** The disc's colour and the glyph's: the user's peach, or the friend's own hue (`friendColor`). */
  fill: string;
  glyph: string;
  /** A friend's reaction lands with one selection tap; the user's own pick taps in the menu. */
  tapOnLand?: boolean;
  /** The drop's point, the corner that faces the message: top-left when it hangs on the bubble's right. */
  point: 'topLeft' | 'topRight';
  /** Where it hangs on the bubble (absolute position). */
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * A reaction on a message's corner: a small drop in the reactor's colour, its point at the message it
 * belongs to, the glyph on it, ringed in the ground so it lifts off the bubble (our own shape and symbols). It moves as SF Symbols do:
 * Bounce when one lands (0.2 -> 1.18 -> 1), Replace down-up when it changes, Disappear when it is taken
 * back. A reaction already there when the chat opens stands still; under Reduce Motion it just appears.
 */
export function ReactionBadge({ name, fill, glyph, point, tapOnLand, style, accessibilityLabel }: ReactionBadgeProps) {
  const reduce = useReducedMotion();
  const now = cleanReact(name);
  const [shown, setShown] = useState<ReactionName | undefined>(now);
  const before = useRef(now);
  const scale = useSharedValue(now ? 1 : 0);
  const swap = useSharedValue(1);

  useEffect(() => {
    const was = before.current;
    before.current = now;
    if (was === now) return;
    if (now) {
      setShown(now);
      if (tapOnLand) haptic.selection();
      if (reduce) {
        scale.value = 1;
        swap.value = 1;
      } else if (!was) {
        scale.value = 0.2;
        scale.value = withSequence(
          withTiming(1.18, { duration: 220, easing: Easing.out(Easing.cubic) }),
          withSpring(1, { damping: 12, stiffness: 260 }),
        );
      } else {
        swap.value = 0;
        swap.value = withSpring(1, { damping: 14, stiffness: 300 });
      }
      return;
    }
    if (reduce) {
      scale.value = 0;
      setShown(undefined);
      return;
    }
    scale.value = withTiming(0.3, { duration: GONE_MS, easing: Easing.in(Easing.quad) }, (done) => {
      if (done) scheduleOnRN(setShown, undefined);
    });
  }, [now, reduce, scale, swap, tapOnLand]);

  const disc = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, (scale.value - 0.3) / 0.5)),
    transform: [{ scale: scale.value }],
  }));
  const face = useAnimatedStyle(() => ({
    opacity: swap.value,
    transform: [{ translateY: (1 - swap.value) * 8 }, { scale: 0.6 + 0.4 * swap.value }],
  }));

  if (!shown) return null;
  return (
    <Animated.View
      style={[styles.badge, point === 'topLeft' ? styles.pointLeft : styles.pointRight, { backgroundColor: fill }, style, disc]}
      pointerEvents="none"
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}>
      <Animated.View style={face}>
        <ReactionGlyph name={shown} color={glyph} size={GLYPH} />
      </Animated.View>
    </Animated.View>
  );
}

/** The badge's outer size, ring included, for placing it on a bubble. */
export const REACTION_BADGE_SIZE = DISC + RING * 2;

const styles = StyleSheet.create({
  badge: {
    width: REACTION_BADGE_SIZE,
    height: REACTION_BADGE_SIZE,
    borderRadius: REACTION_BADGE_SIZE / 2,
    borderWidth: RING,
    borderColor: ink.ground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointLeft: { borderTopLeftRadius: POINT },
  pointRight: { borderTopRightRadius: POINT },
});
