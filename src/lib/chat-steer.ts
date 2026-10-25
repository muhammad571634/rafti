import type { Message, TimeSkip } from '@/types';

import { isSteer, lastExchange } from './chat-turns';

/**
 * Continue and time skip (Character.AI teardown item 5): the user moves a one-to-one chat on
 * without writing. Continue asks them to go on; a time skip moves the story forward and they pick
 * up from there. Each leaves a marker (`card: 'continue' | 'skip'`) that counts as the user's turn,
 * so ↻ redoes only the reply after it (`lastExchange`). Each is one reply, so it costs what a
 * message does. Pure and server-portable: the server ends the prompt with the same cue (`steerCue`).
 */

export const TIME_SKIPS: readonly TimeSkip[] = ['later', 'evening', 'nextMorning', 'week'];

/** Turns the user can take in a row without writing; then the chat waits for them. */
export const MAX_STEERS_IN_A_ROW = 3;

/** How a skip reads to the model, in the history and in the cue (the app shows its own words). */
export const SKIP_TEXT: Record<TimeSkip, string> = {
  later: 'A little later',
  evening: 'That evening',
  nextMorning: 'The next morning',
  week: 'A week later',
};

/** A line you or they wrote, as `lastExchange` counts them. */
const isLine = (m: Message) => m.kind !== 'system' && m.kind !== 'call' && !m.card;

/** Continues and skips since the user last wrote. */
export function steersInARow(messages: readonly Message[] | undefined) {
  const list = messages ?? [];
  let count = 0;
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].author === 'me' && isLine(list[i])) break;
    if (isSteer(list[i])) count++;
  }
  return count;
}

export type SteerBlock = 'typing' | 'waiting' | 'crisis' | 'tooMany';

/**
 * Why the chat can't be moved on now, or null when it can: a reply is on its way; their side
 * has not spoken since the user wrote (nothing to go on from); the newest reply came with the
 * helpline card (a crisis is never skipped past); or the user already took
 * `MAX_STEERS_IN_A_ROW` turns without writing, so the chat waits for them.
 */
export function steerBlock(messages: readonly Message[] | undefined, typing: boolean): SteerBlock | null {
  if (typing) return 'typing';
  const lastLine = (messages ?? []).findLast(isLine);
  if (!lastLine || lastLine.author === 'me') return 'waiting';
  if (lastExchange(messages)?.crisis) return 'crisis';
  if (steersInARow(messages) >= MAX_STEERS_IN_A_ROW) return 'tooMany';
  return null;
}

/** The marker a continue or a skip leaves in the chat; the store gives it an id. */
export const steerMarker = (conversationId: string, kind: 'continue' | 'skip', skip?: TimeSkip, now = new Date()): Omit<Message, 'id'> => ({
  conversationId,
  author: 'them',
  kind: 'system',
  card: kind,
  ...(kind === 'skip' ? { skip: skip ?? 'later' } : {}),
  createdAt: now.toISOString(),
});

/**
 * What this reply should do, after the chat history in the server prompt (the reply cue): go on
 * from their last message, or pick up after the skip. A skip is story time only: plans,
 * reminders and real events the user told them about have not happened because of it.
 */
export function steerCue(kind: 'continue' | 'skip', skip?: TimeSkip): string[] {
  if (kind === 'continue') {
    return [
      'NEXT: The user tapped Continue: they want you to go on without writing anything.',
      '- Pick up right where your last message left off and add something new: a thought, a detail, a question or the next step of the story.',
      '- Do not repeat or sum up what you said, and never write the user’s side.',
      '- 1-3 short messages, in your voice.',
    ];
  }
  return [
    `NEXT: Time skip. ${SKIP_TEXT[skip ?? 'later']}: the story moves on to then.`,
    '- Pick up after it: say in a line where you are or what happened meanwhile, then talk to them.',
    '- This is story time only. Plans, reminders and real events the user told you about have not happened because of it; never treat them as done.',
    '- If a scene is running, it moves forward with the skip and you stay in it.',
    '- 1-3 short messages, in your voice.',
  ];
}

/** A marker as the chat history shows it to the model: a skip says how far; a continue says nothing. */
export const historyText = (m: Message) => (m.card === 'skip' ? `[Time skip: ${SKIP_TEXT[m.skip ?? 'later']}]` : null);
