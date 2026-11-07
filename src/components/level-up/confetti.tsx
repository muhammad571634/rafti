import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { palette } from '@/theme';

import { easeOut, hash, seg } from './motion';

// Native Cook's confetti physics, in the bond's colours: apricot, the bond's mint, a rose, cream
// and white, and hearts among the paper (the relationship is what levelled up).
const PIECES = 48;
const COLORS = [palette.apricot400, palette.mint400, '#FF8FA3', palette.apricot200, '#FFFFFF', palette.apricot600];
/** Width, height and corner of the shapes: a card, a ribbon, a dot; a heart is drawn as a glyph. */
const SHAPES = [
  { w: 9, h: 14, r: 2 },
  { w: 6, h: 20, r: 3 },
  { w: 10, h: 10, r: 5 },
  { w: 14, h: 14, r: 0 },
];
const HEART = 3;
// Launch speed in points a second, the fan's half-angle around straight up, gravity and air drag.
const SPEED_MIN = 520;
const SPEED_MAX = 1050;
const FAN = 78;
const GRAVITY = 900;
const DRAG = 1.8;
const LIFE = 2.4;
const FADE_AT = 2.0;
const SPIN = 900;

type Piece = { color: string; shape: number; vx: number; vy: number; spin: number; flutter: number };

/** One fixed table, so every burst is the same. */
const TABLE: Piece[] = Array.from({ length: PIECES }, (_, i) => {
  const angle = ((hash(i, 1) - 0.5) * 2 * FAN * Math.PI) / 180;
  const speed = SPEED_MIN + hash(i, 2) * (SPEED_MAX - SPEED_MIN);
  return {
    color: COLORS[i % COLORS.length],
    shape: Math.floor(hash(i, 6) * SHAPES.length),
    vx: Math.sin(angle) * speed,
    vy: -Math.cos(angle) * speed,
    spin: (hash(i, 3) < 0.5 ? -1 : 1) * (0.4 + hash(i, 4) * 0.6) * SPIN,
    flutter: 0.5 + hash(i, 5),
  };
});

type Props = {
  clock: SharedValue<number>;
  /** Second the burst fires at. */
  at: number;
  /** The point the pieces leave from. */
  x: number;
  y: number;
  /** How many of the table's pieces to fire. */
  count?: number;
};

function Piece({ piece, clock, at, x, y }: Props & { piece: Piece }) {
  const shape = SHAPES[piece.shape];
  const heart = piece.shape === HEART;
  const style = useAnimatedStyle(() => {
    const age = clock.get() - at;
    if (age < 0 || age > LIFE) return { opacity: 0 };
    // Speed dies away to a steady fall: the usual drag-and-gravity path in closed form.
    const settle = (1 - Math.exp(-DRAG * age)) / DRAG;
    const fall = GRAVITY / DRAG;
    return {
      opacity: 1 - seg(age, FADE_AT, LIFE),
      transform: [
        { translateX: x - shape.w / 2 + piece.vx * settle },
        { translateY: y - shape.h / 2 + (piece.vy - fall) * settle + fall * age },
        // A heart rocks a little; paper spins and turns edge-on as it tumbles.
        { rotate: `${heart ? 25 * Math.sin(age * 5 * piece.flutter) : piece.spin * age}deg` },
        { scaleY: heart ? 1 : 0.35 + 0.65 * Math.abs(Math.cos(age * piece.flutter * 6)) },
        { scale: easeOut(seg(age, 0, 0.08)) },
      ],
    };
  });
  if (heart) {
    return (
      <Animated.View pointerEvents="none" style={[styles.piece, style]}>
        <Ionicons name="heart" size={shape.w} color={piece.color} />
      </Animated.View>
    );
  }
  return <Animated.View pointerEvents="none" style={[styles.piece, { width: shape.w, height: shape.h, borderRadius: shape.r, backgroundColor: piece.color }, style]} />;
}

/** Paper cards, ribbons, dots and hearts thrown up and out from one point. */
export function Confetti({ count = PIECES, ...props }: Props) {
  return (
    <>
      {TABLE.slice(0, count).map((piece, i) => (
        <Piece key={i} piece={piece} {...props} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', left: 0, top: 0 },
});
