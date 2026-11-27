import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { dockIndexFromX, dockWaveTransform, elasticMicDrag } from './reaction-motion';

describe('reaction-motion dock wave & elastic mic math', () => {
  it('returns neutral transform when idle and symmetrical neighbor wave when active', () => {
    assert.deepEqual(dockWaveTransform(2, -1), { scale: 1, translateY: 0, translateX: 0 });
    const peak = dockWaveTransform(2, 2);
    const left = dockWaveTransform(1, 2);
    const right = dockWaveTransform(3, 2);
    const far = dockWaveTransform(5, 2);

    assert.ok(peak.scale > 1.5 && peak.translateY < -10);
    assert.equal(left.scale, right.scale);
    assert.equal(left.translateY, right.translateY);
    assert.ok(left.translateX < 0 && right.translateX > 0);
    assert.ok(far.scale < 1);
  });

  it('maps X coordinate across capsule slots and rejects far outside touches', () => {
    assert.equal(dockIndexFromX(15, 320, 10, 6), 0);
    assert.equal(dockIndexFromX(160, 320, 10, 6), 3);
    assert.equal(dockIndexFromX(305, 320, 10, 6), 5);
    assert.equal(dockIndexFromX(-40, 320, 10, 6), -1);
    assert.equal(dockIndexFromX(380, 320, 10, 6), -1);
  });

  it('applies damped negative rubber-band travel capped at maxTravel', () => {
    assert.equal(elasticMicDrag(20, 96), 0);
    assert.equal(elasticMicDrag(0, 96), 0);
    const mid = elasticMicDrag(-45, 96);
    assert.ok(mid < 0 && mid > -96);
    assert.equal(elasticMicDrag(-500, 96), -96);
  });
});
