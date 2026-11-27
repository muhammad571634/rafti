import { useEffect, useId, useRef, useState } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { cleanReact, type React as ReactionName } from '@/ai/react';
import { haptic } from '@/lib/haptics';
import { sharedReactionSound } from '@/lib/reaction-sound';
import { ink, inkReaction, inkReactionGem } from '@/theme/ink';

/**
 * The six chat reactions — "Suyuq shisha" (Liquid Gem) sculpted symbols (owner approved 2026-11-26).
 * Multi-layered radial/linear gradients with crisp specular highlights and glass rims, drawn on a 24 grid.
 * Colours come strictly from `inkReactionGem` in `src/theme/ink.ts` (zero colour literals in screens).
 */
export interface ReactionGlyphProps {
  name: ReactionName;
  /** Kept for API compatibility; Liquid Gem symbols wear their own sculpted palette from `inkReactionGem`. */
  color?: string;
  size?: number;
}

export function ReactionGlyph({ name, size = 22 }: ReactionGlyphProps) {
  const rawId = useId();
  const gid = `rg_${name}_${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const gem = inkReactionGem[name];

  let body: React.ReactNode;
  switch (name) {
    case 'love':
      body = (
        <>
          <Defs>
            <RadialGradient id={gid} cx="35%" cy="28%" r="72%">
              <Stop offset="0%" stopColor={gem.stops[0]} />
              <Stop offset="42%" stopColor={gem.stops[1]} />
              <Stop offset="100%" stopColor={gem.stops[2]} />
            </RadialGradient>
          </Defs>
          <Path
            d="M12 20.6S3.2 15.2 2.4 9.7C1.7 5.7 4.8 3.2 8 3.6c1.9.2 3.3 1.4 4 2.8.7-1.4 2.1-2.6 4-2.8 3.2-.4 6.3 2.1 5.6 6.1-.8 5.5-9.6 10.9-9.6 10.9z"
            fill={`url(#${gid})`}
            stroke={gem.rim}
            strokeWidth={0.9}
          />
          <Path d="M6.3 7.8c.5-1.3 1.7-2 3-1.8" fill="none" stroke={gem.spec} strokeWidth={1.6} strokeLinecap="round" />
          <Circle cx={17.8} cy={7.5} r={1.1} fill={gem.rim} />
        </>
      );
      break;
    case 'laugh': {
      const laughGem = inkReactionGem.laugh;
      body = (
        <>
          <Defs>
            <RadialGradient id={gid} cx="36%" cy="26%" r="72%">
              <Stop offset="0%" stopColor={laughGem.stops[0]} />
              <Stop offset="48%" stopColor={laughGem.stops[1]} />
              <Stop offset="100%" stopColor={laughGem.stops[2]} />
            </RadialGradient>
          </Defs>
          <Circle cx={12} cy={12} r={9.4} fill={`url(#${gid})`} stroke={laughGem.rim} strokeWidth={0.9} />
          <Path
            d="M6.8 9.2c.8-1 2.2-1 3 0M14.2 9.2c.8-1 2.2-1 3 0"
            fill="none"
            stroke={laughGem.ink}
            strokeWidth={1.9}
            strokeLinecap="round"
          />
          <Path d="M7.2 13.5h9.6c-.4 3.1-2.3 4.9-4.8 4.9s-4.4-1.8-4.8-4.9z" fill={laughGem.ink} />
          <Path
            d="M9.4 16.5c.8-.9 1.6-1.2 2.6-1.2s1.8.3 2.6 1.2c-.8.9-1.7 1.3-2.6 1.3s-1.8-.4-2.6-1.3z"
            fill={laughGem.tongue}
          />
          <Path d="M7.5 6.4a6.4 6.4 0 0 1 4.2-1.5" fill="none" stroke={laughGem.spec} strokeWidth={1.4} strokeLinecap="round" />
        </>
      );
      break;
    }
    case 'wow':
      body = (
        <>
          <Defs>
            <RadialGradient id={gid} cx="35%" cy="25%" r="75%">
              <Stop offset="0%" stopColor={gem.stops[0]} />
              <Stop offset="48%" stopColor={gem.stops[1]} />
              <Stop offset="100%" stopColor={gem.stops[2]} />
            </RadialGradient>
          </Defs>
          <Path
            d="M12 2.2l2.1 5.6 5.9 1.2-4.6 3.9 1.3 5.9L12 15.8l-4.7 3 1.3-5.9-4.6-3.9 5.9-1.2L12 2.2z"
            fill={`url(#${gid})`}
            stroke={gem.rim}
            strokeWidth={0.9}
            strokeLinejoin="round"
          />
          <Circle cx={12} cy={11.2} r={2.2} fill={gem.spec} />
          <Circle cx={19.5} cy={5.2} r={1.3} fill={gem.ink} />
          <Circle cx={4.8} cy={17.8} r={1.1} fill={gem.ink} />
        </>
      );
      break;
    case 'sad':
      body = (
        <>
          <Defs>
            <RadialGradient id={gid} cx="36%" cy="32%" r="72%">
              <Stop offset="0%" stopColor={gem.stops[0]} />
              <Stop offset="46%" stopColor={gem.stops[1]} />
              <Stop offset="100%" stopColor={gem.stops[2]} />
            </RadialGradient>
          </Defs>
          <Path
            d="M12 2.4c4.2 5.3 7 9.1 7 12.4a7 7 0 0 1-14 0c0-3.3 2.8-7.1 7-12.4z"
            fill={`url(#${gid})`}
            stroke={gem.rim}
            strokeWidth={0.9}
          />
          <Path d="M9.4 12.8c-.7 1.4-.5 3.3.7 4.4" fill="none" stroke={gem.spec} strokeWidth={1.6} strokeLinecap="round" />
          <Circle cx={13.8} cy={16.4} r={1.2} fill={gem.rim} />
        </>
      );
      break;
    case 'hyped':
      body = (
        <>
          <Defs>
            <LinearGradient id={gid} x1="50%" y1="0%" x2="50%" y2="100%">
              <Stop offset="0%" stopColor={gem.stops[0]} />
              <Stop offset="42%" stopColor={gem.stops[1]} />
              <Stop offset="100%" stopColor={gem.stops[2]} />
            </LinearGradient>
          </Defs>
          <Path
            d="M12.8 2.2c.8 3.2 5.4 5.6 5.4 11.2a6.2 6.2 0 0 1-12.4 0c0-2.9 1.4-4.9 3-6.2.1 2 1.1 3.1 2.2 3.5-.4-3.7.6-6.3 1.8-8.5z"
            fill={`url(#${gid})`}
            stroke={gem.rim}
            strokeWidth={0.9}
          />
          <Path
            d="M12 20a3.1 3.1 0 0 1-3.1-3.1c0-1.9 1.6-2.9 2.3-4.6.9 1.5 3.9 2.4 3.9 4.6A3.1 3.1 0 0 1 12 20z"
            fill={gem.spec}
            fillOpacity={0.9}
          />
        </>
      );
      break;
    case 'thumbs':
      body = (
        <>
          <Defs>
            <RadialGradient id={gid} cx="35%" cy="25%" r="75%">
              <Stop offset="0%" stopColor={gem.stops[0]} />
              <Stop offset="48%" stopColor={gem.stops[1]} />
              <Stop offset="100%" stopColor={gem.stops[2]} />
            </RadialGradient>
          </Defs>
          <Rect x={3.2} y={10.4} width={3.8} height={9.8} rx={1.6} fill={`url(#${gid})`} stroke={gem.rim} strokeWidth={0.8} />
          <Path
            d="M8.6 20.2V10.3l3.6-6.1c.4-.6 1.1-.8 1.8-.5 1 .4 1.6 1.5 1.3 2.7l-.6 3.3h4.3c1.5 0 2.5 1.3 2.2 2.8l-1.3 6c-.2 1.1-1.2 1.8-2.3 1.8H8.6z"
            fill={`url(#${gid})`}
            stroke={gem.rim}
            strokeWidth={0.9}
          />
          <Path d="M11.8 7.5l1.2-2.2" fill="none" stroke={gem.spec} strokeWidth={1.3} strokeLinecap="round" />
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
const DISC = 31;
const RING = 2.5;
const GLYPH = 19;
/** How long Disappear runs before the badge leaves the tree. */
const GONE_MS = 200;
const BURST_MS = 540;

const SPARK_ANGLES = [0, 1.05, 2.1, 3.14, 4.19, 5.24] as const;

/** Lightweight UI-thread shockwave ring + 6 directional sparks shown briefly when a reaction lands. */
function ReactionBurst({ name, onDone }: { name: ReactionName; onDone: () => void }) {
  const p = useSharedValue(0);
  const color = inkReaction[name];
  const upward = name === 'hyped';
  const downward = name === 'sad';

  useEffect(() => {
    p.value = 0;
    p.value = withTiming(1, { duration: BURST_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished) scheduleOnRN(onDone);
    });
    return () => cancelAnimation(p);
  }, [p, onDone]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: (1 - p.value) * 0.72,
    transform: [{ scale: 0.7 + p.value * 1.45 }],
  }));

  return (
    <View pointerEvents="none" style={styles.burstWrap}>
      <Animated.View style={[styles.burstRing, { borderColor: color }, ringStyle]} />
      {SPARK_ANGLES.map((angle, i) => (
        <SparkDot key={i} angle={angle} p={p} color={color} upward={upward} downward={downward} />
      ))}
    </View>
  );
}

function SparkDot({
  angle,
  p,
  color,
  upward,
  downward,
}: {
  angle: number;
  p: SharedValue<number>;
  color: string;
  upward: boolean;
  downward: boolean;
}) {
  const style = useAnimatedStyle(() => {
    const r = 12 + p.value * 22;
    const dx = Math.cos(angle) * r * (upward || downward ? 0.58 : 1);
    const baseDy = Math.sin(angle) * r;
    const dy = upward ? -Math.abs(baseDy) - p.value * 12 : downward ? Math.abs(baseDy) + p.value * 10 : baseDy;
    const s = 1 - p.value * 0.65;
    return {
      opacity: 1 - p.value,
      transform: [{ translateX: dx }, { translateY: dy }, { scale: s }],
    };
  });
  return <Animated.View style={[styles.sparkDot, { backgroundColor: color }, style]} />;
}

export interface ReactionBadgeProps {
  /** The reaction on the message; anything else (none, an old name) shows nothing. */
  name: string | undefined;
  /** Reactor accent colour: user's brand peach or friend's own hue (`friendColor`), worn as the gem's glowing rim. */
  fill: string;
  /** Kept for API compatibility. */
  glyph: string;
  /** A friend's reaction lands with tactile feedback; the user's own pick also plays its reaction signature. */
  tapOnLand?: boolean;
  /** The drop's point, the corner that faces the message: top-left when it hangs on the bubble's right. */
  point: 'topLeft' | 'topRight';
  /** Where it hangs on the bubble (absolute position). */
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * A Liquid Gem reaction drop on a message's corner: obsidian gem backing framed by the reactor's
 * accent ring so ownership stays clear while the sculpted symbol shines inside. Each of the 6
 * reactions lands with its own unique kinetic animation, radial spark burst, and sound signature.
 * Reactions already present when a chat opens render quietly at rest.
 */
export function ReactionBadge({ name, fill, point, tapOnLand, style, accessibilityLabel }: ReactionBadgeProps) {
  const reduce = useReducedMotion();
  const now = cleanReact(name);
  const [shown, setShown] = useState<ReactionName | undefined>(now);
  const [burstKey, setBurstKey] = useState(0);
  const before = useRef(now);

  const scaleX = useSharedValue(now ? 1 : 0);
  const scaleY = useSharedValue(now ? 1 : 0);
  const rotDeg = useSharedValue(0);
  const shiftY = useSharedValue(0);
  const swap = useSharedValue(1);

  useEffect(() => {
    const was = before.current;
    before.current = now;
    if (was === now) return;

    let cancelHb: (() => void) | undefined;

    if (now) {
      setShown(now);
      sharedReactionSound().play(now);
      if (now === 'love') cancelHb = haptic.heartbeat();
      else if (tapOnLand) haptic.selection();

      if (reduce) {
        scaleX.value = 1;
        scaleY.value = 1;
        rotDeg.value = 0;
        shiftY.value = 0;
        swap.value = 1;
      } else {
        setBurstKey((k) => k + 1);
        swap.value = was ? 0 : 1;
        if (was) swap.value = withSpring(1, { damping: 14, stiffness: 300 });

        // 6 distinct per-reaction kinetic signatures!
        if (now === 'love') {
          const seq = withSequence(
            withTiming(1.24, { duration: 130, easing: Easing.out(Easing.cubic) }),
            withTiming(0.95, { duration: 90 }),
            withTiming(1.3, { duration: 120, easing: Easing.out(Easing.cubic) }),
            withSpring(1, { damping: 12, stiffness: 260 }),
          );
          scaleX.value = 0.25;
          scaleY.value = 0.25;
          scaleX.value = seq;
          scaleY.value = seq;
          rotDeg.value = 0;
          shiftY.value = 0;
        } else if (now === 'laugh') {
          scaleX.value = 0.3;
          scaleY.value = 0.3;
          scaleX.value = withSpring(1, { damping: 11, stiffness: 260 });
          scaleY.value = withSpring(1, { damping: 11, stiffness: 260 });
          rotDeg.value = withSequence(
            withTiming(-16, { duration: 90 }),
            withTiming(15, { duration: 100 }),
            withTiming(-10, { duration: 95 }),
            withTiming(6, { duration: 85 }),
            withTiming(0, { duration: 90 }),
          );
          shiftY.value = 0;
        } else if (now === 'wow') {
          scaleX.value = 0.2;
          scaleY.value = 0.2;
          scaleX.value = withSequence(
            withTiming(1.38, { duration: 140, easing: Easing.out(Easing.cubic) }),
            withTiming(0.88, { duration: 100 }),
            withSpring(1, { damping: 12, stiffness: 280 }),
          );
          scaleY.value = withSequence(
            withTiming(1.22, { duration: 140, easing: Easing.out(Easing.cubic) }),
            withTiming(1.08, { duration: 100 }),
            withSpring(1, { damping: 12, stiffness: 280 }),
          );
          rotDeg.value = 0;
          shiftY.value = 0;
        } else if (now === 'sad') {
          scaleX.value = 0.5;
          scaleY.value = 0.5;
          scaleX.value = withSequence(withTiming(1.08, { duration: 240 }), withSpring(1, { damping: 14, stiffness: 240 }));
          scaleY.value = withSequence(withTiming(0.92, { duration: 240 }), withSpring(1, { damping: 14, stiffness: 240 }));
          shiftY.value = -10;
          shiftY.value = withSequence(
            withTiming(3, { duration: 250, easing: Easing.out(Easing.cubic) }),
            withSpring(0, { damping: 14, stiffness: 220 }),
          );
          rotDeg.value = 0;
        } else if (now === 'hyped') {
          scaleX.value = 0.4;
          scaleY.value = 1.3;
          scaleX.value = withSequence(withTiming(1.24, { duration: 160 }), withSpring(1, { damping: 12, stiffness: 260 }));
          scaleY.value = withSequence(withTiming(0.92, { duration: 160 }), withSpring(1, { damping: 12, stiffness: 260 }));
          shiftY.value = 8;
          shiftY.value = withSequence(
            withTiming(-6, { duration: 170, easing: Easing.out(Easing.cubic) }),
            withSpring(0, { damping: 12, stiffness: 240 }),
          );
          rotDeg.value = 0;
        } else {
          // thumbs: snappy punch-tilt
          scaleX.value = 0.3;
          scaleY.value = 0.3;
          scaleX.value = withSequence(withTiming(1.24, { duration: 140 }), withSpring(1, { damping: 12, stiffness: 280 }));
          scaleY.value = withSequence(withTiming(1.24, { duration: 140 }), withSpring(1, { damping: 12, stiffness: 280 }));
          rotDeg.value = -26;
          rotDeg.value = withSequence(
            withTiming(13, { duration: 160, easing: Easing.out(Easing.cubic) }),
            withSpring(0, { damping: 13, stiffness: 260 }),
          );
          shiftY.value = 0;
        }
      }

      return () => {
        cancelHb?.();
      };
    }

    if (reduce) {
      scaleX.value = 0;
      scaleY.value = 0;
      setShown(undefined);
      return;
    }
    scaleY.value = withTiming(0.3, { duration: GONE_MS, easing: Easing.in(Easing.quad) });
    scaleX.value = withTiming(0.3, { duration: GONE_MS, easing: Easing.in(Easing.quad) }, (done) => {
      if (done) scheduleOnRN(setShown, undefined);
    });
    return () => {
      cancelAnimation(scaleX);
      cancelAnimation(scaleY);
      cancelAnimation(rotDeg);
      cancelAnimation(shiftY);
    };
  }, [now, reduce, scaleX, scaleY, rotDeg, shiftY, swap, tapOnLand]);

  const disc = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, (scaleX.value - 0.3) / 0.5)),
    transform: [
      { translateY: shiftY.value },
      { rotate: `${rotDeg.value}deg` },
      { scaleX: scaleX.value },
      { scaleY: scaleY.value },
    ],
  }));

  const face = useAnimatedStyle(() => ({
    opacity: swap.value,
    transform: [{ translateY: (1 - swap.value) * 8 }, { scale: 0.6 + 0.4 * swap.value }],
  }));

  if (!shown) return null;
  const gem = inkReactionGem[shown];

  return (
    <View style={[styles.anchor, style]} pointerEvents="none">
      {burstKey > 0 && !reduce ? (
        <ReactionBurst key={burstKey} name={shown} onDone={() => setBurstKey(0)} />
      ) : null}
      <Animated.View
        style={[
          styles.badge,
          point === 'topLeft' ? styles.pointLeft : styles.pointRight,
          { backgroundColor: gem.badgeBg, borderColor: ink.ground },
          disc,
        ]}
        accessible={!!accessibilityLabel}
        accessibilityLabel={accessibilityLabel}>
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.innerRim, point === 'topLeft' ? styles.pointLeftInner : styles.pointRightInner, { borderColor: fill }]} />
        <Animated.View style={face}>
          <ReactionGlyph name={shown} size={GLYPH} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/** The badge's outer size, ring included, for placing it on a bubble. */
export const REACTION_BADGE_SIZE = DISC + RING * 2;

const styles = StyleSheet.create({
  anchor: {
    width: REACTION_BADGE_SIZE,
    height: REACTION_BADGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    width: REACTION_BADGE_SIZE,
    height: REACTION_BADGE_SIZE,
    borderRadius: REACTION_BADGE_SIZE / 2,
    borderWidth: RING,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerRim: {
    borderRadius: (REACTION_BADGE_SIZE - RING * 2) / 2,
    borderWidth: 1,
    opacity: 0.62,
  },
  pointLeft: { borderTopLeftRadius: POINT },
  pointRight: { borderTopRightRadius: POINT },
  pointLeftInner: { borderTopLeftRadius: POINT - 1 },
  pointRightInner: { borderTopRightRadius: POINT - 1 },
  burstWrap: {
    position: 'absolute',
    width: REACTION_BADGE_SIZE,
    height: REACTION_BADGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  burstRing: {
    position: 'absolute',
    width: REACTION_BADGE_SIZE,
    height: REACTION_BADGE_SIZE,
    borderRadius: REACTION_BADGE_SIZE / 2,
    borderWidth: 2,
  },
  sparkDot: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
