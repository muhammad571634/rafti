import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { applySlideResistance, elasticStretch, SLIDE_MAGNET_AT, slideDetentIndex } from './slide-wake';

describe('slide-wake elastic glass physics', () => {
  it('applies soft rubber-band resistance at edges and magnetic snap past threshold', () => {
    const left = applySlideResistance(-50, 250);
    assert.ok(left.x < 0 && left.x > -10);
    assert.equal(left.magnetic, false);

    const mid = applySlideResistance(120, 250);
    assert.equal(mid.x, 120);
    assert.equal(mid.magnetic, false);

    const caught = applySlideResistance(250 * SLIDE_MAGNET_AT, 250);
    assert.equal(caught.x, 250);
    assert.equal(caught.magnetic, true);
  });

  it('bounds velocity stretch cleanly and scales up gently on magnetic lock', () => {
    const rest = elasticStretch(0, false);
    assert.deepEqual(rest, { scaleX: 1, scaleY: 1 });

    const fast = elasticStretch(3000, false);
    assert.ok(fast.scaleX > 1.1 && fast.scaleX <= 1.2);
    assert.ok(fast.scaleY < 1 && fast.scaleY >= 0.88);

    const locked = elasticStretch(0, true);
    assert.ok(locked.scaleX > 1.05 && locked.scaleY > 1.05);
  });

  it('computes monotonic detent buckets across 0..1', () => {
    assert.equal(slideDetentIndex(0), 0);
    assert.equal(slideDetentIndex(0.5), 3);
    assert.equal(slideDetentIndex(1), 5);
  });
});
