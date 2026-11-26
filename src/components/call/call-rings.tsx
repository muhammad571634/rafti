import { useEffect, useMemo, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { auraCompanionRgb, CALL_AURA_SCALE, parseHexRgb } from '@/lib/call-aura';
import { skiaReady } from '@/lib/skia-ready';
import { inkCallAura } from '@/theme/ink';

// Guard Skia behind `skiaReady` so web static export and older binaries never crash on import.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SkiaModule = skiaReady ? (require('@shopify/react-native-skia') as typeof import('@shopify/react-native-skia')) : null;

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/**
 * Single-pass O(1) GPU fragment shader for the Live Voice Call "Suyuqli Aurora" (Liquid Ribbon).
 * Renders three overlapping polar silk ribbons + radial ambient bloom + user-speaking inward
 * listening rim + rotating pearl-aurora thinking comet directly from UI-thread loudness values.
 */
const LIQUID_AURORA_SHADER = `
uniform float2 res;
uniform float avatarR;
uniform float time;
uniform float their;
uniform float mine;
uniform float thinking;
uniform float3 accentA;
uniform float3 accentB;

half4 main(float2 p) {
  float2 c = res * 0.5;
  float2 d = p - c;
  float r = length(d);
  float maxR = min(res.x, res.y) * 0.5;

  // Outside avatar core only, with soft inner blend under the circular avatar edge.
  if (r >= maxR) return half4(0.0);

  float theta = atan(d.y, d.x);
  float dr = r - avatarR;

  // Smooth fade before reaching canvas boundary so no square clipping edge ever appears.
  float outerFade = 1.0 - smoothstep(maxR * 0.72, maxR - 1.5, r);
  float innerClip = smoothstep(avatarR - 5.0, avatarR + 1.5, r);

  float3 col = float3(0.0);
  float alpha = 0.0;

  // 1. Ambient breathing silk halo around the portrait
  float idleBreath = 0.5 + 0.5 * sin(time * 0.85);
  float haloAmp = 0.14 + 0.05 * idleBreath + 0.36 * their + 0.22 * thinking + 0.14 * mine;
  float haloFalloff = 16.0 + 26.0 * their + 14.0 * thinking;
  float haloMask = exp(-max(dr, 0.0) / haloFalloff) * innerClip * outerFade;
  float3 haloTint = mix(accentA, accentB, 0.38 + 0.25 * sin(theta + time * 0.6));
  haloTint = mix(haloTint, float3(0.84, 0.94, 1.0), thinking * 0.42 + mine * 0.35);
  float ha = haloAmp * haloMask;
  col = haloTint * ha;
  alpha = ha;

  // 2. Three overlapping Liquid Aurora Ribbons reacting to voice loudness
  float pullIn = 5.5 * mine;
  float waveAmp = 2.4 + 14.5 * their + 3.8 * thinking;
  float speed = 1.05 + 1.65 * their + 0.75 * thinking;

  // Ribbon 0: primary bright friend-accent silk wave
  float w0 = sin(theta * 3.0 - time * speed * 1.15) * 0.65
           + cos(theta * 5.0 + time * speed * 0.82) * 0.35;
  float r0 = avatarR + 10.0 + 18.0 * their - pullIn + w0 * waveAmp;
  float dist0 = abs(r - r0);
  float core0 = exp(-(dist0 * dist0) / (7.5 + 18.0 * their));
  float silk0 = exp(-dist0 / (9.0 + 14.0 * their));
  float a0 = (core0 * (0.34 + 0.52 * their) + silk0 * (0.14 + 0.24 * their)) * innerClip * outerFade;
  float3 c0 = mix(accentA, float3(1.0, 0.97, 0.95), core0 * (0.35 + 0.30 * their));
  col = c0 * a0 + col * (1.0 - a0);
  alpha = a0 + alpha * (1.0 - a0);

  // Ribbon 1: harmonic companion ribbon drifting in counter-phase
  float w1 = sin(theta * 4.0 + time * speed * 0.92 + 1.4) * 0.62
           + sin(theta * 2.0 - time * speed * 0.65) * 0.38;
  float r1 = avatarR + 17.0 + 27.0 * their - pullIn * 1.2 + w1 * (waveAmp * 1.12);
  float dist1 = abs(r - r1);
  float core1 = exp(-(dist1 * dist1) / (11.0 + 26.0 * their));
  float silk1 = exp(-dist1 / (12.0 + 18.0 * their));
  float a1 = (core1 * (0.24 + 0.42 * their) + silk1 * (0.10 + 0.18 * their)) * innerClip * outerFade;
  float3 c1 = mix(accentB, accentA, 0.35 + 0.35 * sin(theta * 2.0 - time));
  col = c1 * a1 + col * (1.0 - a1);
  alpha = a1 + alpha * (1.0 - a1);

  // Ribbon 2: outer ethereal aurora veil (blossoms when they speak warmly)
  float w2 = cos(theta * 3.0 - time * speed * 0.72 + 2.6) * 0.55
           + sin(theta * 6.0 + time * speed * 0.55) * 0.45;
  float r2 = avatarR + 24.0 + 38.0 * their - pullIn * 1.4 + w2 * (waveAmp * 1.25);
  float dist2 = abs(r - r2);
  float silk2 = exp(-dist2 / (14.0 + 22.0 * their));
  float a2 = silk2 * (0.07 + 0.26 * their + 0.10 * thinking) * innerClip * outerFade;
  float3 c2 = mix(accentB, float3(0.95, 0.96, 1.0), 0.28 + 0.35 * thinking);
  col = c2 * a2 + col * (1.0 - a2);
  alpha = a2 + alpha * (1.0 - a2);

  // 3. User speaking ("mine"): crisp luminous listening rim hug around the portrait
  if (mine > 0.01) {
    float rListen = avatarR + 3.0 + 2.0 * sin(theta * 6.0 + time * 3.2) * mine;
    float dListen = abs(r - rListen);
    float lMask = exp(-(dListen * dListen) / (6.0 + 6.0 * mine)) * outerFade;
    float la = lMask * mine * 0.78;
    float3 lCol = mix(float3(0.84, 0.96, 1.0), float3(1.0), 0.45);
    col = lCol * la + col * (1.0 - la);
    alpha = la + alpha * (1.0 - la);
  }

  // 4. Thinking state: serene rotating pearl-aurora comet sweeping around the circle
  if (thinking > 0.01) {
    float sweep = pow(0.5 + 0.5 * cos(theta - time * 2.45), 5.0);
    float rThink = avatarR + 9.0 + 2.0 * sin(theta * 2.0 + time * 1.8);
    float dThink = abs(r - rThink);
    float tCore = exp(-(dThink * dThink) / 6.5) * (0.20 + 0.80 * sweep);
    float ta = tCore * thinking * 0.85 * outerFade;
    float3 tCol = mix(accentA, float3(1.0, 0.98, 0.96), 0.55 + 0.40 * sweep);
    col = tCol * ta + col * (1.0 - ta);
    alpha = ta + alpha * (1.0 - ta);
  }

  float finalAlpha = clamp(alpha, 0.0, 1.0);
  return half4(clamp(col, 0.0, finalAlpha), finalAlpha);
}
`;

type RuntimeEffect = ReturnType<NonNullable<typeof SkiaModule>['Skia']['RuntimeEffect']['Make']>;
let compiledEffect: RuntimeEffect | undefined;

function auroraEffect(): RuntimeEffect {
  if (Platform.OS === 'web' || !SkiaModule) return null;
  if (compiledEffect === undefined) {
    try {
      compiledEffect = SkiaModule.Skia.RuntimeEffect.Make(LIQUID_AURORA_SHADER);
    } catch {
      compiledEffect = null;
    }
  }
  return compiledEffect;
}

/** Fallback ring expansion ratios when Skia is unavailable (web export / older binary). */
const FALLBACK_RINGS = [
  { grow: 0.2, alpha: 0.46 },
  { grow: 0.36, alpha: 0.28 },
  { grow: 0.54, alpha: 0.16 },
];

/**
 * The avatar on a voice call, alive with the approved "Suyuqli Aurora" (Liquid Ribbon) GPU shader:
 * three overlapping liquid silk ribbons swell in the friend's accent with `their` loudness (0-1),
 * draw softly inward with a luminous listening rim when the user speaks (`mine`), and shift into
 * a serene rotating pearl-aurora comet while an answer is on its way (`thinking`).
 * Levels arrive as UI-thread `SharedValue`s so talking causes zero React re-renders.
 */
export function CallRings({
  size,
  their,
  mine,
  thinking,
  accentColor,
  children,
}: {
  size: number;
  their: SharedValue<number>;
  mine: SharedValue<number>;
  thinking: boolean;
  /** Optional friend-hue colour for the voice-reactive aurora ribbons. */
  accentColor?: string;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const effect = useMemo(() => auroraEffect(), []);
  const useGpu = !!(SkiaModule && effect);

  const clock = useSharedValue(0);
  const thinkVal = useSharedValue(thinking ? 1 : 0);
  const fallbackSpin = useSharedValue(0);

  useEffect(() => {
    thinkVal.set(withTiming(thinking ? 1 : 0, { duration: 280, easing: EASE_OUT }));
  }, [thinking, thinkVal]);

  useEffect(() => {
    if (reduced) {
      cancelAnimation(clock);
      cancelAnimation(fallbackSpin);
      return;
    }
    if (useGpu) {
      clock.set(0);
      clock.set(withRepeat(withTiming(Math.PI * 200, { duration: 400_000, easing: Easing.linear }), -1, false));
      return () => cancelAnimation(clock);
    }
    if (thinking) {
      fallbackSpin.set(0);
      fallbackSpin.set(withRepeat(withTiming(360, { duration: 1100, easing: Easing.linear }), -1, false));
    } else {
      cancelAnimation(fallbackSpin);
    }
    return () => cancelAnimation(fallbackSpin);
  }, [reduced, useGpu, thinking, clock, fallbackSpin]);

  const accentHex = accentColor ?? inkCallAura.fallbackAccent;
  const accentA = useMemo(() => parseHexRgb(accentHex), [accentHex]);
  const accentB = useMemo(() => auraCompanionRgb(accentHex), [accentHex]);

  const canvasSize = Math.round(size * CALL_AURA_SCALE);
  const canvasOffset = -Math.round((canvasSize - size) / 2);

  const uniforms = useDerivedValue(() => ({
    res: [canvasSize, canvasSize] as const,
    avatarR: size * 0.5,
    time: reduced ? 0.6 : clock.value,
    their: their.value,
    mine: mine.value,
    thinking: thinkVal.value,
    accentA,
    accentB,
  }));

  // Gentle organic scale on the portrait itself: subtle breath when they speak, attentive lean when you speak.
  const lean = useAnimatedStyle(() => {
    if (reduced) return { transform: [{ scale: 1 }] };
    const s = 1 + 0.022 * their.value + 0.042 * mine.value;
    return { transform: [{ scale: s }] };
  });
  const rim = useAnimatedStyle(() => ({ opacity: mine.value * 0.85 }));
  const turning = useAnimatedStyle(() => ({
    opacity: thinkVal.value,
    transform: [{ rotate: `${fallbackSpin.value}deg` }],
  }));

  const circle = { width: size, height: size, borderRadius: size / 2 };
  const ringFill = accentColor ?? inkCallAura.ringFallback;
  const haloSize = size + 28;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {useGpu && SkiaModule && effect ? (
        <View
          pointerEvents="none"
          style={[
            styles.canvasWrap,
            {
              width: canvasSize,
              height: canvasSize,
              top: canvasOffset,
              left: canvasOffset,
            },
          ]}>
          <SkiaModule.Canvas style={styles.canvasFill}>
            <SkiaModule.Fill>
              <SkiaModule.Shader source={effect} uniforms={uniforms} />
            </SkiaModule.Fill>
          </SkiaModule.Canvas>
        </View>
      ) : (
        <>
          {accentColor ? (
            <View
              pointerEvents="none"
              style={[
                styles.halo,
                { width: haloSize, height: haloSize, borderRadius: haloSize / 2, borderColor: `${accentColor}55` },
              ]}
            />
          ) : null}
          {FALLBACK_RINGS.map((ring, i) => (
            <FallbackRing
              key={i}
              level={their}
              grow={ring.grow}
              alpha={ring.alpha}
              still={reduced}
              color={ringFill}
              style={circle}
            />
          ))}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.arc,
              { width: size + 18, height: size + 18, borderRadius: (size + 18) / 2 },
              accentColor ? { borderTopColor: accentColor, borderRightColor: `${accentColor}55` } : undefined,
              turning,
            ]}
          />
        </>
      )}

      <Animated.View style={lean}>
        {children}
        <Animated.View pointerEvents="none" style={[styles.rim, circle, rim]} />
      </Animated.View>
    </View>
  );
}

function FallbackRing({
  level,
  grow,
  alpha,
  still,
  color,
  style,
}: {
  level: SharedValue<number>;
  grow: number;
  alpha: number;
  still: boolean;
  color: string;
  style: { width: number; height: number; borderRadius: number };
}) {
  const animated = useAnimatedStyle(() => {
    const l = level.value;
    return { opacity: l * alpha, transform: [{ scale: still ? 1 + grow * 0.4 : 1 + grow * l }] };
  });
  return <Animated.View pointerEvents="none" style={[styles.ring, { backgroundColor: color }, style, animated]} />;
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  canvasWrap: { position: 'absolute' },
  canvasFill: { flex: 1 },
  halo: { position: 'absolute', borderWidth: 1 },
  ring: { position: 'absolute' },
  arc: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: 'transparent',
    borderTopColor: inkCallAura.thinkingHalo,
    borderRightColor: inkCallAura.thinkingTrail,
  },
  rim: { position: 'absolute', top: 0, left: 0, borderWidth: 2.5, borderColor: inkCallAura.listenRim },
});
