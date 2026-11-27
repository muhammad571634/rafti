import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { AppState } from '@/store/use-app-store';

import { forgetFriend } from './forget-friend';

const HANA = 'c_hana';
const ERIK = 'c_erik';
const KAI = 'c_kai';

/** Every per-friend slice with one row for Hana and one for Erik. */
function state(): AppState {
  const both = <T,>(make: (characterId: string, i: number) => T) => [make(HANA, 0), make(ERIK, 1)];
  return {
    conversations: both((characterId, i) => ({ id: `conv${i}`, characterId })),
    groups: [
      { id: 'g_pair', memberIds: [HANA, ERIK] },
      { id: 'g_three', memberIds: [HANA, ERIK, KAI] },
    ],
    messages: { conv0: [{ id: 'm0' }], conv1: [{ id: 'm1' }], g_pair: [{ id: 'm2' }], g_three: [{ id: 'm3' }] },
    typing: { conv0: true },
    activeConversationId: 'conv0',
    relationships: { [HANA]: { level: 5 }, [ERIK]: { level: 3 } },
    memories: both((characterId, i) => ({ id: `mem${i}`, characterId })),
    moments: both((characterId, i) => ({ id: `mo${i}`, characterId })),
    schedules: both((characterId, i) => ({ id: `s${i}`, characterId })),
    notes: both((characterId, i) => ({ id: `n${i}`, characterId })),
    boardPosts: both((characterId, i) => ({ id: `b${i}`, characterId })),
    photos: both((characterId, i) => ({ id: `p${i}`, characterId })),
    radioClips: both((characterId, i) => ({ id: `r${i}`, characterId })),
    dateThemes: both((characterId, i) => ({ id: `d${i}`, characterId })),
    threads: both((characterId, i) => ({ id: `t${i}`, characterId })),
    calls: both((characterId, i) => ({ id: `call${i}`, characterId })),
    diary: [
      { id: 'dy0', reply: { characterId: HANA, text: 'Cute page', createdAt: '' }, sharedWithCharacterId: HANA },
      { id: 'dy1', reply: { characterId: ERIK, text: 'Nice', createdAt: '' } },
    ],
    alarms: both((characterId, i) => ({ id: `a${i}`, characterId, hour: 7, minute: 0, enabled: true })),
    wake: { alarmId: 'a0', characterId: HANA },
    activeDate: { characterId: HANA },
    settings: { callerId: HANA },
  } as unknown as AppState;
}

describe('forgetFriend (0z181: Block, Remove friend and Delete share one cleanup)', () => {
  it('leaves nothing of the friend anywhere, and everything of the others', () => {
    const before = state();
    const after = { ...before, ...forgetFriend(before, HANA) } as AppState;
    // Hana's id is nowhere but in the alarm she no longer has.
    const left = JSON.stringify({ ...after, alarms: after.alarms.map((a) => ({ ...a, characterId: a.characterId ?? null })) });
    assert.ok(!left.includes(HANA), left);
    // Erik keeps every row; the pair group with Hana ends, the group of three goes on without her.
    assert.deepEqual(after.conversations.map((c) => c.id), ['conv1']);
    assert.deepEqual(after.groups.map((g) => [g.id, g.memberIds]), [['g_three', [ERIK, KAI]]]);
    assert.deepEqual(Object.keys(after.messages).sort(), ['conv1', 'g_three']);
    assert.equal(after.activeConversationId, null);
    assert.equal(after.calls.length, 1);
    assert.equal(after.threads.length, 1);
    assert.equal(after.diary[1].reply?.characterId, ERIK);
    assert.equal(after.diary[0].reply, undefined, 'her reply goes, the page stays');
    assert.equal(after.diary.length, 2);
  });

  it('keeps the alarm she woke them with, as a plain alarm: a removed friend must not cost a morning', () => {
    const after = forgetFriend(state(), HANA);
    assert.deepEqual(after.alarms?.map((a) => [a.id, a.characterId, a.enabled]), [['a0', undefined, true], ['a1', ERIK, true]]);
    assert.equal(after.wake, null);
  });
});
