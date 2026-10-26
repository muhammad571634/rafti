import { part, type PromptPart } from './prompt-layout';
import { characterParts } from './rules';
import { TOUCH_SHAPE } from './thread-prompt';
import { temperOf } from '../lib/temper';
import type { Character, Relationship, User, WeekStats } from '@/types';

/**
 * The model's side of the Sunday recap (`src/lib/week.ts`): code picks the friend and computes the
 * week's numbers; the model writes one text from them in the friend's own words, with reply ideas.
 * The answer has the thread texts' shape (`parseTouchReply`; a skip sends nothing).
 */
export interface WeekInput {
  character: Character;
  user: User;
  relationship?: Relationship;
  week: WeekStats;
  now: Date;
  replyLanguage?: string;
}

export function weekParts(input: WeekInput): PromptPart[] {
  const { character, user, relationship, week } = input;
  return [
    ...characterParts(character, user, relationship, input.replyLanguage),
    part('week', 'turn', [
      'You are texting first, unprompted: it is Sunday evening and you look back on your week together.',
      `This week: you talked ${week.days} of 7 days (${week.messages} messages from them).`,
      ...(week.wins.length ? [`Things of theirs that went well or got done: ${week.wins.join('; ')}${week.winCount > week.wins.length ? ` and ${week.winCount - week.wins.length} more` : ''}.`] : []),
      ...(week.quests ? [`Real-life quests they did: ${week.quests}.`] : []),
      ...(week.mood ? [`The diary pages they shared with you were mostly ${week.mood}.`] : []),
      `Write it in your own words and your temper (${temperOf(character, relationship?.label)}): celebrate what happened, bring back one moment you remember, look ahead to next week. Never count what did not happen, never guilt. One or two short texts; a small card with the numbers is shown above, so do not list them all.`,
    ]),
    part('shape', 'turn', [TOUCH_SHAPE]),
  ];
}
