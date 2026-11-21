import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEEP_CHAT_LINES, FIRST_STEPS, firstStepReady, firstStepReward, firstStepsDone, firstStepsOpen, firstStepStates, type FirstStepsInput } from './first-steps';

const me = { author: 'me' as const, kind: 'text' as const };
const them = { author: 'them' as const, kind: 'text' as const };
const base: FirstStepsInput = { characters: [{ id: 'a', isOfficial: true }], conversations: [], messages: {}, plans: 0, notifications: false };

describe('first steps (0z294)', () => {
  it('pays 110 shells in all, each step once', () => {
    assert.equal(FIRST_STEPS.reduce((n, s) => n + s.reward, 0), 110);
    assert.equal(firstStepReward('create'), 30);
    assert.equal(firstStepReward('nope'), undefined);
  });

  it('starts with nothing done', () => {
    assert.deepEqual(firstStepsDone(base), { friends: false, create: false, deep: false, plan: false, notify: false });
  });

  it('counts friends the user wrote to, not ones who only wrote first', () => {
    const conversations = ['a', 'b', 'c'].map((f) => ({ id: `c${f}`, characterId: f }));
    const two = { ca: [me], cb: [them, me], cc: [them] };
    assert.equal(firstStepsDone({ ...base, conversations, messages: two }).friends, false);
    assert.equal(firstStepsDone({ ...base, conversations, messages: { ...two, cc: [me] } }).friends, true);
  });

  it('needs 20 of the user’s own lines in one chat; markers and cards do not count', () => {
    const conversations = [{ id: 'c1', characterId: 'a' }];
    const almost = [...Array(DEEP_CHAT_LINES - 1).fill(me), { author: 'me' as const, kind: 'system' as const, card: 'skip' as const }];
    assert.equal(firstStepsDone({ ...base, conversations, messages: { c1: almost } }).deep, false);
    assert.equal(firstStepsDone({ ...base, conversations, messages: { c1: [...almost, me] } }).deep, true);
  });

  it('sees an own character, a plan or alarm, and pushes allowed', () => {
    const done = firstStepsDone({ ...base, characters: [...base.characters, { id: 'u1', isOfficial: false }], plans: 1, notifications: true });
    assert.ok(done.create && done.plan && done.notify);
  });

  it('reads each step as to do, ready or claimed, and closes when all are paid', () => {
    const done = { friends: true, create: false, deep: false, plan: true, notify: false };
    const states = firstStepStates(done, { plan: '2026-11-19' });
    assert.deepEqual(states, { friends: 'ready', create: 'todo', deep: 'todo', plan: 'claimed', notify: 'todo' });
    assert.ok(firstStepReady(states));
    assert.ok(firstStepsOpen({ plan: 'x' }));
    assert.ok(!firstStepsOpen({ friends: 'x', create: 'x', deep: 'x', plan: 'x', notify: 'x' }));
  });
});
