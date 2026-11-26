import { BlurMask, Canvas, Circle, Group, Path, Skia, type SkPath } from '@shopify/react-native-skia';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import { type AccessibilityActionEvent, type LayoutChangeEvent, Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeInDown,
  FadeOutUp,
  runOnJS,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { InkText } from '@/components/ink';
import { haptic } from '@/lib/haptics';
import { bandCentre, MOOD_BANDS, MOOD_GRADIENT, MOOD_SAMPLES, moodBand, moodColor, moodRadius } from '@/lib/mood';
import { ink } from '@/theme/ink';

/**
 * The mood slider: you drag the feeling itself. Above a gradient track a layered shape morphs from
 * a spiky violet burst through a calm blue circle to an orange flower, turning slowly, and the word
 * for the band you are in pushes the last one out. Each new band ticks a selection haptic; on
 * release the thumb springs to the band's middle.
 *
 * Ported from Scrubbers' `MoodFace` (https://github.com/haplollc/Scrubbers, MIT, (c) 2026 Haplo LLC):
 * the same layers, spins, sizes, springs and absolute finger mapping, rebuilt on Skia + Reanimated
 * so the shape is drawn on the UI thread (one canvas, three paths a frame). The clock runs only while
 * `active`, and holds still under Reduce Motion.
 */

/** The shape's box (Scrubbers' 164 pt frame, a touch larger for a sheet's hero). */
const BOX = 200;
/** The three layers, back to front: size in the box, spin speed (rad/s), phase, colour offset, opacity. */
const LAYERS = [
  { size: 0.9, spin: 0.16, phase: 0, shift: -0.06, alpha: 0.55 },
  { size: 0.77, spin: -0.11, phase: 0.5, shift: 0, alpha: 0.6 },
  { size: 0.62, spin: 0.07, phase: 1, shift: 0.06, alpha: 0.9 },
] as const;
/** The dead margin at each end of the track: the thumb's centre never goes past it. */
const INSET = 16;
const THUMB = 28;
const TRACK_HEIGHT = 58;

/** SwiftUI springs (response, damping fraction) as Reanimated's stiffness and damping, mass 1. */
const spring = (response: number, ratio: number) => {
  const stiffness = (2 * Math.PI / response) ** 2;
  return { stiffness, damping: 2 * ratio * Math.sqrt(stiffness), mass: 1 };
};
const SETTLE = spring(0.34, 0.82);
const LIFT_IN = spring(0.35, 0.7);
const LIFT_OUT = spring(0.45, 0.7);

/** One layer's outline as a Skia path, rebuilt on the UI thread. */
function outline(size: number, mood: number, spin: number): SkPath {
  'worklet';
  const path = Skia.PathBuilder.Make();
  const c = BOX / 2;
  const radius = size / 2;
  for (let i = 0; i < MOOD_SAMPLES; i++) {
    const phi = (i / MOOD_SAMPLES) * Math.PI * 2;
    const r = radius * moodRadius(phi + spin, mood);
    const x = c + r * Math.cos(phi);
    const y = c + r * Math.sin(phi);
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  path.close();
  return path.detach();
}

function Layer({ index, mood, clock }: { index: number; mood: SharedValue<number>; clock: SharedValue<number> }) {
  const layer = LAYERS[index];
  const path = useDerivedValue(() => outline(BOX * layer.size, mood.value, clock.value * layer.spin + layer.phase));
  const color = useDerivedValue(() => moodColor(mood.value + layer.shift, layer.alpha));
  return <Path path={path} color={color} />;
}

function MoodShape({ mood, lift, active }: { mood: SharedValue<number>; lift: SharedValue<number>; active: boolean }) {
  const still = useReducedMotion();
  const clock = useSharedValue(0);
  const frame = useFrameCallback((info) => {
    clock.value += (info.timeSincePreviousFrame ?? 16) / 1000;
  }, false);
  useEffect(() => {
    frame.setActive(active && !still);
    return () => frame.setActive(false);
  }, [frame, active, still]);

  const glow = useDerivedValue(() => moodColor(mood.value, 0.35));
  const transform = useDerivedValue(() => [{ scale: 1 + 0.05 * lift.value }]);
  return (
    <Canvas style={styles.canvas}>
      <Group origin={{ x: BOX / 2, y: BOX / 2 }} transform={transform}>
        <Circle cx={BOX / 2} cy={BOX / 2} r={64} color={glow}>
          <BlurMask blur={30} style="normal" />
        </Circle>
        {LAYERS.map((_, i) => (
          <Layer key={i} index={i} mood={mood} clock={clock} />
        ))}
      </Group>
    </Canvas>
  );
}

export interface MoodSliderProps {
  /** The chosen band, 0 (heavy) to 6 (wonderful). */
  value: number;
  onChange: (band: number) => void;
  /** The seven band words, heavy to wonderful, already translated. */
  words: readonly string[];
  /** False stops the shape's slow turn (the sheet is closed). */
  active?: boolean;
}

export function MoodSlider({ value, onChange, words, active = true }: MoodSliderProps) {
  const [width, setWidth] = useState(0);
  const [band, setBand] = useState(value);
  const fraction = useSharedValue(bandCentre(value));
  const lift = useSharedValue(0);
  const span = useSharedValue(1);

  // A new value from outside (the sheet opened again) moves the thumb without a haptic.
  useEffect(() => {
    if (moodBand(fraction.value) !== value) fraction.value = withSpring(bandCentre(value), SETTLE);
    setBand(value);
  }, [value, fraction]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setWidth(w);
    span.value = Math.max(w - INSET * 2, 1);
  };

  const commit = useCallback(
    (next: number) => {
      setBand(next);
      onChange(next);
    },
    [onChange],
  );
  const tick = useCallback(() => haptic.selection(), []);

  useAnimatedReaction(
    () => moodBand(fraction.value),
    (next, prev) => {
      if (prev !== null && next !== prev) {
        runOnJS(tick)();
        runOnJS(commit)(next);
      }
    },
  );

  const press = (x: number) => {
    'worklet';
    fraction.value = Math.min(Math.max((x - INSET) / span.value, 0), 1);
  };
  const release = () => {
    'worklet';
    fraction.value = withSpring(bandCentre(moodBand(fraction.value)), SETTLE);
    lift.value = withSpring(0, LIFT_OUT);
  };
  // The finger's position is the value (absolute mapping): touch anywhere on the track and drag.
  const pan = Gesture.Pan()
    .minDistance(0)
    .failOffsetY([-14, 14])
    .onBegin((e) => {
      lift.value = withSpring(1, LIFT_IN);
      press(e.x);
    })
    .onUpdate((e) => press(e.x))
    .onFinalize(release);

  const thumbStyle = useAnimatedStyle(() => ({
    borderColor: moodColor(fraction.value),
    transform: [{ translateX: INSET + span.value * fraction.value - THUMB / 2 }, { scale: 1 + 0.12 * lift.value }],
  }));

  const step = (by: number) => {
    const next = Math.min(Math.max(band + by, 0), MOOD_BANDS - 1);
    if (next === band) return;
    fraction.value = withSpring(bandCentre(next), SETTLE);
  };
  const onAction = (e: AccessibilityActionEvent) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1);

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityValue={{ text: words[band] }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onAction}
      style={styles.root}>
      <View style={styles.stage} pointerEvents="none">
        {Platform.OS === 'web' ? null : <MoodShape mood={fraction} lift={lift} active={active} />}
      </View>
      {/* Each word pushes the last one out, as Health's do. */}
      <View style={styles.word}>
        <Animated.View key={band} entering={FadeInDown.springify().damping(18)} exiting={FadeOutUp.duration(160)} style={styles.wordInner}>
          <InkText variant="card" lines={1}>
            {words[band]}
          </InkText>
        </Animated.View>
      </View>
      <GestureDetector gesture={pan}>
        <View style={styles.track} onLayout={onLayout}>
          <LinearGradient colors={MOOD_GRADIENT} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.rail} />
          {width > 0 ? <Animated.View style={[styles.thumb, thumbStyle]} /> : null}
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignSelf: 'stretch', alignItems: 'center' },
  stage: { width: BOX, height: BOX },
  canvas: { width: BOX, height: BOX },
  word: { height: 30, alignSelf: 'stretch', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  wordInner: { position: 'absolute' },
  track: { alignSelf: 'stretch', height: TRACK_HEIGHT, justifyContent: 'center' },
  rail: { position: 'absolute', left: INSET - 6, right: INSET - 6, height: 10, borderRadius: 5 },
  thumb: {
    position: 'absolute',
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 2.5,
    backgroundColor: ink.pill,
    shadowColor: ink.onPill,
    shadowOpacity: 0.18,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1.5 },
    elevation: 3,
  },
});
