import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { startSubscription } from './plans';
import { FREE_THOUGHTS_PER_DAY, PLAN_THOUGHTS_PER_DAY, thoughtsLeft } from './thoughts';

const NOW = Date.parse('2026-11-18T08:00:00.000Z');

describe('inner thoughts: a few free a day', () => {
  it('gives everyone a daily count, a plan more', () => {
    assert.equal(thoughtsLeft(undefined, undefined, undefined, '2026-11-18', NOW), FREE_THOUGHTS_PER_DAY);
    assert.equal(thoughtsLeft(startSubscription('basic', NOW), undefined, undefined, '2026-11-18', NOW), PLAN_THOUGHTS_PER_DAY);
  });

  it('counts down today and starts again tomorrow', () => {
    assert.equal(thoughtsLeft(undefined, '2026-11-18', 2, '2026-11-18', NOW), FREE_THOUGHTS_PER_DAY - 2);
    assert.equal(thoughtsLeft(undefined, '2026-11-18', 9, '2026-11-18', NOW), 0);
    assert.equal(thoughtsLeft(undefined, '2026-11-17', 3, '2026-11-18', NOW), FREE_THOUGHTS_PER_DAY);
  });
});
