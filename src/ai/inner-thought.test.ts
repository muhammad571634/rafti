import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { cleanThought, openedThought, THOUGHT_CHARS_MAX, thoughtParts } from './inner-thought';
import { parseModelReply } from './reply-style';

const them = (thought?: string, thoughtRead?: boolean) => ({ author: 'them', kind: 'text', thought, thoughtRead });
const me = { author: 'me', kind: 'text' };

describe('inner thoughts', () => {
  it('keeps one clean line and drops what is not a thought', () => {
    assert.equal(cleanThought('  "I miss him more than I say."  '), 'I miss him more than I say.');
    assert.equal(cleanThought('«Не скажу ему»'), 'Не скажу ему');
    assert.equal(cleanThought('*sighs*'), undefined);
    assert.equal(cleanThought(''), undefined);
    assert.equal(cleanThought(42), undefined);
    const long = cleanThought('word '.repeat(80));
    assert.ok(long && long.length <= THOUGHT_CHARS_MAX + 1 && long.endsWith('…'));
  });

  it('reads the field from the reply the model already writes', () => {
    const reply = parseModelReply('{"crisis":false,"emotion":"calm","messages":["sure."],"thought":"A long day is never just a long day."}');
    assert.equal(reply.thought, 'A long day is never just a long day.');
    assert.equal(parseModelReply('{"messages":["hi"]}').thought, undefined);
  });

  it('tells the next reply once that the user opened the thought', () => {
    assert.equal(openedThought([them('worried', true), me]), 'worried');
    // Not opened, or not answered yet: nothing to notice.
    assert.equal(openedThought([them('worried', false), me]), undefined);
    assert.equal(openedThought([me, them('worried', true)]), undefined);
    // They answered since: the moment has passed, with or without a thought of their own.
    assert.equal(openedThought([them('worried', true), me, them('fine'), me]), undefined);
    assert.equal(openedThought([them('worried', true), me, them(), me]), undefined);
    // A push line of theirs before the user wrote does not end it.
    assert.equal(openedThought([them('worried', true), them(), me]), 'worried');
  });

  it('asks for a thought in a chat, never on a call', () => {
    const chat = thoughtParts(false, [them('worried', true), me]);
    assert.ok(chat.every((p) => p.text));
    assert.match(chat[1].text, /worried/);
    assert.ok(thoughtParts(true, [them('worried', true), me]).every((p) => !p.text));
  });
});
