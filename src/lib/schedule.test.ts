import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { detectPlan } from './schedule';

// A Monday, 14:00 local time.
const now = new Date(2026, 9, 26, 14, 0);

describe('plans the user mentions (English, the launch market)', () => {
  it('reads first-person plans and plans said without "I"', () => {
    assert.deepEqual(detectPlan('I have an exam tomorrow at 9am', now), { title: 'Exam', date: '2026-10-27', time: '09:00', when: 'tomorrow at 09:00' });
    assert.equal(detectPlan('Exam tomorrow morning at 8:30', now)?.time, '08:30');
    assert.equal(detectPlan('Job interview on Friday at 10am', now)?.date, '2026-10-30');
    assert.equal(detectPlan("Doctor's appointment Monday at 2:30pm", now)?.time, '14:30');
  });

  it('puts "tonight at 8" in the evening', () => {
    assert.equal(detectPlan("I'm meeting Sarah tonight at 8", now)?.time, '20:00');
    assert.equal(detectPlan('date tonight at 7!!', now)?.time, '19:00');
  });

  it('leaves questions and the other person’s plans alone', () => {
    assert.equal(detectPlan('What are you doing tomorrow?', now), null);
    assert.equal(detectPlan('Is your exam tomorrow?', now), null);
    assert.equal(detectPlan('Exam tomorrow?', now), null);
  });
});
