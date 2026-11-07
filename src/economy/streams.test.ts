import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { startSubscription } from './plans';
import { FREE_STREAM_ROUNDS, freeRoundsLeft, takeFreeRound } from './streams';

describe('stream rounds', () => {
  const now = Date.parse('2026-10-25T12:00:00.000Z');
  const today = '2026-10-25';

  it('gives free users one free round a day and a plan more', () => {
    assert.equal(freeRoundsLeft(undefined, today, undefined, now), FREE_STREAM_ROUNDS.free);
    assert.equal(freeRoundsLeft(undefined, today, startSubscription('basic', now), now), FREE_STREAM_ROUNDS.plan);
  });

  it('counts today’s rounds and starts again the next day', () => {
    const used = takeFreeRound(undefined, today, undefined, now);
    assert.deepEqual(used, { day: today, used: 1 });
    assert.equal(takeFreeRound(used!, today, undefined, now), null);
    assert.equal(freeRoundsLeft(used!, '2026-10-26', undefined, now), FREE_STREAM_ROUNDS.free);
  });
});
