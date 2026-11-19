/**
 * Product analytics, the part the app and the server share (0z282; the owner put it first after the
 * PolyBuzz read, docs/polybuzz-core.md §5.1). Until now the server knew what each model call cost
 * (`usage_events`) and nothing about what people do: who finishes onboarding, who sends a second
 * message, who comes back the next day, who sees the plan picker and who buys.
 *
 * First-party only: events go to our own server (`POST /v1/events`), into `app_events`, and go with
 * the account (docs/legal/privacy-policy.md "App activity"). No other company's SDK, no ad id.
 *
 * What an event may carry is narrow on purpose: a name and up to eight short props (ids, counts,
 * flags, a screen name). Never the words of a message, a name the user typed or anything they
 * wrote: the props are for counting, and the server cuts every text to `EVENT_LIMITS.text`.
 *
 * Pure: no React Native, so the server imports it as it is (`server/src/app.ts`).
 */

/** Each event the app sends, with the props it may carry. A new one needs no server change. */
export const EVENTS = {
  /** A launch (`cold`), or a return after `SESSION_GAP_MS` away. */
  app_open: ['cold'],
  /** A screen came up: its route with the ids taken out (`/chat/[id]`). */
  screen: ['name'],
  onboarding_step: ['step'],
  onboarding_done: ['character'],
  /** A line the user sent. `kind`: text, voice, photo, idea (a tapped reply idea). */
  message_sent: ['character', 'kind', 'group'],
  /** Their reply did not come (Not Delivered). */
  reply_failed: ['character'],
  /** Another version of their reply was asked for. */
  regenerate: ['character'],
  /** The user wrote on after browsing versions: which one (1-based) of how many stayed on screen. */
  version_kept: ['character', 'index', 'of'],
  /** The user rated one of their replies (thumbs), the signal of which lines land. */
  reply_rated: ['character', 'rating'],
  /** A call ended (or was missed). */
  call: ['character', 'seconds', 'direction', 'missed'],
  /**
   * The shells sheet opened for want of shells: `source` is `message` (a line, with today's free
   * ones used) or `shells` (a feature), `where` the screen. The plan picker itself is a `screen`.
   */
  paywall_view: ['source', 'where'],
  plan_start: ['plan', 'trial'],
  character_created: [],
  push_open: ['kind'],
  level_up: ['character', 'level'],
  check_in: ['day'],
  /** Their reply invited the user to a moment (a call, a date, a game: `src/ai/next-moment.ts`). */
  next_shown: ['kind', 'character'],
  /** The user tapped that invitation's button. */
  next_tapped: ['kind', 'character'],
  /** The user was put in an experiment's arm (`variant`), once a session. */
  exposure: ['experiment', 'arm'],
} as const;

export type EventName = keyof typeof EVENTS;
export type PropValue = string | number | boolean;
export type EventProps = Record<string, PropValue>;
/** The props one event may carry, all optional. */
export type PropsOf<N extends EventName> = Partial<Record<(typeof EVENTS)[N][number], PropValue>>;

/** One event as the phone keeps and sends it. */
export interface TrackedEvent {
  /** The phone's id: a batch sent twice (an answer lost on the way) is kept once. */
  id: string;
  name: string;
  /** When it happened, ms since 1970, the phone's clock. */
  at: number;
  /** The session it belongs to (`sessionFor`). */
  session: string;
  props?: EventProps;
}

export interface EventBatch {
  events: TrackedEvent[];
  app: { version: string; channel: string; platform: string; locale: string };
  /** 0-99, fixed for the install: experiments split on it, and reports can group by it. */
  bucket: number;
}

export const EVENT_LIMITS = {
  /** Events in one request. */
  batch: 50,
  props: 8,
  /** The longest text a prop or an app field may be. */
  text: 64,
  /** Events the phone holds while it cannot send; the oldest go first. */
  queue: 500,
  /** An event older than this is not worth a row. */
  maxAgeMs: 30 * 24 * 3_600_000,
} as const;

/** Away this long, the next open starts a new session. */
export const SESSION_GAP_MS = 30 * 60_000;

const NAME = /^[a-z][a-z0-9_]{1,39}$/;
const KEY = /^[a-z][A-Za-z0-9]{0,23}$/;
const ID = /^[A-Za-z0-9_-]{4,64}$/;
const CHANNELS = new Set(['dev', 'preview', 'production', 'unknown']);
const PLATFORMS = new Set(['ios', 'android', 'web']);

const short = (value: string) => Array.from(value.trim()).slice(0, EVENT_LIMITS.text).join('');

/** The props worth keeping: known shapes only, texts cut, at most `EVENT_LIMITS.props`. */
export function cleanProps(props: unknown): EventProps | undefined {
  if (!props || typeof props !== 'object' || Array.isArray(props)) return undefined;
  const out: EventProps = {};
  let count = 0;
  for (const [key, value] of Object.entries(props as Record<string, unknown>)) {
    if (count >= EVENT_LIMITS.props || !KEY.test(key)) continue;
    if (typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) out[key] = value;
    else if (typeof value === 'string' && value.trim()) out[key] = short(value);
    else continue;
    count += 1;
  }
  return count ? out : undefined;
}

export interface CleanBatch {
  events: (Omit<TrackedEvent, 'at'> & { at: Date })[];
  app: EventBatch['app'];
  bucket: number;
  /** Events refused (a bad name, a bad id); the rest are kept. */
  skipped: number;
}

/**
 * The batch the database can take, or null when the request as a whole is broken. Single bad events
 * are dropped and counted, as in a message sync. A clock far off is pulled to the server's `now`.
 */
export function cleanEventBatch(body: unknown, now = Date.now()): CleanBatch | null {
  const { events, app, bucket } = (body ?? {}) as Partial<Record<keyof EventBatch, unknown>>;
  if (!Array.isArray(events) || !events.length || events.length > EVENT_LIMITS.batch) return null;
  if (typeof bucket !== 'number' || !Number.isInteger(bucket) || bucket < 0 || bucket > 99) return null;
  const a = (app ?? {}) as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === 'string' && value.trim() ? short(value) : '');
  const cleanApp = {
    version: text(a.version) || 'unknown',
    channel: CHANNELS.has(a.channel as string) ? (a.channel as string) : 'unknown',
    platform: PLATFORMS.has(a.platform as string) ? (a.platform as string) : 'unknown',
    locale: text(a.locale).slice(0, 16) || 'unknown',
  };
  const kept: CleanBatch['events'] = [];
  const seen = new Set<string>();
  for (const raw of events) {
    const e = (raw ?? {}) as Record<string, unknown>;
    const ok =
      typeof e.id === 'string' && ID.test(e.id) && !seen.has(e.id) && typeof e.name === 'string' && NAME.test(e.name) && typeof e.session === 'string' && ID.test(e.session);
    if (!ok) continue;
    seen.add(e.id as string);
    const at = typeof e.at === 'number' && Number.isFinite(e.at) ? e.at : now;
    // The phone's clock is trusted within a few minutes ahead; older than the queue can hold is dropped.
    if (at < now - EVENT_LIMITS.maxAgeMs) continue;
    const props = cleanProps(e.props);
    kept.push({ id: e.id as string, name: e.name as string, session: e.session as string, at: new Date(Math.min(at, now + 5 * 60_000)), ...(props ? { props } : {}) });
  }
  return { events: kept, app: cleanApp, bucket, skipped: events.length - kept.length };
}

/** FNV-1a, 32 bits: the same text gives the same number on every phone and on the server. */
export function hash32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** The install's bucket, 0-99. */
export const bucketOf = (install: string) => hash32(install) % 100;

/**
 * An experiment's arm for this install: stable for the install, independent between experiments
 * (each name reshuffles), split by `weights` (equal when omitted).
 */
export function variant<A extends string>(install: string, experiment: string, arms: readonly A[], weights?: readonly number[]): A {
  const w = weights && weights.length === arms.length ? weights : arms.map(() => 1);
  const total = w.reduce((sum, x) => sum + Math.max(0, x), 0) || 1;
  let point = (hash32(`${experiment}:${install}`) % 10_000) / 10_000;
  for (let i = 0; i < arms.length; i += 1) {
    point -= Math.max(0, w[i]) / total;
    if (point < 0) return arms[i];
  }
  return arms[arms.length - 1];
}

/** A route as a screen name: the ids go, so `/chat/c_kai` and `/chat/c_mia` count as one screen. */
export function screenName(segments: readonly string[]): string {
  const name = segments
    .filter((s) => !/^\(.*\)$/.test(s))
    .map((s) => (/^\[.*\]$/.test(s) ? s : s.replace(/[^A-Za-z0-9_-]/g, '')))
    .filter(Boolean)
    .join('/');
  return `/${name}`.slice(0, EVENT_LIMITS.text);
}

/** The session an event belongs to: the same one until the app was away `SESSION_GAP_MS`. */
export function sessionFor(current: { id: string; lastAt: number } | null, now: number, makeId: () => string) {
  if (current && now - current.lastAt < SESSION_GAP_MS) return { session: { id: current.id, lastAt: now }, fresh: false };
  return { session: { id: makeId(), lastAt: now }, fresh: true };
}

/** Adds an event to the queue, dropping the oldest past `EVENT_LIMITS.queue`. */
export const enqueue = (queue: readonly TrackedEvent[], event: TrackedEvent) => [...queue, event].slice(-EVENT_LIMITS.queue);

/** The queue after a send: what the server took (or refused for good) leaves. */
export function settle(queue: readonly TrackedEvent[], sent: readonly TrackedEvent[]) {
  const gone = new Set(sent.map((e) => e.id));
  return queue.filter((e) => !gone.has(e.id));
}
