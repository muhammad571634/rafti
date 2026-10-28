import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BATCH_MAX_MS, BATCH_QUIET_MS, BATCH_TYPING_MS, batchWait, replyBatcher, type BatchClock } from './reply-batch';

/** A clock that moves only when the test says, firing due timers in order. */
function fakeClock() {
  let now = 0;
  let next = 0;
  const timers = new Map<number, { at: number; run: () => void }>();
  const clock: BatchClock = {
    now: () => now,
    set: (run, ms) => {
      timers.set(++next, { at: now + ms, run });
      return next;
    },
    clear: (handle) => void timers.delete(handle as number),
  };
  const advance = (ms: number) => {
    const end = now + ms;
    for (;;) {
      const due = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      timers.delete(due[0]);
      now = due[1].at;
      due[1].run();
    }
    now = end;
  };
  return { clock, advance };
}

describe('back-to-back messages get one reply (backend-plan §12.8)', () => {
  it('waits a beat when the field is empty, longer while they type, never past the cap', () => {
    assert.equal(batchWait(0, 0, false), BATCH_QUIET_MS);
    assert.equal(batchWait(0, 0, true), BATCH_TYPING_MS);
    assert.equal(batchWait(0, BATCH_MAX_MS - 500, true), 500);
    assert.equal(batchWait(0, BATCH_MAX_MS + 100, false), 0);
  });

  it('sends one reply for three quick texts, with the closeness of all three', () => {
    const { clock, advance } = fakeClock();
    const sent: number[] = [];
    const batch = replyBatcher(clock);
    batch.queue('c1', 2, (gain) => sent.push(gain));
    advance(800);
    batch.queue('c1', 2, (gain) => sent.push(gain));
    advance(800);
    batch.queue('c1', 2, (gain) => sent.push(gain));
    advance(BATCH_QUIET_MS - 1);
    assert.deepEqual(sent, []);
    assert.ok(batch.waiting('c1'));
    advance(1);
    assert.deepEqual(sent, [6]);
    assert.ok(!batch.waiting('c1'));
  });

  it('keeps waiting while they type, and answers at the cap if they never stop', () => {
    const { clock, advance } = fakeClock();
    const sent: number[] = [];
    const batch = replyBatcher(clock);
    batch.queue('c1', 1, (gain) => sent.push(gain));
    batch.composing('c1', true);
    advance(BATCH_TYPING_MS + 100);
    assert.deepEqual(sent, [], 'still typing');
    advance(BATCH_MAX_MS);
    assert.deepEqual(sent, [1]);
  });

  it('answers a beat after they clear the field without sending', () => {
    const { clock, advance } = fakeClock();
    const sent: number[] = [];
    const batch = replyBatcher(clock);
    batch.queue('c1', 1, (gain) => sent.push(gain));
    batch.composing('c1', true);
    advance(2000);
    batch.composing('c1', false);
    advance(BATCH_QUIET_MS);
    assert.deepEqual(sent, [1]);
  });

  it('lets a scripted reply take the waiting batch, and keeps chats apart', () => {
    const { clock, advance } = fakeClock();
    const sent: string[] = [];
    const batch = replyBatcher(clock);
    batch.queue('c1', 2, () => sent.push('c1'));
    batch.queue('c2', 2, () => sent.push('c2'));
    assert.equal(batch.take('c1'), 2);
    assert.equal(batch.take('c1'), 0);
    advance(BATCH_MAX_MS);
    assert.deepEqual(sent, ['c2']);
  });
});
