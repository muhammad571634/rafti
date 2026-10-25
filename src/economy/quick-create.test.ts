import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { startSubscription } from './plans';
import {
  consumePortrait,
  FREE_QUICK_CREATES_PER_DAY,
  PLAN_PORTRAITS,
  PORTRAIT_SHELLS,
  portraitPrice,
  portraitsLeft,
  quickCreatesLeft,
  spendQuickCreate,
} from './quick-create';

describe('drawn portraits', () => {
  const now = Date.parse('2026-10-25T12:00:00.000Z');

  it('cost shells without a plan', () => {
    assert.equal(portraitsLeft(undefined, now), 0);
    assert.equal(portraitPrice(undefined, now), PORTRAIT_SHELLS);
    assert.equal(consumePortrait(undefined, now), null);
  });

  it('are free on a plan until its ten are used, then cost shells', () => {
    let sub = startSubscription('basic', now);
    assert.equal(portraitPrice(sub, now), 0);
    for (let i = 0; i < PLAN_PORTRAITS; i++) sub = consumePortrait(sub, now)!;
    assert.equal(portraitsLeft(sub, now), 0);
    assert.equal(portraitPrice(sub, now), PORTRAIT_SHELLS);
    // The next period starts from zero.
    assert.equal(portraitsLeft(sub, now + 31 * 86_400_000), PLAN_PORTRAITS);
  });
});

describe('quick create allowance', () => {
  it('gives the full allowance on a new day', () => {
    assert.equal(quickCreatesLeft(undefined, '2026-10-25'), FREE_QUICK_CREATES_PER_DAY);
    assert.equal(quickCreatesLeft({ day: '2026-10-24', used: 3 }, '2026-10-25'), FREE_QUICK_CREATES_PER_DAY);
  });

  it('counts down through the day and stops at zero', () => {
    let use = spendQuickCreate(undefined, '2026-10-25');
    assert.deepEqual(use, { day: '2026-10-25', used: 1 });
    use = spendQuickCreate(use!, '2026-10-25');
    use = spendQuickCreate(use!, '2026-10-25');
    assert.equal(quickCreatesLeft(use!, '2026-10-25'), 0);
    assert.equal(spendQuickCreate(use!, '2026-10-25'), null);
    // Yesterday's count does not carry over.
    assert.deepEqual(spendQuickCreate(use!, '2026-10-26'), { day: '2026-10-26', used: 1 });
  });
});
