/**
 * Pure animation & fill math for Sigmazam's Polaroid darkroom reveal and Date Liquid Jelly Heart.
 */

/** Total duration (ms) for the Polaroid physical ejection slide from the print slot. */
export const POLAROID_EJECT_MS = 560;

/** Delay (ms) before the darkroom chemical emulsion starts clarifying. */
export const POLAROID_DEV_DELAY_MS = 280;

/** Duration (ms) for the chemical fog-to-clarity development curve. */
export const POLAROID_DEV_MS = 1600;

/** Maps normalized drag position (`-1..1`) to gentle 3D paper inspection tilt in degrees. */
export function polaroidTiltDeg(nx: number, ny: number, maxDeg: number = 11): { rotateX: number; rotateY: number } {
  'worklet';
  const cx = Math.max(-1, Math.min(1, nx));
  const cy = Math.max(-1, Math.min(1, ny));
  return {
    rotateX: -cy * maxDeg,
    rotateY: cx * maxDeg,
  };
}

/**
 * Computes normalized liquid fill ratio (`0.12 .. 1.0`) for the Date Jelly Heart meter
 * so even 0 hearts shows a soft inviting liquid meniscus at the base.
 */
export function jellyHeartFill(hearts: number, maxHearts: number): number {
  'worklet';
  if (maxHearts <= 0) return 0.12;
  const ratio = Math.max(0, Math.min(1, hearts / maxHearts));
  return 0.12 + ratio * 0.88;
}
