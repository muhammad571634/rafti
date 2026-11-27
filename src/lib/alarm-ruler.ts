/**
 * Pure math & sky atmosphere mapping for the 24-hour tactile Alarm Sky Ruler.
 * 288 selectable steps across the full day at 5-minute precision (`00:00` .. `23:55`).
 */

export const ALARM_STEP_MIN = 5;
export const MINUTES_IN_DAY = 24 * 60;
export const MAX_RULER_MIN = MINUTES_IN_DAY - ALARM_STEP_MIN; // 1435 (23:55)
export const ALARM_STEP_COUNT = MINUTES_IN_DAY / ALARM_STEP_MIN; // 288

/** Common morning wake-up presets (in minutes from midnight): 06:30, 07:00, 07:30, 08:00, 09:00. */
export const ALARM_QUICK_PRESETS = [390, 420, 450, 480, 540] as const;

/** Bottom scale landmarks across the 24-hour ruler: 00:00, 06:00, 12:00, 18:00, 23:55. */
export const ALARM_RULER_ANCHORS = [0, 360, 720, 1080, MAX_RULER_MIN] as const;

export type SkyPhase = 'night' | 'dawn' | 'day' | 'evening';

/** Wraps any minute offset cleanly into `[0, 1439]`. */
export function wrapMinutes(totalMinutes: number): number {
  'worklet';
  const m = Math.round(totalMinutes) % MINUTES_IN_DAY;
  return m < 0 ? m + MINUTES_IN_DAY : m;
}

/** Splits total minutes (`0..1439`) into `{ hour, minute }`. */
export function splitMinutes(totalMinutes: number): { hour: number; minute: number } {
  const m = wrapMinutes(totalMinutes);
  return { hour: Math.floor(m / 60), minute: m % 60 };
}

/** Maps minutes (`0..1439`) to normalized ruler position `0..1`. */
export function minutesToNorm(totalMinutes: number): number {
  'worklet';
  const clamped = Math.max(0, Math.min(MAX_RULER_MIN, totalMinutes));
  return clamped / MAX_RULER_MIN;
}

/** Maps normalized ruler position (`0..1`) to snapped 5-minute steps (`0..1435`). */
export function normToSnappedMinutes(norm: number, stepMin: number = ALARM_STEP_MIN): number {
  'worklet';
  const clamped = Math.max(0, Math.min(1, norm));
  const raw = clamped * MAX_RULER_MIN;
  const snapped = Math.round(raw / stepMin) * stepMin;
  return Math.max(0, Math.min(MAX_RULER_MIN, snapped));
}

/** Classifies a clock time into one of four living sky periods. */
export function skyPhaseForMinutes(totalMinutes: number): SkyPhase {
  const m = wrapMinutes(totalMinutes);
  if (m >= 300 && m < 570) return 'dawn'; // 05:00 – 09:29
  if (m >= 570 && m < 1050) return 'day'; // 09:30 – 17:29
  if (m >= 1050 && m < 1260) return 'evening'; // 17:30 – 20:59
  return 'night'; // 21:00 – 04:59
}
