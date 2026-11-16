/**
 * A number that changes in front of the user rolls to its new value instead of jumping (design audit
 * 2026-11-15 §8.2.3, continuity: "numbers count"). Pure parts, so the hook stays a thin clock.
 */

/** How long a roll takes: short steps feel instant, big ones never drag (ms). */
export function rollDuration(from: number, to: number): number {
  const steps = Math.abs(to - from);
  if (steps === 0) return 0;
  return Math.round(Math.min(700, 260 + 90 * Math.log10(steps + 1) * 2));
}

/** The value shown at progress `k` (0..1): a strong ease-out, so it lands softly on the new number. */
export function rollAt(from: number, to: number, k: number): number {
  const t = Math.max(0, Math.min(1, k));
  return Math.round(from + (to - from) * (1 - Math.pow(1 - t, 4)));
}
