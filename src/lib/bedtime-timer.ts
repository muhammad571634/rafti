/**
 * Pure math and time helpers for the Bedtime ruler scrubber.
 * Kept React-Native-free so unit tests and UI worklets share identical bounds and snapping rules.
 */

/** Sleep timer detents along the Bedtime ruler, in minutes. */
export const BEDTIME_TIMERS = [5, 10, 15, 20, 30, 45, 60, 90, 120] as const;

/** Quiet numeric anchors shown beneath the ruler track (must all exist in `BEDTIME_TIMERS`). */
export const BEDTIME_SCALE_ANCHORS = [5, 15, 30, 60, 120] as const;

/** Default timer selection index (20 min). */
export const BEDTIME_DEFAULT_STEP = BEDTIME_TIMERS.indexOf(20);

/** Clamps `value` into `[min, max]`. */
export function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/** Converts a discrete step index `0..count-1` to a normalized `0..1` track position. */
export function stepIndexToNorm(index: number, count: number): number {
  if (count <= 1) return 0;
  const clamped = Math.max(0, Math.min(count - 1, Math.round(index)));
  return clamped / (count - 1);
}

/** Snaps a continuous normalized `0..1` track position to its nearest discrete step index. */
export function normToStepIndex(norm: number, count: number): number {
  if (count <= 1) return 0;
  return Math.round(clampUnit(norm) * (count - 1));
}

/** Converts a local horizontal pointer coordinate inside a track (with side insets) into `0..1`. */
export function xToNorm(x: number, trackWidth: number, inset: number): number {
  const usable = trackWidth - inset * 2;
  if (usable <= 0) return 0;
  return clampUnit((x - inset) / usable);
}

/** Clock hour and minute when a sleep timer of `minutes` finishes starting from `now`. */
export function endsAtParts(now: Date, minutes: number): { hour: number; minute: number } {
  const end = new Date(now.getTime() + Math.max(0, minutes) * 60_000);
  return { hour: end.getHours(), minute: end.getMinutes() };
}

/**
 * Breathing energy for Bedtime's `DotMatrix` halo while configuring the timer:
 * gently deepens with longer sleep durations and blooms slightly while scrubbing.
 */
export function bedtimeHaloEnergy(stepIndex: number, count: number, scrubbing: boolean): number {
  const share = stepIndexToNorm(stepIndex, count);
  return scrubbing ? 0.62 + 0.2 * share : 0.42 + 0.14 * share;
}
