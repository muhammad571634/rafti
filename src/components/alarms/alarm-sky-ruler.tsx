import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Txt } from '@/components/ui';
import { alarmTime } from '@/lib/alarm-format';
import {
  ALARM_QUICK_PRESETS,
  ALARM_RULER_ANCHORS,
  ALARM_STEP_MIN,
  MAX_RULER_MIN,
  minutesToNorm,
  normToSnappedMinutes,
  splitMinutes,
} from '@/lib/alarm-ruler';
import { haptic } from '@/lib/haptics';
import { createScrubberSound, type ScrubberSound } from '@/lib/scrubber-sound';
import { skiaReady } from '@/lib/skia-ready';
import { sleepColors as night, space } from '@/theme';
import { ink, inkFace, inkPeachGlass, inkRadius } from '@/theme/ink';

// Guard Skia behind `skiaReady` so web static export and older binaries never crash on import.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SkiaModule = skiaReady ? (require('@shopify/react-native-skia') as typeof import('@shopify/react-native-skia')) : null;

const TRACK_HEIGHT = 60;
const TRACK_INSET = 12;
const LIFT_SPRING = { damping: 20, stiffness: 280, mass: 0.7 };
const SNAP_SPRING = { damping: 24, stiffness: 320, mass: 0.75 };

/**
 * Single-pass O(1) GPU fragment shader for the 24-hour Alarm Sky Ruler.
 * Paints a subtle 24h sky horizon spectrum (midnight violet -> golden dawn -> clear day ->
 * sunset amber -> midnight), 48 Gaussian bell-curve swelling hairline ticks (major ticks every 3h),
 * and a sky-tinted luminous needle with cream specular filament. Premultiplied alpha throughout.
 */
const SKY_RULER_SHADER = `
uniform float2 res;
uniform float pos;
uniform float lifted;
uniform float inset;

float sdCapsuleY(float2 p, float2 c, float halfH, float r) {
  float dy = abs(p.y - c.y) - max(0.0, halfH - r);
  float2 q = float2(abs(p.x - c.x), max(dy, 0.0));
  return length(q) - r;
}

float3 skyColor(float t) {
  float3 nightC   = float3(0.553, 0.490, 0.945);
  float3 dawnC    = float3(0.922, 0.678, 0.518);
  float3 dayC     = float3(0.478, 0.722, 0.980);
  float3 eveningC = float3(0.953, 0.592, 0.431);
  if (t < 0.25) return mix(nightC, dawnC, smoothstep(0.14, 0.25, t));
  if (t < 0.50) return mix(dawnC, dayC, smoothstep(0.32, 0.46, t));
  if (t < 0.78) return mix(dayC, eveningC, smoothstep(0.66, 0.78, t));
  return mix(eveningC, nightC, smoothstep(0.84, 0.95, t));
}

half4 main(float2 p) {
  float w = max(res.x, 1.0);
  float h = max(res.y, 1.0);
  float trackW = max(w - inset * 2.0, 1.0);
  float u = clamp((p.x - inset) / trackW, 0.0, 1.0);
  float clampedPos = clamp(pos, 0.0, 1.0);
  float ix = inset + clampedPos * trackW;
  float midY = h * 0.50;

  float sigma = max(trackW * 0.135, 1.0);
  float rest = 7.0;
  float swell = 22.0 + 8.0 * lifted;

  float3 activeSky = skyColor(clampedPos);
  float3 localSky  = skyColor(u);
  float3 slateCol  = float3(0.745, 0.737, 0.902);
  float3 creamCol  = float3(1.000, 0.965, 0.925);

  // 1. Subtle 24h sky horizon band + radial bloom behind the active bell-curve zone
  float bandY = abs(p.y - midY) / max(h * 0.48, 1.0);
  float bandA = exp(-bandY * bandY * 3.8) * 0.065;
  float2 ap = (p - float2(ix, midY)) / float2(sigma * 1.2, h * 0.54);
  float ad = length(ap);
  float bloomA = exp(-ad * ad * 2.2) * (0.14 + 0.15 * lifted);
  float alpha = clamp(bandA + bloomA, 0.0, 0.40);
  float3 bgC = (localSky * bandA + activeSky * bloomA) / max(bandA + bloomA, 0.0001);
  float3 col = bgC * alpha;

  // 2. O(1) 48 hairline ticks (every 30 min; major ticks every 3 hours)
  float tickCount = 48.0;
  float stepX = trackW / tickCount;
  float relX = p.x - inset;
  float tickIdx = clamp(floor(relX / stepX + 0.5), 0.0, tickCount);
  float tx = inset + tickIdx * stepX;
  float distFromNeedle = abs(tx - ix);

  if (distFromNeedle >= 2.8) {
    float isMajor = step(abs(mod(tickIdx, 6.0)), 0.01);
    float z = distFromNeedle / sigma;
    float bell = exp(-0.5 * z * z);
    float halfH = (rest + isMajor * 4.5 + swell * bell) * 0.5;
    float radius = (bell > 0.58 || isMajor > 0.5) ? 0.80 : 0.60;
    float dTick = sdCapsuleY(p, float2(tx, midY), halfH, radius);
    float mask = 1.0 - smoothstep(-0.45, 0.55, dTick);
    if (mask > 0.001) {
      float warm = pow(bell, 1.8);
      float3 tc = mix(slateCol, localSky, 0.30 + 0.70 * warm);
      float ta = (0.18 + isMajor * 0.14 + 0.60 * bell) * mask;
      col = tc * ta + col * (1.0 - ta);
      alpha = ta + alpha * (1.0 - ta);
    }
  }

  // 3. Luminous sky-tinted center needle + bloom + cream specular core
  float nHalfH = (rest + swell + 8.0) * 0.5;
  float nRadius = (2.8 + 0.6 * lifted) * 0.5;
  float dNeedle = sdCapsuleY(p, float2(ix, midY), nHalfH, nRadius);

  float glowR = 7.5 + 3.5 * lifted;
  float ga = clamp(exp(-max(dNeedle, 0.0) / glowR) * (0.28 + 0.24 * lifted), 0.0, 0.46);
  col = activeSky * ga + col * (1.0 - ga);
  alpha = ga + alpha * (1.0 - ga);

  float nMask = 1.0 - smoothstep(-0.45, 0.55, dNeedle);
  if (nMask > 0.001) {
    float dSpec = sdCapsuleY(p, float2(ix, midY), max(nHalfH - 3.0, 1.0), 0.55);
    float specMask = (1.0 - smoothstep(-0.3, 0.45, dSpec)) * 0.70;
    float3 nc = mix(activeSky, creamCol, specMask);
    col = nc * nMask + col * (1.0 - nMask);
    alpha = nMask + alpha * (1.0 - nMask);
  }

  return half4(clamp(col, 0.0, alpha), clamp(alpha, 0.0, 1.0));
}
`;

type RuntimeEffect = ReturnType<NonNullable<typeof SkiaModule>['Skia']['RuntimeEffect']['Make']>;
let compiledEffect: RuntimeEffect | undefined;

function skyRulerEffect(): RuntimeEffect {
  if (Platform.OS === 'web' || !SkiaModule) return null;
  if (compiledEffect === undefined) {
    try {
      compiledEffect = SkiaModule.Skia.RuntimeEffect.Make(SKY_RULER_SHADER);
    } catch {
      compiledEffect = null;
    }
  }
  return compiledEffect;
}

export interface AlarmSkyRulerProps {
  hour: number;
  minute: number;
  h12: boolean;
  onChange: (hour: number, minute: number) => void;
  onScrubbingChange?: (scrubbing: boolean) => void;
  accessibilityLabel: string;
}

/**
 * 24-hour precision Alarm Sky Ruler (5-minute steps, 00:00..23:55) with 120 FPS Skia bell-curve
 * shader, watch-crown tactile clicks (sharper detent on full hours), clickable 24h landmarks,
 * and one-tap morning wake-up presets.
 */
export function AlarmSkyRuler({
  hour,
  minute,
  h12,
  onChange,
  onScrubbingChange,
  accessibilityLabel,
}: AlarmSkyRulerProps) {
  const reduced = useReducedMotion();
  const totalMinutes = hour * 60 + minute;
  const [trackWidth, setTrackWidth] = useState(0);

  const pos = useSharedValue(minutesToNorm(totalMinutes));
  const lifted = useSharedValue(0);
  const dragging = useSharedValue(false);
  const widthSV = useSharedValue(0);
  const lastMinSV = useSharedValue(totalMinutes);

  const soundRef = useRef<ScrubberSound | null>(null);
  useEffect(() => {
    const engine = createScrubberSound();
    soundRef.current = engine;
    return () => {
      engine.dispose();
      soundRef.current = null;
    };
  }, []);

  // Sync external edits (from -/+ buttons, TimeWheel, or preset taps) into the ruler smoothly.
  useEffect(() => {
    lastMinSV.value = totalMinutes;
    if (dragging.value) return;
    const target = minutesToNorm(totalMinutes);
    pos.value = reduced ? target : withSpring(target, SNAP_SPRING);
  }, [totalMinutes, reduced, pos, dragging, lastMinSV]);

  const emitMinute = useCallback(
    (mins: number, settleClick: boolean) => {
      const next = splitMinutes(mins);
      onChange(next.hour, next.minute);
      haptic.selection();
      if (settleClick || next.minute === 0) soundRef.current?.settle();
      else soundRef.current?.tick();
    },
    [onChange],
  );

  const emitSettle = useCallback(() => {
    soundRef.current?.settle();
  }, []);

  const setScrubbing = useCallback(
    (active: boolean) => {
      onScrubbingChange?.(active);
    },
    [onScrubbingChange],
  );

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const w = e.nativeEvent.layout.width;
      setTrackWidth(w);
      widthSV.value = w;
    },
    [widthSV],
  );

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .activeOffsetX([-6, 6])
      .failOffsetY([-16, 16])
      .onBegin((e) => {
        'worklet';
        const usable = Math.max(1, widthSV.value - TRACK_INSET * 2);
        const norm = Math.max(0, Math.min(1, (e.x - TRACK_INSET) / usable));
        dragging.value = true;
        pos.value = norm;
        lifted.value = reduced ? 1 : withSpring(1, LIFT_SPRING);
        scheduleOnRN(setScrubbing, true);

        const snapped = normToSnappedMinutes(norm, ALARM_STEP_MIN);
        if (snapped !== lastMinSV.value) {
          lastMinSV.value = snapped;
          scheduleOnRN(emitMinute, snapped, false);
        }
      })
      .onUpdate((e) => {
        'worklet';
        const usable = Math.max(1, widthSV.value - TRACK_INSET * 2);
        const norm = Math.max(0, Math.min(1, (e.x - TRACK_INSET) / usable));
        pos.value = norm;
        const snapped = normToSnappedMinutes(norm, ALARM_STEP_MIN);
        if (snapped !== lastMinSV.value) {
          lastMinSV.value = snapped;
          scheduleOnRN(emitMinute, snapped, false);
        }
      })
      .onFinalize(() => {
        'worklet';
        dragging.value = false;
        const snapped = lastMinSV.value;
        const target = minutesToNorm(snapped);
        pos.value = reduced ? target : withSpring(target, SNAP_SPRING);
        lifted.value = reduced ? 0 : withTiming(0, { duration: 180 });
        scheduleOnRN(setScrubbing, false);
        scheduleOnRN(emitSettle);
      });

    const tap = Gesture.Tap().onEnd((e, ok) => {
      'worklet';
      if (!ok) return;
      const usable = Math.max(1, widthSV.value - TRACK_INSET * 2);
      const norm = Math.max(0, Math.min(1, (e.x - TRACK_INSET) / usable));
      const snapped = normToSnappedMinutes(norm, ALARM_STEP_MIN);
      lastMinSV.value = snapped;
      const target = minutesToNorm(snapped);
      pos.value = reduced ? target : withSpring(target, SNAP_SPRING);
      scheduleOnRN(emitMinute, snapped, true);
    });

    return Gesture.Exclusive(pan, tap);
  }, [widthSV, dragging, pos, lifted, reduced, lastMinSV, setScrubbing, emitMinute, emitSettle]);

  const effect = skyRulerEffect();
  const uniforms = useDerivedValue(() => ({
    res: [Math.max(1, widthSV.value), TRACK_HEIGHT],
    pos: pos.value,
    lifted: lifted.value,
    inset: TRACK_INSET,
  }));

  const fallbackNeedleStyle = useAnimatedStyle(() => {
    const usable = Math.max(0, widthSV.value - TRACK_INSET * 2);
    return {
      transform: [{ translateX: TRACK_INSET + pos.value * usable - 2 }],
    };
  });

  const handleA11yAction = (e: AccessibilityActionEvent) => {
    const delta = e.nativeEvent.actionName === 'increment' ? ALARM_STEP_MIN : e.nativeEvent.actionName === 'decrement' ? -ALARM_STEP_MIN : 0;
    if (!delta) return;
    const next = Math.max(0, Math.min(MAX_RULER_MIN, totalMinutes + delta));
    emitMinute(next, true);
  };

  const formatShort = (mins: number) => {
    const { hour: h, minute: m } = splitMinutes(mins);
    const f = alarmTime(h, m, h12);
    return f.period ? `${f.time}${f.period === 'am' ? 'a' : 'p'}` : f.time;
  };

  return (
    <View style={styles.root}>
      <GestureDetector gesture={gesture}>
        <View
          onLayout={handleLayout}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={accessibilityLabel}
          accessibilityValue={{
            min: 0,
            max: MAX_RULER_MIN,
            now: totalMinutes,
            text: formatShort(totalMinutes),
          }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={handleA11yAction}
          style={styles.trackWrap}>
          {SkiaModule && effect && trackWidth > 0 ? (
            <SkiaModule.Canvas style={styles.canvas}>
              <SkiaModule.Fill>
                <SkiaModule.Shader source={effect} uniforms={uniforms} />
              </SkiaModule.Fill>
            </SkiaModule.Canvas>
          ) : (
            <View style={styles.fallbackTrack}>
              <View style={styles.fallbackRail} />
              <Animated.View style={[styles.fallbackNeedle, fallbackNeedleStyle]} />
            </View>
          )}
        </View>
      </GestureDetector>

      {/* Clickable 24-hour landmarks */}
      <View style={styles.anchors}>
        {ALARM_RULER_ANCHORS.map((mins) => {
          const near = Math.abs(totalMinutes - mins) <= 30;
          return (
            <Pressable
              key={mins}
              hitSlop={8}
              onPress={() => emitMinute(mins, true)}
              accessibilityRole="button"
              accessibilityLabel={formatShort(mins)}>
              <Txt style={[styles.anchorText, near && styles.anchorTextActive]} maxFontSizeMultiplier={1.15}>
                {formatShort(mins)}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      {/* One-tap morning presets */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presets}>
        {ALARM_QUICK_PRESETS.map((mins) => {
          const active = totalMinutes === mins;
          return (
            <Pressable
              key={mins}
              onPress={() => emitMinute(mins, true)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={formatShort(mins)}
              style={[styles.presetPill, active && styles.presetPillOn]}>
              <Txt style={[styles.presetText, active && styles.presetTextOn]} maxFontSizeMultiplier={1.2}>
                {formatShort(mins)}
              </Txt>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'stretch',
    gap: space.sm,
  },
  trackWrap: {
    height: TRACK_HEIGHT,
    justifyContent: 'center',
  },
  canvas: {
    width: '100%',
    height: TRACK_HEIGHT,
  },
  fallbackTrack: {
    height: TRACK_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: TRACK_INSET,
  },
  fallbackRail: {
    height: 4,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.hairlineFill,
  },
  fallbackNeedle: {
    position: 'absolute',
    left: 0,
    width: 4,
    height: 28,
    borderRadius: inkRadius.pill,
    backgroundColor: inkPeachGlass.textBright,
  },
  anchors: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: TRACK_INSET,
    marginTop: -4,
  },
  anchorText: {
    ...inkFace('caption'),
    color: night.textMuted,
    fontVariant: ['tabular-nums'],
  },
  anchorTextActive: {
    color: inkPeachGlass.textBright,
    fontWeight: '600',
  },
  presets: {
    gap: space.xs,
    paddingHorizontal: space.xs,
    paddingTop: 2,
    flexGrow: 1,
    justifyContent: 'center',
  },
  presetPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.raised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
  },
  presetPillOn: {
    backgroundColor: ink.tintFill,
    borderColor: inkPeachGlass.rim,
  },
  presetText: {
    ...inkFace('footnoteStrong'),
    color: night.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  presetTextOn: {
    color: inkPeachGlass.textBright,
  },
});
