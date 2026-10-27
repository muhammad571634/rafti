import { Hono } from 'hono';

import { layoutChatPrompt, type ChatPromptInput } from '../../src/ai/chat-prompt.ts';
import { cleanFirstText, firstTextParts } from '../../src/ai/first-text.ts';
import { layoutPrompt } from '../../src/ai/prompt-layout.ts';
import { parseTouchReply } from '../../src/ai/thread-prompt.ts';
import { parseModelReply } from '../../src/ai/reply-style.ts';
import type { Context } from 'hono';

import { MESSAGE_SYNC_LIMITS, type ClientConfig, type MessageSyncRequest } from '../../src/ai/session-types.ts';
import { DAILY_CHECK_IN, DAILY_CHECK_IN_TOP, FREE_SPINS_PER_DAY, WHEEL_SEGMENTS, WHEEL_WEIGHTS } from '../../src/economy/shells.ts';
import type { LedgerReason } from '../../src/types/index.ts';
import { WalletError, type BootstrapInput, type Db, type UsageEvent } from './db/types.ts';
import { LlmBusyError, type LlmProvider } from './llm/types.ts';
import { costUsd, promptVersion } from './llm/usage.ts';

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

/** The most one spend or grant may move: anything bigger is a bug or an attack. */
const MAX_SPEND = 1000;
const MAX_GRANT = 5000;
const SPEND_REASONS = new Set<LedgerReason>(['chat', 'voice', 'photo', 'note', 'board', 'date', 'photoBooth', 'voiceClone', 'portrait', 'stream', 'call', 'topUp', 'radio', 'other']);
const GRANT_REASONS = new Set<LedgerReason>(['purchase', 'quest', 'invite', 'plan', 'membership', 'share', 'ad', 'other']);
/** Earnings that land in today's free bucket and burn at midnight (src/economy/shells.ts). */
const FREE_GRANTS = new Set<LedgerReason>(['ad', 'share']);

const isCount = (value: unknown, max: number): value is number => Number.isInteger(value) && (value as number) >= 1 && (value as number) <= max;
const isKey = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 100;

/** The most one sync may carry; the phone sends its outbox in batches this size. */
export const SYNC_LIMITS = MESSAGE_SYNC_LIMITS;
/** A restore page (`GET /v1/messages`). */
const PAGE_SIZE = 500;

const MESSAGE_AUTHORS = new Set(['me', 'them']);
const MESSAGE_KINDS = new Set(['text', 'voice', 'image', 'system', 'call']);
const isId = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 100;

/**
 * A sync body the database can take, or null when its shape is wrong. A message the database would
 * refuse (unknown author or kind, a bad date, too big) is left out and counted, so one bad line can
 * never block the rest of the outbox; it stays on the phone. A message sent twice keeps its last copy.
 */
export function cleanSync(body: Record<string, unknown> | null): { request: MessageSyncRequest; skipped: number } | null {
  const { droppedChats, deletedIds, upserts } = body ?? {};
  const ids = (value: unknown, max: number) => Array.isArray(value) && value.length <= max && value.every(isId);
  if (!ids(droppedChats, SYNC_LIMITS.droppedChats) || !ids(deletedIds, SYNC_LIMITS.deletedIds)) return null;
  if (!Array.isArray(upserts) || upserts.length > SYNC_LIMITS.upserts) return null;

  const kept = new Map<string, MessageSyncRequest['upserts'][number]>();
  let skipped = 0;
  for (const entry of upserts as { chatId?: unknown; message?: Record<string, unknown> }[]) {
    const m = entry?.message;
    const ok =
      isId(entry?.chatId) &&
      !!m &&
      isId(m.id) &&
      MESSAGE_AUTHORS.has(m.author as string) &&
      MESSAGE_KINDS.has(m.kind as string) &&
      typeof m.createdAt === 'string' &&
      !Number.isNaN(Date.parse(m.createdAt)) &&
      (m.durationSec == null || Number.isFinite(m.durationSec)) &&
      JSON.stringify(m).length <= SYNC_LIMITS.messageBytes;
    if (!ok) {
      skipped++;
      continue;
    }
    kept.delete(m.id as string);
    kept.set(m.id as string, entry as unknown as MessageSyncRequest['upserts'][number]);
  }
  return {
    request: { droppedChats: droppedChats as string[], deletedIds: deletedIds as string[], upserts: [...kept.values()] },
    skipped,
  };
}

/** The request's JSON object, {} for an empty body, null when it is not JSON. */
async function readJson(c: Context): Promise<Record<string, unknown> | null> {
  try {
    const raw = await c.req.text();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return null;
  }
}

/** Writes a call's cost row without holding the reply up; a failed write is only reported. */
function logUsage(db: Db | null, userId: Promise<string | null>, event: Omit<UsageEvent, 'userId'>) {
  if (!db) return;
  void userId.then((id) => db.logUsage({ userId: id, ...event })).catch((error) => console.error('[usage] not logged', error));
}

/**
 * The API. Chat replies are stateless: the app sends what the reply needs (the same
 * `ChatPromptInput` the prompt code was written for) and gets the bubbles back. Accounts and the
 * server's own economy live in Supabase (`db`), from B0 on (backend-plan §11).
 */
export function createApp(
  provider: LlmProvider | null,
  opts: { timeoutMs: number; db?: Db | null; client?: ClientConfig | null; devGrants?: boolean },
) {
  const app = new Hono();
  const db = opts.db ?? null;

  /**
   * A wallet call for the signed-in user. A wallet not made yet (bootstrap never ran) is made first;
   * too few shells answer 402 with the wallet, so the app can show the real balance.
   */
  async function wallet(c: Context, run: (userId: string) => Promise<unknown>) {
    if (!db) return c.json({ error: 'noDatabase' }, 503);
    const token = bearer(c.req.header('authorization'));
    const userId = token ? await db.userIdFromToken(token) : null;
    if (!userId) return c.json({ error: 'signIn' }, 401);
    try {
      try {
        return c.json(await run(userId));
      } catch (error) {
        if (!(error instanceof WalletError && error.code === 'noWallet')) throw error;
        await db.bootstrap(userId, {});
        return c.json(await run(userId));
      }
    } catch (error) {
      if (error instanceof WalletError && error.code === 'noShells') {
        return c.json({ error: 'noShells', wallet: await db.walletState(userId).catch(() => null) }, 402);
      }
      if (error instanceof WalletError) return c.json({ error: error.code }, 400);
      console.error('[wallet] failed', error);
      return c.json({ error: 'failed' }, 500);
    }
  }

  /** The signed-in user's id, or null (no database, no token, a stale token). */
  async function signedIn(c: Context) {
    const token = bearer(c.req.header('authorization'));
    return db && token ? db.userIdFromToken(token).catch(() => null) : null;
  }

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

  // The wallet (B1.2): the server keeps the balance, the free bucket and the ledger; the app keeps a
  // cache. Money moves only through the SQL functions (supabase/migrations/*_b1_wallet.sql).
  app.get('/v1/wallet', (c) => wallet(c, (userId) => db!.walletState(userId)));

  app.post('/v1/wallet/spend', async (c) => {
    const body = await readJson(c);
    const reason = body?.reason as LedgerReason;
    if (!isCount(body?.amount, MAX_SPEND) || !SPEND_REASONS.has(reason) || !isKey(body?.key)) return c.json({ error: 'badInput' }, 400);
    const { amount, key } = body as { amount: number; key: string };
    const characterId = typeof body?.characterId === 'string' ? body.characterId : undefined;
    // The app's keys get a prefix, so none can clash with the server's own ("daily:…", "spin:…").
    return wallet(c, (userId) => db!.walletSpend(userId, { amount, reason, key: `spend:${key}`, characterId }));
  });

  app.post('/v1/wallet/check-in', (c) => wallet(c, (userId) => db!.walletCheckIn(userId, { ladder: DAILY_CHECK_IN, top: DAILY_CHECK_IN_TOP })));

  app.post('/v1/wallet/spin', (c) =>
    wallet(c, (userId) => db!.walletSpin(userId, { segments: WHEEL_SEGMENTS, weights: WHEEL_WEIGHTS, freeSpins: FREE_SPINS_PER_DAY })),
  );

  // Earnings whose rules are not on the server yet (purchases until RevenueCat, quests, invites):
  // the test server takes the app's word when DEV_GRANTS=1; anywhere else this is off.
  app.post('/v1/wallet/grant', async (c) => {
    if (!opts.devGrants) return c.json({ error: 'off' }, 403);
    const body = await readJson(c);
    const reason = body?.reason as LedgerReason;
    if (!isCount(body?.amount, MAX_GRANT) || !GRANT_REASONS.has(reason) || !isKey(body?.key)) return c.json({ error: 'badInput' }, 400);
    const { amount, key } = body as { amount: number; key: string };
    return wallet(c, (userId) => db!.walletCredit(userId, { amount, reason, key: `grant:${key}`, free: FREE_GRANTS.has(reason) }));
  });

  // The chats (B1.3b): the phone sends what it has not sent yet; a new install reads them back.
  app.post('/v1/messages/sync', async (c) => {
    if (!db) return c.json({ error: 'noDatabase' }, 503);
    const userId = await signedIn(c);
    if (!userId) return c.json({ error: 'signIn' }, 401);
    const clean = cleanSync(await readJson(c));
    if (!clean) return c.json({ error: 'badInput' }, 400);
    try {
      return c.json({ seq: await db.syncMessages(userId, clean.request), skipped: clean.skipped });
    } catch (error) {
      console.error('[messages] sync failed', error);
      return c.json({ error: 'failed' }, 500);
    }
  });

  app.get('/v1/messages', async (c) => {
    if (!db) return c.json({ error: 'noDatabase' }, 503);
    const userId = await signedIn(c);
    if (!userId) return c.json({ error: 'signIn' }, 401);
    const after = Number(c.req.query('after') ?? 0);
    if (!Number.isSafeInteger(after) || after < 0) return c.json({ error: 'badInput' }, 400);
    try {
      return c.json(await db.messagesAfter(userId, after, PAGE_SIZE));
    } catch (error) {
      console.error('[messages] read failed', error);
      return c.json({ error: 'failed' }, 500);
    }
  });

  // Deleting the account deletes everything the server keeps for it (App Store 5.1.1(v)): the auth
  // user goes, and every table follows it through `on delete cascade`.
  app.delete('/v1/account', async (c) => {
    if (!db) return c.json({ error: 'noDatabase' }, 503);
    const userId = await signedIn(c);
    if (!userId) return c.json({ error: 'signIn' }, 401);
    try {
      await db.deleteUser(userId);
      return c.json({ ok: true });
    } catch (error) {
      console.error('[account] delete failed', error);
      return c.json({ error: 'failed' }, 500);
    }
  });

  // A text a friend writes first (B1.4a): a thread's text, the morning brief, the evening question,
  // the Sunday recap. The app picks who, when and about what; the model writes the words. A skip
  // ("the chat already settled it", or a broken answer) is an answer too: the app decides what then.
  app.post('/v1/ai/first-text', async (c) => {
    if (!provider) return c.json({ error: 'noModel' }, 503);
    const request = cleanFirstText(await readJson(c));
    if (!request) return c.json({ error: 'badInput' }, 400);
    request.input = {
      ...request.input,
      user: { ...request.input.user, locale: request.input.user.locale || 'en-US' },
      replyLanguage: request.input.replyLanguage || FOLLOW_USER_LANGUAGE,
    };
    const userId = signedIn(c);
    const started = Date.now();
    try {
      const layout = layoutPrompt(firstTextParts(request));
      const result = await provider.complete(layout, opts);
      const reply = parseTouchReply(result.text);
      const cost = costUsd(result.model, result.usage);
      logUsage(db, userId, {
        kind: 'llm',
        mode: request.kind,
        model: result.model ?? provider.name,
        promptVersion: promptVersion(layout),
        inputTokens: result.usage.input,
        cachedTokens: result.usage.cached,
        outputTokens: result.usage.output,
        costUsd: cost,
      });
      console.log(
        `[first] ${request.kind} ${request.input.character.name} ${result.model ?? provider.name} ${Date.now() - started}ms $${cost?.toFixed(6) ?? '?'} ${reply.skip ? 'skip' : `"${reply.lines[0].slice(0, 50)}"`}`,
      );
      return c.json({ ...reply, model: result.model ?? provider.name });
    } catch (error) {
      if (error instanceof LlmBusyError) return c.json({ error: 'busy' }, 503);
      console.error('[first] failed', error);
      return c.json({ error: 'failed' }, 502);
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

    // Who is asking, looked up while the model writes: the reply never waits on it, and a missing or
    // stale token only leaves the cost row without a user.
    const token = bearer(c.req.header('authorization'));
    const userId = db && token ? db.userIdFromToken(token).catch(() => null) : Promise.resolve(null);

    const started = Date.now();
    try {
      const layout = layoutChatPrompt(input);
      const result = await provider.complete(layout, opts);
      const reply = parseModelReply(result.text);
      const ms = Date.now() - started;
      const cost = costUsd(result.model, result.usage);
      logUsage(db, userId, {
        kind: 'llm',
        mode: 'chat',
        model: result.model ?? provider.name,
        promptVersion: promptVersion(layout),
        inputTokens: result.usage.input,
        cachedTokens: result.usage.cached,
        outputTokens: result.usage.output,
        costUsd: cost,
      });
      const lang = input.replyLanguage === FOLLOW_USER_LANGUAGE ? 'follow' : input.replyLanguage;
      console.log(
        `[reply] ${input.character.name} ${result.model ?? provider.name} ${ms}ms lang=${lang} in=${result.usage.input ?? '?'} cached=${result.usage.cached ?? 0} out=${result.usage.output ?? '?'} $${cost?.toFixed(6) ?? '?'} "${(reply.bubbles[0] ?? '').slice(0, 50)}"`,
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
