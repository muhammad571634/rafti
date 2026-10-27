import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { startSubscription } from './plans';
import {
  consumePortrait,
  createTier,
  PLAN_PORTRAITS,
  PORTRAIT_SHELLS,
  portraitPrice,
  portraitsLeft,
  QUICK_CREATES_PER_DAY,
  quickCreatesLeft,
  quickCreatesPerDay,
  spendQuickCreate,
} from './quick-create';

const now = Date.parse('2026-10-25T12:00:00.000Z');

describe('drawn portraits', () => {
  it('cost shells without a plan', () => {
    assert.equal(portraitsLeft(undefined, now), 0);
    assert.equal(portraitPrice(undefined, now), PORTRAIT_SHELLS);
    assert.equal(consumePortrait(undefined, now), null);
  });

  it('are free on Basic until its ten are used, then cost shells', () => {
    let sub = startSubscription('basic', now);
    assert.equal(portraitPrice(sub, now), 0);
    for (let i = 0; i < PLAN_PORTRAITS.basic; i++) sub = consumePortrait(sub, now)!;
    assert.equal(portraitsLeft(sub, now), 0);
    assert.equal(portraitPrice(sub, now), PORTRAIT_SHELLS);
    // The next period starts from zero.
    assert.equal(portraitsLeft(sub, now + 31 * 86_400_000), PLAN_PORTRAITS.basic);
  });

  it('give Pro twenty a period and the trial three', () => {
    assert.equal(portraitsLeft(startSubscription('pro', now), now), PLAN_PORTRAITS.pro);
    assert.equal(portraitsLeft(startSubscription('proAnnual', now), now), PLAN_PORTRAITS.pro);
    assert.equal(portraitsLeft(startSubscription('proAnnual', now, true), now), PLAN_PORTRAITS.trial);
  });
});

describe('quick create allowance', () => {
  it('follows the plan: one a day free, more on Basic, most on Pro and its trial', () => {
    assert.equal(createTier(undefined, now), 'free');
    assert.equal(quickCreatesPerDay(undefined, now), QUICK_CREATES_PER_DAY.free);
    assert.equal(quickCreatesPerDay(startSubscription('basic', now), now), QUICK_CREATES_PER_DAY.basic);
    assert.equal(quickCreatesPerDay(startSubscription('pro', now), now), QUICK_CREATES_PER_DAY.pro);
    assert.equal(quickCreatesPerDay(startSubscription('proAnnual', now, true), now), QUICK_CREATES_PER_DAY.pro);
    assert.ok(QUICK_CREATES_PER_DAY.free < QUICK_CREATES_PER_DAY.basic && QUICK_CREATES_PER_DAY.basic < QUICK_CREATES_PER_DAY.pro);
  });

  it('gives the full allowance on a new day', () => {
    assert.equal(quickCreatesLeft(undefined, '2026-10-25', 5), 5);
    assert.equal(quickCreatesLeft({ day: '2026-10-24', used: 5 }, '2026-10-25', 5), 5);
  });

  it('counts down through the day and stops at zero', () => {
    let use = spendQuickCreate(undefined, '2026-10-25', 3);
    assert.deepEqual(use, { day: '2026-10-25', used: 1 });
    use = spendQuickCreate(use!, '2026-10-25', 3);
    use = spendQuickCreate(use!, '2026-10-25', 3);
    assert.equal(quickCreatesLeft(use!, '2026-10-25', 3), 0);
    assert.equal(spendQuickCreate(use!, '2026-10-25', 3), null);
    // Yesterday's count does not carry over.
    assert.deepEqual(spendQuickCreate(use!, '2026-10-26', 3), { day: '2026-10-26', used: 1 });
  });

  it('stops a free user after one draft', () => {
    const use = spendQuickCreate(undefined, '2026-10-25', QUICK_CREATES_PER_DAY.free);
    assert.equal(spendQuickCreate(use!, '2026-10-25', QUICK_CREATES_PER_DAY.free), null);
  });
});
