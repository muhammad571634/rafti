import type { Mood } from '@/types';

import type { HistoryTurn } from './prompt-layout';

/**
 * This turn's hints when the model writes the reply (0z141, "characters feel human"). Before, the
 * hints came from the stand-in planner (`planTurn`): English keyword cues and dice decided the
 * feeling ("you feel happy (0.4)"), the move ("tease them a little") and whether to end with a
 * question, so a Russian "мне грустно" could get "tease them" and every few replies an interview
 * question. Now the model reads the message itself, and the hints say only what it cannot see in one
 * reply, in any language:
 * - how it felt at the end of its last reply (the emotion the model itself returned), faded by time,
 *   so a feeling carries over the way a person's does;
 * - the rhythm: its own last replies ended with questions, or the user has been answering in a few
 *   words, so the chat is going flat;
 * - a nudge after a silence (the app's timer, not something the model can know).
 */

/** Ends with a question mark in any script (Latin, CJK full-width, Arabic), closing quotes and emoji after it allowed. */
const ASKS = /[?？؟][\s"'»”’)\]]*(?:[☀-➿️]|[\uD83C-\uDBFF][\uDC00-\uDFFF])*\s*$/;
/** Their reply in a few words: by length, in any language ("ok", "лол", "嗯", "👍"). */
const SHORT_CHARS = 12;

/** The last bubble of a turn (turns join a side's bubbles with new lines). */
const lastLine = (text: string) => text.trim().split('\n').pop()?.trim() ?? '';

export interface TurnRhythm {
  /** Your replies in a row, newest back, that ended with a question. */
  askedInRow: number;
  /** Their turns in a row, newest back, that were only a few characters. */
  shortInRow: number;
}

export function turnRhythm(turns: readonly HistoryTurn[]): TurnRhythm {
  const yours = turns.filter((t) => t.role === 'assistant');
  const theirs = turns.filter((t) => t.role === 'user');
  let askedInRow = 0;
  for (let i = yours.length - 1; i >= 0 && ASKS.test(lastLine(yours[i].text)); i -= 1) askedInRow += 1;
  let shortInRow = 0;
  for (let i = theirs.length - 1; i >= 0 && theirs[i].text.trim().length <= SHORT_CHARS; i -= 1) shortInRow += 1;
  return { askedInRow, shortInRow };
}

/** A feeling halves every two hours; under this it is gone and their usual self is back. */
const HALF_LIFE_H = 2;
const FADED = 0.2;

/** How you feel coming into this reply: your last reply's feeling, faded by the time since. Null: back to your usual self. */
export function carriedMood(mood: Mood | undefined, now: number): { emotion: Mood['emotion']; intensity: number; hours: number } | null {
  if (!mood) return null;
  const hours = Math.max(0, (now - Date.parse(mood.at)) / 3_600_000);
  if (Number.isNaN(hours)) return null;
  const intensity = mood.intensity * 0.5 ** (hours / HALF_LIFE_H);
  return intensity < FADED ? null : { emotion: mood.emotion, intensity, hours };
}

const ago = (hours: number) => (hours < 0.25 ? 'just now' : hours < 1 ? 'less than an hour ago' : `about ${Math.round(hours)} hours ago`);

export interface HumanTurnInput {
  turns: readonly HistoryTurn[];
  /** The feeling you were left with (the relationship's mood: what the model returned last time). */
  mood?: Mood;
  /** Now, ISO (the user's clock), for how much the feeling faded. */
  now?: string;
  /** They went quiet after your last message: this text follows up (the app's silence timer). */
  silence?: boolean;
  /** The mode asks nothing (bedtime): no word about questions. */
  noQuestions?: boolean;
}

/** This turn's hints, last in the prompt, in place of the stand-in planner's. */
export function humanTurnLines({ turns, mood, now, silence, noQuestions }: HumanTurnInput): string[] {
  const lines: string[] = [];
  const at = now ? Date.parse(now) : NaN;
  const carried = Number.isNaN(at) ? null : carriedMood(mood, at);
  if (carried) {
    lines.push(
      `- Coming into this, you still feel ${carried.emotion} (${carried.intensity.toFixed(1)} of 1), from your last reply ${ago(carried.hours)}. Let what they just wrote move it as it would move you; a feeling does not reset in one line.`,
    );
  }
  if (silence) lines.push('- They went quiet after your last message: one light follow-up in your own way, not needy, no guilt.');
  const { askedInRow, shortInRow } = turnRhythm(turns);
  if (!noQuestions && askedInRow >= 2) lines.push('- Your last replies all ended with a question: this time ask nothing; say something of your own.');
  if (!silence && shortInRow >= 2) {
    lines.push('- They have answered in a few words lately: the chat is going flat. Bring something of your own (a story from your day, an opinion, a new topic tied to what you know of them), not another question.');
  }
  lines.push('- Never reuse a line you already said in this chat.');
  return ['THIS TURN (hints; stay natural):', ...lines];
}
