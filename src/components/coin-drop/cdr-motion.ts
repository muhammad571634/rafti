// Coin Drop Reward (Native Cook block, adapted): the motion's numbers and curves as pure worklets.
// Nothing here touches Skia, so the Gifts screen can import it on any build (the wallet's wobble).
// The source's autoPlay loop (frameAt, its timeline) was for the recording and stays behind.

export function clamp01(v: number) {
  'worklet';
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
export function smooth(a: number, b: number, x: number) {
  'worklet';
  const u = clamp01((x - a) / (b - a));
  return u * u * (3 - 2 * u);
}
/** A jelly wobble that starts and ends at 0. */
export function wobbleAt(u: number) {
  'worklet';
  if (u <= 0 || u >= 1) return 0;
  return Math.exp(-u * 5) * Math.sin(u * 26);
}

/** How far the coin is pulled toward the wallet (a share of the way) before it turns to a drop. */
export const PULL_FULL = 0.32;
/** The coin's shape while it is pulled: 0 coin … 0.8 drop (it finishes the change in flight). */
export function meltOf(pull: number) {
  'worklet';
  return 0.8 * smooth(0, 1, pull / PULL_FULL);
}

/** The pour into the wallet, in seconds (the source's release → absorb). */
export const FLY_S = 0.55;
/** Seconds a waiting prize stays in the toast before it pours by itself. */
export const AUTO_COLLECT = 3;
/** Let go past this share of the way (or flick faster than FLICK) and it pours. */
export const PULL_GO = 0.16;
export const FLICK = 0.9;

/** Sizes in points: the coin's unit radius where it starts and in the toast, and the toast. */
export const COIN_S = 22;
export const HERO_S = 66;
export const TILE = 236;
