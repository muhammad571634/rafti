import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useDerivedValue, useFrameCallback, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

/**
 * The LED dot matrix of the dark prototype (owner's brief, 2026-11-11): a round field of dots that
 * swell in a slow wave from the middle, each lit dot with a soft bloom. One runtime shader draws
 * the whole field, so it costs one draw per frame on the Galaxy A51 instead of a view per dot.
 * `energy` 0..1 sets how far the wave swells (0.3 at rest, 1 while a voice plays); it eases, never
 * jumps. The clock runs only while the screen is focused and `active`; under Reduce Motion the
 * field holds one still frame.
 */
const SHADER = `
uniform float2 res;
uniform float t;
uniform float3 col;
uniform float3 col2;
uniform float energy;
uniform float cells;
uniform float square;

half4 main(float2 p) {
  float cell = res.x / cells;
  float2 g = floor(p / cell);
  float2 c = (g + 0.5) * cell;
  float2 uv = (c / res) * 2.0 - 1.0;
  // Round, or a rounded square (a superellipse) like the Ink canvas's writing wait.
  float d = square > 0.5 ? pow(pow(abs(uv.x), 4.0) + pow(abs(uv.y), 4.0), 0.25) : length(uv);
  if (d > 1.04) { return half4(0.0); }
  float ang = atan(uv.y, uv.x);
  // A slow breath (about 8 s), a ripple running out from the middle, and a soft swirl turning
  // through it: three waves mixed, so the field never repeats the same frame twice in a row.
  float breath = 0.5 + 0.5 * sin(t * 0.75);
  float ripple = 0.5 + 0.5 * sin(d * 8.0 - t * 2.0);
  float swirl = 0.5 + 0.5 * sin(ang * 3.0 + d * 5.0 - t * 0.9);
  float wave = mix(ripple, swirl, 0.35);
  float amp = mix(0.3, 1.0, energy) * (0.72 + 0.28 * breath);
  float r = cell * 0.5 * (0.22 + 0.68 * wave * amp) * (1.0 - 0.45 * d);
  float dist = length(p - c);
  float core = smoothstep(r, r - 1.2, dist);
  float bloom = exp(-pow(dist / (r * 2.0 + 0.001), 2.0)) * 0.42 * wave * amp;
  float edge = 1.0 - smoothstep(0.82, 1.04, d);
  float a = clamp(core + bloom, 0.0, 1.0) * edge;
  // The colour drifts from the first to the second outwards, the boundary turning slowly.
  float3 tint = mix(col, col2, clamp(d * 0.9 + 0.25 * sin(t * 0.4 + ang), 0.0, 1.0));
  float lit = 0.3 + 0.7 * wave;
  return half4(tint * lit * a, a);
}
`;

/**
 * Compiled on first use, never at import: the web export renders every route under Node, where
 * Skia is not loaded and `RuntimeEffect.Make` at module scope threw (the 2026-11-11 OTA failed on it).
 */
let effect: ReturnType<typeof Skia.RuntimeEffect.Make> | undefined;
function dotEffect() {
  if (Platform.OS === 'web') return null;
  if (effect === undefined) {
    try {
      effect = Skia.RuntimeEffect.Make(SHADER);
    } catch {
      effect = null;
    }
  }
  return effect;
}

/** "#RRGGBB" to 0..1 channels for the shader. */
function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function DotMatrix({
  size,
  color,
  color2,
  energy = 0.3,
  active = true,
  cells = 15,
  shape = 'round',
  style,
}: {
  size: number;
  /** One hex colour: the friend's or the feature's. */
  color: string;
  /** The colour the field drifts to towards its edge; the same as `color` when left out. */
  color2?: string;
  energy?: number;
  /** False holds the wave where it is (a paused clip). */
  active?: boolean;
  /** Dots across. */
  cells?: number;
  /** The field's outline. */
  shape?: 'round' | 'square';
  style?: StyleProp<ViewStyle>;
}) {
  const still = useReducedMotion();
  const clock = useSharedValue(1.2);
  const level = useSharedValue(energy);
  useEffect(() => {
    level.value = still ? energy : withTiming(energy, { duration: 600 });
  }, [energy, still, level]);

  const frame = useFrameCallback((info) => {
    clock.value += (info.timeSincePreviousFrame ?? 16) / 1000;
  }, false);
  useFocusEffect(
    useCallback(() => {
      frame.setActive(active && !still);
      return () => frame.setActive(false);
    }, [frame, active, still]),
  );

  const col = rgb(color);
  const col2 = rgb(color2 ?? color);
  const uniforms = useDerivedValue(
    () => ({ res: [size, size], t: clock.value, col, col2, energy: level.value, cells, square: shape === 'square' ? 1 : 0 }),
    [size, cells, shape, col[0], col[1], col[2], col2[0], col2[1], col2[2]],
  );

  const source = dotEffect();
  if (!source) return <View style={[{ width: size, height: size }, style]} />;
  return (
    <View style={[{ width: size, height: size }, style]} pointerEvents="none" accessible={false}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Fill>
          <Shader source={source} uniforms={uniforms} />
        </Fill>
      </Canvas>
    </View>
  );
}
