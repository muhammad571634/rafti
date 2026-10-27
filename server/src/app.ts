import { Hono } from 'hono';

import { layoutChatPrompt, type ChatPromptInput } from '../../src/ai/chat-prompt.ts';
import { parseModelReply } from '../../src/ai/reply-style.ts';
import type { ClientConfig } from '../../src/ai/session-types.ts';
import type { BootstrapInput, Db } from './db/types.ts';
import { LlmBusyError, type LlmProvider } from './llm/types.ts';

/** Until the chat's language lock is stored, the reply follows what the user writes (`replyLanguage`). */
export const FOLLOW_USER_LANGUAGE =
  "the language of the user's latest messages (Uzbek, Russian, English…), written naturally as a native speaker would text; English if unclear. Never mix languages.";

/** How much of the chat a request may carry; the prompt layout cuts it further. */
const MAX_MESSAGES = 120;

/** A BCP 47 tag the profile may keep ("en-US", "uz-Latn-UZ"); anything else is dropped. */
export function cleanLocale(value: unknown): string | undefined {
  return typeof value === 'string' && value.length <= 35 && /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(value) ? value : undefined;
}

/** An IANA time zone the runtime knows ("Asia/Tashkent"); anything else is dropped. */
export function cleanTimeZone(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 64) return undefined;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return value;
  } catch {
    return undefined;
  }
}

/** The bearer token of `Authorization: Bearer <token>`, if any. */
const bearer = (header: string | undefined) => header?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? null;

/**
 * The API. Chat replies are stateless: the app sends what the reply needs (the same
 * `ChatPromptInput` the prompt code was written for) and gets the bubbles back. Accounts and the
 * server's own economy live in Supabase (`db`), from B0 on (backend-plan §11).
 */
export function createApp(
  provider: LlmProvider | null,
  opts: { timeoutMs: number; db?: Db | null; client?: ClientConfig | null },
) {
  const app = new Hono();
  const db = opts.db ?? null;

  app.get('/health', (c) => c.json({ ok: true, model: provider?.name ?? null, db: db?.name ?? null }));

  // Where the app signs in. A development build asks here so no key sits in the app's files; a
  // release build reads EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY instead.
  app.get('/v1/client-config', (c) => (opts.client ? c.json(opts.client) : c.json({ error: 'noDatabase' }, 503)));

  // After sign-in (anonymous at first): the profile, the wallet and the plan, created on the first
  // call with the welcome gift paid once (backend-plan §5). Safe to call on every launch.
  app.post('/v1/session/bootstrap', async (c) => {
    if (!db) return c.json({ error: 'noDatabase' }, 503);
    const token = bearer(c.req.header('authorization'));
    if (!token) return c.json({ error: 'signIn' }, 401);
    const userId = await db.userIdFromToken(token);
    if (!userId) return c.json({ error: 'signIn' }, 401);

    let body: Record<string, unknown> = {};
    try {
      const raw = await c.req.text();
      if (raw) body = JSON.parse(raw);
    } catch {
      return c.json({ error: 'badJson' }, 400);
    }
    const input: BootstrapInput = { locale: cleanLocale(body.locale), timeZone: cleanTimeZone(body.timeZone) };

    try {
      return c.json(await db.bootstrap(userId, input));
    } catch (error) {
      console.error('[bootstrap] failed', error);
      return c.json({ error: 'failed' }, 500);
    }
  });

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
      const lang = input.replyLanguage === FOLLOW_USER_LANGUAGE ? 'follow' : input.replyLanguage;
      console.log(
        `[reply] ${input.character.name} ${result.model ?? provider.name} ${ms}ms lang=${lang} in=${result.usage.input ?? '?'} cached=${result.usage.cached ?? 0} out=${result.usage.output ?? '?'} "${(reply.bubbles[0] ?? '').slice(0, 50)}"`,
      );
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
