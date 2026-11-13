import type { WorldNews } from '../lib/world-story';
import { temperOf } from '../lib/temper';
import type { Character, Message, Relationship, User } from '@/types';

import { modePart } from './modes';
import { part, type PromptPart } from './prompt-layout';
import { characterParts } from './rules';
import { TOUCH_SHAPE } from './thread-prompt';

/**
 * A friend brings up what just happened in their world (`dueWorldNews`): code picks who and when,
 * the model writes it in their words. The answer has the thread texts' shape (`parseTouchReply`).
 */
export interface WorldNewsInput {
  character: Character;
  user: User;
  relationship?: Relationship;
  news: Pick<WorldNews, 'kind' | 'title' | 'note'>;
  /** The chat's last lines, oldest first. */
  recent: readonly Message[];
  now: Date;
  utcOffsetMin?: number;
  replyLanguage?: string;
}

export function worldNewsParts(input: WorldNewsInput): PromptPart[] {
  const { character, user, relationship, news } = input;
  const recent = input.recent
    .filter((m) => m.kind === 'text' && m.text && !m.card)
    .slice(-12)
    .map((m) => `${m.author === 'me' ? 'User' : 'You'}: ${m.text}`);
  return [
    ...characterParts(character, user, relationship, input.replyLanguage),
    modePart('initiative'),
    part('recent', 'turn', recent.length ? ['THE CHAT LATELY:', ...recent] : []),
    part('news', 'turn', [
      news.kind === 'chapter'
        ? `You are texting first, unprompted: something just happened in your world. ${news.title}: ${news.note}`
        : `You are texting first, unprompted: it starts today in your world. ${news.title}: ${news.note}`,
      `Write it in your own words and your temper (${temperOf(character, relationship?.label)}), as your own reaction to it and why you thought of them. Never a news report; pull them in with something they can answer. Skip it if the chat is in the middle of something that matters more.`,
    ]),
    part('shape', 'turn', [TOUCH_SHAPE]),
  ];
}
