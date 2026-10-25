/**
 * The reply engine (Character.AI's response style and length, plus a mood that carries between
 * turns): how a character decides what a reply does, apart from who writes the words.
 *
 *   read your message → feel (mood) → plan the turn (flow) → write → pace
 *
 * Reading, feeling, planning and pacing are plain functions of the chat, so the server runs them
 * unchanged. The words come from the mock (`src/mock/reply-writer.ts`) today and from the model
 * later, which gets the style and length in the persona prompt and the plan as hints for this
 * turn (`src/ai/reply-style.ts`), and answers with the emotion it settled on.
 */
import { lastSaid, planTurn } from './flow';
import { currentMood, feel, temperamentFor } from './mood';
import { readMessage } from './read';
import type { TurnContext } from './types';

export function planReply(ctx: TurnContext) {
  const temperament = temperamentFor(ctx.character);
  const read = readMessage(lastSaid(ctx));
  const before = currentMood(ctx.relationship.mood, temperament, ctx.now);
  const mood = feel(before, read, ctx.trigger, temperament, ctx.relationship, ctx.now);
  return { read, plan: planTurn(ctx, temperament, read, mood) };
}

export { chatRhythm, DEFAULT_REPLY_PREFS, memoryQuote, pace, replyPrefs } from './flow';
export { currentMood, temperamentFor } from './mood';
export { plainText, segments, speechOnly } from './narration';
export type { Segment } from './narration';
export { readMessage } from './read';
export type { Move, ReplyPrefs, TurnContext, TurnPlan, TurnTrigger } from './types';
