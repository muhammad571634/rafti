import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { alreadySaid, type OutboxItem, type SaidState } from './outbox';

const item = (id: string, kind: OutboxItem['kind']): OutboxItem => ({ id, kind, characterId: 'hana', line: 'Hi', at: '2026-11-09T08:00:00.000Z' });
const state = (over: Partial<SaidState> = {}): SaidState => ({
  daily: { greetedSlots: [], lifeSent: [], worldNewsSent: [] },
  schedules: [],
  care: [],
  threads: [],
  user: {},
  ...over,
});

describe('a line the app already said is not landed again', () => {
  it('a reminder, a follow-up, a check-in, a thread touch, the birthday', () => {
    const said = state({
      schedules: [{ id: 's1', reminded: true, followedUp: true }],
      care: [{ id: 'c1', done: true }],
      threads: [{ touches: [{ id: 't1', sent: true }] }],
      user: { birthdayWishedYear: 2026 },
    });
    assert.equal(alreadySaid(item('remind:s1', 'remind'), said), true);
    assert.equal(alreadySaid(item('followUp:s1', 'followUp'), said), true);
    assert.equal(alreadySaid(item('care:c1', 'care'), said), true);
    assert.equal(alreadySaid(item('touch:t1', 'touch'), said), true);
    assert.equal(alreadySaid(item('birthday:2026-11-09', 'birthday'), said), true);
  });

  it('the brief and the evening question by their slot, a family moment and world news by their key', () => {
    const said = state({ daily: { greetedSlots: ['2026-11-09:morning', '2026-11-09:night'], lifeSent: ['2026-11-09:hana:lunch'], worldNewsSent: ['w1|2026-11-09'] } });
    assert.equal(alreadySaid(item('brief:2026-11-09:morning:hana', 'brief'), said), true);
    assert.equal(alreadySaid(item('day:2026-11-09:night:hana', 'day'), said), true);
    assert.equal(alreadySaid(item('life:2026-11-09:hana:lunch', 'life'), said), true);
    assert.equal(alreadySaid({ ...item('world:w1', 'world'), at: new Date(2026, 10, 9, 12).toISOString() }, said), true);
  });

  it('a greeting is left to land: a slot can carry two friends’ hellos', () => {
    const said = state({ daily: { greetedSlots: ['2026-11-09:morning'] } });
    assert.equal(alreadySaid(item('morning:2026-11-09:morning:kai', 'morning'), said), false);
  });

  it('what is still open lands, and a comeback always does', () => {
    const open = state({ schedules: [{ id: 's1', reminded: false }], care: [{ id: 'c1' }], threads: [{ touches: [{ id: 't1' }] }] });
    assert.equal(alreadySaid(item('remind:s1', 'remind'), open), false);
    assert.equal(alreadySaid(item('care:c1', 'care'), open), false);
    assert.equal(alreadySaid(item('touch:t1', 'touch'), open), false);
    assert.equal(alreadySaid(item('comeback:2026-11-09:1:hana', 'comeback'), open), false);
  });
});
