import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isTransientStatus, retryBusy, RETRY_AFTER_MS, RETRY_IF_FAILED_WITHIN_MS, type Attempt } from './retry-busy';

/** Attempts answered in order; counts the calls. */
function attempts(...answers: Attempt<string>[]) {
  let calls = 0;
  const run = async () => answers[Math.min(calls++, answers.length - 1)];
  return { run, calls: () => calls };
}
const noWait = async () => {};

describe('retryBusy', () => {
  it('returns the first answer without a second try', async () => {
    const a = attempts({ value: 'hi', transient: false });
    assert.equal(await retryBusy(a.run, { wait: noWait }), 'hi');
    assert.equal(a.calls(), 1);
  });

  it('tries once more after a quick busy failure', async () => {
    const a = attempts({ value: null, transient: true }, { value: 'back', transient: false });
    const waits: number[] = [];
    assert.equal(await retryBusy(a.run, { wait: async (ms) => void waits.push(ms) }), 'back');
    assert.equal(a.calls(), 2);
    assert.deepEqual(waits, [RETRY_AFTER_MS]);
  });

  it('gives up after the second busy failure', async () => {
    const a = attempts({ value: null, transient: true });
    assert.equal(await retryBusy(a.run, { wait: noWait }), null);
    assert.equal(a.calls(), 2);
  });

  it('does not try again after a refusal', async () => {
    const a = attempts({ value: null, transient: false });
    assert.equal(await retryBusy(a.run, { wait: noWait }), null);
    assert.equal(a.calls(), 1);
  });

  it('does not try again when the first try was slow', async () => {
    let t = 0;
    let calls = 0;
    const run = async (): Promise<Attempt<string>> => {
      calls++;
      t += RETRY_IF_FAILED_WITHIN_MS + 1;
      return { value: null, transient: true };
    };
    assert.equal(await retryBusy(run, { now: () => t, wait: noWait }), null);
    assert.equal(calls, 1);
  });
});

describe('isTransientStatus', () => {
  it('marks busy and rate limits only', () => {
    assert.ok([429, 500, 502, 503].every(isTransientStatus));
    assert.ok(![200, 400, 401, 402, 404, 413].some(isTransientStatus));
  });
});
