/**
 * The create form's greeting coach (docs/polybuzz-live-test.md §4.4): how strong a first message is
 * and the one thing that would make it stronger. The first message carries a user-made character's
 * first minute, so it should set the scene, say enough, and leave the user a move. Every signal works
 * in any language and script (length, an *action*, how it ends); no word lists.
 */

export type CoachLevel = 'weak' | 'okay' | 'good' | 'great';
export type CoachTip = 'more' | 'scene' | 'move' | 'detail';

/** Enough to be a moment, and enough for a detail of it. */
export const COACH_SHORT = 60;
export const COACH_DETAIL = 160;

/** Question marks in the scripts our 14 languages use (Latin, CJK full-width, Arabic). */
const ASKS = new Set(['?', '？', '؟']);

/** Characters as people count them: an emoji or a CJK sign is one. */
const length = (text: string) => [...text].length;

/** The last thing the user reads, closing marks and *actions* left out. */
function lastSpoken(text: string) {
  const spoken = text.replace(/\*[^*]*\*/g, ' ').replace(/[\s"'”’»」』)\]…]+$/u, '');
  return [...spoken].at(-1) ?? '';
}

export interface CoachInput {
  greeting: string;
  /** The short *action* before it (the form's opening line), which sets the scene as well. */
  opening?: string;
}

export interface CoachResult {
  /** 0-4 signals met. */
  score: number;
  level: CoachLevel;
  /** The one thing to do next, most useful first; null when nothing is missing. */
  tip: CoachTip | null;
}

/** Null while the greeting is empty: the form then uses a default and shows no meter. */
export function coachGreeting({ greeting, opening }: CoachInput): CoachResult | null {
  const text = greeting.trim();
  if (!text) return null;
  const size = length(text);
  const said = size >= COACH_SHORT;
  const detail = size >= COACH_DETAIL;
  const scene = /\*[^*\s][^*]*\*/.test(text) || !!opening?.trim();
  // Their move: a question at the end, or the user named in it ({{user}}).
  const move = ASKS.has(lastSpoken(text)) || text.includes('{{user}}');
  const score = [said, detail, scene, move].filter(Boolean).length;
  const level: CoachLevel = score >= 4 ? 'great' : score === 3 ? 'good' : score === 2 ? 'okay' : 'weak';
  const tip: CoachTip | null = !said ? 'more' : !scene ? 'scene' : !move ? 'move' : !detail ? 'detail' : null;
  return { score, level, tip };
}
