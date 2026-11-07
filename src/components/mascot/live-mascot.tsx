import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';

/** The art's box: the mascot's head and paws, as in `assets/brand/sigmazam-peek.png`. */
const VB_W = 240;
const VB_H = 200;

const INK = '#4A2618';
const EYES = [
  { cx: 96, cy: 128 },
  { cx: 146, cy: 126 },
] as const;
const EYE_RX = 10;
const EYE_RY = 12.5;

export interface LiveMascotProps {
  /** Width in points; the height follows (5:6 of it). */
  size: number;
  /** 0 = its calm smile, 1 = laughing with happy eyes. */
  joy?: SharedValue<number>;
  /** Where it looks, each from -1 to 1 (x right, y down). */
  lookX?: SharedValue<number>;
  lookY?: SharedValue<number>;
}

/**
 * Our mascot drawn in code (2026-11-07, design-style §10) so its face can live: it blinks now and
 * then, its eyes follow `lookX` / `lookY`, and `joy` turns its smile into a laugh with happy eyes.
 * The body, tuft, blush and paws are one SVG; the eyes and mouth are layers over it, moved by
 * transforms and opacity only. Reduced motion: no blinking (the face still answers `joy`).
 */
export function LiveMascot({ size, joy, lookX, lookY }: LiveMascotProps) {
  const s = size / VB_W;
  const height = VB_H * s;
  const reduced = useReducedMotion();
  const blink = useSharedValue(1);
  const still = useSharedValue(0);
  const joyV = joy ?? still;
  const lx = lookX ?? still;
  const ly = lookY ?? still;

  useEffect(() => {
    if (reduced) return;
    blink.set(
      withRepeat(
        withSequence(
          withDelay(2800, withTiming(0.08, { duration: 70 })),
          withTiming(1, { duration: 110 }),
          // Now and then a second blink right after the first, as people do.
          withDelay(3400, withTiming(0.08, { duration: 70 })),
          withTiming(1, { duration: 100 }),
          withDelay(140, withTiming(0.08, { duration: 60 })),
          withTiming(1, { duration: 100 }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(blink);
  }, [blink, reduced]);

  const openEyes = useAnimatedStyle(() => ({
    opacity: 1 - joyV.get(),
    transform: [{ translateX: lx.get() * 3.5 * s }, { translateY: ly.get() * 3 * s }, { scaleY: blink.get() }],
  }));
  const happyEyes = useAnimatedStyle(() => ({ opacity: joyV.get() }));
  const calmMouth = useAnimatedStyle(() => ({ opacity: 1 - joyV.get() }));
  const laughMouth = useAnimatedStyle(() => ({
    opacity: joyV.get(),
    transform: [{ scale: 0.85 + 0.15 * joyV.get() }],
  }));

  const box = { width: size, height };
  return (
    <View style={box} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
      <Svg width={size} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
        <Defs>
          <LinearGradient id="body" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFF4E8" />
            <Stop offset="1" stopColor="#F6D0B0" />
          </LinearGradient>
          <LinearGradient id="tuft" x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0" stopColor="#F4A06A" />
            <Stop offset="1" stopColor="#E8733B" />
          </LinearGradient>
        </Defs>
        <Path d="M24,200 C18,120 58,48 120,46 C182,44 224,118 216,200 Z" fill="url(#body)" />
        <Path
          d="M30,132 C36,70 86,34 138,40 C176,44 206,30 236,2 C238,40 222,84 186,98 C152,110 118,84 84,92 C60,98 44,112 30,132 Z"
          fill="url(#tuft)"
        />
        <Path d="M84,108 Q94,101 105,107" stroke="#8A5A40" strokeWidth={2.4} strokeLinecap="round" fill="none" />
        <Path d="M135,104 Q146,98 157,104" stroke="#8A5A40" strokeWidth={2.4} strokeLinecap="round" fill="none" />
        <Ellipse cx={70} cy={150} rx={14} ry={8} fill="#F29C8A" opacity={0.45} />
        <Ellipse cx={172} cy={148} rx={14} ry={8} fill="#F29C8A" opacity={0.45} />
        <Ellipse cx={62} cy={190} rx={30} ry={20} fill="#FDE8D6" stroke="#EAC4A4" strokeWidth={1.5} />
        <Ellipse cx={178} cy={190} rx={30} ry={20} fill="#FDE8D6" stroke="#EAC4A4" strokeWidth={1.5} />
      </Svg>

      {EYES.map((eye, i) => (
        <Animated.View
          key={i}
          style={[
            styles.eye,
            {
              left: (eye.cx - EYE_RX) * s,
              top: (eye.cy - EYE_RY) * s,
              width: EYE_RX * 2 * s,
              height: EYE_RY * 2 * s,
              borderRadius: EYE_RX * s,
            },
            openEyes,
          ]}>
          <View style={[styles.shine, { width: 5 * s, height: 5 * s, borderRadius: 2.5 * s, top: 4 * s, right: 4 * s }]} />
        </Animated.View>
      ))}

      <Animated.View style={[StyleSheet.absoluteFill, happyEyes]}>
        <Svg width={size} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
          {EYES.map((eye, i) => (
            <Path
              key={i}
              d={`M${eye.cx - 10},${eye.cy + 4} Q${eye.cx},${eye.cy - 10} ${eye.cx + 10},${eye.cy + 4}`}
              stroke={INK}
              strokeWidth={3.4}
              strokeLinecap="round"
              fill="none"
            />
          ))}
        </Svg>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, calmMouth]}>
        <Svg width={size} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
          <Path d="M110,150 Q121,167 132,150 Q121,155 110,150 Z" fill="#7A2E22" />
          <Ellipse cx={121} cy={159} rx={5} ry={2.5} fill="#E8806A" />
        </Svg>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, laughMouth]}>
        <Svg width={size} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
          <Path d="M102,146 Q121,182 140,146 Q121,152 102,146 Z" fill="#7A2E22" />
          <Ellipse cx={121} cy={167} rx={9} ry={5} fill="#EE8A73" />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** A day's tiny mascot face for the week row: smiling once the day is collected. */
export function MiniMascot({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d="M4,38 C3,20 10,8 20,8 C30,8 37,20 36,38 Z" fill="#FDEBDB" />
      <Path d="M6,22 C8,11 17,5 25,7 C30,8 34,6 38,1 C38,8 35,14 29,16 C23,18 18,13 12,15 C9,16 7,19 6,22 Z" fill="#EE8446" />
      <Path d="M13,24 Q16,20.5 19,24" stroke={INK} strokeWidth={2} strokeLinecap="round" fill="none" />
      <Path d="M22,23.5 Q25,20 28,23.5" stroke={INK} strokeWidth={2} strokeLinecap="round" fill="none" />
      <Path d="M15.5,28 Q20.5,34 25.5,28 Q20.5,29.5 15.5,28 Z" fill="#7A2E22" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  eye: { position: 'absolute', backgroundColor: '#5A3020' },
  shine: { position: 'absolute', backgroundColor: '#FFFFFF' },
});
