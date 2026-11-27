import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { planMemoryLine } from './plan-memory';

describe('planMemoryLine: plans are remembered with the real day', () => {
  it('writes the weekday and date, not "tomorrow"', () => {
    assert.equal(planMemoryLine({ title: 'Exam', date: '2026-10-15' }), 'Exam - Thu, Oct 15.');
  });

  it('adds the time when the message named one', () => {
    assert.equal(planMemoryLine({ title: 'Swim meet', date: '2026-10-17', time: '08:00' }), 'Swim meet - Sat, Oct 17, 08:00.');
  });
});
