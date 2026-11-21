import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { alarmsInOrder, earliest, freeShellsLeft, missedCall, MISSED_CALL_MS, upcomingPlans } from './today-widgets';

// Saturday, Nov 7 2026, 15:00 local time.
const NOW = new Date(2026, 10, 7, 15, 0, 0, 0).getTime();
const TODAY = '2026-11-07';
const at = (h: number, m = 0, day = 7) => new Date(2026, 10, day, h, m, 0, 0).getTime();

describe('earliest', () => {
  it('picks the soonest moment and skips missing ones', () => {
    assert.equal(earliest(undefined, 30, 10, undefined), 10);
    assert.equal(earliest(undefined), undefined);
  });
});

describe('upcomingPlans: the Date widget', () => {
  const plans = [
    { id: 'gone', date: TODAY, time: '09:00' },
    { id: 'later', date: TODAY, time: '18:30' },
    { id: 'soon', date: TODAY, time: '16:00' },
    { id: 'untimed', date: TODAY },
    { id: 'tomorrow', date: '2026-11-08', time: '10:00' },
    { id: 'old', date: '2026-11-06', time: '20:00' },
  ];

  it('keeps what is still ahead, nearest first', () => {
    const { plans: ahead } = upcomingPlans(plans, TODAY, NOW);
    assert.deepEqual(
      ahead.map((p) => p.id),
      ['untimed', 'soon', 'later', 'tomorrow'],
    );
  });

  it('changes when the next timed plan of today starts', () => {
    assert.equal(upcomingPlans(plans, TODAY, NOW).changesAt, at(16));
  });

  it('a started plan leaves at its start', () => {
    const { plans: ahead, changesAt } = upcomingPlans(plans, TODAY, at(16, 0) + 1);
    assert.deepEqual(
      ahead.map((p) => p.id),
      ['untimed', 'later', 'tomorrow'],
    );
    assert.equal(changesAt, at(18, 30));
  });

  it('has nothing to wait for without timed plans today', () => {
    assert.equal(upcomingPlans([{ date: '2026-11-09', time: '08:00' }], TODAY, NOW).changesAt, undefined);
  });
});

describe('alarmsInOrder: the Sleep widget', () => {
  const alarms = [
    { id: 'off', enabled: false, hour: 16, minute: 0, repeat: [] },
    { id: 'morning', enabled: true, hour: 7, minute: 0, repeat: [] },
    { id: 'evening', enabled: true, hour: 21, minute: 30, repeat: [] },
  ];

  it('lists the alarms that are on, the next to ring first', () => {
    assert.deepEqual(
      alarmsInOrder(alarms, NOW).alarms.map((a) => a.id),
      ['evening', 'morning'],
    );
  });

  it('changes when the first one rings', () => {
    assert.equal(alarmsInOrder(alarms, NOW).changesAt, at(21, 30));
  });

  it('after it rings, the morning one leads', () => {
    assert.deepEqual(
      alarmsInOrder(alarms, at(21, 31)).alarms.map((a) => a.id),
      ['morning', 'evening'],
    );
  });

  it('has nothing to wait for with every alarm off', () => {
    assert.equal(alarmsInOrder([alarms[0]], NOW).changesAt, undefined);
  });
});

describe('missedCall: the Calls widget', () => {
  const iso = (t: number) => new Date(t).toISOString();

  it('offers to call back a friend whose call went unanswered today', () => {
    const calls = [{ characterId: 'hana', startedAt: iso(at(13)), direction: 'incoming' as const, missed: true }];
    const { call, changesAt } = missedCall(calls, NOW);
    assert.equal(call?.characterId, 'hana');
    assert.equal(changesAt, at(13) + MISSED_CALL_MS);
  });

  it('a later call with that friend settles it', () => {
    const calls = [
      { characterId: 'hana', startedAt: iso(at(13)), direction: 'incoming' as const, missed: true },
      { characterId: 'hana', startedAt: iso(at(14)), direction: 'outgoing' as const, missed: false },
    ];
    assert.equal(missedCall(calls, NOW).call, undefined);
  });

  it('a missed outgoing call is not theirs to call back', () => {
    const calls = [{ characterId: 'hana', startedAt: iso(at(13)), direction: 'outgoing' as const, missed: true }];
    assert.equal(missedCall(calls, NOW).call, undefined);
  });

  it('older than a day, it is gone', () => {
    const calls = [{ characterId: 'hana', startedAt: iso(NOW - MISSED_CALL_MS - 1), direction: 'incoming' as const, missed: true }];
    assert.equal(missedCall(calls, NOW).call, undefined);
  });

  it('looks past a friend whose last call was answered', () => {
    const calls = [
      { characterId: 'erik', startedAt: iso(at(14)), direction: 'outgoing' as const, missed: false },
      { characterId: 'hana', startedAt: iso(at(12)), direction: 'incoming' as const, missed: true },
    ];
    assert.equal(missedCall(calls, NOW).call?.characterId, 'hana');
  });
});

describe('freeShellsLeft: the Store widget', () => {
  it('counts only today free shells', () => {
    assert.equal(freeShellsLeft({ free: { day: TODAY, amount: 40 } }, TODAY), 40);
    assert.equal(freeShellsLeft({ free: { day: '2026-11-06', amount: 40 } }, TODAY), 0);
    assert.equal(freeShellsLeft({}, TODAY), 0);
  });
});
