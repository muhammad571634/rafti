import { AppState } from 'react-native';
import type { StoreApi } from 'zustand';

import { withAccount } from '@/ai/account';
import { serverMessages } from '@/ai/server';
import { MESSAGE_SYNC_LIMITS } from '@/ai/session-types';
import { diffMessages, isEmptyDiff, type MessagesByChat } from '@/lib/message-diff';

import {
  countMessages,
  importMessages,
  loadMessages,
  markSent,
  messageDbAvailable,
  messagesImported,
  readOutbox,
  saveRestored,
  wipeMessages,
  writeMessageDiff,
} from './message-db';

type MessageStore = StoreApi<{ messages: MessagesByChat; settings: { serverMessages?: boolean } }>;

/** A change waits this long, so a burst of lines (a reply arriving) is one write. */
const FLUSH_DELAY_MS = 250;
const RETRY_DELAY_MS = 2000;
/** The server hears about changes in bigger steps than the disk does. */
const SYNC_DELAY_MS = 3000;
/** One sync sends at most this many batches; the rest goes on the next one. */
const MAX_BATCHES = 20;

let store: MessageStore | null = null;
/** True once the database holds every message; the AsyncStorage save then leaves them out. */
let inDb = false;
/** What the database holds; moves only after a write succeeds. */
let saved: MessagesByChat = {};
let timer: ReturnType<typeof setTimeout> | null = null;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
/** Every database step runs here, one after another (writes, outbox reads, marks). */
let chain: Promise<unknown> = Promise.resolve();
let syncing: Promise<SyncStatus> | null = null;

/** off: Server chats is off (or no database); noServer: no account or the server did not answer. */
export type SyncStatus = 'synced' | 'off' | 'noServer';

export const messagesInDb = () => inDb;

/** Runs a database step after the ones already queued. */
function queued<T>(step: () => Promise<T>): Promise<T> {
  const result = chain.then(step);
  chain = result.catch(() => {});
  return result;
}

/**
 * Called from `onRehydrateStorage`, before the hydration work: the first launch with the
 * database copies the old save in; later launches read the messages back. On any failure
 * the messages stay in the AsyncStorage save, as before.
 */
export async function restoreMessages(target: MessageStore) {
  if (!messageDbAvailable) return;
  store = target;
  const fromSave = target.getState().messages;
  try {
    if (!(await messagesImported())) {
      await importMessages(fromSave);
      saved = fromSave;
    } else {
      const loaded = await loadMessages();
      saved = loaded;
      target.setState({ messages: withLateLines(loaded, fromSave, target.getState().messages) });
    }
    inDb = true;
    watch(target);
    // Anything that changed while the database was busy is written now.
    scheduleFlush();
    scheduleSync();
  } catch (e) {
    console.warn('[messages] database unavailable, keeping the old save', e);
  }
}

/** Writes pending changes now (the app is leaving the screen). */
export function flushMessages() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  return queued(writeChanges);
}

/**
 * Sends what the server has not seen yet (B1.3b), batch by batch. Only one runs at a time;
 * a call made meanwhile gets the running one's answer.
 */
export function syncMessages(): Promise<SyncStatus> {
  syncing ??= runSync()
    .catch((e): SyncStatus => {
      console.warn('[messages] sync failed', e);
      return 'noServer';
    })
    .finally(() => {
      syncing = null;
    });
  return syncing;
}

/**
 * A phone with no messages reads the account's chats back from the server: a new install,
 * or a phone signed in to an account that already has chats. Answers how many came, or null
 * when the server could not be reached.
 */
export async function restoreFromServer(): Promise<number | null> {
  if (!inDb || !store) return 0;
  await flushMessages();
  if ((await queued(countMessages)) > 0) return 0;
  const before = store.getState().messages;
  let after = 0;
  let total = 0;
  for (;;) {
    const page = await withAccount((token) => serverMessages.page(token, after));
    if (!page) return total || null;
    if (page.messages.length) await queued(() => saveRestored(page.messages));
    total += page.messages.length;
    if (page.next == null) break;
    after = page.next;
  }
  if (total) {
    const loaded = await queued(loadMessages);
    saved = loaded;
    store.setState({ messages: withLateLines(loaded, before, store.getState().messages) });
  }
  return total;
}

/**
 * The account was deleted: the database empties, and nothing is left to send. Call it before
 * the store resets, so the reset's own write finds nothing to do.
 */
export function resetMessages() {
  if (!inDb) return Promise.resolve();
  for (const t of [timer, syncTimer]) if (t) clearTimeout(t);
  timer = syncTimer = null;
  return queued(async () => {
    await wipeMessages();
    saved = {};
  });
}

/**
 * Lines added while the database was loading (a timer firing early) would be lost when the
 * loaded messages replace the state, so they go after what the database had.
 */
function withLateLines(loaded: MessagesByChat, before: MessagesByChat, now: MessagesByChat) {
  if (now === before) return loaded;
  const merged = { ...loaded };
  for (const [chatId, list] of Object.entries(now)) {
    if (list === before[chatId]) continue;
    const known = new Set([...(before[chatId] ?? []), ...(loaded[chatId] ?? [])].map((m) => m.id));
    const late = list.filter((m) => !known.has(m.id));
    if (late.length) merged[chatId] = [...(loaded[chatId] ?? []), ...late];
  }
  return merged;
}

let watching = false;

function watch(target: MessageStore) {
  if (watching) return;
  watching = true;
  target.subscribe((s, prev) => {
    if (s.messages !== prev.messages) scheduleFlush();
  });
  AppState.addEventListener('change', (next) => {
    if (next === 'active') return;
    void flushMessages().then(() => (serverOn() ? syncMessages() : null));
  });
}

const serverOn = () => inDb && !!store?.getState().settings.serverMessages;

function scheduleFlush(delay = FLUSH_DELAY_MS) {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    void flushMessages();
  }, delay);
}

function scheduleSync() {
  if (syncTimer || !serverOn()) return;
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void syncMessages();
  }, SYNC_DELAY_MS);
}

async function writeChanges() {
  if (!inDb || !store) return;
  const next = store.getState().messages;
  if (next === saved) return;
  const diff = diffMessages(saved, next);
  try {
    if (!isEmptyDiff(diff)) await writeMessageDiff(diff);
    saved = next;
    scheduleSync();
  } catch (e) {
    console.warn('[messages] save failed, retrying', e);
    scheduleFlush(RETRY_DELAY_MS);
  }
}

async function runSync(): Promise<SyncStatus> {
  if (!serverOn()) return 'off';
  await flushMessages();
  for (let i = 0; i < MAX_BATCHES; i++) {
    const batch = await queued(() => readOutbox(MESSAGE_SYNC_LIMITS));
    if (!batch) return 'synced';
    const sent = await withAccount((token) => serverMessages.sync(token, batch.request));
    if (!sent) return 'noServer';
    await queued(() => markSent(batch));
  }
  // More is left than one sync sends: the rest goes on the next change.
  scheduleSync();
  return 'synced';
}
