/**
 * Which of the friend hues a character wears (design-style §10): a stable pick from its id, so a
 * friend keeps one colour on every tab, every launch and every phone. Pure, no React Native, so
 * `node --test` can load it; the hues themselves live in the theme (`friendHues`, `friendColor`).
 */
export function friendHueIndex(id: string, count: number): number {
  if (count <= 0) return 0;
  // FNV-1a over UTF-16 code units: cheap, spreads short ids like "hana" and "c_12" well.
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % count;
}
