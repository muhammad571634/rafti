/** A packed bubble: its centre and radius, in points from the box's top-left corner. */
export interface Bubble {
  x: number;
  y: number;
  r: number;
}

/** Angles tried around each placed bubble (every 6°). */
const STEPS = 60;

/**
 * Packs bubbles whose areas follow `values` into a `width` × `height` box (Us, "Who you talked
 * with"): the biggest in the middle, each next one at the free spot touching an earlier one that
 * keeps the group most compact for the box's shape, `gap` points apart, none smaller than `minR`
 * points across its radius, the whole group scaled to fill the box and centred in it. Pure and
 * deterministic: the same shares always draw the same picture. Answers in the order of `values`.
 */
export function packBubbles(values: readonly number[], width: number, height: number, gap = 4, minR = 12): Bubble[] {
  if (!values.length || width <= 0 || height <= 0) return [];
  const max = Math.max(...values.map((v) => Math.max(v, 0)), 1e-9);
  const radii = values.map((v) => Math.sqrt(Math.max(v, 0) / max));
  // The gap and the smallest radius are in points, the packing in relative units: a few rounds
  // settle the scale between them.
  let scale = Math.min(width, height) / 2;
  let placed: Bubble[] = [];
  for (let round = 0; round < 4; round++) {
    const rel = radii.map((r) => Math.max(r, minR / scale));
    placed = pack(rel, gap / scale, width / height);
    const box = bounds(placed);
    const next = Math.min(width / box.w, height / box.h);
    if (Math.abs(next - scale) < 0.01) {
      scale = next;
      break;
    }
    scale = next;
  }
  const box = bounds(placed);
  const ox = width / 2 - ((box.left + box.right) / 2) * scale;
  const oy = height / 2 - ((box.top + box.bottom) / 2) * scale;
  return placed.map((b) => ({ x: ox + b.x * scale, y: oy + b.y * scale, r: b.r * scale }));
}

/** The packing in relative units, in input order. */
function pack(radii: readonly number[], gap: number, aspect: number): Bubble[] {
  const order = radii.map((r, i) => ({ r, i })).sort((a, b) => b.r - a.r || a.i - b.i);
  const out: Bubble[] = new Array(radii.length);
  const done: Bubble[] = [];
  for (const { r, i } of order) {
    let best: Bubble | null = null;
    let bestScore = Infinity;
    if (!done.length) best = { x: 0, y: 0, r };
    const box = done.length ? bounds(done) : null;
    for (const p of done) {
      const d = p.r + r + gap;
      for (let k = 0; k < STEPS; k++) {
        const a = (k / STEPS) * Math.PI * 2;
        const x = p.x + Math.cos(a) * d;
        const y = p.y + Math.sin(a) * d;
        if (done.some((q) => Math.hypot(q.x - x, q.y - y) < q.r + r + gap - 1e-9)) continue;
        // The group's box with this spot, measured against the box it must fill (a wide box takes
        // the group sideways): the smaller it needs to shrink, the better; then the nearer the middle.
        const w = Math.max(box!.right, x + r) - Math.min(box!.left, x - r);
        const h = Math.max(box!.bottom, y + r) - Math.min(box!.top, y - r);
        const score = Math.max(w / aspect, h) * 1000 + Math.hypot(x / aspect, y);
        if (score < bestScore) {
          bestScore = score;
          best = { x, y, r };
        }
      }
    }
    out[i] = best!;
    done.push(best!);
  }
  return out;
}

function bounds(bubbles: readonly Bubble[]) {
  const left = Math.min(...bubbles.map((b) => b.x - b.r));
  const right = Math.max(...bubbles.map((b) => b.x + b.r));
  const top = Math.min(...bubbles.map((b) => b.y - b.r));
  const bottom = Math.max(...bubbles.map((b) => b.y + b.r));
  return { left, right, top, bottom, w: right - left, h: bottom - top };
}
