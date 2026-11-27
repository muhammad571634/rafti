import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { AppState } from '@/store/use-app-store';

import { CAST_1_IDS, endedChats, retireCast, retiredIds } from './retire-cast';

const SEED = new Set(['c_milo', 'c_sam']);
const official = (id: string) => ({ id, name: id, isOfficial: true });
const mine = { id: 'c_mine1', name: 'Mine', isOfficial: false };

/** A save from before Cast 2.0: Hana (first cast), Milo (current cast) and a character of the user's own. */
function save() {
  return {
    characters: [official('c_hana'), official('c_milo'), mine],
    conversations: [
      { id: 'v_hana', characterId: 'c_hana' },
      { id: 'v_milo', characterId: 'c_milo' },
      { id: 'v_mine', characterId: 'c_mine1' },
    ],
    groups: [
      { id: 'g_two', memberIds: ['c_hana', 'c_mine1'] },
      { id: 'g_three', memberIds: ['c_hana', 'c_milo', 'c_mine1'] },
    ],
    messages: { v_hana: [{ id: 'm1' }], v_milo: [{ id: 'm2' }], v_mine: [{ id: 'm3' }], g_two: [{ id: 'm4' }] },
    relationships: { c_hana: { characterId: 'c_hana' }, c_milo: { characterId: 'c_milo' }, c_mine1: { characterId: 'c_mine1' } },
    memories: [{ id: 'mem1', characterId: 'c_hana' }, { id: 'mem2', characterId: 'c_mine1' }],
    alarms: [{ id: 'a1', characterId: 'c_hana' }],
    characterDiary: [{ id: 'p1', characterId: 'c_hana' }, { id: 'p2', characterId: 'c_mine1' }],
    selfQuizzes: { c_hana: { week: 'w', questions: [] }, c_mine1: { week: 'w', questions: [] } },
    recentlyViewed: ['c_hana', 'c_mine1'],
    pushLines: { 'greet:c_hana': { line: 'hi', writtenAt: '' } },
    wonFrames: ['seaside'],
    daily: { date: '2026-11-10', worldNewsSent: ['seaside:chapter:1'] },
    settings: { callerId: 'c_hana', realAi: true },
  } as unknown as Partial<AppState>;
}

describe('retiring the first cast', () => {
  it('names every one of the first 55 and any official character the cast no longer has', () => {
    assert.equal(CAST_1_IDS.size, 55);
    const ids = retiredIds([official('c_gone'), official('c_milo'), mine], SEED);
    assert.ok(ids.has('c_hana') && ids.has('c_gone'));
    assert.ok(!ids.has('c_milo') && !ids.has('c_mine1'));
  });

  it('removes a retired friend and everything with them', () => {
    const next = retireCast(save(), SEED);
    assert.deepEqual(next.characters!.map((c) => c.id), ['c_milo', 'c_mine1']);
    assert.deepEqual(next.conversations!.map((c) => c.id), ['v_milo', 'v_mine']);
    // The group left with one member goes with its messages.
    assert.deepEqual(Object.keys(next.messages!), ['v_milo', 'v_mine']);
    assert.deepEqual(Object.keys(next.relationships!), ['c_milo', 'c_mine1']);
    assert.deepEqual(next.memories!.map((m) => m.id), ['mem2']);
    assert.deepEqual(next.characterDiary!.map((p) => p.id), ['p2']);
    assert.deepEqual(Object.keys(next.selfQuizzes!), ['c_mine1']);
    assert.deepEqual(next.recentlyViewed, ['c_mine1']);
    assert.equal(next.settings!.callerId, undefined);
    assert.equal(next.settings!.realAi, true);
  });

  it('ends a group left with one member and keeps a group that still has two', () => {
    const next = retireCast(save(), SEED);
    assert.deepEqual(next.groups!.map((g) => [g.id, g.memberIds]), [['g_three', ['c_milo', 'c_mine1']]]);
  });

  it('keeps an alarm as a plain alarm, and clears the worlds and lines written ahead', () => {
    const next = retireCast(save(), SEED);
    assert.deepEqual(next.alarms, [{ id: 'a1', characterId: undefined }]);
    assert.deepEqual(next.wonFrames, []);
    assert.deepEqual(next.daily!.worldNewsSent, []);
    assert.deepEqual(next.pushLines, {});
  });

  it('writes back only the keys the save had, so nothing unsaved leaks in', () => {
    const next = retireCast({ characters: [official('c_hana')], relationships: {} } as unknown as Partial<AppState>, SEED);
    assert.deepEqual(Object.keys(next).sort(), ['characters', 'relationships']);
    assert.ok(!('typing' in next) && !('activeConversationId' in next));
  });

  it('leaves a save with nothing retired as it was', () => {
    const clean = { characters: [official('c_milo'), mine], relationships: { c_milo: { characterId: 'c_milo' } } } as unknown as Partial<AppState>;
    assert.deepEqual(retireCast(clean, SEED).relationships, clean.relationships);
  });
});

describe('the chats a retirement ended', () => {
  it('are the retired friends’ chats and the groups left with one member', () => {
    const before = save();
    assert.deepEqual(endedChats(before, retireCast(before, SEED)), ['v_hana', 'g_two']);
  });
});
