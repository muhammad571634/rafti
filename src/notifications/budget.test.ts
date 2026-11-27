import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { activityHours, asleep, dailyBudget, hourClock, learnedSleep, lonely, nextPushLog, placeFlexible, PUSH_BUDGET, pushDay, replyRate, sentToday } from './budget';
import type { CareItem, Message, Subscription } from '@/types';

const now = new Date(2026, 9, 26, 12, 0);
const ago = (days: number, hour: number, minute = 0) => {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};
let n = 0;
const mine = (createdAt: string): Message => ({ id: `m${n++}`, conversationId: 'c', author: 'me', kind: 'text', text: 'hi', createdAt });
const first = (createdAt: string, push = false): Message => ({
  id: push ? `m_push_${n++}` : `t${n++}`,
  conversationId: 'c',
  author: 'them',
  kind: 'text',
  text: 'hey',
  createdAt,
  ...(push ? {} : { reach: 'life:parent:lunch' }),
});
const plan = { plan: 'basic', status: 'active', termStart: ago(3, 9), willRenew: true } as Subscription;

describe('push budget', () => {
  it('gives 6 a day free and 20 with a plan, shared out by temper', () => {
    const rate = { lines: 0, answered: 0 };
    const free = dailyBudget({ rate, isLonely: false, now });
    assert.equal(free.day, PUSH_BUDGET.free.day);
    assert.equal(free.perFriend('warm'), 3);
    assert.equal(free.perFriend('clingy'), 4);
    assert.equal(free.perFriend('shy'), 2);
    const paid = dailyBudget({ subscription: plan, rate, isLonely: false, now });
    assert.equal(paid.day, PUSH_BUDGET.plan.day);
    assert.equal(paid.perFriend('warm'), 6);
  });

  it('tunes itself to how the user answers, but never leaves a lonely user alone', () => {
    const quiet = { lines: 10, answered: 1 };
    const some = { lines: 10, answered: 4 };
    const keen = { lines: 10, answered: 8 };
    assert.equal(dailyBudget({ subscription: plan, rate: quiet, isLonely: false, now }).day, 10);
    assert.equal(dailyBudget({ subscription: plan, rate: some, isLonely: false, now }).day, 15);
    assert.equal(dailyBudget({ subscription: plan, rate: keen, isLonely: false, now }).day, 20);
    assert.equal(dailyBudget({ subscription: plan, rate: quiet, isLonely: true, now }).day, 20);
    // Too few lines to tell: the whole budget.
    assert.equal(dailyBudget({ rate: { lines: 2, answered: 0 }, isLonely: false, now }).day, 6);
  });

  it('counts a line friends wrote first as answered when the user writes back in time', () => {
    const chat = [first(ago(1, 13)), mine(ago(1, 13, 40)), first(ago(1, 19), true), mine(ago(1, 23, 30)), first(ago(10, 13))];
    assert.deepEqual(replyRate([chat], now), { lines: 2, answered: 1 });
  });

  it('learns the hours the user is active and when they sleep', () => {
    const chat: Message[] = [];
    for (let d = 1; d <= 10; d++) for (const h of [8, 12, 18, 22, 0]) chat.push(mine(ago(d, h)));
    const hours = activityHours([chat], now);
    assert.equal(hours[8], 10);
    assert.equal(hours[3], 0);
    const sleep = learnedSleep(hours);
    assert.deepEqual(sleep, { from: 1, to: 8 });
    assert.ok(asleep(new Date(2026, 9, 27, 3, 0), sleep));
    assert.ok(!asleep(new Date(2026, 9, 27, 0, 30), sleep));
    // Too little to tell: 23:30 to 07:30.
    assert.deepEqual(learnedSleep(activityHours([[mine(ago(1, 9))]], now)), PUSH_BUDGET.defaultSleep);
  });

  it('places a push without an exact time in an active hour, a little later, never earlier', () => {
    const chat: Message[] = [];
    for (let d = 1; d <= 10; d++) for (const h of [8, 13, 20]) chat.push(mine(ago(d, h)));
    const hours = activityHours([chat], now);
    const sleep = learnedSleep(hours);
    const wanted = new Date(2026, 9, 27, 11, 0);
    const placed = placeFlexible(wanted, 'life:x', hours, sleep);
    // 11:00 and 12:00 are never active; 13:00 is, within the two hours a push may move.
    assert.equal(placed.getHours(), 13);
    assert.ok(placed.getTime() - new Date(2026, 9, 27, 13, 0).getTime() <= PUSH_BUDGET.jitterMin * 60_000);
    assert.equal(placeFlexible(wanted, 'life:x', hours, sleep).getTime(), placed.getTime());
    const active = new Date(2026, 9, 27, 8, 0);
    assert.ok(placeFlexible(active, 'a', hours, sleep).getTime() >= active.getTime());
  });

  it('sees loneliness in sad check-ins and nights awake', () => {
    const hours = new Array<number>(24).fill(0);
    const sad = [{ id: 'c', characterId: 'k', kind: 'lonely', dueAt: ago(1, 15), createdAt: ago(1, 12) } as CareItem];
    assert.ok(lonely(sad, hours, now));
    assert.ok(!lonely([], hours, now));
    hours[2] = 3;
    assert.ok(lonely([], hours, now));
  });

  it('keeps what went out today in the log and swaps the rest for the new plan', () => {
    const log = [
      { id: 'a', at: ago(0, 9) },
      { id: 'b', at: ago(0, 11, 30), characterId: 'c_kai' },
      { id: 'c', at: ago(0, 15) },
      { id: 'd', at: ago(1, 20) },
    ];
    assert.deepEqual(sentToday(log, now).map((p) => p.id), ['a', 'b']);
    const later = new Date(now.getTime() + 3_600_000);
    const next = nextPushLog(log, [{ id: 'e', at: later, characterId: 'c_iris' }], now);
    assert.deepEqual(next.map((p) => p.id), ['a', 'b', 'e']);
    assert.equal(next[2].at, later.toISOString());
    assert.equal(next[2].characterId, 'c_iris');
  });

  it('shows today as sent of the budget, with the sleep as clock times', () => {
    const daily = { pushLog: [{ id: 'a', at: ago(0, 9) }, { id: 'b', at: ago(0, 18) }] };
    const today = pushDay({ messages: {}, care: [], wallet: {}, daily }, now);
    assert.deepEqual(today, { sent: 1, budget: PUSH_BUDGET.free.day, sleep: PUSH_BUDGET.defaultSleep });
    assert.equal(hourClock(23.5), '23:30');
    assert.equal(hourClock(7.5), '07:30');
    assert.equal(hourClock(0), '00:00');
  });
});
