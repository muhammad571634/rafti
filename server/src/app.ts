import { Hono } from 'hono';

import { layoutChatPrompt, type ChatPromptInput } from '../../src/ai/chat-prompt.ts';
import { parseModelReply } from '../../src/ai/reply-style.ts';
import { LlmBusyError, type LlmProvider } from './llm/types.ts';

/** Until the chat's language lock is stored, the reply follows what the user writes (`replyLanguage`). */
export const FOLLOW_USER_LANGUAGE =
  "the language of the user's latest messages (Uzbek, Russian, English…), written naturally as a native speaker would text; English if unclear. Never mix languages.";

/** How much of the chat a request may carry; the prompt layout cuts it further. */
const MAX_MESSAGES = 120;

/**
 * The API. B0 is stateless: the app sends what the reply needs (the same `ChatPromptInput` the
 * prompt code was written for) and gets the bubbles back. The database, accounts and the server's
 * own economy come with Supabase (backend-plan §11, B0-B1).
 */
export function createApp(provider: LlmProvider | null, opts: { timeoutMs: number }) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, model: provider?.name ?? null }));

  app.post('/v1/chat/reply', async (c) => {
    if (!provider) return c.json({ error: 'noModel' }, 503);
    let input: ChatPromptInput;
    try {
      input = await c.req.json();
    } catch {
      return c.json({ error: 'badJson' }, 400);
    }
    if (!input?.character?.name || !input?.user || !Array.isArray(input.messages)) return c.json({ error: 'badInput' }, 400);
    // English is the launch market: a profile without a locale is written to in English. Until the
    // database keeps each chat's language lock (`lockedReplyLanguage`), the model follows the
    // language the user writes in, so nobody gets answered in a language they did not use.
    input = {
      ...input,
      user: { ...input.user, locale: input.user.locale || 'en-US' },
      messages: input.messages.slice(-MAX_MESSAGES),
      replyLanguage: input.replyLanguage || FOLLOW_USER_LANGUAGE,
    };

    const started = Date.now();
    try {
      const result = await provider.complete(layoutChatPrompt(input), opts);
      const reply = parseModelReply(result.text);
      const ms = Date.now() - started;
      // The cost log until the database's `usage_events` exists.
      console.log(`[reply] ${input.character.name} ${result.model ?? provider.name} ${ms}ms in=${result.usage.input ?? '?'} cached=${result.usage.cached ?? 0} out=${result.usage.output ?? '?'}`);
      if (!reply.bubbles.length) return c.json({ error: 'empty' }, 502);
      return c.json({ messages: reply.bubbles, emotion: reply.emotion, intensity: reply.intensity, model: result.model ?? provider.name, ms });
    } catch (error) {
      if (error instanceof LlmBusyError) {
        console.warn(`[reply] busy: ${error.message.slice(0, 160)}`);
        return c.json({ error: 'busy' }, 503);
      }
      console.error('[reply] failed', error);
      return c.json({ error: 'failed' }, 502);
    }
  });

  return app;
}
