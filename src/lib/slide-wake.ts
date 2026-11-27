/**
 * Pure gesture physics for Sigmazam's Elastic Liquid Glass Slide-to-Wake / Slide-to-Answer control.
 */

/** Progress fraction where the right-hand magnetic dock catches the handle. */
export const SLIDE_MAGNET_AT = 0.84;

/** Minimum progress fraction on release that completes the unlock gesture. */
export const SLIDE_UNLOCK_AT = 0.8;

/** Number of subtle tactile micro-detents distributed across the travel path. */
export const SLIDE_DETENT_BUCKETS = 6;

/**
 * Applies soft rubber-band resistance past the left/right edges and magnetic attraction
 * once the finger crosses `SLIDE_MAGNET_AT`.
 */
export function applySlideResistance(rawX: number, maxX: number): { x: number; magnetic: boolean } {
  'worklet';
  if (maxX <= 0) return { x: 0, magnetic: false };
  if (rawX < 0) return { x: rawX * 0.14, magnetic: false };
  if (rawX >= maxX * SLIDE_MAGNET_AT) {
    const over = Math.max(0, rawX - maxX);
    return { x: maxX + over * 0.08, magnetic: true };
  }
  return { x: rawX, magnetic: false };
}

/**
 * Computes subtle velocity-coupled squash & stretch for the liquid-glass handle.
 * Keeps deformation gentle and organic (`scaleX` up to `1.18`, `scaleY` down to `0.90`).
 */
export function elasticStretch(velocityPxPerSec: number, magnetic: boolean): { scaleX: number; scaleY: number } {
  'worklet';
  const speed = Math.min(1, Math.abs(velocityPxPerSec) / 1400);
  const magBoost = magnetic ? 0.07 : 0;
  return {
    scaleX: 1 + speed * 0.16 + magBoost,
    scaleY: 1 - speed * 0.09 + magBoost,
  };
}

/** Discrete detent bucket (`0 .. buckets - 1`) for progressive micro-ticks along the track. */
export function slideDetentIndex(progress: number, buckets: number = SLIDE_DETENT_BUCKETS): number {
  'worklet';
  const p = Math.max(0, Math.min(0.9999, progress));
  return Math.floor(p * buckets);
}
