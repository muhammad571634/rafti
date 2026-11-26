import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { jellyHeartFill, polaroidTiltDeg } from './polaroid-motion';

describe('polaroid-motion & jelly heart math', () => {
  it('clamps 3D paper tilt cleanly within maxDeg', () => {
    assert.deepEqual(polaroidTiltDeg(0, 0), { rotateX: -0, rotateY: 0 });
    assert.deepEqual(polaroidTiltDeg(2, -2, 10), { rotateX: 10, rotateY: 10 });
    assert.deepEqual(polaroidTiltDeg(-2, 2, 10), { rotateX: -10, rotateY: -10 });
  });

  it('keeps jelly heart fill bounded between meniscus floor and full', () => {
    assert.equal(jellyHeartFill(0, 6), 0.12);
    assert.equal(jellyHeartFill(6, 6), 1);
    assert.equal(jellyHeartFill(9, 6), 1);
    assert.ok(jellyHeartFill(3, 6) > 0.5 && jellyHeartFill(3, 6) < 0.6);
  });
});
