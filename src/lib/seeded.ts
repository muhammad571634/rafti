/**
 * Picks that look random but come out the same for the same seed. A push scheduled
 * for 08:00 and the message the store writes into the chat when the app opens use
 * the same seed, so the notification and the chat always say the same line.
 */
export function hashSeed(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

export function pickSeeded<T>(list: readonly T[], seed: string): T {
  return list[hashSeed(seed) % list.length];
}
