import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  alarmCountdown,
  alarmsInOrder,
  earliest,
  freeShellsLeft,
  missedCall,
  MISSED_CALL_MS,
  nextRelativeWakeAt,
  resolveDateWidget,
  resolveGiftsAction,
  resolveSleepWidget,
  upcomingPlans,
} from './today-widgets';

// Saturday, Nov 7 2026, 15:00 local time.
const NOW = new Date(2026, 10, 7, 15, 0, 0, 0).getTime();
const TODAY = '2026-11-07';
const at = (h: number, m = 0, day = 7) => new Date(2026, 10, day, h, m, 0, 0).getTime();

describe('earliest & nextRelativeWakeAt', () => {
  it('picks the soonest moment and skips missing ones', () => {
    assert.equal(earliest(undefined, 30, 10, undefined), 10);
    assert.equal(earliest(undefined), undefined);
  });

  it('wakes every minute in the first hour, every hour in the first day, and stops after a day', () => {
    const tenSecAgo = new Date(NOW - 10_000).toISOString();
    assert.equal(nextRelativeWakeAt(tenSecAgo, NOW), NOW + 50_000);

    const twoHoursAgo = new Date(NOW - 2 * 3_600_000 - 15 * 60_000).toISOString();
    assert.equal(nextRelativeWakeAt(twoHoursAgo, NOW), NOW + 45 * 60_000);

    const twoDaysAgo = new Date(NOW - 2 * MISSED_CALL_MS).toISOString();
    assert.equal(nextRelativeWakeAt(twoDaysAgo, NOW), undefined);
    assert.equal(nextRelativeWakeAt(undefined, NOW), undefined);
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

describe('contextual widget chains: Date, Sleep, Gifts', () => {
  const known = new Set(['c_ethan', 'c_clara']);
  const hasCharacter = (id: string) => known.has(id);

  it('Date widget prioritizes an active date, then upcoming plan (targeting friend+day), else hero partner', () => {
    const schedules = [
      { characterId: 'c_blocked', date: TODAY, time: '15:30', title: 'Hidden' },
      { characterId: 'c_ethan', date: TODAY, time: '19:00', title: 'Movie night' },
      { characterId: 'c_clara', date: '2026-11-08', time: '10:00', title: 'Brunch' },
    ];

    const inProgress = resolveDateWidget({
      activeDate: { characterId: 'c_clara', placeId: 'rooftop', live: { title: 'Rooftop Stars' } },
      schedules,
      today: TODAY,
      now: NOW,
      heroId: 'c_ethan',
      hasCharacter,
    });
    assert.equal(inProgress.mode, 'activeDate');
    if (inProgress.mode === 'activeDate') {
      assert.equal(inProgress.characterId, 'c_clara');
      assert.equal(inProgress.placeId, 'rooftop');
      assert.equal(inProgress.customTitle, 'Rooftop Stars');
    }

    const planned = resolveDateWidget({
      activeDate: null,
      schedules,
      today: TODAY,
      now: NOW,
      heroId: 'c_clara',
      hasCharacter,
    });
    assert.equal(planned.mode, 'plan');
    if (planned.mode === 'plan') {
      assert.equal(planned.plan.characterId, 'c_ethan');
      assert.equal(planned.plan.title, 'Movie night');
      assert.equal(planned.nextPlan?.characterId, 'c_clara');
    }

    const empty = resolveDateWidget({
      activeDate: null,
      schedules: [],
      today: TODAY,
      now: NOW,
      heroId: 'c_clara',
      hasCharacter,
    });
    assert.deepEqual(empty, { mode: 'empty', partnerId: 'c_clara' });
  });

  it('Sleep widget keeps Alarms, Bedtime, and disabled alarms all reachable with zero dead ends', () => {
    const active = resolveSleepWidget({
      alarms: [
        { id: 'a1', enabled: true, hour: 7, minute: 30, repeat: [1, 2, 3], label: 'Gym', characterId: 'c_clara' },
        { id: 'a_blocked', enabled: true, hour: 6, minute: 0, repeat: [], label: 'Nope', characterId: 'c_gone' },
      ],
      now: NOW,
      heroId: 'c_ethan',
      hasCharacter,
    });
    assert.equal(active.mode, 'alarm');
    if (active.mode === 'alarm') {
      assert.equal(active.targetRoute, '/alarms');
      assert.equal(active.alarm.id, 'a1');
      assert.equal(active.bedtimePartnerId, 'c_clara');
      assert.equal(active.addFriendId, 'c_clara');
    }

    const disabledOnly = resolveSleepWidget({
      alarms: [{ id: 'a1', enabled: false, hour: 7, minute: 30, repeat: [], label: '', characterId: 'c_clara' }],
      now: NOW,
      heroId: 'c_ethan',
      hasCharacter,
    });
    assert.deepEqual(disabledOnly, {
      mode: 'empty',
      targetRoute: '/bedtime',
      partnerId: 'c_ethan',
      addFriendId: 'c_ethan',
      hasDisabledAlarms: true,
    });

    const none = resolveSleepWidget({
      alarms: [],
      now: NOW,
      heroId: 'c_ethan',
      hasCharacter,
    });
    assert.deepEqual(none, {
      mode: 'empty',
      targetRoute: '/bedtime',
      partnerId: 'c_ethan',
      addFriendId: 'c_ethan',
      hasDisabledAlarms: false,
    });
  });

  it('Gifts widget unifies spin, daily check-in, and first-step rewards so More badge never contradicts', () => {
    assert.equal(
      resolveGiftsAction({ daily: { spinDay: undefined, spinsUsed: 0 }, today: TODAY, checkInClaimed: false, stepReady: true }),
      'spin',
    );
    assert.equal(
      resolveGiftsAction({ daily: { spinDay: TODAY, spinsUsed: 1 }, today: TODAY, checkInClaimed: false, stepReady: true }),
      'checkIn',
    );
    assert.equal(
      resolveGiftsAction({ daily: { spinDay: TODAY, spinsUsed: 1 }, today: TODAY, checkInClaimed: true, stepReady: true }),
      'firstStep',
    );
    assert.equal(
      resolveGiftsAction({ daily: { spinDay: TODAY, spinsUsed: 1 }, today: TODAY, checkInClaimed: true, stepReady: false }),
      'none',
    );
  });

  it('computes live alarm countdowns and exact minute rollover boundaries', () => {
    const alarm = { hour: 21, minute: 30, repeat: [] };
    // NOW is 15:00:00 -> 6h 30m left; next minute decrement happens 50ms after 15:00 -> 15:01? No, at 15:00:00 it is 390m -> drops to 389m at 15:00:00.001? Let's test 15:00:20 too.
    const exact = alarmCountdown(alarm, NOW);
    assert.equal(exact.hours, 6);
    assert.equal(exact.minutes, 30);
    assert.equal(exact.ringAt, at(21, 30));

    // At 21:14:40 -> ceil(15m 20s) = 16m -> next drop at 21:15:00 + 50ms.
    const almost = alarmCountdown(alarm, at(21, 14) + 40_000);
    assert.equal(almost.hours, 0);
    assert.equal(almost.minutes, 16);
    assert.equal(almost.nextWakeAt, at(21, 15) + 50);

    // Morning alarm wraps cleanly to next day.
    const morning = alarmCountdown({ hour: 7, minute: 15, repeat: [] }, NOW);
    assert.equal(morning.hours, 16);
    assert.equal(morning.minutes, 15);
    assert.equal(morning.ringAt, at(7, 15, 8));
  });
});
