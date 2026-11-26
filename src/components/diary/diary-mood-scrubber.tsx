import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Txt } from '@/components/ui';
import {
  DIARY_MOOD_GRADIENT,
  DIARY_MOOD_HEX,
  DIARY_MOOD_RGB,
  DIARY_MOODS,
  diaryMoodIndex,
  diaryMoodNorm,
  diaryMoodRgba,
} from '@/lib/diary-mood';
import { haptic } from '@/lib/haptics';
import { createScrubberSound, type ScrubberSound } from '@/lib/scrubber-sound';
import { skiaReady } from '@/lib/skia-ready';
import { ink, inkFace, inkGlass, inkRadius } from '@/theme/ink';
import type { DiaryMood } from '@/types';

// Guard Skia import behind `skiaReady` so web export and older binaries never crash at import.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SkiaModule = skiaReady ? (require('@shopify/react-native-skia') as typeof import('@shopify/react-native-skia')) : null;

const ORB_SIZE = 58;
const TRACK_HEIGHT = 40;
const RAIL_INSET = 16;
const THUMB_SIZE = 34;
const LIFT_SPRING = { damping: 20, stiffness: 280, mass: 0.7 };
const SNAP_SPRING = { damping: 24, stiffness: 320, mass: 0.75 };

/**
 * Single-pass O(1) GPU SkSL shader for the 3-layer counter-rotating morphing mood orb.
 * Polar outline math adapted from Scrubbers' MoodFace (MIT, (c) 2026 Haplo LLC):
 * low end draws 11 spikes, middle (`soft`) forms a serene circle, high end blooms into 7 petals.
 * Strictly premultiplied alpha output for Apple Metal & Android Vulkan/GLES.
 */
const MOOD_ORB_SHADER = `
uniform float2 res;
uniform float pos;
uniform float lifted;
uniform float t;

float moodRad(float phi, float m) {
  if (m < 0.5) {
    float k = pow(1.0 - m * 2.0, 1.2);
    float peaks = pow(abs(cos(5.5 * phi)), 5.0);
    return 1.0 - 0.44 * k + 0.44 * k * peaks;
  }
  float k = pow(m * 2.0 - 1.0, 1.1);
  float lobes = pow(abs(cos(3.5 * phi)), 0.55);
  return 1.0 - 0.30 * k * (1.0 - lobes);
}

float3 moodCol(float p) {
  float3 c0 = float3(0.486, 0.510, 0.769);
  float3 c1 = float3(0.357, 0.608, 0.941);
  float3 c2 = float3(0.784, 0.616, 0.949);
  float3 c3 = float3(0.949, 0.690, 0.420);
  float3 c4 = float3(1.000, 0.478, 0.349);
  float f = clamp(p, 0.0, 1.0) * 4.0;
  if (f < 1.0) return mix(c0, c1, f);
  if (f < 2.0) return mix(c1, c2, f - 1.0);
  if (f < 3.0) return mix(c2, c3, f - 2.0);
  return mix(c3, c4, f - 3.0);
}

half4 main(float2 p) {
  float2 c = res * 0.5;
  float rMax = min(c.x, c.y);
  float2 v = (p - c) / max(rMax, 1.0);
  float dist = length(v);
  float phi = atan(v.y, v.x);

  float m = 0.08 + clamp(pos, 0.0, 1.0) * 0.92;
  float3 base = moodCol(pos);
  float liftScale = 1.0 + 0.08 * lifted;
  float px = 2.0 / max(rMax, 1.0);

  // Soft ambient halo glow behind the orb
  float glowA = clamp(exp(-dist * dist * 2.8) * (0.30 + 0.18 * lifted), 0.0, 0.55);
  float3 col = base * glowA;
  float alpha = glowA;

  // Layer 1 (outer, slow forward spin)
  float r1 = 0.86 * liftScale * moodRad(phi + t * 0.35, m);
  float a1 = (1.0 - smoothstep(r1 - px, r1 + px, dist)) * 0.30;
  col = base * a1 + col * (1.0 - a1);
  alpha = a1 + alpha * (1.0 - a1);

  // Layer 2 (middle, counter spin)
  float r2 = 0.72 * liftScale * moodRad(phi - t * 0.24, m);
  float a2 = (1.0 - smoothstep(r2 - px, r2 + px, dist)) * 0.52;
  col = base * a2 + col * (1.0 - a2);
  alpha = a2 + alpha * (1.0 - a2);

  // Layer 3 (core, crisp inner bloom)
  float r3 = 0.56 * liftScale * moodRad(phi + t * 0.16, m);
  float a3 = (1.0 - smoothstep(r3 - px, r3 + px, dist)) * 0.94;
  float3 core = mix(base, float3(1.0, 0.98, 0.96), 0.14 * (1.0 - clamp(dist / max(r3, 0.01), 0.0, 1.0)));
  col = core * a3 + col * (1.0 - a3);
  alpha = a3 + alpha * (1.0 - a3);

  return half4(clamp(col, 0.0, alpha), clamp(alpha, 0.0, 1.0));
}
`;

type RuntimeEffect = ReturnType<NonNullable<typeof SkiaModule>['Skia']['RuntimeEffect']['Make']>;
let compiledOrb: RuntimeEffect | undefined;

function orbEffect(): RuntimeEffect {
  if (Platform.OS === 'web' || !SkiaModule) return null;
  if (compiledOrb === undefined) {
    try {
      compiledOrb = SkiaModule.Skia.RuntimeEffect.Make(MOOD_ORB_SHADER);
    } catch {
      compiledOrb = null;
    }
  }
  return compiledOrb;
}

export interface DiaryMoodScrubberProps {
  /** Selected diary mood (`tired` | `blue` | `soft` | `happy` | `excited`). */
  mood: DiaryMood;
  /** Localized labels for all 5 moods. */
  labels: Record<DiaryMood, string>;
  /** Accessibility heading (e.g. "Today's mood"). */
  accessibilityLabel: string;
  /** Called whenever the snapped mood changes. */
  onChange: (next: DiaryMood) => void;
  /** Notifies parent scroll container while horizontally scrubbing. */
  onScrubChange?: (scrubbing: boolean) => void;
}

/**
 * Heartbeat Diary's "Jonli shakl" mood picker:
 * a 3-layer morphing GPU orb beside the mood name and a 5-stop tactile liquid-glass scrubber rail
 * with synchronized selection haptics and low-latency acoustic tick/settle clicks.
 */
export function DiaryMoodScrubber({
  mood,
  labels,
  accessibilityLabel,
  onChange,
  onScrubChange,
}: DiaryMoodScrubberProps) {
  const reduced = useReducedMotion();
  const count = DIARY_MOODS.length;
  const maxIdx = count - 1;
  const moodIdx = diaryMoodIndex(mood);

  const [trackWidth, setTrackWidth] = useState(0);
  const [dragging, setDragging] = useState(false);

  const pos = useSharedValue(diaryMoodNorm(moodIdx));
  const lifted = useSharedValue(0);
  const clock = useSharedValue(0.8);
  const widthSv = useSharedValue(0);
  const draggingSv = useSharedValue(0);
  const lastIdxSv = useSharedValue(moodIdx);

  const soundRef = useRef<ScrubberSound | null>(null);
  const onChangeRef = useRef(onChange);
  const onScrubRef = useRef(onScrubChange);
  onChangeRef.current = onChange;
  onScrubRef.current = onScrubChange;

  useEffect(() => {
    const engine = createScrubberSound();
    soundRef.current = engine;
    return () => {
      engine.dispose();
      soundRef.current = null;
    };
  }, []);

  useEffect(() => {
    lastIdxSv.value = moodIdx;
    if (draggingSv.value === 1) return;
    const target = diaryMoodNorm(moodIdx);
    pos.value = reduced ? target : withSpring(target, SNAP_SPRING);
  }, [moodIdx, reduced, pos, draggingSv, lastIdxSv]);

  useFrameCallback((info) => {
    if (reduced) return;
    clock.value += (info.timeSincePreviousFrame ?? 16) / 1000;
  }, !reduced);

  const handleCross = useCallback((nextIdx: number) => {
    const nextMood = DIARY_MOODS[nextIdx];
    if (!nextMood) return;
    haptic.selection();
    soundRef.current?.tick();
    onChangeRef.current(nextMood);
  }, []);

  const handleSettle = useCallback((changed: boolean, nextIdx?: number) => {
    if (changed && nextIdx != null) {
      const nextMood = DIARY_MOODS[nextIdx];
      if (nextMood) {
        haptic.selection();
        onChangeRef.current(nextMood);
      }
    }
    soundRef.current?.settle();
  }, []);

  const handleDragState = useCallback((active: boolean) => {
    setDragging(active);
    onScrubRef.current?.(active);
  }, []);

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const w = Math.round(e.nativeEvent.layout.width);
      if (w > 0 && w !== trackWidth) {
        setTrackWidth(w);
        widthSv.value = w;
      }
    },
    [trackWidth, widthSv],
  );

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .activeOffsetX([-5, 5])
      .failOffsetY([-18, 18])
      .onStart((e) => {
        'worklet';
        draggingSv.value = 1;
        lifted.value = reduced ? 1 : withSpring(1, LIFT_SPRING);
        scheduleOnRN(handleDragState, true);

        const usable = widthSv.value - RAIL_INSET * 2;
        if (usable <= 0) return;
        const norm = Math.max(0, Math.min(1, (e.x - RAIL_INSET) / usable));
        pos.value = norm;
        const nearest = Math.round(norm * maxIdx);
        if (nearest !== lastIdxSv.value) {
          lastIdxSv.value = nearest;
          scheduleOnRN(handleCross, nearest);
        }
      })
      .onUpdate((e) => {
        'worklet';
        const usable = widthSv.value - RAIL_INSET * 2;
        if (usable <= 0) return;
        const norm = Math.max(0, Math.min(1, (e.x - RAIL_INSET) / usable));
        pos.value = norm;
        const nearest = Math.round(norm * maxIdx);
        if (nearest !== lastIdxSv.value) {
          lastIdxSv.value = nearest;
          scheduleOnRN(handleCross, nearest);
        }
      })
      .onFinalize(() => {
        'worklet';
        if (draggingSv.value !== 1) return;
        draggingSv.value = 0;
        const snapped = lastIdxSv.value / maxIdx;
        pos.value = reduced ? snapped : withSpring(snapped, SNAP_SPRING);
        lifted.value = reduced ? 0 : withSpring(0, LIFT_SPRING);
        scheduleOnRN(handleDragState, false);
        scheduleOnRN(handleSettle, false);
      });

    const tap = Gesture.Tap()
      .maxDistance(10)
      .onEnd((e, success) => {
        'worklet';
        if (!success) return;
        const usable = widthSv.value - RAIL_INSET * 2;
        if (usable <= 0) return;
        const norm = Math.max(0, Math.min(1, (e.x - RAIL_INSET) / usable));
        const nearest = Math.round(norm * maxIdx);
        const snapped = nearest / maxIdx;
        pos.value = reduced ? snapped : withSpring(snapped, SNAP_SPRING);
        const changed = nearest !== lastIdxSv.value;
        lastIdxSv.value = nearest;
        scheduleOnRN(handleSettle, changed, nearest);
      });

    return Gesture.Exclusive(pan, tap);
  }, [draggingSv, lifted, widthSv, pos, lastIdxSv, maxIdx, reduced, handleDragState, handleCross, handleSettle]);

  const thumbStyle = useAnimatedStyle(() => {
    const usable = Math.max(0, widthSv.value - RAIL_INSET * 2);
    const x = RAIL_INSET + pos.value * usable - THUMB_SIZE / 2;
    return {
      transform: [{ translateX: x }, { scale: 1 + 0.1 * lifted.value }],
    };
  });

  const thumbCoreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.14 * lifted.value }],
  }));

  const uniforms = useDerivedValue(
    () => ({
      res: [ORB_SIZE, ORB_SIZE],
      pos: pos.value,
      lifted: lifted.value,
      t: clock.value,
    }),
    [],
  );

  const jumpTo = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(maxIdx, idx));
      const nextMood = DIARY_MOODS[clamped];
      if (!nextMood) return;
      if (clamped === moodIdx) {
        soundRef.current?.settle();
        return;
      }
      lastIdxSv.value = clamped;
      const target = diaryMoodNorm(clamped);
      pos.value = reduced ? target : withSpring(target, SNAP_SPRING);
      haptic.selection();
      soundRef.current?.settle();
      onChangeRef.current(nextMood);
    },
    [maxIdx, moodIdx, lastIdxSv, pos, reduced],
  );

  const onAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === 'increment') jumpTo(moodIdx + 1);
      else if (event.nativeEvent.actionName === 'decrement') jumpTo(moodIdx - 1);
    },
    [jumpTo, moodIdx],
  );

  const moodHex = DIARY_MOOD_HEX[moodIdx];
  const cardRim = diaryMoodRgba(diaryMoodNorm(moodIdx), dragging ? 0.52 : 0.22);
  const activeLabel = labels[mood];
  const effect = orbEffect();
  const Canvas = SkiaModule?.Canvas;
  const Fill = SkiaModule?.Fill;
  const Shader = SkiaModule?.Shader;

  return (
    <View
      style={[styles.card, { borderColor: cardRim }]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`${accessibilityLabel}, ${activeLabel}`}
      accessibilityValue={{ min: 0, max: maxIdx, now: moodIdx, text: activeLabel }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onAccessibilityAction}>
      <View style={styles.topRow}>
        <View style={styles.orbWrap} pointerEvents="none">
          {effect && Canvas && Fill && Shader ? (
            <Canvas style={StyleSheet.absoluteFill}>
              <Fill>
                <Shader source={effect} uniforms={uniforms} />
              </Fill>
            </Canvas>
          ) : (
            <View style={[styles.fallbackOrb, { backgroundColor: moodHex }]} />
          )}
        </View>
        <View style={styles.wordCol}>
          <Txt style={[styles.word, { color: moodHex }]} lines={1} maxFontSizeMultiplier={1.2}>
            {activeLabel}
          </Txt>
        </View>
      </View>

      <GestureDetector gesture={gesture}>
        <View style={styles.track} onLayout={handleLayout}>
          <View style={styles.railWrap} pointerEvents="none">
            <LinearGradient
              colors={DIARY_MOOD_GRADIENT}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
          {trackWidth > 0 ? (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              {DIARY_MOOD_RGB.map((_, idx) => {
                const usable = Math.max(0, trackWidth - RAIL_INSET * 2);
                const left = RAIL_INSET + (idx / maxIdx) * usable - 2;
                return <View key={idx} style={[styles.detent, { left }]} />;
              })}
            </View>
          ) : null}
          {trackWidth > 0 ? (
            <Animated.View style={[styles.thumb, thumbStyle]} pointerEvents="none">
              <Animated.View style={[styles.thumbCore, thumbCoreStyle]} />
            </Animated.View>
          ) : null}
        </View>
      </GestureDetector>

      <View style={styles.stopsRow}>
        {DIARY_MOODS.map((m, idx) => {
          const selected = idx === moodIdx;
          return (
            <Pressable
              key={m}
              onPress={() => jumpTo(idx)}
              hitSlop={6}
              style={styles.stopBtn}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={labels[m]}>
              <Txt
                style={[styles.stopText, selected && styles.stopTextActive]}
                lines={1}
                maxFontSizeMultiplier={1.1}>
                {labels[m]}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orbWrap: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackOrb: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  wordCol: {
    flex: 1,
    justifyContent: 'center',
  },
  word: {
    ...inkFace('title'),
    fontSize: 25,
    lineHeight: 30,
  },
  track: {
    height: TRACK_HEIGHT,
    width: '100%',
    justifyContent: 'center',
  },
  railWrap: {
    position: 'absolute',
    left: RAIL_INSET,
    right: RAIL_INSET,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    opacity: 0.9,
  },
  detent: {
    position: 'absolute',
    top: (TRACK_HEIGHT - 4) / 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: ink.photoLine,
  },
  thumb: {
    position: 'absolute',
    top: (TRACK_HEIGHT - THUMB_SIZE) / 2,
    left: 0,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: ink.tintFill,
    borderWidth: 1,
    borderColor: inkGlass.topLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbCore: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: ink.text,
  },
  stopsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  stopBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },
  stopText: {
    ...inkFace('tag'),
    color: ink.text3,
    textAlign: 'center',
  },
  stopTextActive: {
    color: ink.text,
    fontWeight: '600',
  },
});
