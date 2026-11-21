import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { chatTurns } from '../ai/chat-prompt';
import { groupTurns } from '../ai/group-reply';
import { canReplyTo, cutQuote, replyCue, replySnapshot, REPLY_QUOTE_MAX } from './reply-quote';
import type { Character, Message, User } from '@/types';

const line = (extra: Partial<Message>): Message => ({
  id: 'm1',
  conversationId: 'c',
  author: 'them',
  kind: 'text',
  text: 'hey',
  createdAt: '2026-11-15T10:00:00.000Z',
  ...extra,
});

describe('what can be answered', () => {
  it('takes words, photos and voice notes', () => {
    assert.equal(canReplyTo(line({})), true);
    assert.equal(canReplyTo(line({ kind: 'image', text: undefined })), true);
    assert.equal(canReplyTo(line({ kind: 'voice', text: undefined })), true);
  });
  it('leaves cards, system lines, calls and pending lines alone', () => {
    assert.equal(canReplyTo(line({ card: 'skip' })), false);
    assert.equal(canReplyTo(line({ kind: 'system' })), false);
    assert.equal(canReplyTo(line({ kind: 'call' })), false);
    assert.equal(canReplyTo(line({ pending: true })), false);
    assert.equal(canReplyTo(line({ text: '  ' })), false);
  });
});

describe('the kept quote', () => {
  it('cuts a long line at a word, with an ellipsis', () => {
    const long = 'word '.repeat(60);
    const cut = cutQuote(long);
    assert.ok(cut.length <= REPLY_QUOTE_MAX + 1);
    assert.ok(cut.endsWith('word…'));
  });
  it('keeps a voice note by its transcript and a group member by their id', () => {
    const quote = replySnapshot(line({ kind: 'voice', text: undefined, transcript: 'on my way', characterId: 'kai' }));
    assert.deepEqual(quote, { id: 'm1', author: 'them', characterId: 'kai', kind: 'voice', text: 'on my way' });
  });
});

describe('the model hears what was answered', () => {
  it('names their own line, the user\'s own line and a photo', () => {
    assert.equal(replyCue({ id: 'a', author: 'them', kind: 'text', text: 'Did you eat?' }), '[Replying to your message: "Did you eat?"]');
    assert.equal(replyCue({ id: 'a', author: 'me', kind: 'text', text: 'brb' }), '[Replying to my own earlier message: "brb"]');
    assert.equal(replyCue({ id: 'a', author: 'them', kind: 'image' }), '[Replying to your message: a photo]');
  });

  it('puts the note in front of the user\'s turn in a one-to-one chat', () => {
    const turns = chatTurns([
      line({ id: 'q', text: 'Did you eat?' }),
      line({ id: 'r', author: 'me', text: 'Not yet', replyTo: { id: 'q', author: 'them', kind: 'text', text: 'Did you eat?' } }),
    ]);
    assert.equal(turns[1].text, '[Replying to your message: "Did you eat?"] Not yet');
  });

  it('tells a group member whether the quote was theirs or another member\'s', () => {
    const messages = [
      line({ id: 'q', characterId: 'kai', text: 'Pizza?' }),
      line({ id: 'r', author: 'me', text: 'Yes!', replyTo: { id: 'q', author: 'them', characterId: 'kai', kind: 'text', text: 'Pizza?' } }),
    ];
    const user = { displayName: 'Ali' } as User;
    const kai = { id: 'kai', name: 'Kai' } as Character;
    const hana = { id: 'hana', name: 'Hana' } as Character;
    const asKai = groupTurns({ character: kai, others: [{ id: 'hana', name: 'Hana' }], user, messages } as never);
    assert.equal(asKai.at(-1)?.text, 'Ali: [Replying to your message: "Pizza?"] Yes!');
    const asHana = groupTurns({ character: hana, others: [{ id: 'kai', name: 'Kai' }], user, messages } as never);
    assert.equal(asHana.at(-1)?.text.split('\n').at(-1),'Ali: [Replying to Kai\'s message: "Pizza?"] Yes!');
  });
});
