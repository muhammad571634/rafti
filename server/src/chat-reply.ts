import { layoutChatPrompt, type ChatPromptInput } from '../../src/ai/chat-prompt.ts';
import type { PromptLayout } from '../../src/ai/prompt-layout.ts';
import { findRepeat, type Repeat } from '../../src/ai/repetition.ts';
import { userLines } from '../../src/ai/reply-language.ts';
import { parseModelReply, type ModelReply } from '../../src/ai/reply-style.ts';
import { imageCue } from '../../src/ai/photo-prompt.ts';
import { detectCrisis, VEILED_MESSAGE, VEILED_NEUTRAL } from '../../src/ai/safety.ts';
import type { Message } from '../../src/types/index.ts';
import type { LlmProvider, LlmResult } from './llm/types.ts';

/**
 * One model call a reply made, for the cost log: the first draft ("chat", "call"…), or the second
 * try of the crisis check ("chatCrisis"…) or the repetition guard ("chatRepeat"…).
 */
export interface ChatCall {
  mode: string;
  layout: PromptLayout;
  result: LlmResult;
}

export interface GuardedReply {
  reply: ModelReply;
  /** The call whose answer went out. */
  result: LlmResult;
  calls: ChatCall[];
  /** What the first draft echoed, when it did. */
  repeat: Repeat | null;
  /** The user may be in danger: the app shows the helpline card with the reply. */
  crisis: boolean;
  /** The provider's filter stopped the first draft (`LlmResult.blocked`); the second try answered, or nothing did. */
  blocked?: 'reply' | 'prompt';
}

/** A crisis second try waits for anything but a nearly spent deadline: it matters more than speed. */
const CRISIS_MIN_LEFT_MS = 3000;

/**
 * One chat reply with the crisis check and the repetition guard; the route and the eval set
 * (server/evals) both answer through here, so the eval sees what users get.
 *
 * Crisis (B1.6): the phrase list (`detectCrisis`) catches the clearest lines before the model runs,
 * so the first draft already follows `CRISIS_CUE`; in every other case, and in any language, the
 * model marks its draft `crisis` and is asked once more with the cue. Repetition (B1.5): a draft
 * that echoes one of their recent replies (or a version a ↻ replaces) is asked for once more with
 * the echoed line named, while half the wait is left, and the second try goes out unless it echoes
 * as much. One second try at most, the crisis first. Busy or slow the second time, the first draft
 * goes out after all. A picture the provider refused comes back with no words: asked once more
 * without it, the character says they cannot see it, and no reason is kept.
 *
 * The output check (SAFETY_LAYERS): a draft the provider's safety filter stopped is asked for once
 * more with `SAFE_RETRY_CUE` (fade to black, in character), and when the user's own message was what
 * the filter would not read, it is veiled (`VEILED_MESSAGE`). Stopped again, no words go out and the
 * app shows Not delivered: never a stock line. This one comes before every other second try.
 */
export async function chatReply<I extends ChatPromptInput>(
  provider: LlmProvider,
  input: I,
  timeoutMs: number,
  /** A group member's reply goes through the same guards with its own prompt (`layoutGroupReply`). */
  { mode = input.mode ?? 'chat', layoutOf = layoutChatPrompt as (input: I) => PromptLayout }: { mode?: string; layoutOf?: (input: I) => PromptLayout } = {},
): Promise<GuardedReply> {
  const started = Date.now();
  const caught = userLines(input.messages).slice(-1).some(detectCrisis);
  const layout = layoutOf(caught ? { ...input, crisis: true } : input);
  const first = await provider.complete(layout, { timeoutMs });
  const calls: ChatCall[] = [{ mode, layout, result: first }];
  let reply = parseModelReply(first.text);
  let result = first;
  // The first draft's own crisis flag; a stopped draft has none, so the second try may still raise it.
  const flagged = caught || reply.crisis === true;

  const repeat = reply.bubbles.length && !flagged ? findRepeat(reply.bubbles, input.messages, input.redo) : null;
  const left = timeoutMs - (Date.now() - started);
  const blocked = first.blocked;
  // A picture the provider would not take comes back stopped (or wordless): asked again without it.
  const refused = !!input.images?.length && (blocked === 'prompt' || !reply.bubbles.length);
  const retry = refused
    ? {
        mode: `${mode}Blind`,
        input: { ...input, images: undefined, cue: [...(input.cue ?? []), ...imageCue()], ...(caught ? { crisis: true } : {}), ...(blocked === 'reply' ? { safe: true } : {}) },
      }
    : blocked
      ? {
          mode: `${mode}Safe`,
          input: {
            ...input,
            ...(caught ? { crisis: true } : {}),
            safe: true,
            ...(blocked === 'prompt' ? { messages: veilRecentUser(input.messages, caught) } : {}),
          },
        }
      : flagged && !caught && left > CRISIS_MIN_LEFT_MS
        ? { mode: `${mode}Crisis`, input: { ...input, crisis: true } }
        : repeat && left > timeoutMs / 2
          ? { mode: `${mode}Repeat`, input: { ...input, repeated: repeat.line } }
          : null;
  if (retry) {
    const again = layoutOf(retry.input);
    try {
      const second = await provider.complete(again, { timeoutMs: left });
      calls.push({ mode: retry.mode, layout: again, result: second });
      const redone = parseModelReply(second.text);
      const better = repeat ? (findRepeat(redone.bubbles, input.messages, input.redo)?.score ?? 0) < repeat.score : true;
      if (redone.bubbles.length && better) {
        reply = redone;
        result = second;
      }
    } catch (error) {
      console.warn(`[reply] second try failed: ${String((error as Error).message).slice(0, 120)}`);
    }
  }
  // The helpline card follows the draft that went out too: a stopped first draft could not raise it.
  const crisis = flagged || reply.crisis === true;
  return { reply, result, calls, repeat, crisis, ...(blocked ? { blocked } : {}) };
}

/** How many of the user's latest messages a stopped prompt veils: the filter reads the whole chat. */
export const VEIL_USER_TURNS = 3;

/**
 * The chat with the user's latest messages veiled, for a prompt the filter would not read: the one
 * that tripped it may sit a few turns back, and veiling only the last would stop every later reply
 * too. A message the crisis check caught gets the neutral veil, so the crisis cue leads.
 */
export function veilRecentUser(messages: readonly Message[], crisis = false): Message[] {
  const mine = messages.flatMap((m, i) => (m.author === 'me' ? [i] : [])).slice(-VEIL_USER_TURNS);
  const veil = crisis ? VEILED_NEUTRAL : VEILED_MESSAGE;
  return messages.map((m, i) => (mine.includes(i) ? { ...m, text: veil, transcript: undefined } : m));
}
