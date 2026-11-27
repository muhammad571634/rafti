import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  QUIZ_MAX_QUESTIONS,
  checkQuiz,
  cleanQuiz,
  lineFor,
  partnerPick,
  pickSome,
  weekKey,
  wonWorldQuiz,
} from './quiz';

const q = (text: string, options: string[]) => ({ text, options });

describe('cleanQuiz', () => {
  it('trims, drops empty answers and questions with fewer than two', () => {
    const clean = cleanQuiz({
      title: '  Things  I love ',
      questions: [q(' Food? ', ['Ramen', ' ', 'Pizza']), q('Lonely?', ['Yes', ''])],
    });
    assert.equal(clean.title, 'Things I love');
    assert.deepEqual(clean.questions, [q('Food?', ['Ramen', 'Pizza'])]);
  });

  it('keeps at most 5 questions and 4 answers', () => {
    const many = Array.from({ length: 7 }, (_, i) => q(`Q${i}`, ['a', 'b', 'c', 'd', 'e']));
    const clean = cleanQuiz({ title: 'T', questions: many });
    assert.equal(clean.questions.length, QUIZ_MAX_QUESTIONS);
    assert.equal(clean.questions[0].options.length, 4);
  });
});

describe('checkQuiz', () => {
  it('needs a title and one full question, and refuses a crisis', () => {
    assert.equal(checkQuiz({ title: '', questions: [q('Q', ['a', 'b'])] }), 'noTitle');
    assert.equal(checkQuiz({ title: 'T', questions: [q('Q', ['a'])] }), 'noQuestions');
    assert.equal(checkQuiz({ title: 'T', questions: [q('Do you want to die?', ['a', 'b'])] }), 'crisis');
    assert.equal(checkQuiz({ title: 'T', questions: [q('Q', ['a', 'b'])] }), null);
  });
});

describe('partnerPick', () => {
  it('is stable and inside the answers', () => {
    const a = partnerPick('c_theo', 'quiz1', 2, 3);
    assert.equal(a, partnerPick('c_theo', 'quiz1', 2, 3));
    assert.ok(a >= 0 && a < 3);
  });
});

describe('weekKey', () => {
  it('gives the ISO week', () => {
    assert.equal(weekKey(new Date(2026, 9, 15)), '2026-W42');
    assert.equal(weekKey(new Date(2027, 0, 1)), '2026-W53');
  });
});

describe('pickSome and lineFor', () => {
  it('picks the same items for the same seed, without repeats', () => {
    const list = [1, 2, 3, 4, 5, 6, 7, 8];
    const a = pickSome(list, 's', 5);
    assert.deepEqual(a, pickSome(list, 's', 5));
    assert.equal(new Set(a).size, 5);
  });

  it('fills in the answer', () => {
    assert.equal(lineFor(['It is {answer}.'], 'x', 'Elio'), 'It is Elio.');
    assert.equal(lineFor([], 'x'), '');
  });
});

describe('wonWorldQuiz', () => {
  it('needs 4 of 5', () => {
    assert.equal(wonWorldQuiz(3), false);
    assert.equal(wonWorldQuiz(4), true);
  });
});
