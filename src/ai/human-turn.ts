import type { ReplyPrefs } from '@/lib/reply-engine';
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
/**
 * Their reply in a few words, in any script ("ok", "лол", "嗯", "👍"), counted as `textSize` counts
 * them: by characters a whole Chinese apology ("对不起，我刚才太过分了", 11) read as a bare "ok".
 */
const SHORT_WORDS = 3;

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
  for (let i = theirs.length - 1; i >= 0 && textSize(theirs[i].text.trim()) <= SHORT_WORDS; i -= 1) shortInRow += 1;
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

/** Feelings after which a short answer means something (a clash, a hurt, a worry), and how strong one still has to be. */
const TENSE: ReadonlySet<Mood['emotion']> = new Set(['annoyed', 'sad', 'worried']);
const TENSE_MIN = 0.4;

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
  /** The chat's reply style and length (`replyPrefs`): the size this turn aims at. */
  prefs?: ReplyPrefs;
  /** A call: its replies do not update the feeling, so a chat's annoyance would outlive a make-up. */
  call?: boolean;
}

/**
 * About how many words a text holds, in any script: words between spaces, and for scripts written
 * without spaces (Chinese, Japanese, Thai) about two characters a word.
 */
export function textSize(text: string) {
  const dense = (text.match(DENSE) ?? []).length;
  const spaced = text.replace(DENSE, ' ').trim();
  return (spaced ? spaced.split(/\s+/).length : 0) + Math.ceil(dense / 2);
}

/** Kana, CJK ideographs and Thai: written without spaces between words (Korean has spaces). */
const DENSE = /[぀-ヿ㐀-鿿฀-๿]/g;

/**
 * The size of this reply as a number the model can keep (owner, 2026-11-07: "short" still came back
 * as paragraphs; long replies tire people and cost output). Short: a line or two. Auto: about as much
 * as they wrote, a little more, never a wall. Long: fuller, still in short bubbles. Story is prose.
 */
export function lengthLine(prefs: ReplyPrefs | undefined, turns: readonly HistoryTurn[]): string {
  const style = prefs?.style ?? 'mix';
  const length = prefs?.length ?? 'auto';
  if (style === 'story') return length === 'short' ? '- Keep it to about 50 words.' : length === 'long' ? '- About 150 words of prose.' : '- About 90 words of prose.';
  const theirs = [...turns].reverse().find((t) => t.role === 'user');
  const said = theirs ? textSize(theirs.text) : 8;
  const words = length === 'short' ? 18 : length === 'long' ? 60 : Math.min(40, Math.max(10, Math.round(said * 1.2 + 8)));
  const bubbles = words <= 14 ? 1 : words <= 30 ? 2 : 3;
  return `- About ${words} words in all, in ${bubbles === 1 ? 'one bubble' : `up to ${bubbles} bubbles`}; each bubble one or two short lines, like a text. Never a paragraph.`;
}

/** This turn's hints, last in the prompt, in place of the stand-in planner's. */
export function humanTurnLines({ turns, mood, now, silence, noQuestions, prefs, call }: HumanTurnInput): string[] {
  const lines: string[] = [lengthLine(prefs, turns)];
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
  // Which way a few words lean is read from your own feeling, not from their words (any language):
  // right after a clash or a worry their short answer is the message (0z177: we skipped it for a new
  // topic where Character.AI and BIMOBIMO both answered it); after small talk it is just an "ok".
  // Only when their message is the one being answered: a continue (⏩) or a follow-up goes on from
  // your own last line and must not call out the same "ok" again.
  const answersThem = !silence && turns.at(-1)?.role === 'user';
  const tense = !call && carried !== null && TENSE.has(carried.emotion) && carried.intensity >= TENSE_MIN;
  if (answersThem && shortInRow >= 1 && tense) {
    lines.push(
      '- They answered in a few words right after a tense moment: that short answer is the message. Read it against the moment: cold, hurt, giving up, holding something back, or a plain yes or a warm sign. Answer what it is, as you would (notice it, call it out, soften, or take the warmth), in a new way each time. Do not leave it for another topic or walk off.',
    );
  } else if (answersThem && shortInRow >= 2) {
    lines.push(
      '- They have answered in a few words lately and the chat is going flat. If you just asked about news they hold back, they may be teasing you or hiding bad news: read which, and play along or go gentle. Otherwise do not remark on how little they wrote: carry the talk yourself with more of your own thing (what happened, how you feel about it), ending on a small hook, not a question.',
    );
  }
  lines.push('- Never reuse a line you already said in this chat.');
  return ['THIS TURN (hints; stay natural):', ...lines];
}
