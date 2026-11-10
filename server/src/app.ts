import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';

import { CHAT_MODES, type ChatMode, type ChatPromptInput } from '../../src/ai/chat-prompt.ts';
import { cleanClock, cleanTogether } from '../../src/ai/together-prompt.ts';
import { cleanOwnDay } from '../../src/ai/own-day.ts';
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
import { parseStreamLine, streamDayNotes, streamLineParts, type StreamLineRequest } from '../../src/ai/content-prompts.ts';
import { cleanFirstText, firstTextParts } from '../../src/ai/first-text.ts';
import { cleanWrite, parseWrite, WRITE_MODE, writeDayNotes, writeParts } from '../../src/ai/writes.ts';
import { cleanGroupLines, layoutGroupReply, type GroupPromptInput } from '../../src/ai/group-reply.ts';
import { cleanMemoryPass, memoryPassParts, parseMemoryPass } from '../../src/ai/memory-pass.ts';
import type { PromptMode } from '../../src/ai/modes.ts';
import { layoutPrompt, part, type PromptLayout } from '../../src/ai/prompt-layout.ts';
import { followsUser, followUserLanguage } from '../../src/ai/reply-language.ts';
import { parseTouchReply } from '../../src/ai/thread-prompt.ts';
import type { Context, MiddlewareHandler } from 'hono';

import {
  MEMORY_SYNC_LIMITS,
  MESSAGE_SYNC_LIMITS,
  REPORT_LIMITS,
  SPEAK_CHARS_MAX,
  type ChatMemory,
  type ClientConfig,
  type MemorySyncRequest,
  type MessageSyncRequest,
  type ReportRequest,
  type SpeakRequest,
} from '../../src/ai/session-types.ts';
import { REPORT_REASONS } from '../../src/ai/safety.ts';
import {
  DAILY_CHECK_IN,
  DAILY_CHECK_IN_TOP,
  FREE_SPINS_PER_DAY,
  PAID_SHARES_PER_DAY,
  SHARE_REWARD,
  WHEEL_SEGMENTS,
  WHEEL_WEIGHTS,
} from '../../src/economy/shells.ts';
import type { LedgerReason, MemoryItem, PlanId } from '../../src/types/index.ts';
import { PLANS, shellGrant } from '../../src/economy/plans.ts';
import { cleanImages, PHOTO_CHARS_MAX, PHOTOS_MAX } from '../../src/ai/photo-prompt.ts';
import { cleanClip, CLIP_CHARS_MAX, parseTranscript, transcribeLayout } from '../../src/ai/voice-prompt.ts';
import { chatReply } from './chat-reply.ts';
import { WalletError, type BootstrapInput, type Db, type UsageEvent } from './db/types.ts';
import { LlmBusyError, type LlmProvider } from './llm/types.ts';
import type { SpeechProvider } from './speech/elevenlabs.ts';
import { lineSigner } from './speech/sign.ts';
import { speechOnly } from '../../src/lib/reply-engine/narration.ts';
import { costUsd, promptVersion } from './llm/usage.ts';
import { MODEL_LIMITS, windowBudget, windowLimiter, type ModelLimits } from './rate-limit.ts';

/** The plans a test subscription may name (`PLANS`). */
const PLAN_IDS = Object.keys(PLANS) as PlanId[];

/**
 * Until each chat's language lock is stored, the reply follows what the user writes, and before
 * they write, their phone's language (src/ai/reply-language.ts).
 */
const replyLanguageOf = (input: { replyLanguage?: string; user: { locale?: string } }) => input.replyLanguage || followUserLanguage(input.user.locale);

/** How much of the chat a request may carry; the prompt layout cuts it further. */
const MAX_MESSAGES = 120;
/** A group is the user and two or three characters; a little room for a member just added. */
const MAX_GROUP_OTHERS = 4;

/** Every route that calls the model and so costs money (`modelGuard`). */
const MODEL_ROUTES = ['/v1/chat/reply', '/v1/chat/group', '/v1/voice/transcribe', '/v1/voice/speak', '/v1/ai/first-text', '/v1/memory/pass', '/v1/characters/draft', '/v1/characters/draft/field', '/v1/streams/line', '/v1/ai/write'];
/** Where someone is talking; every other model route is side work with a day's cap of its own (`sidePerDay`). */
const TALK_ROUTES = new Set(['/v1/chat/reply', '/v1/chat/group', '/v1/voice/transcribe', '/v1/voice/speak']);
/** The ledger is read again for an account at its allowance at most this often. */
const LEDGER_READ_MS = 20_000;
/**
 * Writes nobody is waiting on (`/v1/ai/write`): a friend's diary page, their weekly quiz, a world
 * quiz's host lines. A date round, a note or an answer to the user's own page is someone waiting.
 */
const SIDE_WRITES = new Set<string>(['diary', 'selfQuiz', 'worldLines']);
/** A line read aloud: its text and the character's id. */
const SPEAK_BODY_MAX_BYTES = SPEAK_CHARS_MAX * 4 + 1000;
/** A line takes about a second to read out; more than this and the call shows the caption alone. */
const SPEAK_TIMEOUT_MS = 10_000;
/** A reply request: its photos, and room for the chat and everything else it carries. */
const CHAT_BODY_MAX_BYTES = PHOTOS_MAX * PHOTO_CHARS_MAX + 2_000_000;
/** A voice message: its clip and the little around it. */
const VOICE_BODY_MAX_BYTES = CLIP_CHARS_MAX + 1000;
/** A report: the message and the lines before it, at up to 4 bytes a character. */
const REPORT_BODY_MAX_BYTES = (REPORT_LIMITS.context + 1) * REPORT_LIMITS.textChars * 4 + 4000;
const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
const TOKEN_KNOWN_MS = 5 * MINUTE_MS;
/** A token the sign-in service refused is not asked about again for this long: a flood of bad tokens stays here. */
const TOKEN_REFUSED_MS = 30_000;
const MAX_KNOWN_TOKENS = 20_000;
/** How long one answer of the database's health stands (`/health` is asked every 30 s by the host, and by every app open). */
const DB_HEALTH_MS = 30_000;

/**
 * When a token says it ends, in ms, or null when it cannot be read. Only for a token the sign-in
 * check already vouched for: it caps how long that answer is remembered, it proves nothing.
 */
export function tokenEnds(token: string): number | null {
  try {
    const exp = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'))?.exp;
    return typeof exp === 'number' && Number.isFinite(exp) ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/** What the server counts about itself, for the log (`index.ts`): answers by kind since the start. */
export interface Served {
  ok: number;
  /** 429 and 503: a limit, a full gate, a busy model. */
  busy: number;
  /** 500 and 502. */
  failed: number;
}

/** A BCP 47 tag the profile may keep ("en-US", "uz-Latn-UZ"); anything else is dropped. */
export function cleanLocale(value: unknown): string | undefined {
  return typeof value === 'string' && value.length <= 35 && /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(value) ? value : undefined;
}

/**
 * An IANA time zone the runtime knows ("Asia/Tashkent"), in its proper case, as the database
 * keeps only names it knows (`profiles_known_time_zone`); anything else is dropped.
 */
export function cleanTimeZone(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 64) return undefined;
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: value }).resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

/** The bearer token of `Authorization: Bearer <token>`, if any. */
const bearer = (header: string | undefined) => header?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? null;

/** The most one spend or grant may move: anything bigger is a bug or an attack. */
const MAX_SPEND = 1000;
const MAX_GRANT = 5000;
const SPEND_REASONS = new Set<LedgerReason>(['chat', 'voice', 'photo', 'note', 'board', 'date', 'photoBooth', 'voiceClone', 'portrait', 'stream', 'call', 'topUp', 'setup', 'radio', 'other']);
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

const REPORT_REASON_SET = new Set<string>(REPORT_REASONS);
const isReportText = (value: unknown): value is string => typeof value === 'string' && value.length <= REPORT_LIMITS.textChars;
/** Postgres takes no NUL and no lone surrogate (half an emoji after a cut): either would refuse the report for good. */
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
const storable = (text: string) => text.replace(LONE_SURROGATE, '�').replaceAll(String.fromCharCode(0), '');

/** A report the database can take, or null. Unlike a sync nothing is dropped: a report is kept whole or refused. */
export function cleanReport(body: Record<string, unknown> | null): ReportRequest | null {
  const { id, characterId, reason, text, context } = body ?? {};
  if (!isId(id) || !isId(characterId) || !REPORT_REASON_SET.has(reason as string) || !isReportText(text)) return null;
  if (!Array.isArray(context) || context.length > REPORT_LIMITS.context) return null;
  const lines = context as { author?: unknown; text?: unknown; characterId?: unknown }[];
  const lineOk = (l: (typeof lines)[number]) =>
    (l?.author === 'me' || l?.author === 'them') && isReportText(l.text) && (l.characterId === undefined || isId(l.characterId));
  if (!lines.every(lineOk)) return null;
  return {
    id,
    characterId,
    reason: reason as ReportRequest['reason'],
    text: storable(text),
    context: lines.map((l) => ({
      author: l.author as 'me' | 'them',
      text: storable(l.text as string),
      ...(l.characterId === undefined ? {} : { characterId: l.characterId as string }),
    })),
  };
}

/** A line to read aloud, or null: words to say, a character, and their gender when known. */
export function cleanSpeak(body: Record<string, unknown> | null): SpeakRequest | null {
  const { text, characterId, gender, sig } = body ?? {};
  if (typeof text !== 'string' || !text.trim() || text.length > SPEAK_CHARS_MAX || !isId(characterId)) return null;
  if (typeof sig !== 'string' || !sig || sig.length > 64) return null;
  // The text exactly as the reply gave it: the signature is over those characters.
  return { text, characterId, sig, ...(gender === 'male' || gender === 'female' ? { gender } : {}) };
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
    clock: cleanClock(body?.clock),
    ownDay: cleanOwnDay(body?.ownDay),
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
  opts: {
    timeoutMs: number;
    voiceProvider?: LlmProvider | null;
    /**
     * The character's voice on calls; none means captions only. `pricePer1k` is for the cost log;
     * the two budgets cap the characters read aloud a day per user and for the whole service.
     */
    speech?: { provider: SpeechProvider; pricePer1k: number; userCharsPerDay: number; charsPerDay: number } | null;
    /** Signs call lines for `/v1/voice/speak`; a fresh key per process when not given (tests give one). */
    signer?: ReturnType<typeof lineSigner>;
    db?: Db | null;
    client?: ClientConfig | null;
    devGrants?: boolean;
    /** User ids that may start a plan with no store behind it (`TEST_SUBSCRIBERS`, before billing). */
    testSubscribers?: readonly string[];
    limits?: Partial<ModelLimits>;
    /** Counted into as answers go out (`Served`); the caller owns it and logs it. */
    served?: Served;
    /**
     * `ENFORCE_WALLET`: a reply past the account's allowance (`mayReply`) is refused with 402. Off,
     * the allowance is only counted and a crossing logged, so it can be checked on real traffic first.
     */
    enforceWallet?: boolean;
  },
) {
  const app = new Hono();
  const db = opts.db ?? null;
  const limits = { ...MODEL_LIMITS, ...opts.limits };
  const userMinute = windowLimiter(limits.userPerMinute, MINUTE_MS);
  const userDay = windowLimiter(limits.userPerDay, DAY_MS);
  const firstTextDay = windowLimiter(limits.firstTextPerDay, DAY_MS);
  const userData = windowLimiter(limits.dataPerMinute, MINUTE_MS);
  const addressData = windowLimiter(limits.addressDataPerMinute, MINUTE_MS);
  const sideDay = windowLimiter(limits.sidePerDay, DAY_MS);
  let photosInFlight = 0;

  /**
   * The reply allowance: the model answers an account as often as it paid for, read from the
   * ledger. The app spends a shell and asks for the reply as two calls with nothing tying them, so
   * the server does not charge here (it could charge twice); it counts the day's replies against
   * the day's spends plus a free share (hellos, a version asked for again, a wake-up talk). A group
   * message is one spend and up to four replies; a call is paid in minutes and has its own count.
   * An account that never spends gets the free share and no more, where it had 1,500 a day.
   * The ledger is read only when an account reaches its allowance, and a failed read lets the
   * reply out: a database hiccup must never stop someone who paid. Per machine and per UTC day.
   */
  const allowance = new Map<string, { replies: number; calls: number; spends: number; readAt: number; blind: boolean; said: boolean }>();
  let allowanceDay = 0;
  async function mayReply(userId: string, kind: 'chat' | 'group' | 'call'): Promise<boolean> {
    if (!db?.spendsToday) return true;
    const day = Math.floor(Date.now() / DAY_MS);
    if (day !== allowanceDay) {
      allowance.clear();
      allowanceDay = day;
    }
    let entry = allowance.get(userId);
    if (!entry) {
      entry = { replies: 0, calls: 0, spends: 0, readAt: 0, blind: false, said: false };
      allowance.set(userId, entry);
    }
    if (kind === 'call') return ++entry.calls <= limits.callRepliesPerDay;
    const weight = kind === 'group' ? 1 / MAX_GROUP_OTHERS : 1;
    const within = (e: { replies: number; spends: number }) => e.replies + weight <= limits.freeRepliesPerDay + e.spends;
    if (!within(entry) && Date.now() - entry.readAt >= LEDGER_READ_MS) {
      entry.readAt = Date.now();
      const spends = await db.spendsToday(userId).catch(() => null);
      entry.blind = spends === null;
      if (spends !== null) entry.spends = spends;
    }
    // The ledger could not be read: replies go out until the next read says otherwise.
    if (entry.blind) return true;
    if (!within(entry)) return false;
    entry.replies += weight;
    return true;
  }

  /** Null when the reply may go out; else the 402 to answer with (only while `enforceWallet` is on). */
  async function overAllowance(c: Context, userId: string | null, kind: 'chat' | 'group' | 'call') {
    if (!userId || (await mayReply(userId, kind))) return null;
    const entry = allowance.get(userId);
    if (entry && !entry.said) {
      entry.said = true;
      console.info(`[allowance] ${opts.enforceWallet ? 'refused' : 'would refuse'} ${kind}: replies=${Math.round(entry.replies)} calls=${entry.calls} spends=${entry.spends}`);
    }
    if (!opts.enforceWallet) return null;
    return c.json({ error: 'noShells', wallet: await db!.walletState(userId).catch(() => null) }, 402);
  }
  // Accounts start anonymous and free, so reports have their own cap.
  const reportDay = windowLimiter(REPORT_LIMITS.perDay, DAY_MS);
  // Characters read aloud a day: each user's, and the whole service's (a stop on the voice bill).
  const userVoiceDay = windowBudget(opts.speech?.userCharsPerDay ?? 0, DAY_MS);
  const serviceVoiceDay = windowBudget(opts.speech?.charsPerDay ?? 0, DAY_MS);
  const signer = opts.signer ?? lineSigner();
  const addressMinute = windowLimiter(limits.addressPerMinute, MINUTE_MS);
  const addressDay = windowLimiter(limits.addressPerDay, DAY_MS);
  const knownTokens = new Map<string, { userId: string | null; until: number; ends: number | null }>();
  const asking = new Map<string, Promise<string | null>>();

  function remember(token: string, entry: { userId: string | null; until: number; ends: number | null }) {
    if (knownTokens.size >= MAX_KNOWN_TOKENS) {
      // The oldest tenth goes (a Map keeps the order of arrival), never the whole lot: emptying it
      // would send every user to the sign-in service in the same second.
      let drop = MAX_KNOWN_TOKENS / 10;
      for (const key of knownTokens.keys()) {
        if (drop-- <= 0) break;
        knownTokens.delete(key);
      }
    }
    knownTokens.delete(token);
    knownTokens.set(token, entry);
  }

  /**
   * The account behind a token, for every route. Asked once in a while and once at a time: no
   * request waits on the sign-in service twice, and many requests with one new token ask together.
   * A refusal is remembered briefly too. When the service cannot be reached, a token it vouched for
   * a moment ago still stands until the token's own end.
   */
  function accountOf(token: string): Promise<string | null> {
    if (!db) return Promise.resolve(null);
    const known = knownTokens.get(token);
    if (known && known.until > Date.now()) return Promise.resolve(known.userId);
    const pending = asking.get(token);
    if (pending) return pending;
    const ask = (async () => {
      try {
        const userId = await db.userIdFromToken(token);
        const ends = userId ? tokenEnds(token) : null;
        remember(token, { userId, ends, until: userId ? Math.min(Date.now() + TOKEN_KNOWN_MS, ends ?? Infinity) : Date.now() + TOKEN_REFUSED_MS });
        return userId;
      } catch (error) {
        if (known?.userId && (known.ends ?? 0) > Date.now()) return known.userId;
        console.warn(`[auth] not checked: ${String((error as Error).message).slice(0, 120)}`);
        return null;
      } finally {
        asking.delete(token);
      }
    })();
    asking.set(token, ask);
    return ask;
  }

  if (opts.served) {
    const served = opts.served;
    app.use('*', async (c, next) => {
      await next();
      const status = c.res.status;
      if (status === 429 || status === 503) served.busy += 1;
      else if (status >= 500) served.failed += 1;
      else served.ok += 1;
    });
  }

  // Whoever spends the model's money: a signed-in account (anonymous counts, every install has one)
  // within its limits. A server with no database has no accounts, so it only counts addresses.
  const modelGuard: MiddlewareHandler = async (c, next) => {
    const address = c.req.header('fly-client-ip') ?? 'local';
    if (!addressMinute(address) || !addressDay(address)) return c.json({ error: 'busy' }, 429);
    if (db) {
      const token = bearer(c.req.header('authorization'));
      const userId = token ? await accountOf(token) : null;
      if (!userId) return c.json({ error: 'signIn' }, 401);
      if (!userMinute(userId) || !userDay(userId)) return c.json({ error: 'busy' }, 429);
      if (!TALK_ROUTES.has(c.req.path) && !sideDay(userId)) return c.json({ error: 'busy' }, 429);
    }
    await next();
  };
  for (const route of MODEL_ROUTES) app.use(route, modelGuard);

  // Everything else under /v1 (the wallet, the syncs, bootstrap): no model behind it, but each call
  // is work for the database, so a script cannot loop on them either. An unknown token is left to
  // the route, which answers 401.
  app.use('/v1/*', async (c, next) => {
    if (MODEL_ROUTES.includes(c.req.path)) return next();
    if (!addressData(c.req.header('fly-client-ip') ?? 'local')) return c.json({ error: 'busy' }, 429);
    const token = bearer(c.req.header('authorization'));
    const userId = token ? await accountOf(token) : null;
    if (userId && !userData(userId)) return c.json({ error: 'busy' }, 429);
    await next();
  });
  for (const route of ['/v1/chat/reply', '/v1/chat/group']) {
    app.use(route, bodyLimit({ maxSize: CHAT_BODY_MAX_BYTES, onError: (c) => c.json({ error: 'tooLarge' }, 413) }));
  }
  app.use('/v1/voice/transcribe', bodyLimit({ maxSize: VOICE_BODY_MAX_BYTES, onError: (c) => c.json({ error: 'tooLarge' }, 413) }));
  app.use('/v1/reports', bodyLimit({ maxSize: REPORT_BODY_MAX_BYTES, onError: (c) => c.json({ error: 'tooLarge' }, 413) }));
  app.use('/v1/voice/speak', bodyLimit({ maxSize: SPEAK_BODY_MAX_BYTES, onError: (c) => c.json({ error: 'tooLarge' }, 413) }));

  /**
   * A wallet call for the signed-in user. A wallet not made yet (bootstrap never ran) is made first;
   * too few shells answer 402 with the wallet, so the app can show the real balance.
   */
  async function wallet(c: Context, run: (userId: string) => Promise<unknown>) {
    if (!db) return c.json({ error: 'noDatabase' }, 503);
    const userId = await signedIn(c);
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
  function signedIn(c: Context): Promise<string | null> {
    const token = bearer(c.req.header('authorization'));
    return token ? accountOf(token) : Promise.resolve(null);
  }

  /** A reply that carries photos holds megabytes until the model answers: only so many at once, the next is busy. */
  async function withPhotos<T>(images: readonly unknown[] | undefined, run: () => Promise<T>): Promise<T> {
    if (!images?.length) return run();
    if (photosInFlight >= limits.photosInFlight) throw new LlmBusyError('photos: too many at once');
    photosInFlight += 1;
    try {
      return await run();
    } finally {
      photosInFlight -= 1;
    }
  }

  /**
   * One model call for a feature: the cost row is written under `mode` (without holding the answer
   * up), `read` turns the model's text into the answer. Busy (the free tier's cap) is 503.
   * `template` is the mode block the prompt carries (src/ai/modes.ts), for `promptVersion`;
   * `temperature` is for work that must be exact (the memory pass). `side`: nobody is waiting on
   * the answer, so it gives way first when the service is full (`llm/gate.ts`).
   */
  async function modelCall(
    c: Context,
    mode: string,
    layout: PromptLayout,
    read: (text: string) => object,
    { template, temperature, using = provider, side = false }: { template?: PromptMode; temperature?: number; using?: LlmProvider | null; side?: boolean } = {},
  ) {
    if (!using) return c.json({ error: 'noModel' }, 503);
    const started = Date.now();
    try {
      const result = await using.complete(layout, { timeoutMs: opts.timeoutMs, temperature, ...(side ? { priority: 'side' as const } : {}) });
      const model = result.model ?? using.name;
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
      // Stopped by the provider's filter: an error, never an empty result the caller would take as
      // "nothing to say" (a memory pass would mark its lines done and lose their facts).
      const answer = result.blocked ? null : (read(result.text) as { language?: unknown });
      // The language the model said it wrote in (a first text names it, 0z186): a language name, no chat words.
      const wrote = typeof answer?.language === 'string' && answer.language ? ` wrote=${answer.language.replace(/\s+/g, '_')}` : '';
      console.log(`[${mode}] ${model} ${Date.now() - started}ms in=${result.usage.input ?? '?'} out=${result.usage.output ?? '?'} $${cost?.toFixed(6) ?? '?'}${result.blocked ? ` safety=${result.blocked}` : ''}${wrote}`);
      if (!answer) return c.json({ error: 'blocked' }, 502);
      return c.json({ ...answer, model });
    } catch (error) {
      if (error instanceof LlmBusyError) return c.json({ error: 'busy' }, 503);
      console.error(`[${mode}] failed`, error);
      return c.json({ error: 'failed' }, 502);
    }
  }

  // `dbOk` is for people and monitors. The answer stays 200 when the database is away: replies need
  // only the model, and a host that took the machine out for it would stop those too.
  let dbHealth: { ok: boolean; until: number } | null = null;
  async function dbOk() {
    if (!db?.ping) return undefined;
    if (!dbHealth || dbHealth.until <= Date.now()) {
      const ok = await db.ping().then(
        () => true,
        () => false,
      );
      dbHealth = { ok, until: Date.now() + DB_HEALTH_MS };
    }
    return dbHealth.ok;
  }
  app.get('/health', async (c) => c.json({ ok: true, model: provider?.name ?? null, db: db?.name ?? null, dbOk: await dbOk() }));

  // Where the app signs in. A development build asks here so no key sits in the app's files; a
  // release build reads EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY instead.
  app.get('/v1/client-config', (c) => (opts.client ? c.json(opts.client) : c.json({ error: 'noDatabase' }, 503)));

  // After sign-in (anonymous at first): the profile, the wallet and the plan, created on the first
  // call with the welcome gift paid once (backend-plan §5). Safe to call on every launch.
  app.post('/v1/session/bootstrap', async (c) => {
    if (!db) return c.json({ error: 'noDatabase' }, 503);
    const userId = await signedIn(c);
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
  app.get('/v1/wallet', (c) =>
    wallet(c, async (userId) => {
      await payPlanShells(userId);
      return db!.walletState(userId);
    }),
  );

  /**
   * A plan's monthly shells (0z142): the server pays them, once per 30-day period of a paid plan
   * (`shellGrant`; a trial pays none), keyed `plan:<period start>` so a second read or a race books
   * nothing more. Before, the phone added them to its own copy and the next sync took them back.
   */
  async function payPlanShells(userId: string) {
    const sub = await db!.currentSubscription?.(userId);
    // The row is the store's word: a trial pays nothing, whatever its dates (no rolling it into a paid term here).
    if (!sub || sub.status === 'trial') return;
    const grant = shellGrant({ ...sub, usage: { periodStart: sub.termStart, callSeconds: 0, voiceSeconds: 0 } }, undefined, Date.now());
    if (!grant || grant.amount <= 0) return;
    await db!.walletCredit(userId, { amount: grant.amount, reason: 'plan', key: `plan:${grant.periodStart}`, free: false });
  }

  // A plan with no store behind it, before billing (RevenueCat will write `subscriptions` from the
  // stores' webhooks): only the accounts in `TEST_SUBSCRIBERS`, or a laptop server with DEV_GRANTS.
  app.post('/v1/subscription/test', async (c) => {
    if (!db?.startTestSubscription) return c.json({ error: 'noDatabase' }, 503);
    const userId = await signedIn(c);
    if (!userId) return c.json({ error: 'signIn' }, 401);
    if (!opts.devGrants && !opts.testSubscribers?.includes(userId)) {
      console.info(`[subscription] test plan refused for ${userId}`);
      return c.json({ error: 'off' }, 403);
    }
    const body = await readJson(c);
    const plan = body?.plan as PlanId;
    if (!PLAN_IDS.includes(plan) || (body?.trial !== undefined && typeof body.trial !== 'boolean')) return c.json({ error: 'badInput' }, 400);
    return wallet(c, async (id) => {
      await db.startTestSubscription!(id, plan, body?.trial === true, new Date());
      await payPlanShells(id);
      return { wallet: await db.walletState(id), subscription: await db.currentSubscription!(id) };
    });
  });

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

  // A report on a character's message reaches a person (road-to-launch item 8). The same id sent
  // again (a retry after a lost answer) is kept once.
  app.post('/v1/reports', async (c) => {
    if (!db) return c.json({ error: 'noDatabase' }, 503);
    const userId = await signedIn(c);
    if (!userId) return c.json({ error: 'signIn' }, 401);
    const report = cleanReport(await readJson(c));
    if (!report) return c.json({ error: 'badInput' }, 400);
    if (!reportDay(userId)) return c.json({ error: 'busy' }, 429);
    try {
      await db.saveReport(userId, report);
      console.log(`[report] ${report.reason} ${report.characterId}`);
      return c.json({ ok: true });
    } catch (error) {
      console.error('[report] not kept', error);
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
      // The token outlives the account by up to an hour on its own: here it ends now.
      const token = bearer(c.req.header('authorization'));
      if (token) remember(token, { userId: null, ends: null, until: tokenEnds(token) ?? Date.now() + 60 * MINUTE_MS });
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
    // Written ahead for pushes nobody may read: capped per account a day, and side work for the gate.
    const userId = await signedIn(c);
    if (userId && !firstTextDay(userId)) return c.json({ error: 'busy' }, 429);
    return modelCall(c, request.kind, layoutPrompt(firstTextParts(request)), parseTouchReply, { template: 'initiative', side: true });
  });

  // The memory pass (B2): what was said since the last pass becomes facts and the story so far. The
  // app sends the facts and the lines and applies the answer (src/lib/memory-ops.ts).
  app.post('/v1/memory/pass', async (c) => {
    if (!provider) return c.json({ error: 'noModel' }, 503);
    const request = cleanMemoryPass(await readJson(c));
    if (!request) return c.json({ error: 'badInput' }, 400);
    const ids = new Set(request.facts.map((f) => f.id));
    // Side work: a pass turned away runs again after the next lines (the app marks lines done only on an answer).
    return modelCall(c, 'memory', layoutPrompt(memoryPassParts(request)), (text) => parseMemoryPass(text, ids, request.ownDay), { temperature: 0.2, side: true });
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
    const { input, other, topic, said, turn, clock, ownDay } = request;
    const user = { ...input.user, locale: input.user.locale || 'en-US' };
    const persona = { ...input, user, replyLanguage: replyLanguageOf({ ...input, user }) };
    const layout = layoutPrompt(streamLineParts(persona, other, topic, said, turn, { clock, ownDay }));
    return modelCall(
      c,
      'stream',
      layout,
      (text) => {
        const line = parseStreamLine(text, input.character.name);
        const day = line ? streamDayNotes(text) : [];
        return { line, ...(day.length ? { day } : {}) };
      },
      { template: 'stream', side: true },
    );
  });

  // What a friend writes on a screen of its own (src/ai/writes.ts): a note, a diary page, a quiz, a
  // round of a date. A broken answer is `{ result: null }`: the app says they are busy, no stock line.
  app.post('/v1/ai/write', async (c) => {
    if (!provider) return c.json({ error: 'noModel' }, 503);
    const request = cleanWrite(await readJson(c));
    if (!request) return c.json({ error: 'badInput' }, 400);
    const user = { ...request.input.user, locale: request.input.user.locale || 'en-US' };
    request.input = { ...request.input, user, replyLanguage: replyLanguageOf({ ...request.input, user }) };
    return modelCall(
      c,
      request.kind,
      layoutPrompt(writeParts(request)),
      (text) => {
        const result = parseWrite(request, text);
        const day = result ? writeDayNotes(request, text) : [];
        return { result, ...(day.length ? { day } : {}) };
      },
      { template: WRITE_MODE[request.kind], side: SIDE_WRITES.has(request.kind) },
    );
  });

  // What a voice message says, so the chat reads it as words. The clip is only passed on to the
  // model: it is not kept, and the words go in no log. `text` is '' when no words were made out.
  // Only `voiceProvider`: the app's consent names the service the voice goes to.
  app.post('/v1/voice/transcribe', async (c) => {
    const clip = cleanClip((await readJson(c))?.clip);
    if (!clip) return c.json({ error: 'badInput' }, 400);
    return modelCall(c, 'transcribe', transcribeLayout(clip), (text) => parseTranscript(text) ?? { text: null }, { temperature: 0, using: opts.voiceProvider ?? null });
  });

  // One of the character's lines read aloud, on a call (ElevenLabs). Without a voice service it says
  // `noVoice` and the app shows captions alone. The words go in no log; the cost does.
  // Only a line the model wrote for this user on a call (its `sig`), within the user's and the
  // whole service's daily characters; past either, `noVoice` and the call goes on in captions.
  app.post('/v1/voice/speak', async (c) => {
    const speech = opts.speech;
    if (!speech) return c.json({ error: 'noVoice' }, 503);
    const request = cleanSpeak(await readJson(c));
    if (!request) return c.json({ error: 'badInput' }, 400);
    const userId = await signedIn(c);
    if (!userId) return c.json({ error: 'signIn' }, 401);
    if (!signer.check(userId, request.text, request.sig)) return c.json({ error: 'badInput' }, 400);
    // What a voice can say: the narration in *stars* stays on the screen.
    const words = speechOnly(request.text).trim();
    if (!words) return c.json({ error: 'badInput' }, 400);
    if (!userVoiceDay(userId, words.length) || !serviceVoiceDay('all', words.length)) return c.json({ error: 'noVoice' }, 503);
    const started = Date.now();
    try {
      const { audio, model } = await speech.provider.speak(words, speech.provider.voiceFor(request), SPEAK_TIMEOUT_MS);
      const cost = (words.length / 1000) * speech.pricePer1k;
      logUsage(db, Promise.resolve(userId), { kind: 'tts', mode: 'call', model, costUsd: cost });
      console.log(`[speak] ${model} ${Date.now() - started}ms chars=${words.length} $${cost.toFixed(6)}`);
      return c.json({ audio: audio.toString('base64') });
    } catch (error) {
      if (error instanceof LlmBusyError) return c.json({ error: 'busy' }, 503);
      console.error(`[speak] failed: ${String((error as Error).message).slice(0, 80)}`);
      return c.json({ error: 'failed' }, 502);
    }
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
    const images = cleanImages(raw.images);
    if (images === null) return c.json({ error: 'badInput' }, 400);
    const user = { ...raw.user, locale: raw.user.locale || 'en-US' };
    const input: GroupPromptInput = {
      ...raw,
      images,
      mode: undefined,
      user,
      messages: raw.messages.slice(-MAX_MESSAGES),
      replyLanguage: replyLanguageOf({ ...raw, user }),
      cue: Array.isArray(raw.cue) ? raw.cue.filter((l) => typeof l === 'string').slice(0, 8) : undefined,
      // The hour and what this member already said of their own day (0z145).
      clock: cleanClock(raw.clock),
      ownDay: cleanOwnDay(raw.ownDay),
    };
    const userId = signedIn(c);
    const over = await overAllowance(c, await userId, 'group');
    if (over) return over;
    const started = Date.now();
    try {
      const { reply, result, calls, crisis, blocked } = await withPhotos(images, () => chatReply(provider, input, opts.timeoutMs, { mode: 'group', layoutOf: layoutGroupReply }));
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
      console.log(`[group] ${input.character.name} ${result.model ?? provider.name} ${Date.now() - started}ms calls=${calls.length}${blocked ? ` safety=${blocked}` : ''}`);
      const lines = cleanGroupLines(reply.bubbles, input.character, input.others);
      if (!lines.length) return c.json({ error: 'empty' }, 502);
      return c.json({ messages: lines, crisis, photos: reply.photos, day: crisis ? undefined : reply.day, model: result.model ?? provider.name });
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
    const images = cleanImages(input.images);
    if (images === null) return c.json({ error: 'badInput' }, 400);
    // A profile without a locale is written to in English. Until the database keeps each chat's
    // language lock, the model follows the language the user writes in, whatever it is, reminded
    // with their latest words (`languageCue`), so nobody gets answered in a language they did not use.
    const user = { ...input.user, locale: input.user.locale || 'en-US' };
    input = {
      ...input,
      images,
      mode: CHAT_MODES.includes(input.mode as ChatMode) ? input.mode : undefined,
      user,
      messages: input.messages.slice(-MAX_MESSAGES),
      replyLanguage: replyLanguageOf({ ...input, user }),
      // The user's clock and what they set up with this friend (0z135); malformed ones are dropped.
      clock: cleanClock(input.clock),
      together: cleanTogether(input.together),
      // What the friend already said of their own day (0z144).
      ownDay: cleanOwnDay(input.ownDay),
    };

    // Who is asking: the guard above already checked the token, so this is its remembered answer.
    const userId = signedIn(c);
    const over = await overAllowance(c, await userId, input.mode === 'call' ? 'call' : 'chat');
    if (over) return over;

    const started = Date.now();
    try {
      const { reply, result, calls, repeat, crisis, blocked } = await withPhotos(images, () => chatReply(provider, input, opts.timeoutMs));
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
      // `safety`: the provider's filter stopped the first draft; `redone` when the second try answered.
      const guard = blocked
        ? ` safety=${blocked} ${reply.bubbles.length ? 'redone' : 'stopped'}`
        : crisis
          ? ` crisis ${calls.length > 1 ? redone : 'cued'}`
          : repeat
            ? ` repeat=${repeat.score.toFixed(2)} ${redone}`
            : '';
      // No words of the chat in the log: the privacy policy says so (docs/legal/privacy-policy.md).
      console.log(
        `[reply] ${input.character.name} ${result.model ?? provider.name} ${ms}ms lang=${lang} in=${result.usage.input ?? '?'} cached=${result.usage.cached ?? 0} out=${result.usage.output ?? '?'} $${cost?.toFixed(6) ?? '?'}${guard} bubbles=${reply.bubbles.length}${reply.language ? ` wrote=${reply.language.replace(/\s+/g, '_')}` : ''}`,
      );
      if (!reply.bubbles.length) return c.json({ error: 'empty' }, 502);
      // On a call with a voice service, each line comes signed for this user: only these lines are
      // read aloud (`/v1/voice/speak`).
      const caller = input.mode === 'call' && opts.speech ? await userId : null;
      const voice = caller ? reply.bubbles.map((line) => signer.sign(caller, line)) : undefined;
      // `crisis`: the app shows the helpline card with the reply (src/ai/safety.ts).
      // `setup`: an alarm or plan the user asked for, shown as a card to confirm; never on a call or after a crisis.
      const setup = input.mode === 'call' || crisis ? undefined : reply.setup;
      // `threads`: what the friend will follow up on; the app applies it on the phone's clock. Never after a crisis.
      const threads = crisis ? undefined : reply.threads;
      // `day`: new things the friend said of their own day; the app keeps them for the next replies.
      const day = crisis ? undefined : reply.day;
      // `react`: a sticker the friend put on the user's latest message; never after a crisis or on a call.
      const react = crisis || input.mode === 'call' ? undefined : reply.react;
      // `ideas`: one-tap replies in the chat's language (IDEAS_CUE); texting only, never after a crisis.
      const ideas = crisis || (input.mode && input.mode !== 'chat') ? undefined : reply.ideas;
      return c.json({ messages: reply.bubbles, emotion: reply.emotion, intensity: reply.intensity, crisis, photos: reply.photos, setup, threads, day, react, ideas, voice, model: result.model ?? provider.name, ms });
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
