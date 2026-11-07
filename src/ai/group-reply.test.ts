import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Character, Message, User } from '@/types';

import { cleanGroupLines, groupHelloCue, groupReplyParts, groupTurns, layoutGroupReply } from './group-reply';

const base = { handle: '@x', bio: 'Bio.', category: 'school', accentIndex: 0, voiceReady: false, tags: ['calm'], greeting: 'Hi.' };
const ronan = { ...base, id: 'c_ronan', name: 'Ronan Vale', series: 'Velvet District' } as unknown as Character;
const isolde = { ...base, id: 'c_isolde', name: 'Isolde Valcour', series: 'Velvet District' } as unknown as Character;
const user = { displayName: 'Sam', locale: 'en' } as User;

const line = (author: 'me' | 'them', text: string, characterId?: string): Message =>
  ({ id: text, conversationId: 'g', author, kind: 'text', text, characterId, createdAt: '2026-10-31T10:00:00.000Z' }) as Message;

const chat = [line('me', 'are you two on the same side?'), line('them', 'Nobody is.', 'c_isolde'), line('them', 'Stay by the door.', 'c_ronan'), line('me', 'ok then')];

describe('a group as one member reads it', () => {
  it('keeps their own lines theirs and names everyone else', () => {
    assert.deepEqual(groupTurns({ character: ronan, others: [isolde], user, messages: chat }), [
      { role: 'user', text: 'Sam: are you two on the same side?\nIsolde Valcour: Nobody is.' },
      { role: 'assistant', text: 'Stay by the door.' },
      { role: 'user', text: 'Sam: ok then' },
    ]);
  });

  it('reads the same chat from the other side', () => {
    assert.deepEqual(groupTurns({ character: isolde, others: [ronan], user, messages: chat })[1], { role: 'assistant', text: 'Nobody is.' });
  });

  it('uses the name the user plays under', () => {
    const persona = { name: 'Dana' } as never;
    assert.match(groupTurns({ character: ronan, others: [isolde], user, persona, messages: chat })[0].text, /^Dana: /);
  });
});

describe('a member’s prompt', () => {
  const input = { character: ronan, others: [isolde], user, messages: chat };

  it('is this member’s persona, the group, and the shape of an answer', () => {
    const text = groupReplyParts(input).map((p) => p.text).join('\n');
    assert.match(text, /Name: Ronan Vale/);
    assert.match(text, /group chat with Sam and:/);
    assert.match(text, /Isolde Valcour \(from Velvet District\): you already know each other/);
    assert.match(text, /no name in front/);
  });

  it('carries the turn’s cue after the history', () => {
    assert.match(layoutGroupReply({ ...input, cue: groupHelloCue('Isolde') }).turn, /you speak first/);
    assert.doesNotMatch(layoutGroupReply(input).turn, /you speak first/);
  });

  it('follows a crisis with the cue', () => {
    assert.match(layoutGroupReply({ ...input, crisis: true }).turn.toLowerCase(), /crisis|danger|safe/);
  });
});

describe('what the model wrote', () => {
  it('takes this member’s own name off a line, full or first', () => {
    assert.deepEqual(cleanGroupLines(['Ronan Vale: Stay.', '**Ronan:** Back.', 'Ronan looks away.'], ronan, [isolde]), ['Stay.', 'Back.', 'Ronan looks away.']);
  });

  it('drops a line written for someone else', () => {
    assert.deepEqual(cleanGroupLines(['Isolde: Darling.', 'Isolde Valcour: Quite.', 'Isolde is lying.'], ronan, [isolde]), ['Isolde is lying.']);
  });
});
