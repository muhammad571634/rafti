import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { persistentDailyBudget, persistentDailyLimiter, windowLimiter } from './rate-limit.ts';

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

  it('persists daily quotas in the shared database store across server restarts', async () => {
    const counts = new Map<string, number>();
    const store = {
      async consumeDailyQuota(scope: string, bucket: string, amount: number, limit: number) {
        const k = `${scope}:${bucket}`;
        const prev = counts.get(k) ?? 0;
        if (prev + amount > limit) return false;
        counts.set(k, prev + amount);
        return true;
      },
    };
    // Two separate server instances sharing one Postgres quota table.
    const serverA = persistentDailyLimiter({ bucket: 'user_day', limit: 2, store });
    const serverB = persistentDailyLimiter({ bucket: 'user_day', limit: 2, store });
    assert.equal(await serverA('u1'), true);
    assert.equal(await serverB('u1'), true);
    assert.equal(await serverA('u1'), false);
    assert.equal(await serverB('u2'), true);

    const voiceA = persistentDailyBudget({ bucket: 'voice_user', limit: 100, store });
    const voiceB = persistentDailyBudget({ bucket: 'voice_user', limit: 100, store });
    assert.equal(await voiceA('u1', 60), true);
    assert.equal(await voiceB('u1', 50), false);
    assert.equal(await voiceB('u1', 40), true);
  });

  it('falls back gracefully to in-memory counting on a DB error and warns once per bucket', async () => {
    let warnings = 0;
    const broken = {
      async consumeDailyQuota() {
        throw new Error('function consume_daily_quota does not exist');
      },
    };
    const allow = persistentDailyLimiter({
      bucket: 'side_day',
      limit: 2,
      store: broken,
      onFallback: () => {
        warnings += 1;
      },
    });
    assert.deepEqual([await allow('u1'), await allow('u1'), await allow('u1')], [true, true, false]);
    assert.equal(warnings, 1);
  });
});
