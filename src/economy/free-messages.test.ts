import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FREE_MESSAGES_PER_DAY, freeMessagesPerDay, messagesLeft, PLAN_MESSAGES_PER_DAY, showLeft, usedToday } from './free-messages';
import { startSubscription } from './plans';

const NOW = Date.parse('2026-11-15T08:00:00.000Z');

describe('free messages: talking is not metered (audit §6.3, shape B)', () => {
  it('gives everyone a daily count, and a plan its fair use', () => {
    assert.equal(freeMessagesPerDay(undefined, NOW), FREE_MESSAGES_PER_DAY);
    assert.equal(freeMessagesPerDay(startSubscription('basic', NOW), NOW), PLAN_MESSAGES_PER_DAY);
    assert.equal(freeMessagesPerDay(startSubscription('pro', NOW), NOW), PLAN_MESSAGES_PER_DAY);
  });

  it('starts the count again on a new day', () => {
    assert.equal(usedToday('2026-11-15', 12, '2026-11-15'), 12);
    assert.equal(usedToday('2026-11-14', 30, '2026-11-15'), 0);
    assert.equal(usedToday(undefined, undefined, '2026-11-15'), 0);
  });

  it('never goes below zero left', () => {
    assert.equal(messagesLeft(undefined, 0, NOW), FREE_MESSAGES_PER_DAY);
    assert.equal(messagesLeft(undefined, FREE_MESSAGES_PER_DAY + 4, NOW), 0);
  });

  it('says how many are left only for the last five of the free count, never on a plan', () => {
    assert.equal(showLeft(undefined, FREE_MESSAGES_PER_DAY - 6, NOW), null);
    assert.equal(showLeft(undefined, FREE_MESSAGES_PER_DAY - 5, NOW), 5);
    assert.equal(showLeft(undefined, FREE_MESSAGES_PER_DAY - 1, NOW), 1);
    assert.equal(showLeft(undefined, FREE_MESSAGES_PER_DAY, NOW), null);
    assert.equal(showLeft(startSubscription('basic', NOW), PLAN_MESSAGES_PER_DAY - 1, NOW), null);
  });

  it('ends a plan that was not renewed: back to the free count', () => {
    const sub = { ...startSubscription('basic', NOW), willRenew: false };
    assert.equal(freeMessagesPerDay(sub, NOW + 40 * 86_400_000), FREE_MESSAGES_PER_DAY);
  });
});
