import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { InkText } from '@/components/ink';
import { duration } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { hexToRgb01, lineAt } from '@/lib/radio-clips';
import { sharedScrubberSound } from '@/lib/scrubber-sound';
import { skiaReady } from '@/lib/skia-ready';
import { immersive } from '@/theme';
import { ink, inkRadius } from '@/theme/ink';

// Guard Skia behind `skiaReady` so web static export and older binaries never crash on import.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SkiaModule = skiaReady ? (require('@shopify/react-native-skia') as typeof import('@shopify/react-native-skia')) : null;

const TRACK_H = 44;
const PAD_X = 10;
const PILL_W = 86;

/**
 * Single-pass O(1) GPU fragment shader for the Radio "Jonli to'lqin" breathing wave scrubber.
 * Draws the calm unplayed rail, chapter boundary beads, living voice-modulated sinusoidal wave
 * along the played portion in the friend's accent color, and a glowing glass thumb at the playhead.
 */
const RADIO_WAVE_SHADER = `
uniform float2 res;
uniform float progress;
uniform float phase;
uniform float amp;
uniform float scrubbing;
uniform float3 accent;
uniform float4 markers;
uniform float markerCount;
uniform float padX;

float sdSegment(float2 p, float2 a, float2 b) {
  float2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
  return length(pa - ba * h);
}

half4 main(float2 p) {
  float w = max(res.x, 1.0);
  float h = max(res.y, 1.0);
  float usableW = max(w - padX * 2.0, 1.0);
  float clampedP = clamp(progress, 0.0, 1.0);
  float playX = padX + clampedP * usableW;
  float midY = h * 0.54;

  float3 col = float3(0.0);
  float alpha = 0.0;

  // 1. Calm unplayed rail (x >= playX)
  if (p.x >= playX - 2.0 && p.x <= w - padX + 2.0) {
    float dRail = sdSegment(p, float2(playX, midY), float2(w - padX, midY)) - 1.35;
    float rMask = 1.0 - smoothstep(-0.5, 0.65, dRail);
    if (rMask > 0.001) {
      float ra = 0.18 * rMask;
      col = float3(1.0) * ra;
      alpha = ra;
    }
  }

  // 2. Spoken-line chapter beads (up to 4 interior boundaries)
  for (int i = 0; i < 4; i++) {
    if (float(i) < markerCount) {
      float mFrac = i == 0 ? markers.x : (i == 1 ? markers.y : (i == 2 ? markers.z : markers.w));
      float mx = padX + mFrac * usableW;
      float dDot = length(p - float2(mx, midY)) - 2.5;
      float dMask = 1.0 - smoothstep(-0.4, 0.55, dDot);
      if (dMask > 0.001) {
        float da = (mx <= playX ? 0.72 : 0.28) * dMask;
        float3 dc = mx <= playX ? float3(1.0) : float3(0.85);
        col = dc * da + col * (1.0 - da);
        alpha = da + alpha * (1.0 - da);
      }
    }
  }

  // 3. Living breathing sine wave along played segment (padX .. playX)
  if (p.x >= padX - 4.0 && p.x <= playX + 4.0 && playX > padX + 1.0) {
    float span = max(playX - padX, 1.0);
    float u = clamp((p.x - padX) / span, 0.0, 1.0);
    float edgeTaper = sin(min(1.0, u * 5.0) * 1.570796) * sin(min(1.0, (1.0 - u) * 7.0) * 1.570796);
    float voiceMod = 0.76 + 0.24 * sin(phase * 0.85) * cos(phase * 0.43);
    float waveAmp = 5.4 * amp * voiceMod * edgeTaper;
    float k = 0.135;
    float waveY = midY + sin((p.x - padX) * k - phase) * waveAmp;
    // Correct perpendicular distance by slope so steep sections keep uniform thickness
    float dyDx = cos((p.x - padX) * k - phase) * waveAmp * k;
    float dist = abs(p.y - waveY) / sqrt(1.0 + dyDx * dyDx);

    // Clip ends cleanly
    float endClip = smoothstep(padX - 1.5, padX + 0.5, p.x) * (1.0 - smoothstep(playX - 0.5, playX + 1.5, p.x));
    float strokeHalf = 1.65 + 0.45 * scrubbing;

    // Soft accent glow around wave
    float glow = exp(-max(dist - strokeHalf, 0.0) / (4.5 + 2.5 * scrubbing)) * (0.30 + 0.22 * scrubbing) * endClip;
    if (glow > 0.001) {
      col = accent * glow + col * (1.0 - glow);
      alpha = glow + alpha * (1.0 - glow);
    }

    float wMask = (1.0 - smoothstep(-0.45, 0.55, dist - strokeHalf)) * endClip;
    if (wMask > 0.001) {
      col = accent * wMask + col * (1.0 - wMask);
      alpha = wMask + alpha * (1.0 - wMask);
    }
  }

  // 4. Luminous glass thumb at playX
  float thumbR = 5.6 + 2.8 * scrubbing;
  float dThumb = length(p - float2(playX, midY));
  float tGlow = exp(-max(dThumb - thumbR, 0.0) / 7.5) * (0.36 + 0.24 * scrubbing);
  if (tGlow > 0.001) {
    col = accent * tGlow + col * (1.0 - tGlow);
    alpha = tGlow + alpha * (1.0 - tGlow);
  }
  float ringMask = 1.0 - smoothstep(-0.45, 0.55, dThumb - thumbR);
  if (ringMask > 0.001) {
    float innerMask = 1.0 - smoothstep(-0.45, 0.55, dThumb - (thumbR - 2.0));
    float3 tc = mix(accent, float3(1.0), innerMask);
    col = tc * ringMask + col * (1.0 - ringMask);
    alpha = ringMask + alpha * (1.0 - ringMask);
  }

  return half4(clamp(col, 0.0, alpha), clamp(alpha, 0.0, 1.0));
}
`;

type RuntimeEffect = ReturnType<NonNullable<typeof SkiaModule>['Skia']['RuntimeEffect']['Make']>;
let compiledEffect: RuntimeEffect | undefined;

function waveEffect(): RuntimeEffect {
  if (Platform.OS === 'web' || !SkiaModule) return null;
  if (compiledEffect === undefined) {
    try {
      compiledEffect = SkiaModule.Skia.RuntimeEffect.Make(RADIO_WAVE_SHADER);
    } catch {
      compiledEffect = null;
    }
  }
  return compiledEffect;
}

export interface RadioWaveScrubberProps {
  elapsed: number;
  durationSec: number;
  playing: boolean;
  accentColor: string;
  lines: string[];
  lineStarts: number[];
  onSeek: (seconds: number) => void;
  onScrubPreview?: (seconds: number | null) => void;
}

/**
 * 120 FPS Skia "Jonli to'lqin" scrubber for the Radio player.
 * Breathes smoothly in the friend's accent color while playing, flattens serenely when paused,
 * displays spoken-line chapter markers, and pops a floating timestamp + line badge while scrubbing.
 */
export function RadioWaveScrubber({
  elapsed,
  durationSec,
  playing,
  accentColor,
  lines,
  lineStarts,
  onSeek,
  onScrubPreview,
}: RadioWaveScrubberProps) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [scrubSec, setScrubSec] = useState<number | null>(null);

  const widthSV = useSharedValue(0);
  const progressSV = useSharedValue(durationSec > 0 ? Math.min(1, elapsed / durationSec) : 0);
  const scrubbingSV = useSharedValue(0);
  const ampSV = useSharedValue(playing && !reduced ? 1 : 0);
  const phaseSV = useSharedValue(0);
  const lastStepSV = useSharedValue(-1);
  const lastLineSV = useSharedValue(-1);

  const rgb = useMemo(() => hexToRgb01(accentColor), [accentColor]);

  // Compute up to 4 normalized interior chapter boundary positions (skip index 0 at 0.0).
  const markerPack = useMemo(() => {
    const interior = lineStarts
      .slice(1, 5)
      .map((s) => (durationSec > 0 ? Math.max(0.02, Math.min(0.98, s / durationSec)) : 0));
    return {
      vec: [interior[0] ?? 0, interior[1] ?? 0, interior[2] ?? 0, interior[3] ?? 0] as [number, number, number, number],
      count: interior.length,
    };
  }, [lineStarts, durationSec]);

  useEffect(() => {
    if (scrubSec !== null) return;
    const p = durationSec > 0 ? Math.max(0, Math.min(1, elapsed / durationSec)) : 0;
    progressSV.value = reduced ? p : withTiming(p, { duration: 240, easing: Easing.out(Easing.quad) });
  }, [elapsed, durationSec, scrubSec, reduced, progressSV]);

  useEffect(() => {
    const active = (playing || scrubSec !== null) && !reduced;
    ampSV.value = withTiming(active ? 1 : 0, { duration: 280, easing: Easing.out(Easing.cubic) });
    if (active) {
      phaseSV.value = withRepeat(
        withTiming(phaseSV.value + Math.PI * 2, { duration: 1500, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      cancelAnimation(phaseSV);
    }
    return () => cancelAnimation(phaseSV);
  }, [playing, scrubSec, reduced, ampSV, phaseSV]);

  const onSeekRef = useRef(onSeek);
  const onPreviewRef = useRef(onScrubPreview);
  useEffect(() => {
    onSeekRef.current = onSeek;
    onPreviewRef.current = onScrubPreview;
  }, [onSeek, onScrubPreview]);

  const handleScrubUpdate = useCallback(
    (norm: number) => {
      const sec = Math.max(0, Math.min(durationSec, norm * durationSec));
      setScrubSec(sec);
      onPreviewRef.current?.(sec);

      const lineIdx = lineAt(lines, sec);
      if (lineIdx !== lastLineSV.value) {
        lastLineSV.value = lineIdx;
        haptic.selection();
        sharedScrubberSound().settle();
      } else {
        const step = Math.floor(norm * 24);
        if (step !== lastStepSV.value) {
          lastStepSV.value = step;
          sharedScrubberSound().tick();
        }
      }
    },
    [durationSec, lines, lastLineSV, lastStepSV],
  );

  const handleScrubEnd = useCallback(
    (norm: number) => {
      const sec = Math.max(0, Math.min(durationSec, norm * durationSec));
      setScrubSec(null);
      onPreviewRef.current?.(null);
      onSeekRef.current(sec);
      sharedScrubberSound().settle();
    },
    [durationSec],
  );

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const w = e.nativeEvent.layout.width;
      setWidth(w);
      widthSV.value = w;
    },
    [widthSV],
  );

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .activeOffsetX([-5, 5])
      .onBegin((e) => {
        'worklet';
        const usable = Math.max(1, widthSV.value - PAD_X * 2);
        const norm = Math.max(0, Math.min(1, (e.x - PAD_X) / usable));
        progressSV.value = norm;
        scrubbingSV.value = withSpring(1, { damping: 20, stiffness: 300 });
        scheduleOnRN(handleScrubUpdate, norm);
      })
      .onUpdate((e) => {
        'worklet';
        const usable = Math.max(1, widthSV.value - PAD_X * 2);
        const norm = Math.max(0, Math.min(1, (e.x - PAD_X) / usable));
        progressSV.value = norm;
        scheduleOnRN(handleScrubUpdate, norm);
      })
      .onFinalize(() => {
        'worklet';
        scrubbingSV.value = withTiming(0, { duration: 160 });
        scheduleOnRN(handleScrubEnd, progressSV.value);
      });

    const tap = Gesture.Tap().onEnd((e, ok) => {
      'worklet';
      if (!ok) return;
      const usable = Math.max(1, widthSV.value - PAD_X * 2);
      const norm = Math.max(0, Math.min(1, (e.x - PAD_X) / usable));
      progressSV.value = withTiming(norm, { duration: 160 });
      scheduleOnRN(handleScrubEnd, norm);
    });

    return Gesture.Exclusive(pan, tap);
  }, [widthSV, progressSV, scrubbingSV, handleScrubUpdate, handleScrubEnd]);

  const effect = waveEffect();
  const uniforms = useDerivedValue(() => ({
    res: [Math.max(1, widthSV.value), TRACK_H],
    progress: progressSV.value,
    phase: phaseSV.value,
    amp: ampSV.value,
    scrubbing: scrubbingSV.value,
    accent: rgb,
    markers: markerPack.vec,
    markerCount: markerPack.count,
    padX: PAD_X,
  }));

  const pillStyle = useAnimatedStyle(() => {
    const usable = Math.max(1, widthSV.value - PAD_X * 2);
    const px = PAD_X + progressSV.value * usable;
    const clampedX = Math.max(PILL_W / 2, Math.min(widthSV.value - PILL_W / 2, px));
    return {
      opacity: scrubbingSV.value,
      transform: [{ translateX: clampedX - PILL_W / 2 }, { scale: 0.9 + 0.1 * scrubbingSV.value }],
    };
  });

  const fallbackFillStyle = useAnimatedStyle(() => {
    const usable = Math.max(0, widthSV.value - PAD_X * 2);
    return { width: Math.max(4, progressSV.value * usable) };
  });

  const shownSec = scrubSec ?? elapsed;
  const activeLine = lineAt(lines, shownSec) + 1;

  const handleA11yAction = (e: AccessibilityActionEvent) => {
    const delta = e.nativeEvent.actionName === 'increment' ? 3 : e.nativeEvent.actionName === 'decrement' ? -3 : 0;
    if (!delta) return;
    onSeek(Math.max(0, Math.min(durationSec, elapsed + delta)));
    haptic.selection();
  };

  return (
    <View style={styles.root}>
      {/* Floating glass timestamp + line pill above finger while scrubbing */}
      <Animated.View pointerEvents="none" style={[styles.floatPill, pillStyle]}>
        <InkText variant="caption" color={ink.text} style={styles.tabular} lines={1}>
          {`${duration(Math.floor(shownSec))} · ${activeLine}/${Math.max(1, lines.length)}`}
        </InkText>
      </Animated.View>

      <GestureDetector gesture={gesture}>
        <View
          onLayout={onLayout}
          accessible
          accessibilityRole="adjustable"
          accessibilityValue={{
            min: 0,
            max: Math.max(1, durationSec),
            now: Math.floor(shownSec),
            text: duration(Math.floor(shownSec)),
          }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={handleA11yAction}
          style={styles.track}>
          {SkiaModule && effect && width > 0 ? (
            <SkiaModule.Canvas style={styles.canvas}>
              <SkiaModule.Fill>
                <SkiaModule.Shader source={effect} uniforms={uniforms} />
              </SkiaModule.Fill>
            </SkiaModule.Canvas>
          ) : (
            <View style={styles.fallbackRail}>
              <Animated.View style={[styles.fallbackFill, { backgroundColor: accentColor }, fallbackFillStyle]} />
            </View>
          )}
        </View>
      </GestureDetector>

      <View style={styles.times}>
        <InkText variant="caption" color={immersive.secondaryLabel} style={styles.tabular}>
          {duration(Math.floor(shownSec))}
        </InkText>
        <InkText variant="caption" color={immersive.secondaryLabel} style={styles.tabular}>
          {`-${duration(Math.max(0, Math.ceil(durationSec - shownSec)))}`}
        </InkText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 2,
  },
  floatPill: {
    position: 'absolute',
    top: -30,
    left: 0,
    width: PILL_W,
    height: 26,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.elevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.elevatedRim,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  track: {
    height: TRACK_H,
    justifyContent: 'center',
  },
  canvas: {
    width: '100%',
    height: TRACK_H,
  },
  fallbackRail: {
    marginHorizontal: PAD_X,
    height: 5,
    borderRadius: inkRadius.pill,
    backgroundColor: immersive.fill,
    overflow: 'hidden',
  },
  fallbackFill: {
    height: '100%',
    borderRadius: inkRadius.pill,
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: PAD_X,
    marginTop: -4,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});
