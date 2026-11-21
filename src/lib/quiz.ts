import { detectCrisis } from '../ai/safety';
import { hashSeed } from './seeded';

/**
 * Quizzes (F29): the couple packs, a friend's own weekly quiz, quizzes the user writes and the
 * world quiz that wins a Photo Booth frame. Pure on purpose: the server copies the limits and checks.
 */

export const QUIZ_MAX_QUESTIONS = 5;
export const OPTIONS_MIN = 2;
export const OPTIONS_MAX = 4;
export const QUESTION_MAX = 80;
export const OPTION_MAX = 30;
export const QUIZ_TITLE_MAX = 40;
/** Questions in one world quiz, and how many right answers win its frame. */
export const WORLD_QUESTIONS = 5;
export const WORLD_PASS = 4;

export interface QuizDraft {
  title: string;
  questions: { text: string; options: string[] }[];
}

const tidy = (text: string, max: number) => text.replace(/\s+/g, ' ').trim().slice(0, max).trim();

/** Trimmed text, empty answers dropped, a question kept only with its text and 2+ answers. */
export function cleanQuiz(draft: QuizDraft): QuizDraft {
  return {
    title: tidy(draft.title, QUIZ_TITLE_MAX),
    questions: draft.questions
      .map((q) => ({
        text: tidy(q.text, QUESTION_MAX),
        options: q.options
          .map((o) => tidy(o, OPTION_MAX))
          .filter(Boolean)
          .slice(0, OPTIONS_MAX),
      }))
      .filter((q) => q.text && q.options.length >= OPTIONS_MIN)
      .slice(0, QUIZ_MAX_QUESTIONS),
  };
}

export type QuizProblem = 'noTitle' | 'noQuestions' | 'crisis';

/** Why a quiz cannot be saved, or null. */
export function checkQuiz(draft: QuizDraft): QuizProblem | null {
  const clean = cleanQuiz(draft);
  if (!clean.title) return 'noTitle';
  if (!clean.questions.length) return 'noQuestions';
  const text = [clean.title, ...clean.questions.flatMap((q) => [q.text, ...q.options])];
  if (text.some((t) => detectCrisis(t))) return 'crisis';
  return null;
}

/** A friend's pick: the same for that friend, quiz and question every time (the server's model replaces it). */
export function partnerPick(characterId: string, quizId: string, question: number, optionCount: number) {
  return hashSeed(`${characterId}:${quizId}:${question}`) % Math.max(1, optionCount);
}

/** The ISO week, e.g. "2026-W42": a friend's own quiz changes once a week. */
export function weekKey(date: Date) {
  const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const weekday = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((day.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${day.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** `count` items of `list` in an order that is the same for the same seed. */
export function pickSome<T>(list: readonly T[], seed: string, count: number): T[] {
  const out = [...list];
  let h = hashSeed(seed) || 1;
  for (let i = out.length - 1; i > 0; i--) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, count);
}

/** One of a friend's lines for the moment, with `{answer}` filled in. */
export function lineFor(lines: readonly string[], seed: string, answer = '') {
  if (!lines.length) return '';
  return lines[hashSeed(seed) % lines.length].replaceAll('{answer}', answer);
}

export const wonWorldQuiz = (score: number) => score >= WORLD_PASS;
