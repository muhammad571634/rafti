import { modePart } from './modes';
import { part, type PromptPart } from './prompt-layout';
import { characterParts } from './rules';
import { TOUCH_SHAPE, wallClock } from './thread-prompt';
import { temperOf } from '../lib/temper';
import type { Character, DiaryMood, Message, Relationship, Thread, User } from '@/types';

/**
 * The model's side of the evening "how was today?" (`src/lib/day-ask.ts`). Code picks the friend,
 * the time and the back-off; the model writes the question from what it knows of the user's day,
 * and, when the user answers, reads the mood for their diary page. Both answers are small JSON.
 */
export interface DayAskInput {
  character: Character;
  user: User;
  relationship?: Relationship;
  /** What happened today in this chat, oldest first. */
  today: readonly Message[];
  /** This friend's threads that happened or were settled today ("the exam went well"). */
  threads: readonly Thread[];
  now: Date;
  /** The user's clock, in minutes east of UTC: every time in the prompt is theirs (UTC when missing). */
  utcOffsetMin?: number;
  replyLanguage?: string;
}

export function dayAskParts(input: DayAskInput): PromptPart[] {
  const { character, user, relationship, now } = input;
  const lines = input.today
    .filter((m) => m.kind === 'text' && m.text && !m.card)
    .slice(-16)
    .map((m) => `${m.author === 'me' ? 'User' : 'You'}: ${m.text}`);
  const things = input.threads.map((t) => `- ${t.about}${t.outcome ? ` (${t.outcome})` : ''}`);
  return [
    ...characterParts(character, user, relationship, input.replyLanguage),
    modePart('initiative'),
    part('today', 'turn', [
      ...(lines.length ? ['TODAY IN YOUR CHAT:', ...lines] : ['You have not talked today.']),
      ...(things.length ? ['WHAT WAS ON TODAY:', ...things] : []),
    ]),
    part('dayAsk', 'turn', [
      `You are texting first, unprompted: it is evening (${wallClock(now.toISOString(), input.utcOffsetMin)} where they are) and you ask how their day was.`,
      `Ask in your own words and your temper (${temperOf(character, relationship?.label)}); pick up on something from today when there is one, never a generic survey. One short text. Their answer becomes a page in their diary, so make it easy to say a little.`,
    ]),
    part('shape', 'turn', [TOUCH_SHAPE]),
  ];
}

/** With the reply to an answer: the diary page's mood, read by the model from their words. */
export const DAY_DIARY_LINE =
  'They just told you about their day; it goes into their diary. Add to the JSON a "diary" field: {"mood":"happy|soft|blue|excited|tired"}. Leave it out if the message is not about their day.';

const MOODS: readonly DiaryMood[] = ['happy', 'soft', 'blue', 'excited', 'tired'];

/** The diary mood from the model's JSON reply; null when it left it out or it is not one we know. */
export function parseDayMood(raw: string): DiaryMood | null {
  try {
    const mood = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '')?.diary?.mood;
    return MOODS.find((m) => m === mood) ?? null;
  } catch {
    return null;
  }
}
