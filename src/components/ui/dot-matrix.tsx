import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useDerivedValue, useFrameCallback, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

/**
 * The LED dot matrix of the dark prototype (owner's brief, 2026-11-11): a round field of dots that
 * swell in a slow wave from the middle, each lit dot with a soft bloom. One runtime shader draws
 * the whole field, so it costs one draw per frame on the Galaxy A51 instead of a view per dot.
 * `energy` 0..1 sets how far the wave swells (0.3 at rest, 1 while a voice plays); it eases, never
 * jumps. The clock runs only while the screen is focused and `active`; under Reduce Motion the
 * field holds one still frame.
 */
const SOURCE = Skia.RuntimeEffect.Make(`
uniform float2 res;
uniform float t;
uniform float3 col;
uniform float energy;
uniform float cells;

half4 main(float2 p) {
  float cell = res.x / cells;
  float2 g = floor(p / cell);
  float2 c = (g + 0.5) * cell;
  float2 uv = (c / res) * 2.0 - 1.0;
  float d = length(uv);
  if (d > 1.04) { return half4(0.0); }
  float wave = 0.5 + 0.5 * sin(d * 7.0 - t * 2.1);
  float amp = mix(0.3, 1.0, energy);
  float r = cell * 0.5 * (0.26 + 0.6 * wave * amp) * (1.0 - 0.5 * d);
  float dist = length(p - c);
  float core = smoothstep(r, r - 1.2, dist);
  float bloom = exp(-pow(dist / (r * 2.0 + 0.001), 2.0)) * 0.4 * wave * amp;
  float edge = 1.0 - smoothstep(0.82, 1.04, d);
  float a = clamp(core + bloom, 0.0, 1.0) * edge;
  float lit = 0.35 + 0.65 * wave;
  return half4(col * lit * a, a);
}
`);

/** "#RRGGBB" to 0..1 channels for the shader. */
function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function DotMatrix({
  size,
  color,
  energy = 0.3,
  active = true,
  cells = 15,
  style,
}: {
  size: number;
  /** One hex colour: the friend's or the feature's. */
  color: string;
  energy?: number;
  /** False holds the wave where it is (a paused clip). */
  active?: boolean;
  /** Dots across. */
  cells?: number;
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
  const uniforms = useDerivedValue(() => ({ res: [size, size], t: clock.value, col, energy: level.value, cells }), [size, cells, col[0], col[1], col[2]]);

  if (!SOURCE) return <View style={[{ width: size, height: size }, style]} />;
  return (
    <View style={[{ width: size, height: size }, style]} pointerEvents="none" accessible={false}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Fill>
          <Shader source={SOURCE} uniforms={uniforms} />
        </Fill>
      </Canvas>
    </View>
  );
}
