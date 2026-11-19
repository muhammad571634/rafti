import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { eventsFromChange, type WatchedState } from './analytics-diff.ts';

const base: WatchedState = {
  messages: { conv_kai: [{ id: 'm1', author: 'them', kind: 'text' }] },
  conversations: [{ id: 'conv_kai', characterId: 'c_kai' }],
  groups: [{ id: 'grp_1' }],
  calls: [],
  characters: [{ id: 'c_kai', isOfficial: true }],
  levelUp: null,
  user: { onboardedAt: '2026-11-01T10:00:00Z' },
  wallet: {},
  daily: { checkInDay: 1, lastLoginDay: '2026-11-18' },
  replyVersions: {},
};
const names = (prev: WatchedState, next: WatchedState) => eventsFromChange(prev, next).map((e) => e.name);

describe('eventsFromChange', () => {
  it('sees nothing when nothing changed', () => {
    assert.deepEqual(eventsFromChange(base, { ...base }), []);
  });

  it('counts a line you sent, with its kind and friend, and not cards or system lines', () => {
    const list = base.messages.conv_kai ?? [];
    const next = {
      ...base,
      messages: {
        ...base.messages,
        conv_kai: [...list, { id: 'm2', author: 'me' as const, kind: 'voice' }, { id: 'm3', author: 'me' as const, kind: 'text', card: 'setup' }, { id: 'm4', author: 'them' as const, kind: 'text' }],
      },
    };
    assert.deepEqual(eventsFromChange(base, next), [{ name: 'message_sent', props: { kind: 'voice', group: false, character: 'c_kai' } }]);
  });

  it('sees an invitation under their reply, not one in a restored chat', () => {
    const list = base.messages.conv_kai ?? [];
    const next = { ...base, messages: { conv_kai: [...list, { id: 'm2', author: 'them' as const, kind: 'text', next: 'quiz' }] } };
    assert.deepEqual(eventsFromChange(base, next), [{ name: 'next_shown', props: { kind: 'quiz', character: 'c_kai' } }]);
  });

  it('marks a group line as a group line', () => {
    const next = { ...base, messages: { ...base.messages, grp_1: [{ id: 'g1', author: 'me' as const, kind: 'text' }] } };
    assert.deepEqual(eventsFromChange(base, next), [{ name: 'message_sent', props: { kind: 'text', group: true } }]);
  });

  it('does not count a chat that arrives whole (a restore)', () => {
    const restored = Array.from({ length: 10 }, (_, i) => ({ id: `r${i}`, author: 'me' as const, kind: 'text' }));
    assert.deepEqual(names(base, { ...base, messages: { ...base.messages, conv_new: restored } }), []);
  });

  it('does not count your old lines read back into a chat that had some', () => {
    const page = Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, author: 'me' as const, kind: 'text' }));
    assert.deepEqual(names(base, { ...base, messages: { conv_kai: [...page, ...(base.messages.conv_kai ?? [])] } }), []);
  });

  it('sees a failed reply and a rating, once each', () => {
    const sent = { ...base, messages: { conv_kai: [{ id: 'm1', author: 'them' as const, kind: 'text' }, { id: 'm2', author: 'me' as const, kind: 'text' }] } };
    const failed = { ...sent, messages: { conv_kai: [{ id: 'm1', author: 'them' as const, kind: 'text', rating: 'up' as const }, { id: 'm2', author: 'me' as const, kind: 'text', failed: true }] } };
    assert.deepEqual(eventsFromChange(sent, failed), [
      { name: 'reply_rated', props: { rating: 'up', character: 'c_kai' } },
      { name: 'reply_failed', props: { character: 'c_kai' } },
    ]);
    // The same flags again are not new.
    assert.deepEqual(names(failed, { ...failed, messages: { conv_kai: [...(failed.messages.conv_kai ?? [])] } }), []);
  });

  it('names the version kept when the user writes on after browsing', () => {
    const exchange = { conv_kai: [{ id: 'm1', author: 'them' as const, kind: 'text' }, { id: 'm2', author: 'me' as const, kind: 'text' }, { id: 'm3', author: 'them' as const, kind: 'text' }] };
    const browsed = { ...base, messages: exchange, replyVersions: { conv_kai: { afterId: 'm2', versions: [['a'], ['b'], ['c']], index: 1 } } };
    const wrote = { ...browsed, messages: { conv_kai: [...exchange.conv_kai, { id: 'm4', author: 'me' as const, kind: 'text' }] } };
    assert.deepEqual(eventsFromChange(browsed, wrote), [
      { name: 'message_sent', props: { kind: 'text', group: false, character: 'c_kai' } },
      { name: 'version_kept', props: { index: 2, of: 3, character: 'c_kai' } },
    ]);
    // A later line is not a second choice.
    const later = { ...wrote, messages: { conv_kai: [...wrote.messages.conv_kai, { id: 'm5', author: 'them' as const, kind: 'text' }, { id: 'm6', author: 'me' as const, kind: 'text' }] } };
    assert.deepEqual(names(wrote, later), ['message_sent']);
  });

  it('counts another version of their reply only when one is added', () => {
    const one = { ...base, replyVersions: { conv_kai: { afterId: 'm2', versions: [[], []], index: 0 } } };
    assert.deepEqual(names(base, one), ['regenerate']);
    const browsed = { ...one, replyVersions: { conv_kai: { afterId: 'm2', versions: [[], []], index: 0 } } };
    assert.deepEqual(names(one, browsed), []);
    const two = { ...one, replyVersions: { conv_kai: { afterId: 'm2', versions: [[], [], []], index: 0 } } };
    assert.deepEqual(names(one, two), ['regenerate']);
  });

  it('logs a call, a level, a character of your own, onboarding, a plan and a check-in', () => {
    const fresh = { ...base, user: {} };
    const next: WatchedState = {
      ...fresh,
      calls: [{ id: 'call1', characterId: 'c_kai', durationSec: 61.4, direction: 'outgoing', missed: false }],
      characters: [...base.characters, { id: 'c_mine', isOfficial: false }],
      levelUp: { characterId: 'c_kai', level: 3 },
      user: { onboardedAt: '2026-11-19T10:00:00Z' },
      wallet: { subscription: { plan: 'basic', status: 'trial' } },
      daily: { checkInDay: 2, lastLoginDay: '2026-11-19' },
    };
    assert.deepEqual(eventsFromChange(fresh, next), [
      { name: 'call', props: { character: 'c_kai', seconds: 61, direction: 'outgoing', missed: false } },
      { name: 'character_created' },
      { name: 'level_up', props: { character: 'c_kai', level: 3 } },
      { name: 'onboarding_done', props: { character: 'c_kai' } },
      { name: 'plan_start', props: { plan: 'basic', trial: true } },
      { name: 'check_in', props: { day: 2 } },
    ]);
    // A trial turning paid is a start too; the same plan read again is not.
    const paid = { ...next, wallet: { subscription: { plan: 'basic', status: 'active' } } };
    assert.deepEqual(names(next, paid), ['plan_start']);
    assert.deepEqual(names(paid, { ...paid, wallet: { subscription: { plan: 'basic', status: 'active' } } }), []);
  });
});
