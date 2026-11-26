/**
 * The mood check-in's model: seven bands from heavy to wonderful, the colour of a feeling and the
 * outline of the shape that morphs with it.
 *
 * The shape and colour maths are ported from Scrubbers' `MoodFace` / `MoodShape`
 * (https://github.com/haplollc/Scrubbers, MIT, (c) 2026 Haplo LLC), itself after Apple's State of
 * Mind logging in Health: 11 sharp spikes at the heavy end, a circle in the middle, 7 round petals
 * at the wonderful end. Everything here is plain arithmetic marked `'worklet'`, so the slider runs
 * it on the UI thread every frame and the tests run it in Node.
 */

/** How many bands the slider has; the store keeps the chosen band as 0..MOOD_BANDS-1. */
export const MOOD_BANDS = 7;

/** The bands' locale keys (`mood.band.<key>`), heavy to wonderful. */
export const MOOD_KEYS = ['heavy', 'low', 'bitLow', 'okay', 'good', 'great', 'wonderful'] as const;
export type MoodKey = (typeof MOOD_KEYS)[number];

/** Heavy to wonderful as Apple's Health colours them (sRGB 0..1), one stop per band. */
export const MOOD_PALETTE: readonly (readonly [number, number, number])[] = [
  [0.36, 0.2, 0.8],
  [0.46, 0.33, 0.96],
  [0.3, 0.5, 1],
  [0.24, 0.72, 0.98],
  [0.34, 0.8, 0.62],
  [1, 0.76, 0.24],
  [1, 0.53, 0.12],
];

/** The track's gradient: every band's stop, heavy to wonderful. */
export const MOOD_GRADIENT = MOOD_PALETTE.map(([r, g, b]) => `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`) as unknown as readonly [string, string, ...string[]];

const clamp01 = (x: number) => {
  'worklet';
  return x < 0 ? 0 : x > 1 ? 1 : x;
};

/** Which band a position along the slider (0..1) falls in. */
export function moodBand(fraction: number): number {
  'worklet';
  return Math.min(Math.floor(clamp01(fraction) * MOOD_BANDS), MOOD_BANDS - 1);
}

/** The middle of a band along the slider: where the thumb settles when the finger lifts. */
export function bandCentre(band: number): number {
  'worklet';
  const b = Math.min(Math.max(Math.round(band), 0), MOOD_BANDS - 1);
  return (b + 0.5) / MOOD_BANDS;
}

/** The feeling's colour at a position, blended between the palette's stops, as `rgba(...)`. */
export function moodColor(fraction: number, alpha = 1): string {
  'worklet';
  const f = clamp01(fraction) * (MOOD_PALETTE.length - 1);
  const i = Math.min(Math.floor(f), MOOD_PALETTE.length - 2);
  const t = f - i;
  const a = MOOD_PALETTE[i];
  const b = MOOD_PALETTE[i + 1];
  const ch = (k: number) => Math.round((a[k] + (b[k] - a[k]) * t) * 255);
  return `rgba(${ch(0)},${ch(1)},${ch(2)},${alpha})`;
}

/** A band's own colour (its middle), for the chat card and the Today row. */
export const bandColor = (band: number, alpha = 1) => moodColor(bandCentre(band), alpha);

/**
 * The outline's radius at angle `phi` as a share of the full radius. Below the middle, narrow
 * peaks rise over a smaller body; above it, broad lobes are parted by narrow notches.
 */
export function moodRadius(phi: number, mood: number): number {
  'worklet';
  const m = clamp01(mood);
  if (m < 0.5) {
    const t = Math.pow(1 - m * 2, 1.2);
    const peaks = Math.pow(Math.abs(Math.cos((11 * phi) / 2)), 5);
    return 1 - 0.46 * t + 0.46 * t * peaks;
  }
  const t = Math.pow(m * 2 - 1, 1.1);
  const lobes = Math.pow(Math.abs(Math.cos((7 * phi) / 2)), 0.55);
  return 1 - 0.3 * t * (1 - lobes);
}

/** Points sampled round the outline: enough for smooth petals and sharp spikes on a phone. */
export const MOOD_SAMPLES = 144;

/**
 * The outline as an SVG path string centred in a `size` box, turned by `spin` radians. Skia's
 * `Skia.Path.MakeFromSVGString` reads it on the UI thread; the chat card draws it once.
 */
export function moodPath(size: number, mood: number, spin: number, samples = MOOD_SAMPLES): string {
  'worklet';
  const c = size / 2;
  let d = '';
  for (let i = 0; i < samples; i++) {
    const phi = (i / samples) * Math.PI * 2;
    const r = c * moodRadius(phi + spin, mood);
    const x = c + r * Math.cos(phi);
    const y = c + r * Math.sin(phi);
    d += `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return `${d}Z`;
}

/** Whether a stored band is one the app knows (an old or hand-edited save could hold anything). */
export const isMoodBand = (band: unknown): band is number => typeof band === 'number' && Number.isInteger(band) && band >= 0 && band < MOOD_BANDS;

/** Heavy, middle or good: how the friend's stock answer reads when the model is off. */
export const moodTone = (band: number): 'low' | 'mid' | 'high' => (band <= 2 ? 'low' : band === 3 ? 'mid' : 'high');
