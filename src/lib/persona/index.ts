/**
 * The persona engine: how a character decides what to say, separate from who
 * writes the words.
 *
 *   read your message → feel (mood) → plan the turn (flow) → write → pace
 *
 * Reading, feeling, planning and pacing are plain functions of the chat, so they
 * can move to the server unchanged. Writing is a swappable `ReplyWriter`: the
 * mock in `src/mock/reply-writer.ts` today, the model (see `prompt.ts`) later.
 */
import { pace, planTurn } from './flow';
import { currentMood, feel, temperamentFor } from './mood';
import { enforceStyle } from './prompt';
import { readMessage } from './read';
import type { ReplyDraft, ReplyWriter, TurnContext } from './types';

export async function composeReply(ctx: TurnContext, write: ReplyWriter): Promise<ReplyDraft> {
  const rand = ctx.random ?? Math.random;
  const temperament = temperamentFor(ctx.character);
  // Only a message they are answering right now is read; a nudge or a date opener answers nothing.
  const said = ctx.history.filter((m) => !m.muted);
  const last = said[said.length - 1];
  const read = readMessage(ctx.trigger !== 'silence' && last?.author === 'me' ? last : undefined);

  const before = currentMood(ctx.relationship.mood, temperament, ctx.now);
  const mood = feel(before, read, ctx.trigger, temperament, ctx.relationship, ctx.now);
  const plan = planTurn(ctx, temperament, read, mood);

  const written = await write(plan, ctx);
  const bubbles = enforceStyle(written.bubbles, plan.style);
  const settled = written.emotion
    ? { emotion: written.emotion, intensity: written.intensity ?? mood.intensity, at: mood.at }
    : mood;

  return { bubbles, delays: pace(bubbles, read, rand), mood: settled, plan };
}

export { DEFAULT_REPLY_PREFS, memoryQuote, replyPrefs } from './flow';
export { plainText, segments, speechOnly } from './narration';
export type { Segment } from './narration';
export { buildPrompt, parseModelReply } from './prompt';
export type { ModelPrompt } from './prompt';
export type {
  Move,
  ReplyDraft,
  ReplyPrefs,
  ReplyWriter,
  TurnContext,
  TurnPlan,
  TurnTrigger,
  WrittenReply,
} from './types';
