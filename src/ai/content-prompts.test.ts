import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Character, User } from '@/types';

import {
  buildDateRoundsPrompt,
  buildQuizAnswerPrompt,
  buildSelfQuizPrompt,
  buildWorldQuizPrompt,
  parseStreamLine,
  STREAM_LINE_MAX,
} from './content-prompts';

describe('parseStreamLine: the model’s stream line, cleaned (B1.4b)', () => {
  it('takes the line, without the speaker’s name or quotes in front', () => {
    assert.equal(parseStreamLine('{"line":"Race you to the pier?"}', 'Kai Arden'), 'Race you to the pier?');
    assert.equal(parseStreamLine('Sure! {"line":"Kai: \\"Race you?\\""}', 'Kai Arden'), 'Race you?');
    assert.equal(parseStreamLine('{"line":"Kai Arden: fine."}', 'Kai Arden'), 'fine.');
    // Another name in front is part of the line ("Mira: …" said by Kai stays as written).
    assert.equal(parseStreamLine('{"line":"Mira, you wish."}', 'Kai Arden'), 'Mira, you wish.');
  });

  it('gives null for a broken or empty answer, and keeps a long line short', () => {
    assert.equal(parseStreamLine('no json', 'Kai'), null);
    assert.equal(parseStreamLine('{"line":"   "}', 'Kai'), null);
    assert.equal(parseStreamLine('{"text":"hi"}', 'Kai'), null);
    assert.equal(parseStreamLine(`{"line":"${'a'.repeat(500)}"}`, 'Kai')?.length, STREAM_LINE_MAX);
  });
});

const base = {
  handle: '@x',
  category: 'school',
  accentIndex: 0,
  voiceReady: false,
  isOfficial: true,
  greeting: 'Hi.',
  tags: ['kind'],
};
const theo = {
  ...base,
  id: 'c_theo',
  name: 'Theo Lancaster',
  series: 'Seaside Academy',
  bio: 'Student union president.',
} as Character;
const elio = {
  ...base,
  id: 'c_elio',
  name: 'Elio Vance',
  series: 'Seaside Academy',
  bio: 'Feeds the campus cats.',
} as Character;
const user = { displayName: 'Mo', locale: 'en' } as User;
const input = { character: theo, user, replyLanguage: 'uz' };

describe('content prompts', () => {
  it('all start from the persona prompt, with world and reply language', () => {
    for (const prompt of [
      buildSelfQuizPrompt(input, '2026-W42'),
      buildQuizAnswerPrompt(input, 'Sunday breakfast?', ['Pancakes', 'Coffee']),
      buildWorldQuizPrompt(input, [theo, elio]),
      buildDateRoundsPrompt(input, { title: 'Lake', scene: 'Ducks.', rounds: 5, mood: 'friendly' }),
    ]) {
      assert.match(prompt, /Name: Theo Lancaster \(from Seaside Academy\)/);
      assert.match(prompt, /REPLY LANGUAGE: uz/);
      assert.match(prompt, /JSON only/);
    }
  });

  it('the self quiz asks for 5 questions in their voice', () => {
    const prompt = buildSelfQuizPrompt(input, '2026-W42');
    assert.match(prompt, /How well do you know Theo Lancaster/);
    assert.match(prompt, /5 questions/);
  });

  it('the answer prompt lists the options by number', () => {
    assert.match(buildQuizAnswerPrompt(input, 'Q?', ['A', 'B']), /0\. A\n1\. B/);
  });

  it('the world quiz is limited to the bios it is given', () => {
    const prompt = buildWorldQuizPrompt(input, [theo, elio]);
    assert.match(prompt, /Elio Vance: Feeds the campus cats\./);
    assert.match(prompt, /use only these facts/);
  });

  it('the date prompt keeps the user scene and the round count', () => {
    const prompt = buildDateRoundsPrompt(input, { title: 'Lake', scene: 'Ducks.', rounds: 8, mood: 'sweet' });
    assert.match(prompt, /Ducks\./);
    assert.match(prompt, /8 rounds/);
    assert.match(prompt, /sweet mood/);
  });
});
