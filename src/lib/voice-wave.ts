/** How many bars a voice note keeps of its loudness (one number each, 0-1). */
export const WAVE_BARS = 32;
/** The meter's quiet end: anything at or below reads as silence. */
const FLOOR_DB = -60;
/** The lowest bar drawn, so a pause still shows a dot of a line. */
const MIN_BAR = 0.08;

/**
 * The recorder's meter readings (dBFS, about five a second) as `count` bars from 0 to 1: each bar is
 * the loudest reading in its stretch, scaled from -60 dB to the clip's own peak, so a quiet speaker's
 * note still has a shape. Two decimals, so a note keeps ~130 bytes of it.
 */
export function waveFromMeter(readings: readonly number[], count = WAVE_BARS): number[] {
  const db = readings.filter((v) => Number.isFinite(v));
  if (!db.length) return [];
  const peak = Math.max(...db);
  const span = Math.max(peak - FLOOR_DB, 12);
  const level = (v: number) => Math.min(1, Math.max(MIN_BAR, (v - FLOOR_DB) / span));
  return resampleWave(db.map(level), count).map((v) => Math.round(v * 100) / 100);
}

/** The bars at another count: the loudest of each stretch going down, the nearest going up. */
export function resampleWave(levels: readonly number[], count: number): number[] {
  if (!levels.length || count <= 0) return [];
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const from = Math.floor((i * levels.length) / count);
    const to = Math.max(from + 1, Math.floor(((i + 1) * levels.length) / count));
    let top = 0;
    for (let k = from; k < to && k < levels.length; k++) top = Math.max(top, levels[k]);
    out.push(top);
  }
  return out;
}

/** How many bars a note shows: longer notes are wider, as in Telegram, within the bubble's room. */
export function barsFor(seconds: number): number {
  return Math.max(14, Math.min(WAVE_BARS, 12 + Math.round(seconds)));
}
