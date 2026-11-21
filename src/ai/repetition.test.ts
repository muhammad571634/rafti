import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Character, Message, User } from '@/types';

import { chatParts } from './chat-prompt';
import { joinParts } from './prompt-layout';
import { findRepeat, OPENERS_MAX, openerLines, REPEAT_THRESHOLD, repeatCue, similarity, theirReplies } from './repetition';

let n = 0;
const msg = (author: 'me' | 'them', text: string, extra: Partial<Message> = {}): Message => ({
  id: `m${n++}`,
  conversationId: 'c',
  author,
  kind: 'text',
  text,
  createdAt: '2026-10-28T10:00:00Z',
  ...extra,
});

const chat = [
  msg('them', 'Hey you! Long time no see.'),
  msg('me', 'hi, rough day at work'),
  msg('them', 'Oh no, come sit with me and tell me everything that happened.'),
  msg('them', '*pats the couch*'),
  msg('me', 'my boss yelled at me'),
  msg('them', 'Oh, that is so unfair of him, you work harder than anyone I know.'),
];

describe('the repetition guard (backend-plan §12.7)', () => {
  it('reads their replies as runs of their lines, skipping calls and cards', () => {
    const lines = [...chat, msg('them', '', { kind: 'call', durationSec: 30 }), msg('them', 'Continue', { card: 'continue' }), msg('them', 'Still here.')];
    assert.deepEqual(theirReplies(lines), [
      ['Hey you! Long time no see.'],
      ['Oh no, come sit with me and tell me everything that happened.', '*pats the couch*'],
      ['Oh, that is so unfair of him, you work harder than anyone I know.', 'Still here.'],
    ]);
    assert.equal(theirReplies(lines, 1).length, 1);
  });

  it('measures closeness like pg_trgm: the same words score 1, a paraphrase high, another line low', () => {
    assert.equal(similarity('Come sit with me.', 'come sit with me'), 1);
    assert.ok(similarity('Oh no, come sit with me and tell me everything', 'Oh no, come and sit with me, tell me everything') > REPEAT_THRESHOLD);
    assert.ok(similarity('Oh no, come sit with me and tell me everything', 'Did you eat anything today? Be honest.') < 0.2);
    assert.equal(similarity('', 'anything'), 0);
  });

  it('finds an echo of an earlier line, in one bubble or across bubbles, and lets short lines come back', () => {
    const hit = findRepeat(['Aww.', 'Oh no, come and sit with me, tell me everything that happened.'], chat);
    assert.equal(hit?.line, 'Oh no, come sit with me and tell me everything that happened.');
    assert.ok((hit?.score ?? 0) >= REPEAT_THRESHOLD);
    assert.ok(findRepeat(['Oh, that is so unfair of him,', 'you work harder than anyone I know.'], chat));
    assert.equal(findRepeat(['Long time no see.'], chat), null);
    assert.equal(findRepeat(['What did he say, word for word? I want to know.'], chat), null);
    assert.ok(findRepeat(['Breathe. You did your best with the report today.'], [], ['Breathe. You did your best with that report today.']));
  });

  it('lists how recent replies opened, newest last, and names a word that started most of them', () => {
    assert.deepEqual(openerLines([]), []);
    const lines = openerLines(chat);
    assert.equal(lines[0], 'YOUR RECENT REPLIES OPENED WITH (start this one differently):');
    assert.deepEqual(lines.slice(1), ['- "Hey you! Long time no see.…"', '- "Oh no, come sit with me…"', '- "Oh, that is so unfair of…"']);
    const ohs = [msg('them', 'Oh wow.'), msg('me', 'a'), msg('them', 'Oh no.'), msg('me', 'b'), msg('them', 'Oh! Really?'), msg('me', 'c')];
    assert.match(openerLines(ohs).at(-1) ?? '', /keep starting with "oh": not this time/);
    const many = Array.from({ length: 30 }, (_, i) => [msg('them', `Reply${i} goes here`), msg('me', 'ok')]).flat();
    assert.equal(openerLines(many).length, 1 + OPENERS_MAX);
  });

  it('rides in the turn tier of a chat reply; the second try names the echoed line', () => {
    const kai = { id: 'c_kai', name: 'Kai', handle: '@k', bio: 'Swimmer.', category: 'school', accentIndex: 0, voiceReady: false, isOfficial: true, greeting: 'Hey!', tags: [] } as Character;
    const sam = { id: 'u1', displayName: 'Sam', locale: 'en-US' } as User;
    const parts = chatParts({ character: kai, user: sam, messages: chat, repeated: 'Come sit with me.' });
    assert.equal(parts.find((p) => p.name === 'openers')?.tier, 'turn');
    assert.ok(joinParts(parts).includes(repeatCue('Come sit with me.').join('\n')));
    assert.ok(!joinParts(chatParts({ character: kai, user: sam, messages: chat })).includes('DO NOT REPEAT'));
  });
});
