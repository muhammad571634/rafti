import { Hono } from 'hono';

import { CHAT_MODES, type ChatMode, type ChatPromptInput } from '../../src/ai/chat-prompt.ts';
import {
  buildDraftPrompt,
  buildFieldPrompt,
  checkIdea,
  DRAFT_FIELDS,
  parseDraft,
  parseField,
  type DraftField,
  type DraftInput,
  type FieldContext,
} from '../../src/ai/character-draft.ts';
import { parseStreamLine, streamLineParts, type StreamLineRequest } from '../../src/ai/content-prompts.ts';
import { cleanFirstText, firstTextParts } from '../../src/ai/first-text.ts';
import { cleanGroupLines, layoutGroupReply, type GroupPromptInput } from '../../src/ai/group-reply.ts';
import { cleanMemoryPass, memoryPassParts, parseMemoryPass } from '../../src/ai/memory-pass.ts';
import type { PromptMode } from '../../src/ai/modes.ts';
import { layoutPrompt, part, type PromptLayout } from '../../src/ai/prompt-layout.ts';
import { followsUser, followUserLanguage } from '../../src/ai/reply-language.ts';
import { parseTouchReply } from '../../src/ai/thread-prompt.ts';
import type { Context } from 'hono';

import {
  MEMORY_SYNC_LIMITS,
  MESSAGE_SYNC_LIMITS,
  type ChatMemory,
  type ClientConfig,
  type MemorySyncRequest,
  type MessageSyncRequest,
} from '../../src/ai/session-types.ts';
import {
  DAILY_CHECK_IN,
  DAILY_CHECK_IN_TOP,
  FREE_SPINS_PER_DAY,
  PAID_SHARES_PER_DAY,
  SHARE_REWARD,
  WHEEL_SEGMENTS,
  WHEEL_WEIGHTS,
} from '../../src/economy/shells.ts';
import type { LedgerReason, MemoryItem } from '../../src/types/index.ts';
import { chatReply } from './chat-reply.ts';
import { WalletError, type BootstrapInput, type Db, type UsageEvent } from './db/types.ts';
import { LlmBusyError, type LlmProvider } from './llm/types.ts';
import { costUsd, promptVersion } from './llm/usage.ts';

/**
 * Until each chat's language lock is stored, the reply follows what the user writes, and before
 * they write, their phone's language (src/ai/reply-language.ts).
 */
const replyLanguageOf = (input: { replyLanguage?: string; user: { locale?: string } }) => input.replyLanguage || followUserLanguage(input.user.locale);

/** How much of the chat a request may carry; the prompt layout cuts it further. */
const MAX_MESSAGES = 120;
/** A group is the user and two or three characters; a little room for a member just added. */
const MAX_GROUP_OTHERS = 4;

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

const MEMORY_ABOUT = new Set(['you', 'them', 'story']);
const MEMORY_STATUS = new Set(['active', 'superseded', 'archived']);
const isDay = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));

/**
 * A memory sync the database can take, or null when its shape is wrong. As with the chats, an item
 * the database would refuse (a bad date, an unknown status, too big, an id already sent) is left
 * out and counted. A character or chat sent twice keeps its last copy.
 */
export function cleanMemorySync(body: Record<string, unknown> | null): { request: MemorySyncRequest; skipped: number } | null {
  const { characters, chats } = body ?? {};
  if (!Array.isArray(characters) || characters.length > MEMORY_SYNC_LIMITS.characters) return null;
  if (!Array.isArray(chats) || chats.length > MEMORY_SYNC_LIMITS.chats) return null;

  const lists = new Map<string, Record<string, unknown>[]>();
  for (const entry of characters as { characterId?: unknown; items?: unknown }[]) {
    if (!isId(entry?.characterId) || !Array.isArray(entry.items) || entry.items.length > MEMORY_SYNC_LIMITS.items) return null;
    lists.delete(entry.characterId);
    lists.set(entry.characterId, entry.items as Record<string, unknown>[]);
  }
  let skipped = 0;
  const seen = new Set<string>();
  const kept: MemorySyncRequest['characters'] = [];
  for (const [characterId, items] of lists) {
    const ok = items.filter((m) => {
      const fine =
        isPlainObject(m) &&
        isId(m.id) &&
        !seen.has(m.id) &&
        m.characterId === characterId &&
        typeof m.text === 'string' &&
        m.text.trim().length > 0 &&
        typeof m.createdAt === 'string' &&
        !Number.isNaN(Date.parse(m.createdAt)) &&
        (m.about == null || MEMORY_ABOUT.has(m.about as string)) &&
        (m.status == null || MEMORY_STATUS.has(m.status as string)) &&
        (m.pinned == null || typeof m.pinned === 'boolean') &&
        (m.importance == null || Number.isFinite(m.importance)) &&
        (m.until == null || isDay(m.until)) &&
        JSON.stringify(m).length <= MEMORY_SYNC_LIMITS.itemBytes;
      if (fine) seen.add(m.id as string);
      else skipped++;
      return fine;
    });
    kept.push({ characterId, items: ok as unknown as MemoryItem[] });
  }

  const rows = new Map<string, ChatMemory>();
  for (const entry of chats as Record<string, unknown>[]) {
    if (!isPlainObject(entry) || !isId(entry.chatId)) return null;
    if (entry.summary != null && (typeof entry.summary !== 'string' || entry.summary.length > MEMORY_SYNC_LIMITS.summaryChars)) return null;
    if (entry.mark != null && !isId(entry.mark)) return null;
    rows.delete(entry.chatId);
    rows.set(entry.chatId, {
      chatId: entry.chatId,
      ...(typeof entry.summary === 'string' && entry.summary.trim() ? { summary: entry.summary.trim() } : {}),
      ...(typeof entry.mark === 'string' ? { mark: entry.mark } : {}),
    });
  }
  return { request: { characters: kept, chats: [...rows.values()] }, skipped };
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
/** "English", "Uzbek (Latin)", "en-US": what the prompts call the REPLY LANGUAGE. */
const isLanguage = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 60;

/** How much of a stream the next line sees; the round is a few lines, so this is all of it in practice. */
const STREAM_SAID_MAX = 24;

/** A stream line request the prompt code can lay out, or null. */
export function cleanStreamLine(body: Record<string, unknown> | null): StreamLineRequest | null {
  const { input, other, topic, said, turn } = body ?? {};
  if (!isPlainObject(input) || !isPlainObject(input.character) || typeof input.character.name !== 'string' || !input.character.name) return null;
  if (!isPlainObject(input.user) || !isPlainObject(other) || typeof other.name !== 'string' || !other.name) return null;
  if (typeof topic !== 'string' || !topic.trim() || topic.length > 200 || !Array.isArray(said) || !isPlainObject(turn)) return null;
  const { index, total } = turn;
  if (!Number.isInteger(index) || !Number.isInteger(total) || (index as number) < 0 || (total as number) < 1 || (total as number) > 50) return null;
  const lines = said
    .filter((l): l is { name: string; text: string } => isPlainObject(l) && typeof l.name === 'string' && typeof l.text === 'string')
    .slice(-STREAM_SAID_MAX)
    .map(({ name, text }) => ({ name: name.slice(0, 40), text: text.slice(0, 400) }));
  return {
    input: input as unknown as StreamLineRequest['input'],
    other: other as unknown as StreamLineRequest['other'],
    topic: topic.trim(),
    said: lines,
    turn: { index: index as number, total: total as number },
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

  /**
   * One model call for a feature: the cost row is written under `mode` (without holding the answer
   * up), `read` turns the model's text into the answer. Busy (the free tier's cap) is 503.
   * `template` is the mode block the prompt carries (src/ai/modes.ts), for `promptVersion`;
   * `temperature` is for work that must be exact (the memory pass).
   */
  async function modelCall(c: Context, mode: string, layout: PromptLayout, read: (text: string) => object, template?: PromptMode, temperature?: number) {
    if (!provider) return c.json({ error: 'noModel' }, 503);
    const started = Date.now();
    try {
      const result = await provider.complete(layout, { timeoutMs: opts.timeoutMs, temperature });
      const model = result.model ?? provider.name;
      const cost = costUsd(result.model, result.usage);
      logUsage(db, signedIn(c), {
        kind: 'llm',
        mode,
        model,
        promptVersion: promptVersion(layout, template),
        inputTokens: result.usage.input,
        cachedTokens: result.usage.cached,
        outputTokens: result.usage.output,
        costUsd: cost,
      });
      console.log(`[${mode}] ${model} ${Date.now() - started}ms in=${result.usage.input ?? '?'} out=${result.usage.output ?? '?'} $${cost?.toFixed(6) ?? '?'}`);
      return c.json({ ...read(result.text), model });
    } catch (error) {
      if (error instanceof LlmBusyError) return c.json({ error: 'busy' }, 503);
      console.error(`[${mode}] failed`, error);
      return c.json({ error: 'failed' }, 502);
    }
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

  // A shared card pays the first few shares of the user's day; the cap lives here, not on the phone.
  app.post('/v1/wallet/share', (c) => wallet(c, (userId) => db!.walletShare(userId, { amount: SHARE_REWARD, perDay: PAID_SHARES_PER_DAY })));

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

  // The memory (B2.3): each character the phone changed goes up whole; a new install reads it all back.
  app.post('/v1/memories/sync', async (c) => {
    if (!db) return c.json({ error: 'noDatabase' }, 503);
    const userId = await signedIn(c);
    if (!userId) return c.json({ error: 'signIn' }, 401);
    const clean = cleanMemorySync(await readJson(c));
    if (!clean) return c.json({ error: 'badInput' }, 400);
    try {
      await db.syncMemories(userId, clean.request);
      return c.json({ skipped: clean.skipped });
    } catch (error) {
      console.error('[memories] sync failed', error);
      return c.json({ error: 'failed' }, 500);
    }
  });

  app.get('/v1/memories', async (c) => {
    if (!db) return c.json({ error: 'noDatabase' }, 503);
    const userId = await signedIn(c);
    if (!userId) return c.json({ error: 'signIn' }, 401);
    try {
      return c.json(await db.memoriesOf(userId));
    } catch (error) {
      console.error('[memories] read failed', error);
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
    const user = { ...request.input.user, locale: request.input.user.locale || 'en-US' };
    request.input = { ...request.input, user, replyLanguage: replyLanguageOf({ ...request.input, user }) };
    return modelCall(c, request.kind, layoutPrompt(firstTextParts(request)), parseTouchReply, 'initiative');
  });

  // The memory pass (B2): what was said since the last pass becomes facts and the story so far. The
  // app sends the facts and the lines and applies the answer (src/lib/memory-ops.ts).
  app.post('/v1/memory/pass', async (c) => {
    if (!provider) return c.json({ error: 'noModel' }, 503);
    const request = cleanMemoryPass(await readJson(c));
    if (!request) return c.json({ error: 'badInput' }, 400);
    const ids = new Set(request.facts.map((f) => f.id));
    return modelCall(c, 'memory', layoutPrompt(memoryPassParts(request)), (text) => parseMemoryPass(text, ids), undefined, 0.2);
  });

  // Quick create (B1.4b, backend-plan §12.17): the whole character from the creator's idea. The idea
  // is checked again here (the app checks it first); a model refusal comes back as `{ ok: false }`.
  app.post('/v1/characters/draft', async (c) => {
    if (!provider) return c.json({ error: 'noModel' }, 503);
    const body = await readJson(c);
    const { idea, sparks, role, language } = body ?? {};
    if (typeof idea !== 'string' || !Array.isArray(sparks) || !isLanguage(language)) return c.json({ error: 'badInput' }, 400);
    const problems = checkIdea(idea, sparks as string[]);
    if (problems.length) return c.json({ error: 'badIdea', problems }, 400);
    const input: DraftInput = { idea, sparks: sparks as DraftInput['sparks'], role: typeof role === 'string' ? (role as DraftInput['role']) : undefined, language };
    return modelCall(c, 'quickCreate', layoutPrompt([part('draft', 'turn', [buildDraftPrompt(input)])]), parseDraft);
  });

  // ✦ on one field of the create form: that field written again from what the form holds.
  app.post('/v1/characters/draft/field', async (c) => {
    if (!provider) return c.json({ error: 'noModel' }, 503);
    const body = await readJson(c);
    const { field, character, language } = body ?? {};
    if (!DRAFT_FIELDS.includes(field as DraftField) || !isPlainObject(character) || !isLanguage(language)) return c.json({ error: 'badInput' }, 400);
    const prompt = buildFieldPrompt(field as DraftField, character as FieldContext, language);
    return modelCall(c, 'draftField', layoutPrompt([part('field', 'turn', [prompt])]), (text) => ({ value: parseField(field as DraftField, text) }));
  });

  // One line of a stream (B1.4b): the speaker's own persona writes it, one call per line, so the two
  // voices stay their own. A broken answer is `{ line: null }` and the app writes its stand-in.
  app.post('/v1/streams/line', async (c) => {
    if (!provider) return c.json({ error: 'noModel' }, 503);
    const request = cleanStreamLine(await readJson(c));
    if (!request) return c.json({ error: 'badInput' }, 400);
    const { input, other, topic, said, turn } = request;
    const user = { ...input.user, locale: input.user.locale || 'en-US' };
    const persona = { ...input, user, replyLanguage: replyLanguageOf({ ...input, user }) };
    const layout = layoutPrompt(streamLineParts(persona, other, topic, said, turn));
    return modelCall(c, 'stream', layout, (text) => ({ line: parseStreamLine(text, input.character.name) }), 'stream');
  });

  // One group member's next message: their persona, the group as they read it, this turn's cue. The
  // app asks once per member who answers (`pickResponders`), so every voice stays its own.
  app.post('/v1/chat/group', async (c) => {
    if (!provider) return c.json({ error: 'noModel' }, 503);
    const body = await readJson(c);
    const raw = body as unknown as GroupPromptInput | null;
    if (!raw?.character?.name || !raw.user || !Array.isArray(raw.messages) || !Array.isArray(raw.others) || !raw.others.length || raw.others.length > MAX_GROUP_OTHERS) {
      return c.json({ error: 'badInput' }, 400);
    }
    const user = { ...raw.user, locale: raw.user.locale || 'en-US' };
    const input: GroupPromptInput = {
      ...raw,
      mode: undefined,
      user,
      messages: raw.messages.slice(-MAX_MESSAGES),
      replyLanguage: replyLanguageOf({ ...raw, user }),
      cue: Array.isArray(raw.cue) ? raw.cue.filter((l) => typeof l === 'string').slice(0, 8) : undefined,
    };
    const userId = signedIn(c);
    const started = Date.now();
    try {
      const { reply, result, calls, crisis } = await chatReply(provider, input, opts.timeoutMs, { mode: 'group', layoutOf: layoutGroupReply });
      for (const call of calls) {
        logUsage(db, userId, {
          kind: 'llm',
          mode: call.mode,
          model: call.result.model ?? provider.name,
          promptVersion: promptVersion(call.layout, 'group'),
          inputTokens: call.result.usage.input,
          cachedTokens: call.result.usage.cached,
          outputTokens: call.result.usage.output,
          costUsd: costUsd(call.result.model, call.result.usage),
        });
      }
      console.log(`[group] ${input.character.name} ${result.model ?? provider.name} ${Date.now() - started}ms calls=${calls.length}`);
      const lines = cleanGroupLines(reply.bubbles, input.character, input.others);
      if (!lines.length) return c.json({ error: 'empty' }, 502);
      return c.json({ messages: lines, crisis, model: result.model ?? provider.name });
    } catch (error) {
      if (error instanceof LlmBusyError) return c.json({ error: 'busy' }, 503);
      console.error('[group] failed', error);
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
    // A profile without a locale is written to in English. Until the database keeps each chat's
    // language lock, the model follows the language the user writes in, whatever it is, reminded
    // with their latest words (`languageCue`), so nobody gets answered in a language they did not use.
    const user = { ...input.user, locale: input.user.locale || 'en-US' };
    input = {
      ...input,
      mode: CHAT_MODES.includes(input.mode as ChatMode) ? input.mode : undefined,
      user,
      messages: input.messages.slice(-MAX_MESSAGES),
      replyLanguage: replyLanguageOf({ ...input, user }),
    };

    // Who is asking, looked up while the model writes: the reply never waits on it, and a missing or
    // stale token only leaves the cost row without a user.
    const token = bearer(c.req.header('authorization'));
    const userId = db && token ? db.userIdFromToken(token).catch(() => null) : Promise.resolve(null);

    const started = Date.now();
    try {
      const { reply, result, calls, repeat, crisis } = await chatReply(provider, input, opts.timeoutMs);
      const ms = Date.now() - started;
      let cost: number | null = 0;
      for (const call of calls) {
        const callCost = costUsd(call.result.model, call.result.usage);
        cost = cost === null || callCost === null ? null : cost + callCost;
        logUsage(db, userId, {
          kind: 'llm',
          mode: call.mode,
          model: call.result.model ?? provider.name,
          promptVersion: promptVersion(call.layout, input.mode ?? 'chat'),
          inputTokens: call.result.usage.input,
          cachedTokens: call.result.usage.cached,
          outputTokens: call.result.usage.output,
          costUsd: callCost,
        });
      }
      const lang = followsUser(input.replyLanguage) ? `follow:${input.user.locale}` : input.replyLanguage;
      const redone = result === calls[0].result ? 'kept' : 'redone';
      const guard = crisis ? ` crisis ${calls.length > 1 ? redone : 'cued'}` : repeat ? ` repeat=${repeat.score.toFixed(2)} ${redone}` : '';
      console.log(
        `[reply] ${input.character.name} ${result.model ?? provider.name} ${ms}ms lang=${lang} in=${result.usage.input ?? '?'} cached=${result.usage.cached ?? 0} out=${result.usage.output ?? '?'} $${cost?.toFixed(6) ?? '?'}${guard} "${(reply.bubbles[0] ?? '').slice(0, 50)}"`,
      );
      if (!reply.bubbles.length) return c.json({ error: 'empty' }, 502);
      // `crisis`: the app shows the helpline card with the reply (src/ai/safety.ts).
      return c.json({ messages: reply.bubbles, emotion: reply.emotion, intensity: reply.intensity, crisis, model: result.model ?? provider.name, ms });
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
