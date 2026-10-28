import { layoutChatPrompt, type ChatPromptInput } from '../../src/ai/chat-prompt.ts';
import type { PromptLayout } from '../../src/ai/prompt-layout.ts';
import { findRepeat, type Repeat } from '../../src/ai/repetition.ts';
import { parseModelReply, type ModelReply } from '../../src/ai/reply-style.ts';
import type { LlmProvider, LlmResult } from './llm/types.ts';

/** One model call a reply made, for the cost log: the first draft, or the guard's second try. */
export interface ChatCall {
  mode: 'chat' | 'chatRepeat';
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
}

/**
 * One chat reply with the repetition guard (src/ai/repetition.ts): a first draft that echoes one of
 * their recent replies (or a version a ↻ replaces) is asked for once more with the echoed line named,
 * while at least half the wait is left. The second try goes out unless it echoes as much; busy or
 * slow the second time, the first draft goes out after all. The route and the eval set
 * (server/evals) both answer through here, so the eval sees what users get.
 */
export async function chatReply(provider: LlmProvider, input: ChatPromptInput, timeoutMs: number): Promise<GuardedReply> {
  const started = Date.now();
  const layout = layoutChatPrompt(input);
  const first = await provider.complete(layout, { timeoutMs });
  const calls: ChatCall[] = [{ mode: 'chat', layout, result: first }];
  let reply = parseModelReply(first.text);
  let result = first;

  const repeat = reply.bubbles.length ? findRepeat(reply.bubbles, input.messages, input.redo) : null;
  const left = timeoutMs - (Date.now() - started);
  if (repeat && left > timeoutMs / 2) {
    const again = layoutChatPrompt({ ...input, repeated: repeat.line });
    try {
      const second = await provider.complete(again, { timeoutMs: left });
      calls.push({ mode: 'chatRepeat', layout: again, result: second });
      const redone = parseModelReply(second.text);
      const still = findRepeat(redone.bubbles, input.messages, input.redo);
      if (redone.bubbles.length && (still?.score ?? 0) < repeat.score) {
        reply = redone;
        result = second;
      }
    } catch (error) {
      console.warn(`[reply] second try failed: ${String((error as Error).message).slice(0, 120)}`);
    }
  }
  return { reply, result, calls, repeat };
}
