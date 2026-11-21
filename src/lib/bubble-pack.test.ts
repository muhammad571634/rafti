import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { packBubbles } from './bubble-pack';

const overlaps = (a: { x: number; y: number; r: number }, b: { x: number; y: number; r: number }, gap: number) => Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r + gap - 0.01;

describe('bubble packing (Us, who you talked with)', () => {
  const W = 320;
  const H = 200;

  for (const values of [[98, 2], [46, 31, 23], [30, 20, 12, 10, 8, 6, 5, 4, 2, 1, 1, 1], Array(12).fill(1), [1, 0, 0]]) {
    it(`fits ${values.length} bubbles in the box, apart, in order (${values.join(' ')})`, () => {
      const out = packBubbles(values, W, H, 4, 12);
      assert.equal(out.length, values.length);
      for (const b of out) {
        assert.ok(b.x - b.r >= -0.5 && b.x + b.r <= W + 0.5, `x ${b.x} r ${b.r}`);
        assert.ok(b.y - b.r >= -0.5 && b.y + b.r <= H + 0.5, `y ${b.y} r ${b.r}`);
        assert.ok(b.r >= 11.5, `r ${b.r}`);
      }
      for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) assert.ok(!overlaps(out[i], out[j], 4), `${i} and ${j} overlap`);
      // A bigger share never draws a smaller bubble.
      for (let i = 0; i < values.length; i++) for (let j = 0; j < values.length; j++) if (values[i] > values[j]) assert.ok(out[i].r >= out[j].r - 0.01);
    });
  }

  it('keeps every bubble big enough for a name when a dozen share the card (Us: 27 pt, 268 pt tall)', () => {
    const out = packBubbles([60, 40, 25, 18, 12, 9, 7, 5, 3, 2, 1, 1], 319, 268, 4, 27);
    assert.ok(out.every((b) => b.r >= 26.5 && b.x - b.r >= -0.5 && b.x + b.r <= 319.5 && b.y - b.r >= -0.5 && b.y + b.r <= 268.5));
    for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) assert.ok(!overlaps(out[i], out[j], 4));
  });

  it('uses the box: the group touches two opposite sides', () => {
    const out = packBubbles([30, 20, 12, 10, 8, 6], W, H);
    const left = Math.min(...out.map((b) => b.x - b.r));
    const right = Math.max(...out.map((b) => b.x + b.r));
    const top = Math.min(...out.map((b) => b.y - b.r));
    const bottom = Math.max(...out.map((b) => b.y + b.r));
    assert.ok(Math.abs(right - left - W) < 1 || Math.abs(bottom - top - H) < 1);
  });

  it('draws the same picture every time, and nothing for nothing', () => {
    assert.deepEqual(packBubbles([5, 3, 2], W, H), packBubbles([5, 3, 2], W, H));
    assert.deepEqual(packBubbles([], W, H), []);
    assert.deepEqual(packBubbles([1, 2], 0, H), []);
  });
});
