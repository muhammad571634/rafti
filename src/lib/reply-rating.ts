import type { Message } from '@/types';

import { isTurn } from './chat-turns';

/**
 * 👍 👎 under their newest reply (Character.AI teardown §12, flows.md D109): a vote on how the reply
 * was written, outside the story; the friend never sees it. A sticker from the long-press menu is a
 * feeling inside the story. A happy sticker counts as 👍, so nobody votes twice, and 👎 takes a happy
 * sticker back, as the two would say opposite things. Sad is a feeling, not a vote. The vote sits on
 * the reply's first line, so it travels with its version (↻ ‹ ›).
 */

export type Rating = 'up' | 'down';

/** What was off, asked after 👎. */
export const OFF_REASONS = ['character', 'listen', 'repeat', 'long', 'short', 'sense'] as const;
export type OffReason = (typeof OFF_REASONS)[number];

/** Each reason as the model reads it: what to do differently. */
const OFF_FIX: Record<OffReason, string> = {
  character: 'it did not sound like you: stay in your own voice, temper and way of talking',
  listen: 'it missed what they said: answer their last message itself first',
  repeat: 'it repeated itself: say something new, nothing you said earlier in the chat',
  long: 'it was too long: keep it short',
  short: 'it was too short: give it more',
  sense: 'it did not make sense: keep it clear and true to the story so far',
};

/** Stickers that say the reply landed well. */
const HAPPY = new Set(['love', 'laugh', 'wow', 'hyped', 'thumbs']);
export const isHappy = (reaction?: string) => !!reaction && HAPPY.has(reaction);

const isReplyLine = (m: Message) => m.author === 'them' && (m.kind === 'text' || m.kind === 'voice');

/** The reply's vote: the one cast with 👍 👎, else 👍 for a happy sticker on any of its lines. */
export function ratingOf(reply: readonly Message[]): Rating | undefined {
  const cast = reply.find((m) => m.rating)?.rating;
  if (cast) return cast;
  return reply.some((m) => isHappy(m.reaction)) ? 'up' : undefined;
}

/** A line of a reply after a vote: the vote and its reason go on the first line; 👎 takes happy stickers back. */
export function withRating(line: Message, first: boolean, rating?: Rating, reason?: OffReason): Message {
  return {
    ...line,
    rating: first ? rating : undefined,
    offReason: first && rating === 'down' ? reason : undefined,
    reaction: rating === 'down' && isHappy(line.reaction) ? undefined : line.reaction,
  };
}

/** Their lines of the reply that holds `id`: everything of theirs between the turns around it. */
export function replyAround(messages: readonly Message[], id: string): Message[] {
  const at = messages.findIndex((m) => m.id === id);
  if (at < 0) return [];
  let start = at;
  while (start > 0 && !isTurn(messages[start - 1])) start--;
  let end = at;
  while (end < messages.length - 1 && !isTurn(messages[end + 1])) end++;
  return messages.slice(start, end + 1).filter(isReplyLine);
}

/** For a new version after 👎 with a reason: what to fix this time. */
export const offCue = (reason: OffReason) => `The user marked that reply down: ${OFF_FIX[reason]}.`;

/** How many liked lines the prompt carries as examples. */
const LIKED_MAX = 3;

/**
 * What the user's votes taught about this chat, for every reply: the newest lines they liked (a 👍
 * or a happy sticker) as the way to write, and the reasons of their 👎 as what to stay away from.
 */
export function tasteLines(messages: readonly Message[]) {
  const liked: string[] = [];
  const off = new Set<OffReason>();
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (!isReplyLine(m)) continue;
    const text = m.kind === 'text' ? m.text?.trim() : undefined;
    if (text && liked.length < LIKED_MAX && (m.rating === 'up' || (!m.rating && isHappy(m.reaction)))) liked.unshift(text);
    if (m.rating === 'down' && m.offReason && m.offReason in OFF_FIX) off.add(m.offReason as OffReason);
  }
  return [
    ...(liked.length ? ['THEY LIKED THESE REPLIES OF YOURS (write more like them, never copy them):', ...liked.map((t) => `- ${t}`)] : []),
    ...(off.size ? ['THEY MARKED REPLIES DOWN BECAUSE:', ...[...off].map((r) => `- ${OFF_FIX[r]}`)] : []),
  ];
}
