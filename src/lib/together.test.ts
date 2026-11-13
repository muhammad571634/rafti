import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { chatClock, togetherWith } from './together';

describe('chatClock', () => {
  it('sends now in UTC and the phone offset in minutes', () => {
    const now = new Date('2026-11-07T13:20:00.000Z');
    const clock = chatClock(now);
    assert.equal(clock.now, '2026-11-07T13:20:00.000Z');
    assert.equal(clock.utcOffsetMin, -now.getTimezoneOffset());
  });
});

describe('togetherWith: what the user set up with this friend', () => {
  const schedules = [
    { characterId: 'hana', title: 'Old', date: '2026-11-05' },
    { characterId: 'hana', title: 'Yesterday', date: '2026-11-06', time: '19:00' },
    { characterId: 'hana', title: 'Coffee', date: '2026-11-08', time: '18:30' },
    { characterId: 'hana', title: 'Today', date: '2026-11-07', time: '09:00' },
    { characterId: 'erik', title: 'Not hers', date: '2026-11-08' },
  ];
  const alarms = [
    { characterId: 'hana', enabled: true, hour: 7, minute: 0, repeat: [1, 2, 3, 4, 5], label: 'Gym' },
    { characterId: 'hana', enabled: false, hour: 9, minute: 0, repeat: [] },
    { characterId: 'erik', enabled: true, hour: 6, minute: 0, repeat: [] },
    { enabled: true, hour: 8, minute: 0, repeat: [] },
  ];

  it('keeps her plans from yesterday on, soonest first, and the alarms she wakes them with', () => {
    assert.deepEqual(togetherWith({ schedules, alarms }, 'hana', '2026-11-07'), {
      plans: [
        { title: 'Yesterday', date: '2026-11-06', time: '19:00' },
        { title: 'Today', date: '2026-11-07', time: '09:00' },
        { title: 'Coffee', date: '2026-11-08', time: '18:30' },
      ],
      wakes: [{ hour: 7, minute: 0, repeat: [1, 2, 3, 4, 5], label: 'Gym' }],
    });
  });

  it('is nothing for a friend with nothing set up', () => {
    assert.equal(togetherWith({ schedules, alarms }, 'kai', '2026-11-07'), undefined);
  });

  it('crosses a month and a year when it looks back a day', () => {
    const plans = togetherWith({ schedules: [{ characterId: 'hana', title: 'NYE', date: '2025-12-31' }], alarms: [] }, 'hana', '2026-01-01');
    assert.equal(plans?.plans.length, 1);
  });
});
