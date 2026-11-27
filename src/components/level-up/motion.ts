// The level-up moment's curves (from Native Cook's Level Up Takeover): the whole screen is a pure
// function of one clock, so every piece lands on the same beat.

/** 0 before `from`, 1 after `to`, a straight line between. */
export function seg(t: number, from: number, to: number) {
  'worklet';
  return Math.min(1, Math.max(0, (t - from) / (to - from)));
}

export function easeOut(p: number) {
  'worklet';
  return 1 - (1 - p) * (1 - p) * (1 - p);
}

/** A spring's position in closed form, from 0 at `elapsed` = 0 towards 1, for a mass of 1. */
export function spring(elapsed: number, stiffness: number, damping: number) {
  'worklet';
  if (elapsed <= 0) return 0;
  const omega = Math.sqrt(stiffness);
  const zeta = damping / (2 * omega);
  const decay = Math.exp(-zeta * omega * elapsed);
  const damped = omega * Math.sqrt(1 - zeta * zeta);
  return 1 - decay * (Math.cos(damped * elapsed) + ((zeta * omega) / damped) * Math.sin(damped * elapsed));
}

/** Gap in seconds between the first ("lub") and second ("dub") beat of a double heartbeat. */
export const HEARTBEAT_GAP_SEC = 0.21;

/**
 * Closed-form double-heartbeat scale curve ("lub-dub") starting at `elapsed = 0`.
 * Returns `1` before the beat and settles cleanly back to `1` after ~0.65 s.
 */
export function heartbeatScale(elapsed: number) {
  'worklet';
  if (elapsed <= 0 || elapsed >= 0.72) return 1;
  const lub = Math.exp(-Math.pow((elapsed - 0.045) / 0.042, 2)) * 0.048;
  const dub = Math.exp(-Math.pow((elapsed - (HEARTBEAT_GAP_SEC + 0.05)) / 0.055, 2)) * 0.072;
  return 1 + lub + dub;
}

/** A number in [0, 1) that is always the same for the same pair: the confetti table is built from it. */
export function hash(index: number, salt: number) {
  const x = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}
