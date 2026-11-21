import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { windowLimiter } from './rate-limit.ts';

describe('the model call limits', () => {
  it('allows the limit in a window, then refuses until it ends', () => {
    let t = 0;
    const allow = windowLimiter(2, 1000, () => t);
    assert.deepEqual([allow('a'), allow('a'), allow('a')], [true, true, false]);
    t = 1000;
    assert.equal(allow('a'), true);
  });

  it('counts each key on its own', () => {
    const allow = windowLimiter(1, 1000, () => 0);
    assert.deepEqual([allow('a'), allow('b'), allow('a')], [true, true, false]);
  });
});
