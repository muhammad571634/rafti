import { AppState } from 'react-native';
import type { StoreApi } from 'zustand';

import { withAccount } from '@/ai/account';
import { serverMemories } from '@/ai/server';
import { changedKeys, joinRemote, memorySignatures, memorySyncBatch, stillDirty, type MemorySyncState } from '@/lib/memory-sync';
import type { Conversation, MemoryItem } from '@/types';

import type { SyncStatus } from './message-sync';

type MemoryStore = StoreApi<{
  memories: MemoryItem[];
  conversations: Conversation[];
  memorySync: MemorySyncState;
  settings: { serverMessages?: boolean };
}>;

/** The server hears about memory a little after it changes, so a memory pass's ops go up as one. */
const SYNC_DELAY_MS = 3000;
/** One sync sends at most this many batches; the rest goes on the next change. */
const MAX_BATCHES = 10;

let store: MemoryStore | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let syncing: Promise<SyncStatus> | null = null;

const serverOn = () => !!store?.getState().settings.serverMessages;

/**
 * The memory on the server (B2.3), beside the chats (`message-sync.ts`) and under the same
 * Server chats switch. Every change to a character's memory or a chat's summary marks its key;
 * the marks are saved with the store, and a sync 3 s later (or when the app leaves the
 * foreground) sends each marked character whole. The first sync of an install reads the server's
 * copy first and joins it, so a new phone gets its memory back.
 */
export function startMemorySync(target: MemoryStore) {
  if (store) return;
  store = target;
  target.subscribe((s, prev) => {
    if (s.settings.serverMessages && !prev.settings.serverMessages) schedule();
    if (s.memories === prev.memories && s.conversations === prev.conversations) return;
    const keys = changedKeys(memorySignatures(prev.memories, prev.conversations), memorySignatures(s.memories, s.conversations));
    if (!keys.length) return;
    const dirty = [...new Set([...s.memorySync.dirty, ...keys])];
    target.setState({ memorySync: { ...s.memorySync, dirty } });
    schedule();
  });
  AppState.addEventListener('change', (next) => {
    if (next !== 'active' && serverOn()) void syncMemories();
  });
  schedule();
}

function schedule() {
  if (timer || !serverOn()) return;
  timer = setTimeout(() => {
    timer = null;
    void syncMemories();
  }, SYNC_DELAY_MS);
}

/** Sends what the server has not taken yet. Only one runs at a time; a call meanwhile gets its answer. */
export function syncMemories(): Promise<SyncStatus> {
  syncing ??= runSync()
    .catch((e): SyncStatus => {
      console.warn('[memories] sync failed', e);
      return 'noServer';
    })
    .finally(() => {
      syncing = null;
    });
  return syncing;
}

async function runSync(): Promise<SyncStatus> {
  if (!store || !serverOn()) return 'off';
  const target = store;
  if (!target.getState().memorySync.joined) {
    const remote = await withAccount((token) => serverMemories.all(token));
    if (!remote) return 'noServer';
    const s = target.getState();
    const joined = joinRemote(s.memories, s.conversations, remote);
    // Everything the phone now holds goes up once: the server may have none of it.
    const all = [...memorySignatures(joined.memories, joined.conversations).keys()];
    target.setState({ ...joined, memorySync: { joined: true, dirty: [...new Set([...s.memorySync.dirty, ...all])] } });
  }
  for (let i = 0; i < MAX_BATCHES; i++) {
    const s = target.getState();
    const batch = memorySyncBatch(s.memorySync.dirty, s.memories, s.conversations);
    if (!batch) return 'synced';
    const sent = await withAccount((token) => serverMemories.sync(token, batch.request));
    if (!sent) return 'noServer';
    const now = target.getState();
    target.setState({ memorySync: { ...now.memorySync, dirty: stillDirty(now.memorySync.dirty, batch.sent, now.memories, now.conversations) } });
  }
  schedule();
  return 'synced';
}

/** The account was deleted: nothing is left to send (the store's reset clears the marks). */
export function resetMemorySync() {
  if (timer) clearTimeout(timer);
  timer = null;
}
