import { part, type PromptPart } from './prompt-layout';
import { characterParts } from './rules';
import { TOUCH_SHAPE } from './thread-prompt';
import type { Brief } from '../lib/brief';
import { temperOf } from '../lib/temper';
import type { Character, Message, Relationship, User } from '@/types';

/**
 * The model's side of the morning brief (`src/lib/brief.ts`): code picks the friend, the morning
 * time and today's things; the model writes the text in the friend's own words, with reply ideas.
 * The answer has the thread texts' shape and is read by `parseTouchReply` (a broken answer is a
 * skip, and the plain good morning goes instead).
 */
export interface BriefInput {
  character: Character;
  user: User;
  relationship?: Relationship;
  brief: Brief;
  /** The chat's last lines, oldest first. */
  recent: readonly Message[];
  now: Date;
  replyLanguage?: string;
}

export function briefParts(input: BriefInput): PromptPart[] {
  const { character, user, relationship, brief, now } = input;
  const recent = input.recent
    .filter((m) => m.kind === 'text' && m.text && !m.card)
    .slice(-12)
    .map((m) => `${m.author === 'me' ? 'User' : 'You'}: ${m.text}`);
  return [
    ...characterParts(character, user, relationship, input.replyLanguage),
    part('recent', 'turn', recent.length ? ['THE CHAT LATELY:', ...recent] : []),
    part('brief', 'turn', [
      `You are texting first, unprompted: your good morning. It is ${now.toISOString().slice(0, 16).replace('T', ' ')}.`,
      'What they told you is happening today:',
      ...brief.items.map((x) => `- ${x.title}${x.time ? ` at ${x.time}` : ' (some time today)'}`),
      `Say good morning and that you know what is ahead, in your own words and your temper (${temperOf(character, relationship?.label)}). Wish them luck where it fits: this is your only luck text before these things, so make it count. Short, like a real text; never a list or a schedule read aloud.`,
    ]),
    part('shape', 'turn', [TOUCH_SHAPE]),
  ];
}
