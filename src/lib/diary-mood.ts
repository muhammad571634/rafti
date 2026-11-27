/**
 * Pure model and morphing geometry for the Heartbeat Diary's "Jonli shakl" mood scrubber.
 *
 * Maps the 5 `DiaryMood` values along a calm-to-bright emotional spectrum
 * (`tired -> blue -> soft -> happy -> excited`) while keeping exact `DiaryMood` storage keys.
 * Polar morphing math (`diaryMoodRadius`) is adapted from Scrubbers' `MoodFace`
 * (https://github.com/haplollc/Scrubbers, MIT, (c) 2026 Haplo LLC).
 */
import type { DiaryMood } from '@/types';

/** Ordered spectrum of the 5 Heartbeat Diary moods, calm/low to bright/high. */
export const DIARY_MOODS: readonly DiaryMood[] = ['tired', 'blue', 'soft', 'happy', 'excited'] as const;

/** Normalized sRGB (0..1) stops for each mood along the spectrum. */
export const DIARY_MOOD_RGB: readonly (readonly [number, number, number])[] = [
  [0.486, 0.51, 0.769], // tired: twilight indigo (#7C82C4)
  [0.357, 0.608, 0.941], // blue: rain blue (#5B9BF0)
  [0.784, 0.616, 0.949], // soft: dusk lavender (#C89DF2)
  [0.949, 0.69, 0.42], // happy: warm peach-amber (#F2B06B)
  [1.0, 0.478, 0.349], // excited: sunlit apricot-coral (#FF7A59)
] as const;

/** Pre-computed hex stops for gradient rails and paper mood seals. */
export const DIARY_MOOD_HEX: readonly string[] = ['#7C82C4', '#5B9BF0', '#C89DF2', '#F2B06B', '#FF7A59'] as const;

/** Gradient tuple matching `LinearGradient`'s `colors` prop. */
export const DIARY_MOOD_GRADIENT = DIARY_MOOD_HEX as unknown as readonly [string, string, ...string[]];

function clamp01(value: number): number {
  'worklet';
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Finds a `DiaryMood`'s spectrum index (defaults to `soft` = 2 if unknown). */
export function diaryMoodIndex(mood: DiaryMood): number {
  const idx = DIARY_MOODS.indexOf(mood);
  return idx >= 0 ? idx : 2;
}

/** Converts a discrete index `0..4` into normalized `0..1` position. */
export function diaryMoodNorm(index: number): number {
  'worklet';
  const max = DIARY_MOODS.length - 1;
  const clamped = Math.max(0, Math.min(max, Math.round(index)));
  return clamped / max;
}

/** Snaps a continuous `0..1` scrub position to its nearest mood index `0..4`. */
export function diaryMoodIndexAt(norm: number): number {
  'worklet';
  return Math.round(clamp01(norm) * (DIARY_MOODS.length - 1));
}

/** Blends the mood RGB color (0..1 channels) continuously along `0..1`. */
export function diaryMoodRgb(norm: number): [number, number, number] {
  'worklet';
  const max = DIARY_MOOD_RGB.length - 1;
  const f = clamp01(norm) * max;
  const i = Math.min(Math.floor(f), max - 1);
  const t = f - i;
  const a = DIARY_MOOD_RGB[i];
  const b = DIARY_MOOD_RGB[i + 1];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Returns an `rgba(r,g,b,a)` string blended along the 5-mood spectrum. */
export function diaryMoodRgba(norm: number, alpha = 1): string {
  'worklet';
  const [r, g, b] = diaryMoodRgb(norm);
  return `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${alpha})`;
}

/**
 * Polar radius `0..1` at angle `phi` for mood position `norm` (`0..1`):
 * low end draws 11 resting spikes, middle (`soft`) forms a calm circle, high end blooms into 7 warm petals.
 */
export function diaryMoodRadius(phi: number, norm: number): number {
  'worklet';
  const m = 0.08 + clamp01(norm) * 0.92;
  if (m < 0.5) {
    const t = Math.pow(1 - m * 2, 1.2);
    const peaks = Math.pow(Math.abs(Math.cos((11 * phi) / 2)), 5);
    return 1 - 0.44 * t + 0.44 * t * peaks;
  }
  const t = Math.pow(m * 2 - 1, 1.1);
  const lobes = Math.pow(Math.abs(Math.cos((7 * phi) / 2)), 0.55);
  return 1 - 0.3 * t * (1 - lobes);
}
