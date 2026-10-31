import type { Conversation, MemoryItem } from '@/types';

import { MEMORY_SYNC_LIMITS, type MemoriesState, type MemorySyncRequest } from '../ai/session-types';

/**
 * The memory's way to the server (B2.3), without the store: what changed, what one sync carries,
 * what is still to send after it, and how the server's copy joins the phone's. Two kinds of thing
 * sync on their own, each under a key: a character's whole memory list (`c:`), and one chat's
 * summary with how far the memory pass read (`h:`).
 */
/** Saved with the store, so a change made offline or just before the app closed still goes up. */
export interface MemorySyncState {
  /** Keys changed since the server last took them. */
  dirty: string[];
  /** True once the server's copy has been read and joined (`joinRemote`): a new phone restores first. */
  joined: boolean;
}

export const characterKey = (characterId: string) => `c:${characterId}`;
export const chatKey = (chatId: string) => `h:${chatId}`;

/** Each key's content as a string, to tell what changed; a key with nothing in it is missing. */
export function memorySignatures(memories: readonly MemoryItem[], conversations: readonly Conversation[]): Map<string, string> {
  const lists = new Map<string, MemoryItem[]>();
  for (const m of memories) {
    const list = lists.get(m.characterId);
    if (list) list.push(m);
    else lists.set(m.characterId, [m]);
  }
  const signatures = new Map([...lists].map(([id, list]) => [characterKey(id), JSON.stringify(list)]));
  for (const c of conversations) if (c.summary || c.memoryMark) signatures.set(chatKey(c.id), `${c.summary ?? ''}\u0000${c.memoryMark ?? ''}`);
  return signatures;
}

/** The keys added, changed or gone between two snapshots. */
export function changedKeys(before: ReadonlyMap<string, string>, after: ReadonlyMap<string, string>): string[] {
  const keys = new Set([...before.keys(), ...after.keys()]);
  return [...keys].filter((key) => before.get(key) !== after.get(key));
}

/** Active facts first, then the newest: what a character over the limit sends (the rest stays on the phone). */
function capItems(items: MemoryItem[]): MemoryItem[] {
  if (items.length <= MEMORY_SYNC_LIMITS.items) return items;
  const active = (m: MemoryItem) => (m.status ?? 'active') === 'active';
  return [...items]
    .sort((a, b) => Number(active(b)) - Number(active(a)) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, MEMORY_SYNC_LIMITS.items);
}

/**
 * The next sync: dirty keys up to the limits, and each key's signature as sent, so a key that
 * changed while the sync was on its way stays dirty. Null when nothing is dirty.
 */
export function memorySyncBatch(
  dirty: readonly string[],
  memories: readonly MemoryItem[],
  conversations: readonly Conversation[],
): { request: MemorySyncRequest; sent: Map<string, string> } | null {
  const signatures = memorySignatures(memories, conversations);
  const request: MemorySyncRequest = { characters: [], chats: [] };
  const sent = new Map<string, string>();
  for (const key of dirty) {
    const id = key.slice(2);
    if (key.startsWith('c:') && request.characters.length < MEMORY_SYNC_LIMITS.characters) {
      request.characters.push({ characterId: id, items: capItems(memories.filter((m) => m.characterId === id)) });
    } else if (key.startsWith('h:') && request.chats.length < MEMORY_SYNC_LIMITS.chats) {
      const chat = conversations.find((c) => c.id === id);
      const summary = chat?.summary?.slice(0, MEMORY_SYNC_LIMITS.summaryChars);
      request.chats.push({ chatId: id, ...(summary ? { summary } : {}), ...(chat?.memoryMark ? { mark: chat.memoryMark } : {}) });
    } else {
      continue;
    }
    sent.set(key, signatures.get(key) ?? '');
  }
  return sent.size ? { request, sent } : null;
}

/** After a sync went through: the keys still to send (not in it, or changed since). */
export function stillDirty(
  dirty: readonly string[],
  sent: ReadonlyMap<string, string>,
  memories: readonly MemoryItem[],
  conversations: readonly Conversation[],
): string[] {
  const now = memorySignatures(memories, conversations);
  return dirty.filter((key) => !sent.has(key) || sent.get(key) !== (now.get(key) ?? ''));
}

/**
 * The server's copy joined to the phone's, the first time they meet: a character the phone has no
 * memory of takes the server's list, a chat with no summary takes the server's. What the phone has
 * wins, so nothing it holds is lost; then the phone sends it all (`memorySignatures` keys).
 */
export function joinRemote(
  memories: readonly MemoryItem[],
  conversations: readonly Conversation[],
  remote: MemoriesState,
): { memories: MemoryItem[]; conversations: Conversation[] } {
  const known = new Set(memories.map((m) => m.characterId));
  const ids = new Set(memories.map((m) => m.id));
  const taken = remote.characters
    .filter((c) => !known.has(c.characterId))
    .flatMap((c) => c.items.filter((m) => !ids.has(m.id)).map((m) => ({ ...m, characterId: c.characterId })));
  const chats = new Map(remote.chats.map((h) => [h.chatId, h]));
  return {
    memories: taken.length ? [...memories, ...taken] : [...memories],
    conversations: conversations.map((c) => {
      const h = chats.get(c.id);
      return h && !c.summary && !c.memoryMark ? { ...c, ...(h.summary ? { summary: h.summary } : {}), ...(h.mark ? { memoryMark: h.mark } : {}) } : c;
    }),
  };
}
