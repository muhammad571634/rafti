import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { rollAt, rollDuration } from './count-roll';

describe('a number rolling to its new value', () => {
  it('starts at the old value and lands exactly on the new one', () => {
    assert.equal(rollAt(120, 220, 0), 120);
    assert.equal(rollAt(120, 220, 1), 220);
    assert.equal(rollAt(220, 120, 1), 120);
    assert.equal(rollAt(5, 0, 2), 0);
    assert.equal(rollAt(5, 0, -1), 5);
  });

  it('moves most of the way early (ease-out) and never overshoots', () => {
    assert.ok(rollAt(0, 100, 0.5) >= 90);
    for (let k = 0; k <= 1; k += 0.05) {
      const v = rollAt(0, 100, k);
      assert.ok(v >= 0 && v <= 100);
    }
  });

  it('is short for small steps and capped for big ones', () => {
    assert.equal(rollDuration(7, 7), 0);
    assert.ok(rollDuration(10, 11) < 350);
    assert.ok(rollDuration(0, 100) > rollDuration(0, 5));
    assert.equal(rollDuration(0, 1_000_000), 700);
  });
});
