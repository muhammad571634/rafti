/**
 * Pure geometry & kinetic wave math for Sigmazam's macOS-Dock reaction scrubber
 * and elastic HoldMic rubber-band drag.
 */

export interface DockTransform {
  scale: number;
  translateY: number;
  translateX: number;
}

/**
 * Computes neighbor-coupled macOS-Dock wave lift for reaction slot `index`
 * when the finger is over `activeIndex` (`-1` when resting).
 */
export function dockWaveTransform(index: number, activeIndex: number): DockTransform {
  'worklet';
  if (activeIndex < 0) return { scale: 1, translateY: 0, translateX: 0 };
  const dist = Math.abs(index - activeIndex);
  if (dist === 0) return { scale: 1.54, translateY: -15, translateX: 0 };
  if (dist === 1) return { scale: 1.18, translateY: -5, translateX: index < activeIndex ? -3 : 3 };
  return { scale: 0.94, translateY: 0, translateX: 0 };
}

/** Maps a local X touch coordinate inside the reaction capsule to `0..count-1` or `-1` outside. */
export function dockIndexFromX(localX: number, width: number, paddingX: number, count: number): number {
  'worklet';
  if (count <= 0 || width <= paddingX * 2) return -1;
  const usable = width - paddingX * 2;
  const rel = localX - paddingX;
  if (rel < -18 || rel > usable + 18) return -1;
  const idx = Math.floor((Math.max(0, Math.min(usable - 0.01, rel)) / usable) * count);
  return Math.max(0, Math.min(count - 1, idx));
}

/** Smooth elastic rubber-band resistance for HoldMic leftward cancel and upward lock drags. */
export function elasticMicDrag(delta: number, maxTravel: number): number {
  'worklet';
  if (delta >= 0) return 0;
  const mag = Math.abs(delta);
  const damped = Math.pow(mag, 0.84) * 1.38;
  return -Math.min(maxTravel, damped);
}
