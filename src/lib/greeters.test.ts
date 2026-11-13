import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { greeters } from './greeters';

const now = new Date(2026, 10, 2, 8, 0);
const daysAgo = (days: number) => now.getTime() - days * 86_400_000;
const talked =
  (when: Record<string, number>) =>
  (id: string): number =>
    when[id] ?? 0;

describe('who says good morning and good night', () => {
  it('always has the closest friend first', () => {
    const talkedAt = talked({ b: daysAgo(1), c: daysAgo(1) });
    for (const slot of ['2026-11-02:morning', '2026-11-02:night', '2026-11-03:morning']) {
      assert.equal(greeters(['a', 'b', 'c'], talkedAt, slot, now)[0], 'a');
    }
  });

  it('hands the second greeting around the friends talked with this week, one slot at a time', () => {
    const talkedAt = talked({ b: daysAgo(1), c: daysAgo(2), d: daysAgo(6) });
    const seconds = ['2026-11-02:morning', '2026-11-02:night', '2026-11-03:morning', '2026-11-03:night', '2026-11-04:morning', '2026-11-04:night'].map(
      (slot) => greeters(['a', 'b', 'c', 'd'], talkedAt, slot, now)[1],
    );
    assert.deepEqual(new Set(seconds), new Set(['b', 'c', 'd']));
    assert.deepEqual(seconds.slice(0, 3), seconds.slice(3));
    seconds.forEach((id, i) => assert.notEqual(id, seconds[(i + 1) % seconds.length]));
  });

  it('does not leave a friend with only mornings or only nights', () => {
    for (const others of [['b', 'c'], ['b', 'c', 'd', 'e']]) {
      const talkedAt = talked(Object.fromEntries(others.map((id) => [id, daysAgo(1)])));
      const days = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'];
      const second = (slot: string) => new Set(days.map((day) => greeters(['a', ...others], talkedAt, `${day}:${slot}`, now)[1]));
      assert.equal(second('morning').size, others.length);
      assert.equal(second('night').size, others.length);
    }
  });

  it('leaves out a friend not talked with for over a week', () => {
    const talkedAt = talked({ b: daysAgo(1), c: daysAgo(8) });
    for (const slot of ['2026-11-02:morning', '2026-11-02:night', '2026-11-03:morning']) {
      assert.deepEqual(greeters(['a', 'b', 'c'], talkedAt, slot, now), ['a', 'b']);
    }
  });

  it('falls back to the next closest when nobody else was talked with this week', () => {
    assert.deepEqual(greeters(['a', 'b', 'c'], talked({ a: daysAgo(0) }), '2026-11-02:morning', now), ['a', 'b']);
  });

  it('answers the same for the same slot, so the push and the chat agree', () => {
    const talkedAt = talked({ b: daysAgo(1), c: daysAgo(2) });
    assert.deepEqual(greeters(['a', 'b', 'c'], talkedAt, '2026-11-02:night', now), greeters(['a', 'b', 'c'], talkedAt, '2026-11-02:night', now));
  });

  it('copes with one friend and with none', () => {
    assert.deepEqual(greeters(['a'], talked({ a: daysAgo(0) }), '2026-11-02:morning', now), ['a']);
    assert.deepEqual(greeters([], talked({}), '2026-11-02:morning', now), []);
  });
});
