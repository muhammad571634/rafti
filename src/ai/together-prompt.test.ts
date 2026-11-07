import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { cleanClock, cleanTogether, clockLines, dayPart, togetherLines } from './together-prompt';

// Saturday, Nov 7 2026, 13:20 UTC = 18:20 in Tashkent (UTC+5).
const CLOCK = { now: '2026-11-07T13:20:00.000Z', utcOffsetMin: 300 };

describe('clockLines: the friend knows what time it is', () => {
  it('names the day, the time and the part of the day on the user clock', () => {
    const [line] = clockLines(CLOCK);
    assert.match(line, /Saturday 2026-11-07 18:20/);
    assert.match(line, /UTC\+05:00, evening/);
  });

  it('handles offsets west of UTC and the day before', () => {
    const [line] = clockLines({ now: '2026-11-07T03:00:00.000Z', utcOffsetMin: -300 });
    assert.match(line, /Friday 2026-11-06 22:00/);
    assert.match(line, /UTC-05:00, night/);
  });

  it('says nothing without a clock', () => {
    assert.deepEqual(clockLines(undefined), []);
  });

  it('names parts of the day as a person would', () => {
    assert.deepEqual([3, 8, 14, 19, 23].map(dayPart), ['night', 'morning', 'afternoon', 'evening', 'night']);
  });
});

describe('togetherLines: plans and wake-ups set up together', () => {
  it('lists plans with their day and time, and wake-ups with their days', () => {
    const lines = togetherLines(
      {
        plans: [
          { title: 'Coffee in the studio', date: '2026-11-08', time: '18:30' },
          { title: 'Exam', date: '2026-11-10' },
        ],
        wakes: [{ hour: 7, minute: 0, repeat: [1, 2, 3, 4, 5], label: 'Gym' }],
      },
      CLOCK,
    );
    assert.match(lines[0], /SET UP TOGETHER/);
    assert.match(lines[1], /Sun 2026-11-08 18:30: "Coffee in the studio"/);
    assert.match(lines[2], /Tue 2026-11-10 \(no set time\): "Exam"/);
    assert.match(lines[3], /wake them up at 07:00 on weekdays \("Gym"\)/);
  });

  it('marks a plan that already passed so the friend can ask how it went', () => {
    const lines = togetherLines({ plans: [{ title: 'Lunch', date: '2026-11-07', time: '13:00' }], wakes: [] }, CLOCK);
    assert.match(lines[1], /already passed/);
  });

  it('says how often an alarm rings', () => {
    const wake = (repeat: number[]) => togetherLines({ plans: [], wakes: [{ hour: 6, minute: 5, repeat }] })[1];
    assert.match(wake([]), /06:05 once/);
    assert.match(wake([0, 1, 2, 3, 4, 5, 6]), /every day/);
    assert.match(wake([0, 6]), /on weekends/);
    assert.match(wake([1, 3]), /on Mon, Wed/);
  });

  it('says nothing when nothing was set up', () => {
    assert.deepEqual(togetherLines({ plans: [], wakes: [] }), []);
    assert.deepEqual(togetherLines(undefined), []);
  });
});

describe('the server cleans what the app sends', () => {
  it('keeps a real clock and drops a wrong one', () => {
    assert.deepEqual(cleanClock(CLOCK), CLOCK);
    assert.equal(cleanClock({ now: 'soon', utcOffsetMin: 300 }), undefined);
    assert.equal(cleanClock({ now: CLOCK.now, utcOffsetMin: 2000 }), undefined);
    assert.equal(cleanClock('x'), undefined);
  });

  it('keeps well-formed plans and wake-ups, short and few', () => {
    const together = cleanTogether({
      plans: [
        { title: '  Coffee  ', date: '2026-11-08', time: '18:30' },
        { title: 'Bad date', date: 'tomorrow' },
        { title: '', date: '2026-11-08' },
        { title: 'Odd time', date: '2026-11-09', time: '25:00' },
      ],
      wakes: [{ hour: 7, minute: 0, repeat: [1, 9, 'x'] }, { hour: 30, minute: 0, repeat: [] }],
    });
    assert.deepEqual(together, {
      plans: [
        { title: 'Coffee', date: '2026-11-08', time: '18:30' },
        { title: 'Odd time', date: '2026-11-09' },
      ],
      wakes: [{ hour: 7, minute: 0, repeat: [1] }],
    });
  });

  it('drops an empty or wrong shape', () => {
    assert.equal(cleanTogether({ plans: [], wakes: [] }), undefined);
    assert.equal(cleanTogether(null), undefined);
  });
});
