import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ANSWER_MIN_MS, attemptMs, freshFirst } from './gemini.ts';

describe('attemptMs', () => {
  it('gives a model half of what is left, but never less than a reply needs', () => {
    assert.equal(attemptMs(20_000), 10_000);
    assert.equal(attemptMs(12_000), ANSWER_MIN_MS);
  });

  it('never runs past the deadline', () => {
    assert.equal(attemptMs(6_000), 6_000);
    assert.equal(attemptMs(2_500.7), 2_500);
  });

  it('after a fast "high demand" on 20 s, two full tries fit (and a short last one) instead of four cut-off ones', () => {
    let left = 19_500;
    const tries: number[] = [];
    while (left >= 1500) {
      const ms = attemptMs(left);
      tries.push(ms);
      left -= ms;
    }
    assert.deepEqual(tries, [9_750, 8_000, 1_750]);
  });
});

describe('freshFirst', () => {
  const models = ['lite', 'preview', 'latest'];

  it('keeps the order when nobody was busy', () => {
    assert.deepEqual(freshFirst(models, new Map(), 1000), models);
  });

  it('tries a model that just turned a call away last, until its time is up', () => {
    const busy = new Map([['lite', 5000]]);
    assert.deepEqual(freshFirst(models, busy, 1000), ['preview', 'latest', 'lite']);
    assert.deepEqual(freshFirst(models, busy, 6000), models);
  });
});
