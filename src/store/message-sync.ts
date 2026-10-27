import { AppState } from 'react-native';
import type { StoreApi } from 'zustand';

import { diffMessages, isEmptyDiff, type MessagesByChat } from '@/lib/message-diff';

import {
  importMessages,
  loadMessages,
  messageDbAvailable,
  messagesImported,
  writeMessageDiff,
} from './message-db';

type MessageStore = StoreApi<{ messages: MessagesByChat }>;

/** A change waits this long, so a burst of lines (a reply arriving) is one write. */
const FLUSH_DELAY_MS = 250;
const RETRY_DELAY_MS = 2000;

let store: MessageStore | null = null;
/** True once the database holds every message; the AsyncStorage save then leaves them out. */
let inDb = false;
/** What the database holds; moves only after a write succeeds. */
let saved: MessagesByChat = {};
let timer: ReturnType<typeof setTimeout> | null = null;
let chain: Promise<void> = Promise.resolve();

export const messagesInDb = () => inDb;

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
  chain = chain.then(writeChanges);
  return chain;
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
    if (next !== 'active') void flushMessages();
  });
}

function scheduleFlush(delay = FLUSH_DELAY_MS) {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    void flushMessages();
  }, delay);
}

async function writeChanges() {
  if (!inDb || !store) return;
  const next = store.getState().messages;
  if (next === saved) return;
  const diff = diffMessages(saved, next);
  try {
    if (!isEmptyDiff(diff)) await writeMessageDiff(diff);
    saved = next;
  } catch (e) {
    console.warn('[messages] save failed, retrying', e);
    scheduleFlush(RETRY_DELAY_MS);
  }
}
