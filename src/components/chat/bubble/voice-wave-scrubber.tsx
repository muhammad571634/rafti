import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LayoutChangeEvent, Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Txt } from '@/components/ui';
import { duration as fmtDuration } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { sharedScrubberSound } from '@/lib/scrubber-sound';
import { skiaReady } from '@/lib/skia-ready';
import { voiceSecondAt } from '@/lib/voice-wave';
import { ink, inkPeachGlass, inkRadius } from '@/theme/ink';

// Guard Skia import behind `skiaReady` so web export and older binaries never crash at import.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SkiaModule = skiaReady ? (require('@shopify/react-native-skia') as typeof import('@shopify/react-native-skia')) : null;

const WAVE_HEIGHT = 36;
const WAVE_INSET = 4;
const LIFT_SPRING = { damping: 20, stiffness: 300, mass: 0.65 };

/**
 * Single-pass O(1) GPU SkSL shader for chat voice message "To'lqinli" (Wave Swell) scrubbing.
 * Packs up to 32 waveform bar heights into 8 float4 uniforms (`b0..b7`) with a branch-tree lookup
 * (zero loops, zero dynamic array indexing — 100% compatible with Metal, Vulkan, and GLES).
 * Renders sub-pixel played sweep, Gaussian bell-curve swelling under the user's thumb, gentle live
 * playback breathing near the playhead, soft radial aura, and luminous scrub needle in one draw call.
 */
const VOICE_WAVE_SHADER = `
uniform float2 res;
uniform float progress;
uniform float lifted;
uniform float playing;
uniform float phase;
uniform float count;
uniform float mine;
uniform float4 b0;
uniform float4 b1;
uniform float4 b2;
uniform float4 b3;
uniform float4 b4;
uniform float4 b5;
uniform float4 b6;
uniform float4 b7;

float pick4(float4 v, float k) {
  if (k < 0.5) return v.x;
  if (k < 1.5) return v.y;
  if (k < 2.5) return v.z;
  return v.w;
}

float barLevel(float idx) {
  if (idx < 16.0) {
    if (idx < 8.0) {
      if (idx < 4.0) return pick4(b0, idx);
      return pick4(b1, idx - 4.0);
    }
    if (idx < 12.0) return pick4(b2, idx - 8.0);
    return pick4(b3, idx - 12.0);
  }
  if (idx < 24.0) {
    if (idx < 20.0) return pick4(b4, idx - 16.0);
    return pick4(b5, idx - 20.0);
  }
  if (idx < 28.0) return pick4(b6, idx - 24.0);
  return pick4(b7, idx - 28.0);
}

float sdCapsuleY(float2 p, float2 c, float halfH, float r) {
  float dy = abs(p.y - c.y) - max(0.0, halfH - r);
  float2 q = float2(abs(p.x - c.x), max(dy, 0.0));
  return length(q) - r;
}

half4 main(float2 p) {
  float w = max(res.x, 1.0);
  float h = max(res.y, 1.0);
  float inset = 4.0;
  float tw = max(w - inset * 2.0, 1.0);
  float n = max(count, 1.0);
  float ix = inset + clamp(progress, 0.0, 1.0) * tw;
  float midY = h * 0.5;
  float sigma = max(tw * 0.145, 1.0);

  // Theme colours: mine = espresso (#2B1305) on peach; theirs = cream/peach (#FFF3EA / #EBAD84) on night.
  float3 espresso = float3(0.169, 0.075, 0.020);
  float3 cream    = float3(1.000, 0.953, 0.918);
  float3 peach    = float3(0.922, 0.678, 0.518);
  float3 mist     = float3(0.922, 0.922, 0.961);

  float3 col = float3(0.0);
  float alpha = 0.0;

  // 1. Soft radial aura behind thumb when scrubbing
  if (lifted > 0.01) {
    float2 ap = (p - float2(ix, midY)) / float2(sigma * 1.1, h * 0.55);
    float ad = length(ap);
    float ga = clamp(exp(-ad * ad * 2.4) * (mine > 0.5 ? 0.16 : 0.24) * lifted, 0.0, 0.35);
    float3 ac = mine > 0.5 ? espresso : peach;
    col = ac * ga;
    alpha = ga;
  }

  // 2. O(1) nearest waveform bar with Gaussian bell-curve swell + sub-pixel played split
  float stepX = tw / n;
  float barIdx = clamp(floor((p.x - inset) / stepX), 0.0, n - 1.0);
  float cx = inset + (barIdx + 0.5) * stepX;
  float barW = clamp(stepX * 0.56, 2.2, 3.2);
  float barR = barW * 0.5;

  float lvl = barLevel(barIdx);
  float distNeedle = abs(cx - ix);
  float z = distNeedle / sigma;
  float bell = exp(-0.5 * z * z);

  float liveBounce = 1.0 + 0.14 * playing * bell * sin(phase * 7.0 + barIdx * 0.7);
  float swellBoost = 1.0 + 0.52 * lifted * bell;
  float baseH = 4.0 + lvl * 18.0;
  float bh = min(h - 4.0, baseH * liveBounce * swellBoost);
  float dBar = sdCapsuleY(p, float2(cx, midY), bh * 0.5, barR);
  float barMask = 1.0 - smoothstep(-0.45, 0.55, dBar);

  if (barMask > 0.001) {
    // Sub-pixel smooth transition right across the exact playhead x coordinate
    float playedMix = smoothstep(ix + 0.6, ix - 0.6, p.x);
    float activePlay = max(playing, max(lifted, step(0.002, progress)));
    float playedAmt = playedMix * activePlay;

    float unplayedA = (mine > 0.5 ? 0.30 : 0.28) + 0.24 * bell * lifted;
    float3 unplayedC = mine > 0.5 ? espresso : mist;
    float3 playedC = mine > 0.5 ? espresso : mix(cream, peach, clamp(lifted * 1.4, 0.0, 1.0));

    float3 bc = mix(unplayedC, playedC, playedAmt);
    float ba = mix(unplayedA, 1.0, playedAmt) * barMask;
    col = bc * ba + col * (1.0 - ba);
    alpha = ba + alpha * (1.0 - ba);
  }

  // 3. Luminous scrub needle when dragging
  if (lifted > 0.02) {
    float nh = (24.0 + 7.0 * lifted) * 0.5;
    float nr = 1.25;
    float dNeedle = sdCapsuleY(p, float2(ix, midY), nh, nr);
    float glow = clamp(exp(-max(dNeedle, 0.0) / 6.0) * (mine > 0.5 ? 0.22 : 0.36) * lifted, 0.0, 0.42);
    float3 nc = mine > 0.5 ? espresso : peach;
    col = nc * glow + col * (1.0 - glow);
    alpha = glow + alpha * (1.0 - glow);

    float nMask = (1.0 - smoothstep(-0.45, 0.55, dNeedle)) * lifted;
    if (nMask > 0.001) {
      col = nc * nMask + col * (1.0 - nMask);
      alpha = nMask + alpha * (1.0 - nMask);
    }
  }

  return half4(clamp(col, 0.0, alpha), clamp(alpha, 0.0, 1.0));
}
`;

type RuntimeEffect = ReturnType<NonNullable<typeof SkiaModule>['Skia']['RuntimeEffect']['Make']>;
let compiledWave: RuntimeEffect | undefined;

function waveEffect(): RuntimeEffect {
  if (Platform.OS === 'web' || !SkiaModule) return null;
  if (compiledWave === undefined) {
    try {
      compiledWave = SkiaModule.Skia.RuntimeEffect.Make(VOICE_WAVE_SHADER);
    } catch {
      compiledWave = null;
    }
  }
  return compiledWave;
}

function packBars(bars: readonly number[]) {
  const padded = new Array<number>(32).fill(0.2);
  const n = Math.min(32, bars.length);
  for (let i = 0; i < n; i++) padded[i] = Math.max(0.08, Math.min(1, bars[i]));
  return {
    b0: [padded[0], padded[1], padded[2], padded[3]],
    b1: [padded[4], padded[5], padded[6], padded[7]],
    b2: [padded[8], padded[9], padded[10], padded[11]],
    b3: [padded[12], padded[13], padded[14], padded[15]],
    b4: [padded[16], padded[17], padded[18], padded[19]],
    b5: [padded[20], padded[21], padded[22], padded[23]],
    b6: [padded[24], padded[25], padded[26], padded[27]],
    b7: [padded[28], padded[29], padded[30], padded[31]],
  };
}

export interface VoiceWaveScrubberProps {
  bars: readonly number[];
  durationSec: number;
  progress: number;
  playing: boolean;
  playable: boolean;
  mine: boolean;
  inkColor: string;
  faintColor: string;
  onScrubStart: () => void;
  onScrubMove: (fraction: number) => void;
  onScrubEnd: (fraction: number) => void;
}

/**
 * Tactile 120 FPS Skia waveform scrubber for chat voice messages:
 * sub-pixel smooth playback sweep, Gaussian bell-curve swelling under the user's thumb,
 * floating glass timestamp badge above the finger, and synchronized tactile tick/settle sound.
 */
export function VoiceWaveScrubber({
  bars,
  durationSec,
  progress,
  playing,
  playable,
  mine,
  inkColor,
  faintColor,
  onScrubStart,
  onScrubMove,
  onScrubEnd,
}: VoiceWaveScrubberProps) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [scrubSec, setScrubSec] = useState(0);

  const widthSv = useSharedValue(0);
  const progSv = useSharedValue(progress);
  const liftedSv = useSharedValue(0);
  const playingSv = useSharedValue(playing ? 1 : 0);
  const phaseSv = useSharedValue(0);
  const draggingSv = useSharedValue(0);
  const lastSecSv = useSharedValue(-1);

  const callbacksRef = useRef({ onScrubStart, onScrubMove, onScrubEnd, durationSec });
  callbacksRef.current = { onScrubStart, onScrubMove, onScrubEnd, durationSec };

  useEffect(() => {
    playingSv.value = playing ? 1 : 0;
  }, [playing, playingSv]);

  useEffect(() => {
    if (draggingSv.value === 1) return;
    progSv.value = reduced || !playing ? progress : withTiming(progress, { duration: 55 });
  }, [progress, playing, reduced, progSv, draggingSv]);

  useFrameCallback((info) => {
    if (playingSv.value > 0.5 && !reduced) {
      phaseSv.value += (info.timeSincePreviousFrame ?? 16) / 1000;
    }
  }, playing && !reduced);

  const handleBeginJS = useCallback((frac: number) => {
    const sec = voiceSecondAt(frac, callbacksRef.current.durationSec);
    setScrubSec(sec);
    callbacksRef.current.onScrubStart();
    callbacksRef.current.onScrubMove(frac);
  }, []);

  const handleSecondTickJS = useCallback((frac: number, sec: number) => {
    setScrubSec(sec);
    haptic.selection();
    sharedScrubberSound().tick();
    callbacksRef.current.onScrubMove(frac);
  }, []);

  const handleEndJS = useCallback((frac: number) => {
    sharedScrubberSound().settle();
    callbacksRef.current.onScrubEnd(frac);
  }, []);

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const w = Math.round(e.nativeEvent.layout.width);
      if (w > 0 && w !== width) {
        setWidth(w);
        widthSv.value = w;
      }
    },
    [width, widthSv],
  );

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .enabled(playable)
      .activeOffsetX([-5, 5])
      .failOffsetY([-14, 14])
      .onStart((e) => {
        'worklet';
        const usable = widthSv.value - WAVE_INSET * 2;
        if (usable <= 0) return;
        draggingSv.value = 1;
        liftedSv.value = reduced ? 1 : withSpring(1, LIFT_SPRING);
        const frac = Math.max(0, Math.min(1, (e.x - WAVE_INSET) / usable));
        progSv.value = frac;
        const sec = durationSec > 0 ? Math.round(frac * durationSec) : 0;
        lastSecSv.value = sec;
        scheduleOnRN(handleBeginJS, frac);
      })
      .onUpdate((e) => {
        'worklet';
        const usable = widthSv.value - WAVE_INSET * 2;
        if (usable <= 0) return;
        const frac = Math.max(0, Math.min(1, (e.x - WAVE_INSET) / usable));
        progSv.value = frac;
        const sec = durationSec > 0 ? Math.round(frac * durationSec) : 0;
        if (sec !== lastSecSv.value) {
          lastSecSv.value = sec;
          scheduleOnRN(handleSecondTickJS, frac, sec);
        }
      })
      .onFinalize(() => {
        'worklet';
        if (draggingSv.value !== 1) return;
        draggingSv.value = 0;
        liftedSv.value = reduced ? 0 : withSpring(0, LIFT_SPRING);
        const target = Math.min(0.98, progSv.value);
        scheduleOnRN(handleEndJS, target);
      });

    return pan;
  }, [playable, widthSv, draggingSv, liftedSv, progSv, lastSecSv, durationSec, reduced, handleBeginJS, handleSecondTickJS, handleEndJS]);

  const packed = useMemo(() => packBars(bars), [bars]);
  const barCount = Math.min(32, bars.length);

  const uniforms = useDerivedValue(
    () => ({
      res: [Math.max(1, widthSv.value), WAVE_HEIGHT],
      progress: progSv.value,
      lifted: liftedSv.value,
      playing: playingSv.value,
      phase: phaseSv.value,
      count: barCount,
      mine: mine ? 1 : 0,
      b0: packed.b0,
      b1: packed.b1,
      b2: packed.b2,
      b3: packed.b3,
      b4: packed.b4,
      b5: packed.b5,
      b6: packed.b6,
      b7: packed.b7,
    }),
    [barCount, mine, packed],
  );

  const tipStyle = useAnimatedStyle(() => {
    const usable = Math.max(0, widthSv.value - WAVE_INSET * 2);
    const cx = WAVE_INSET + progSv.value * usable;
    const clampedX = Math.max(22, Math.min(Math.max(22, widthSv.value - 22), cx));
    return {
      opacity: liftedSv.value,
      transform: [
        { translateX: clampedX - 24 },
        { translateY: (1 - liftedSv.value) * 6 },
        { scale: 0.86 + 0.14 * liftedSv.value },
      ],
    };
  });

  const effect = waveEffect();
  const Canvas = SkiaModule?.Canvas;
  const Fill = SkiaModule?.Fill;
  const Shader = SkiaModule?.Shader;

  const content = (
    <View style={styles.wrap} onLayout={handleLayout}>
      {playable ? (
        <Animated.View pointerEvents="none" style={[styles.tip, tipStyle]}>
          <Txt style={styles.tipText} lines={1}>
            {fmtDuration(scrubSec)}
          </Txt>
        </Animated.View>
      ) : null}

      {width > 0 && effect && Canvas && Fill && Shader ? (
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          <Fill>
            <Shader source={effect} uniforms={uniforms} />
          </Fill>
        </Canvas>
      ) : (
        <View style={styles.fallback} pointerEvents="none">
          {bars.map((v, i) => {
            const active = (playing || progress > 0) && i / bars.length < progress;
            return (
              <View
                key={i}
                style={[
                  styles.fallbackBar,
                  {
                    height: 3 + v * 18,
                    backgroundColor: active ? inkColor : faintColor,
                    opacity: active ? 1 : 0.42,
                  },
                ]}
              />
            );
          })}
        </View>
      )}
    </View>
  );

  return playable ? <GestureDetector gesture={gesture}>{content}</GestureDetector> : content;
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    height: WAVE_HEIGHT,
    minWidth: 96,
    justifyContent: 'center',
  },
  tip: {
    position: 'absolute',
    top: -32,
    left: 0,
    width: 48,
    height: 24,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.elevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: inkPeachGlass.rim,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  tipText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: inkPeachGlass.textBright,
  },
  fallback: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
    paddingHorizontal: WAVE_INSET,
  },
  fallbackBar: {
    width: 2.5,
    borderRadius: 1.5,
  },
});
