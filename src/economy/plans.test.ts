import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { canRing, startSubscription } from './plans';

const NOW = Date.parse('2026-10-13T08:00:00.000Z');
const DAY = 86_400_000;

describe('canRing: who a character may call on their own', () => {
  it('never rings a free user', () => {
    assert.equal(canRing(undefined, NOW), false);
  });

  it('rings during the trial and on every paid plan', () => {
    assert.equal(canRing(startSubscription('basic', NOW, true), NOW), true);
    for (const plan of ['basic', 'quarterly', 'annual', 'pro'] as const) {
      assert.equal(canRing(startSubscription(plan, NOW), NOW), true, plan);
    }
  });

  it('stops ringing once a cancelled plan or the trial has ended', () => {
    const cancelled = { ...startSubscription('basic', NOW - 40 * DAY), willRenew: false };
    assert.equal(canRing(cancelled, NOW), false);
    const trial = { ...startSubscription('basic', NOW - 4 * DAY, true), willRenew: false };
    assert.equal(canRing(trial, NOW), false);
  });
});
