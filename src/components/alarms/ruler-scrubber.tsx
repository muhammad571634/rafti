import { Ionicons } from '@expo/vector-icons';
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
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Txt } from '@/components/ui';
import { BEDTIME_SCALE_ANCHORS, stepIndexToNorm } from '@/lib/bedtime-timer';
import { haptic } from '@/lib/haptics';
import { createScrubberSound, type ScrubberSound } from '@/lib/scrubber-sound';
import { skiaReady } from '@/lib/skia-ready';
import { ink, inkFace, inkPeachGlass, inkRadius } from '@/theme/ink';

// Guard Skia import behind `skiaReady` so web export and older binaries never crash at import.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SkiaModule = skiaReady ? (require('@shopify/react-native-skia') as typeof import('@shopify/react-native-skia')) : null;

const TRACK_HEIGHT = 60;
const TRACK_INSET = 12;
const ANCHOR_WIDTH = 36;
const LIFT_SPRING = { damping: 20, stiffness: 280, mass: 0.7 };
const SNAP_SPRING = { damping: 24, stiffness: 320, mass: 0.75 };

/**
 * Single-pass GPU fragment shader for the Bedtime ruler scrubber.
 * Draws the radial peach/lavender aura, 45 O(1) Gaussian bell-curve swelling hairline ticks,
 * baseline detent dots, and luminous brand-peach center needle with specular highlight in one draw call.
 * All compositing stays strictly premultiplied (`0 <= col.rgb <= alpha <= 1`).
 */
const RULER_SHADER = `
uniform float2 res;
uniform float pos;
uniform float lifted;
uniform float steps;
uniform float inset;

float sdCapsuleY(float2 p, float2 c, float halfH, float r) {
  float dy = abs(p.y - c.y) - max(0.0, halfH - r);
  float2 q = float2(abs(p.x - c.x), max(dy, 0.0));
  return length(q) - r;
}

half4 main(float2 p) {
  float w = max(res.x, 1.0);
  float h = max(res.y, 1.0);
  float trackW = max(w - inset * 2.0, 1.0);
  float ix = inset + clamp(pos, 0.0, 1.0) * trackW;
  float midY = h * 0.50;

  float sigma = max(trackW * 0.145, 1.0);
  float rest = 7.0;
  float swell = 23.0 + 8.0 * lifted;

  float3 peachCol = float3(0.922, 0.678, 0.518);
  float3 lavCol   = float3(0.655, 0.545, 0.980);
  float3 slateCol = float3(0.745, 0.737, 0.902);
  float3 creamCol = float3(1.000, 0.965, 0.925);

  // 1. Soft radial aura behind the bell-curve zone
  float2 ap = (p - float2(ix, midY)) / float2(sigma * 1.15, h * 0.56);
  float ad = length(ap);
  float auraP = exp(-ad * ad * 2.3) * (0.12 + 0.14 * lifted);
  float auraL = exp(-ad * ad * 1.1) * (0.05 + 0.05 * lifted);
  float alpha = clamp(auraP + auraL, 0.0, 0.36);
  float3 auraC = (peachCol * auraP + lavCol * auraL) / max(auraP + auraL, 0.0001);
  float3 col = auraC * alpha;

  // 2. O(1) nearest hairline tick with Gaussian bell-curve swelling
  float tickCount = 44.0;
  float stepX = trackW / tickCount;
  float relX = p.x - inset;
  float tickIdx = clamp(floor(relX / stepX + 0.5), 0.0, tickCount);
  float tx = inset + tickIdx * stepX;
  float distFromNeedle = abs(tx - ix);

  if (distFromNeedle >= 2.8) {
    float z = distFromNeedle / sigma;
    float bell = exp(-0.5 * z * z);
    float halfH = (rest + swell * bell) * 0.5;
    float radius = bell > 0.58 ? 0.80 : 0.60;
    float dTick = sdCapsuleY(p, float2(tx, midY), halfH, radius);
    float mask = 1.0 - smoothstep(-0.45, 0.55, dTick);
    if (mask > 0.001) {
      float warm = pow(bell, 2.0);
      float3 tc = mix(slateCol, peachCol, warm);
      float ta = (0.17 + 0.62 * bell) * mask;
      col = tc * ta + col * (1.0 - ta);
      alpha = ta + alpha * (1.0 - ta);
    }
  }

  // 3. O(1) baseline detent dots at each selectable step
  if (steps > 1.0) {
    float sSpacing = trackW / (steps - 1.0);
    float sIdx = clamp(floor(relX / sSpacing + 0.5), 0.0, steps - 1.0);
    float sx = inset + sIdx * sSpacing;
    float sdNeedle = abs(sx - ix);
    if (sdNeedle >= 4.0) {
      float dz = sdNeedle / sigma;
      float dbell = exp(-0.5 * dz * dz);
      float dDot = length(p - float2(sx, h - 3.5)) - 1.35;
      float dMask = 1.0 - smoothstep(-0.4, 0.5, dDot);
      if (dMask > 0.001) {
        float da = (0.16 + 0.34 * dbell) * dMask;
        float3 dc = mix(float3(0.92, 0.92, 0.96), peachCol, dbell * 0.6);
        col = dc * da + col * (1.0 - da);
        alpha = da + alpha * (1.0 - da);
      }
    }
  }

  // 4. Luminous brand-peach center needle + bloom + cream specular filament
  float nHalfH = (rest + swell + 8.0) * 0.5;
  float nRadius = (2.8 + 0.6 * lifted) * 0.5;
  float dNeedle = sdCapsuleY(p, float2(ix, midY), nHalfH, nRadius);

  float glowR = 7.5 + 3.5 * lifted;
  float ga = clamp(exp(-max(dNeedle, 0.0) / glowR) * (0.28 + 0.24 * lifted), 0.0, 0.45);
  col = peachCol * ga + col * (1.0 - ga);
  alpha = ga + alpha * (1.0 - ga);

  float nMask = 1.0 - smoothstep(-0.45, 0.55, dNeedle);
  if (nMask > 0.001) {
    float dSpec = sdCapsuleY(p, float2(ix, midY), max(nHalfH - 3.0, 1.0), 0.55);
    float specMask = (1.0 - smoothstep(-0.3, 0.45, dSpec)) * 0.68;
    float3 nc = mix(peachCol, creamCol, specMask);
    col = nc * nMask + col * (1.0 - nMask);
    alpha = nMask + alpha * (1.0 - nMask);
  }

  return half4(clamp(col, 0.0, alpha), clamp(alpha, 0.0, 1.0));
}
`;

type RuntimeEffect = ReturnType<NonNullable<typeof SkiaModule>['Skia']['RuntimeEffect']['Make']>;
let compiledEffect: RuntimeEffect | undefined;

function rulerEffect(): RuntimeEffect {
  if (Platform.OS === 'web' || !SkiaModule) return null;
  if (compiledEffect === undefined) {
    try {
      compiledEffect = SkiaModule.Skia.RuntimeEffect.Make(RULER_SHADER);
    } catch {
      compiledEffect = null;
    }
  }
  return compiledEffect;
}

export interface RulerScrubberProps {
  /** Ordered discrete values in minutes (e.g. `BEDTIME_TIMERS`). */
  steps: readonly number[];
  /** Currently selected index in `steps`. */
  stepIndex: number;
  /** Formatted duration readout, e.g. "20 min". */
  valueLabel: string;
  /** Live completion clock line, e.g. "Ends 23:05". */
  endsLabel: string;
  /** Screen-reader label for the timer control. */
  accessibilityLabel: string;
  /** Called whenever the snapped step index changes. */
  onChange: (nextIndex: number) => void;
  /** Notifies parent when active scrubbing starts/ends (used to breathe the DotMatrix halo). */
  onScrubChange?: (scrubbing: boolean) => void;
}

/**
 * Tactile Apple-grade Bedtime ruler scrubber:
 * Gaussian bell-curve ticks swell smoothly under the user's finger at 60–120 FPS in one GPU shader pass,
 * paired with synchronized selection haptics and a low-latency pooled acoustic tick sound.
 */
export function RulerScrubber({
  steps,
  stepIndex,
  valueLabel,
  endsLabel,
  accessibilityLabel,
  onChange,
  onScrubChange,
}: RulerScrubberProps) {
  const reduced = useReducedMotion();
  const count = steps.length;
  const maxIdx = Math.max(1, count - 1);

  const [trackWidth, setTrackWidth] = useState(0);
  const [active, setActive] = useState(false);

  const pos = useSharedValue(stepIndexToNorm(stepIndex, count));
  const lifted = useSharedValue(0);
  const pulse = useSharedValue(0);
  const widthSv = useSharedValue(0);
  const draggingSv = useSharedValue(0);
  const lastStepSv = useSharedValue(stepIndex);

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

  // Keep shared values synced when stepIndex changes externally (anchor tap or accessibility).
  useEffect(() => {
    lastStepSv.value = stepIndex;
    if (draggingSv.value === 1) return;
    const target = stepIndexToNorm(stepIndex, count);
    pos.value = reduced ? target : withSpring(target, SNAP_SPRING);
  }, [stepIndex, count, reduced, pos, draggingSv, lastStepSv]);

  const firePulse = useCallback(() => {
    if (reduced) return;
    pulse.value = withSequence(withTiming(1, { duration: 60 }), withTiming(0, { duration: 150 }));
  }, [pulse, reduced]);

  const handleStepCross = useCallback(
    (next: number) => {
      haptic.selection();
      soundRef.current?.tick();
      firePulse();
      onChangeRef.current(next);
    },
    [firePulse],
  );

  const handleSettle = useCallback(
    (changedOnTap: boolean, next?: number) => {
      if (changedOnTap && next != null) {
        haptic.selection();
        firePulse();
        onChangeRef.current(next);
      }
      soundRef.current?.settle();
    },
    [firePulse],
  );

  const handleDragState = useCallback((isScrubbing: boolean) => {
    setActive(isScrubbing);
    onScrubRef.current?.(isScrubbing);
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

        const usable = widthSv.value - TRACK_INSET * 2;
        if (usable <= 0) return;
        const norm = Math.max(0, Math.min(1, (e.x - TRACK_INSET) / usable));
        pos.value = norm;
        const nearest = Math.round(norm * maxIdx);
        if (nearest !== lastStepSv.value) {
          lastStepSv.value = nearest;
          scheduleOnRN(handleStepCross, nearest);
        }
      })
      .onUpdate((e) => {
        'worklet';
        const usable = widthSv.value - TRACK_INSET * 2;
        if (usable <= 0) return;
        const norm = Math.max(0, Math.min(1, (e.x - TRACK_INSET) / usable));
        pos.value = norm;
        const nearest = Math.round(norm * maxIdx);
        if (nearest !== lastStepSv.value) {
          lastStepSv.value = nearest;
          scheduleOnRN(handleStepCross, nearest);
        }
      })
      .onFinalize(() => {
        'worklet';
        if (draggingSv.value !== 1) return;
        draggingSv.value = 0;
        const snapped = lastStepSv.value / maxIdx;
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
        const usable = widthSv.value - TRACK_INSET * 2;
        if (usable <= 0) return;
        const norm = Math.max(0, Math.min(1, (e.x - TRACK_INSET) / usable));
        const nearest = Math.round(norm * maxIdx);
        const snapped = nearest / maxIdx;
        pos.value = reduced ? snapped : withSpring(snapped, SNAP_SPRING);
        const changed = nearest !== lastStepSv.value;
        lastStepSv.value = nearest;
        scheduleOnRN(handleSettle, changed, nearest);
      });

    return Gesture.Exclusive(pan, tap);
  }, [draggingSv, lifted, widthSv, pos, lastStepSv, maxIdx, reduced, handleDragState, handleStepCross, handleSettle]);

  const cardStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(lifted.value, [0, 1], [ink.edge, inkPeachGlass.rim]),
  }));

  const readoutStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.05 * lifted.value }],
  }));

  const pulseDotStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: 0.5 + 0.85 * pulse.value }],
  }));

  const fallbackNeedleStyle = useAnimatedStyle(() => {
    const usable = Math.max(0, widthSv.value - TRACK_INSET * 2);
    return {
      transform: [{ translateX: TRACK_INSET + pos.value * usable - 1.5 }],
    };
  });

  const uniforms = useDerivedValue(
    () => ({
      res: [Math.max(1, widthSv.value), TRACK_HEIGHT],
      pos: pos.value,
      lifted: lifted.value,
      steps: count,
      inset: TRACK_INSET,
    }),
    [count],
  );

  const anchors = useMemo(() => {
    const usable = Math.max(0, trackWidth - TRACK_INSET * 2);
    const list: { min: number; idx: number; left: number }[] = [];
    for (const min of BEDTIME_SCALE_ANCHORS) {
      const idx = steps.indexOf(min);
      if (idx < 0) continue;
      const norm = stepIndexToNorm(idx, count);
      list.push({ min, idx, left: TRACK_INSET + norm * usable - ANCHOR_WIDTH / 2 });
    }
    return list;
  }, [steps, count, trackWidth]);

  const jumpTo = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(count - 1, idx));
      if (clamped === stepIndex) {
        soundRef.current?.settle();
        return;
      }
      lastStepSv.value = clamped;
      const target = stepIndexToNorm(clamped, count);
      pos.value = reduced ? target : withSpring(target, SNAP_SPRING);
      haptic.selection();
      soundRef.current?.settle();
      firePulse();
      onChangeRef.current(clamped);
    },
    [count, stepIndex, lastStepSv, pos, reduced, firePulse],
  );

  const onAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === 'increment') jumpTo(stepIndex + 1);
      else if (event.nativeEvent.actionName === 'decrement') jumpTo(stepIndex - 1);
    },
    [jumpTo, stepIndex],
  );

  const effect = rulerEffect();
  const Canvas = SkiaModule?.Canvas;
  const Fill = SkiaModule?.Fill;
  const Shader = SkiaModule?.Shader;

  return (
    <Animated.View
      style={[styles.card, cardStyle]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`${accessibilityLabel}, ${valueLabel}, ${endsLabel}`}
      accessibilityValue={{ min: steps[0], max: steps[count - 1], now: steps[stepIndex], text: valueLabel }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onAccessibilityAction}>
      <View style={styles.header}>
        <Animated.View style={[styles.readout, readoutStyle]}>
          <Ionicons name="timer-outline" size={19} color={active ? ink.accent : ink.text2} />
          <Txt style={[styles.numeral, active && styles.numeralActive]} lines={1} maxFontSizeMultiplier={1.2}>
            {valueLabel}
          </Txt>
        </Animated.View>
        <View style={styles.endsRow}>
          <Animated.View style={[styles.pulseDot, pulseDotStyle]} />
          <Txt style={styles.endsText} lines={1} maxFontSizeMultiplier={1.15}>
            {endsLabel}
          </Txt>
        </View>
      </View>

      <GestureDetector gesture={gesture}>
        <View style={styles.track} onLayout={handleLayout}>
          {trackWidth > 0 && effect && Canvas && Fill && Shader ? (
            <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
              <Fill>
                <Shader source={effect} uniforms={uniforms} />
              </Fill>
            </Canvas>
          ) : trackWidth > 0 ? (
            <View style={styles.fallbackTrack} pointerEvents="none">
              <View style={styles.fallbackLine} />
              <Animated.View style={[styles.fallbackNeedle, fallbackNeedleStyle]} />
            </View>
          ) : null}
        </View>
      </GestureDetector>

      <View style={styles.scaleRow}>
        {trackWidth > 0
          ? anchors.map((a) => {
              const selected = a.idx === stepIndex;
              return (
                <Pressable
                  key={a.min}
                  onPress={() => jumpTo(a.idx)}
                  hitSlop={8}
                  style={[styles.anchorBtn, { left: a.left }]}
                  accessibilityRole="button"
                  accessibilityLabel={`${a.min}`}>
                  <Txt style={[styles.anchorText, selected && styles.anchorActive]} lines={1}>
                    {a.min}
                  </Txt>
                </Pressable>
              );
            })
          : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 2,
  },
  readout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexShrink: 1,
  },
  numeral: {
    ...inkFace('numeralSmall'),
    fontSize: 28,
    lineHeight: 33,
    color: ink.text,
  },
  numeralActive: {
    color: inkPeachGlass.textBright,
  },
  endsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ink.accent,
  },
  endsText: {
    ...inkFace('footnote'),
    color: ink.text2,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: TRACK_HEIGHT,
    width: '100%',
    justifyContent: 'center',
  },
  scaleRow: {
    position: 'relative',
    height: 18,
    width: '100%',
  },
  anchorBtn: {
    position: 'absolute',
    top: 0,
    width: ANCHOR_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anchorText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    color: ink.text3,
  },
  anchorActive: {
    color: ink.accent,
  },
  fallbackTrack: {
    flex: 1,
    justifyContent: 'center',
  },
  fallbackLine: {
    height: 2,
    marginHorizontal: TRACK_INSET,
    borderRadius: 1,
    backgroundColor: ink.hairlineFill,
  },
  fallbackNeedle: {
    position: 'absolute',
    width: 3,
    height: 36,
    borderRadius: 2,
    backgroundColor: ink.accent,
  },
});
