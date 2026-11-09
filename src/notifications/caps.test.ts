import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Budget } from './budget';
import { capped, counts } from './caps';
import type { PlannedPush, PushKind } from './plan';

const at = (h: number, m = 0, day = 10) => new Date(2026, 10, day, h, m);
const push = (kind: PushKind, id: string, when: Date, extra: Partial<PlannedPush> = {}): PlannedPush => ({
  id,
  kind,
  at: when,
  characterId: 'hana',
  title: 'Hana',
  line: 'Hi',
  route: '/chat/c1',
  channel: 'messages',
  ...extra,
});
const budget = (day = 6, perFriend = 3): Budget => ({ day, perFriend: () => perFriend });
/** Quiet 23:00-08:00, as the default settings. */
const quiet = (d: Date) => d.getHours() >= 23 || d.getHours() < 8;
const plan = (pushes: PlannedPush[], b = budget(), sent: { id: string; at: string; characterId?: string }[] = []) => capped(pushes, quiet, b, () => 'warm', sent);
const hhmm = (d: Date) => d.toTimeString().slice(0, 5);

describe("the push planner's brakes", () => {
  it('moves a counted push out of quiet hours, later the same day', () => {
    const [moved] = plan([push('comeback', 'c', at(7, 30))]);
    assert.equal(hhmm(moved.at), '08:00');
  });

  it('keeps what the user asked for where it is, even at night, and never counts it', () => {
    const remind = push('remind', 'r', at(23, 20), { timeSensitive: true });
    const call = push('call', 'k', at(7, 0), { textKey: 'push.incomingCall' });
    assert.deepEqual(plan([remind, call]).map((p) => hhmm(p.at)), ['07:00', '23:20']);
    assert.equal(counts(remind), false);
    assert.equal(counts(call), false);
  });

  it('spaces counted pushes and gives each friend room', () => {
    const out = plan([push('care', 'a', at(9, 0)), push('diary', 'b', at(9, 10), { characterId: 'kai' }), push('touch', 'c', at(9, 20))]);
    const byId = Object.fromEntries(out.map((p) => [p.id, hhmm(p.at)]));
    assert.equal(byId.a, '09:00');
    assert.equal(byId.b, '09:40', 'another friend waits the half hour, in quarter-hour steps');
    assert.equal(byId.c, '11:05', 'the same friend waits two hours');
  });

  it('holds the day budget and each friend share, counting what already went out today', () => {
    const many = Array.from({ length: 10 }, (_, i) => push('comeback', `c${i}`, at(9 + i), { characterId: `f${i}` }));
    assert.equal(plan(many, budget(4)).length, 4);
    const sent = [{ id: 's1', at: at(8, 30).toISOString(), characterId: 'f0' }];
    assert.equal(plan(many, budget(4), sent).length, 3);
    const hana = [push('care', 'h1', at(9)), push('touch', 'h2', at(12)), push('life', 'h3', at(15))];
    assert.equal(plan(hana, budget(6, 2)).length, 2);
  });

  it('puts the more important push first when they want the same time', () => {
    const out = plan([push('spins', 's', at(18), { characterId: undefined }), push('care', 'c', at(18))]);
    assert.deepEqual(out.map((p) => [p.id, hhmm(p.at)]), [['c', '18:00'], ['s', '18:30']]);
  });

  it("a hello keeps to its hour: no room within the hour means no hello (she already wrote that morning)", () => {
    const care = push('care', 'care', at(9, 16));
    const hello = push('morning', 'hello', at(8, 30));
    const out = plan([care, hello]);
    assert.deepEqual(out.map((p) => p.id), ['care'], 'the hello would have moved to 11:16');
    const early = plan([push('care', 'care', at(11)), push('morning', 'hello', at(8, 30))]);
    assert.deepEqual(early.map((p) => [p.id, hhmm(p.at)]), [['hello', '08:30'], ['care', '11:00']]);
  });

  it('other pushes still move as far as the day allows', () => {
    const out = plan([push('care', 'care', at(9, 16)), push('diary', 'diary', at(9, 30))]);
    assert.equal(hhmm(out.find((p) => p.id === 'diary')!.at), '11:30');
  });
});
