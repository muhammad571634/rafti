import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Character, User } from '@/types';

import { cleanFirstText, firstTextParts } from './first-text';
import { birthdayCue } from './moment-prompt';
import { joinParts } from './prompt-layout';
import { cleanWrite, parseWrite, writeParts, type WriteRequest } from './writes';

const kai = { id: 'c_kai', name: 'Kai Arden', series: 'Seaside Academy', bio: 'Swims at dawn.', gender: 'male', tags: ['kind'] } as unknown as Character;
const sam = { displayName: 'Sam', locale: 'ru-RU' } as User;
const input = { character: kai, user: sam };
const questions = [
  { text: 'Tea or coffee?', options: ['Tea', 'Coffee'] },
  { text: 'Sea or hills?', options: ['Sea', 'Hills'] },
];
const date = { title: 'The pier', scene: 'Sunset on the pier.', mood: 'sweet' as const, total: 3 };

describe('what a friend writes on a screen of its own', () => {
  it('every kind starts from the persona and asks for JSON', () => {
    const requests: WriteRequest[] = [
      { kind: 'note', input, question: 'What scares you?' },
      { kind: 'diary', input, day: { lines: [{ mine: false, text: 'I passed the exam' }] } },
      { kind: 'diaryReply', input, entry: 'A long day.' },
      { kind: 'quizPicks', input, title: 'Mornings', questions },
      { kind: 'selfQuiz', input, week: '2026-W44' },
      { kind: 'worldLines', input, world: 'Seaside Academy', questions: questions.map((q) => ({ ...q, answer: 0 })) },
      { kind: 'dateRound', input, date, soFar: [] },
    ];
    for (const request of requests) {
      const prompt = joinParts(writeParts(request));
      assert.match(prompt, /Name: Kai Arden/, request.kind);
      assert.match(prompt, /JSON only/, request.kind);
    }
  });

  it('a heavy day quotes nothing and stays gentle', () => {
    const prompt = joinParts(writeParts({ kind: 'diary', input, day: { lines: [], heavy: true } }));
    assert.match(prompt, /heavy for them/);
    assert.doesNotMatch(prompt, /YESTERDAY IN YOUR CHAT/);
  });

  it('a date round knows what they chose, and which round it is', () => {
    const first = joinParts(writeParts({ kind: 'dateRound', input, date, soFar: [] }));
    assert.match(first, /1 of 3/);
    assert.match(first, /Sunset on the pier\./);
    const middle = joinParts(writeParts({ kind: 'dateRound', input, date, soFar: [{ line: 'Kai waves.', picked: 'Wave back.', reply: 'Kai grins.' }] }));
    assert.match(middle, /They chose: Wave back\./);
    assert.match(middle, /follows from what they just chose/);
    const last = joinParts(writeParts({ kind: 'dateRound', input, date, soFar: [1, 2].map(() => ({ line: 'l', picked: 'p', reply: 'r' })) }));
    assert.match(last, /goodbye/);
  });

  it('takes a good answer and drops a broken one', () => {
    const note: WriteRequest & { kind: 'note' } = { kind: 'note', input, question: 'Q?' };
    assert.deepEqual(parseWrite(note, 'Sure: {"note":"  The dark. "}'), { note: 'The dark.' });
    assert.equal(parseWrite(note, 'no json'), null);
    assert.equal(parseWrite(note, '{"note":" "}'), null);

    const diary: WriteRequest & { kind: 'diary' } = { kind: 'diary', input, day: { lines: [] } };
    assert.deepEqual(parseWrite(diary, '{"mood":"angry","paragraphs":["One."]}'), { mood: 'soft', body: ['One.'] });
    assert.equal(parseWrite(diary, '{"mood":"happy","paragraphs":[]}'), null);
  });

  it('a quiz answer must fit its question, or the whole answer goes', () => {
    const picks: WriteRequest & { kind: 'quizPicks' } = { kind: 'quizPicks', input, title: 'T', questions };
    const good = { answer: 1, same: 'Yes!', differ: 'No way.' };
    assert.deepEqual(parseWrite(picks, JSON.stringify({ picks: [good, good] })), { picks: [good, good] });
    assert.equal(parseWrite(picks, JSON.stringify({ picks: [good] })), null);
    assert.equal(parseWrite(picks, JSON.stringify({ picks: [good, { ...good, answer: 2 }] })), null);
    assert.equal(parseWrite(picks, JSON.stringify({ picks: [good, { ...good, differ: '' }] })), null);
  });

  it('a week’s own quiz needs real questions with four answers', () => {
    const self: WriteRequest & { kind: 'selfQuiz' } = { kind: 'selfQuiz', input, week: 'W' };
    const q = { text: 'My fear?', options: ['A', 'B', 'C', 'D'], answer: 3, same: 's', differ: 'd' };
    assert.equal(parseWrite(self, JSON.stringify({ questions: [q, q, q] }))?.questions.length, 3);
    assert.equal(parseWrite(self, JSON.stringify({ questions: [q] })), null);
    assert.equal(parseWrite(self, JSON.stringify({ questions: [q, q, { ...q, options: ['A', 'B'] }] })), null);
  });

  it('a date round has three choices, and hearts stay 0 to 3', () => {
    const round: WriteRequest & { kind: 'dateRound' } = { kind: 'dateRound', input, date, soFar: [] };
    const choice = { text: 'Go', reply: 'Kai goes.', hearts: 9 };
    const parsed = parseWrite(round, JSON.stringify({ line: 'Kai waits.', choices: [choice, { ...choice, hearts: -2 }, { ...choice, hearts: '2' }] }));
    assert.deepEqual(parsed?.choices.map((c) => c.hearts), [3, 0, 2]);
    assert.equal(parseWrite(round, JSON.stringify({ line: 'Kai waits.', choices: [choice, choice] })), null);
    assert.equal(parseWrite(round, JSON.stringify({ line: '', choices: [choice, choice, choice] })), null);
  });

  it('turns away what the prompt code cannot lay out', () => {
    assert.equal(cleanWrite(null), null);
    assert.equal(cleanWrite({ kind: 'poem', input }), null);
    assert.equal(cleanWrite({ kind: 'note', input: { user: sam }, question: 'Q' }), null);
    assert.equal(cleanWrite({ kind: 'note', input, question: '' }), null);
    assert.equal(cleanWrite({ kind: 'quizPicks', input, title: 'T', questions: [] }), null);
    assert.equal(cleanWrite({ kind: 'worldLines', input, world: 'W', questions: [{ ...questions[0], answer: 7 }] }), null);
    assert.equal(cleanWrite({ kind: 'dateRound', input, date: { ...date, total: 99 }, soFar: [] }), null);
    assert.equal(cleanWrite({ kind: 'dateRound', input, date: { ...date, mood: 'spicy' }, soFar: [] }), null);
    assert.ok(cleanWrite({ kind: 'dateRound', input, date, soFar: [] }));
    assert.ok(cleanWrite({ kind: 'diary', input, day: { lines: [{ mine: true, text: 'hi' }] } }));
  });
});

describe('a moment: a text because of something in the app', () => {
  const now = '2026-10-31T08:00:00.000Z';
  const request = { kind: 'moment', input: { character: kai, user: sam, recent: [], now, cue: birthdayCue('Sam') } };

  it('carries what happened and leaves the words to the model', () => {
    const clean = cleanFirstText(request);
    assert.ok(clean);
    const prompt = joinParts(firstTextParts(clean));
    assert.match(prompt, /Sam’s birthday/);
    assert.match(prompt, /You are texting first/);
    assert.match(prompt, /\{"language"/);
  });

  it('needs a cue', () => {
    assert.equal(cleanFirstText({ ...request, input: { ...request.input, cue: [] } }), null);
  });
});
