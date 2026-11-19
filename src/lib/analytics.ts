import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { AppState, Platform } from 'react-native';

import { withAccount } from '@/ai/account';
import { serverEvents } from '@/ai/server';
import i18n from '@/i18n';

import {
  bucketOf,
  enqueue,
  EVENT_LIMITS,
  sessionFor,
  settle,
  variant,
  type EventBatch,
  type EventName,
  type PropsOf,
  type TrackedEvent,
} from './analytics-events';

/**
 * Product analytics on the phone (0z282): `track` adds an event to a queue that goes to our server
 * in batches (`POST /v1/events`): when 20 are waiting, once a minute while the app is open, and when
 * it goes to the background. The queue is saved, so events made offline or on a bad connection go
 * later; past `EVENT_LIMITS.queue` the oldest are dropped. Nothing here ever holds the UI up or
 * throws: a failed send keeps the events for the next try.
 *
 * The user can turn it off (Profile → Share usage data, `settings.shareUsage`): the queue is emptied
 * and nothing more is kept or sent. What an event may carry is in `analytics-events.ts`.
 */

const QUEUE_KEY = 'sigmazam.analytics.queue';
const INSTALL_KEY = 'sigmazam.analytics.install';
const FLUSH_AT = 20;
const FLUSH_EVERY_MS = 60_000;
const SAVE_AFTER_MS = 2_000;

let queue: TrackedEvent[] = [];
let enabled = true;
/** Nothing is sent until the saved setting is known (`setAnalyticsEnabled`, after the store loads). */
let configured = false;
let started = false;
let install = '';
let session: { id: string; lastAt: number } | null = null;
let flushing: Promise<void> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;
/** Events tracked before the saved queue and install id are read; they join once it is in. */
let early: TrackedEvent[] = [];
let ready: Promise<void> | null = null;
const exposed = new Set<string>();

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

function channel(): EventBatch['app']['channel'] {
  if (__DEV__) return 'dev';
  const name = Updates.channel;
  return name === 'preview' || name === 'production' ? name : 'unknown';
}

function appInfo(): EventBatch['app'] {
  return {
    version: Constants.expoConfig?.version ?? 'unknown',
    channel: channel(),
    platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web',
    locale: i18n.language || 'unknown',
  };
}

function load() {
  ready ??= (async () => {
    try {
      const [saved, id] = await Promise.all([AsyncStorage.getItem(QUEUE_KEY), AsyncStorage.getItem(INSTALL_KEY)]);
      install = id || newId();
      if (!id) await AsyncStorage.setItem(INSTALL_KEY, install);
      const parsed = saved ? (JSON.parse(saved) as TrackedEvent[]) : [];
      if (Array.isArray(parsed)) queue = parsed.slice(-EVENT_LIMITS.queue);
    } catch {
      install ||= newId();
    }
    for (const e of early) queue = enqueue(queue, e);
    early = [];
  })();
  return ready;
}

function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue)).catch(() => {});
  }, SAVE_AFTER_MS);
}

/** The current session, opening a new one (with its `app_open`) after a long enough time away. */
function currentSession(now: number, cold: boolean) {
  const next = sessionFor(session, now, newId);
  session = next.session;
  if (next.fresh) add({ id: newId(), name: 'app_open', at: now, session: session.id, props: { cold } });
  return session.id;
}

function add(event: TrackedEvent) {
  if (!install) early.push(event);
  else queue = enqueue(queue, event);
  save();
  if (queue.length >= FLUSH_AT) void flush();
}

/** Records one event. Props are for counting: ids, numbers, flags, never what anyone wrote. */
export function track<N extends EventName>(name: N, props?: PropsOf<N>) {
  if (!enabled) return;
  const now = Date.now();
  const id = currentSession(now, !started);
  add({ id: newId(), name, at: now, session: id, ...(props && Object.keys(props).length ? { props: props as TrackedEvent['props'] } : {}) });
}

/** Sends what is waiting, a batch at a time; one send runs at a time. */
export function flush(): Promise<void> {
  if (!enabled || !configured) return Promise.resolve();
  flushing ??= (async () => {
    await load();
    while (enabled && queue.length) {
      const batch = queue.slice(0, EVENT_LIMITS.batch);
      const body: EventBatch = { events: batch, app: appInfo(), bucket: bucketOf(install) };
      const outcome = await withAccount((token) => serverEvents.send(token, body), 8000);
      // Kept, or refused for good (a broken batch would block the queue forever): either way it leaves.
      if (outcome !== 'kept' && outcome !== 'refused') break;
      queue = settle(queue, batch);
      save();
    }
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

/**
 * Starts once per launch: reads the saved queue, opens the session, and sends on a timer while the
 * app is open and when it goes to the background.
 */
export function startAnalytics() {
  if (started) return;
  void load();
  currentSession(Date.now(), true);
  started = true;
  flushTimer = setInterval(() => void flush(), FLUSH_EVERY_MS);
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      if (enabled) currentSession(Date.now(), false);
      flushTimer ??= setInterval(() => void flush(), FLUSH_EVERY_MS);
      return;
    }
    if (state === 'background') {
      if (flushTimer) clearInterval(flushTimer);
      flushTimer = null;
      if (session) session = { ...session, lastAt: Date.now() };
      void flush();
    }
  });
}

/** Share usage data on or off (`settings.shareUsage`). Off empties the queue on the phone. */
export function setAnalyticsEnabled(on: boolean) {
  const first = !configured;
  configured = true;
  if (on === enabled) {
    if (first && on && queue.length >= FLUSH_AT) void flush();
    return;
  }
  enabled = on;
  if (on) return;
  queue = [];
  early = [];
  session = null;
  exposed.clear();
  AsyncStorage.removeItem(QUEUE_KEY).catch(() => {});
}

/**
 * The install's arm of an experiment, and an `exposure` event the first time it is asked for in a
 * session, so the arms can be compared (`analytics.experiments`). Before the install id is read
 * (the first moments of the first launch) it answers the first arm and records nothing.
 */
export function experiment<A extends string>(name: string, arms: readonly A[], weights?: readonly number[]): A {
  if (!install) return arms[0];
  const arm = variant(install, name, arms, weights);
  const key = `${session?.id ?? ''}:${name}`;
  if (!exposed.has(key)) {
    exposed.add(key);
    track('exposure', { experiment: name, arm });
  }
  return arm;
}

/** A new account on this phone (after Delete account): a new install id and nothing queued from before. */
export async function resetAnalytics() {
  queue = [];
  early = [];
  session = null;
  exposed.clear();
  install = newId();
  await AsyncStorage.multiRemove([QUEUE_KEY]).catch(() => {});
  await AsyncStorage.setItem(INSTALL_KEY, install).catch(() => {});
}
