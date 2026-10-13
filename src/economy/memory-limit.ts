import type { MemoryItem, Subscription } from '@/types';

import { rollSubscription } from './plans';

/**
 * Memory on the free plan (backend-plan §15.10, owner decision 2026-10-13): each character
 * keeps 20 open memories; the rest are still saved but locked until the user takes a plan
 * ("Unlock with Basic"). Any plan or the trial opens them all. Memory quality is the same on
 * every paid plan (§15.8), so Basic and Pro open the same.
 */
export const FREE_MEMORY_LIMIT = 20;

/** Every memory is open: a plan or its trial is running. */
export function hasFullMemory(sub: Subscription | undefined, now: number) {
  return !!rollSubscription(sub, now);
}

/** Pinned first, then the newest: the order of the Memories screen and of what stays open. */
export function byMemoryOrder(a: MemoryItem, b: MemoryItem) {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  return Date.parse(b.createdAt) - Date.parse(a.createdAt);
}

/**
 * One character's memories, split into what the character may use and what is locked.
 * Without a plan the first 20 in `byMemoryOrder` stay open, so a pinned memory stays open
 * and the oldest unpinned ones lock first.
 */
export function splitMemories(
  memories: MemoryItem[],
  characterId: string,
  full: boolean,
): { open: MemoryItem[]; locked: MemoryItem[] } {
  const mine = memories.filter((m) => m.characterId === characterId).sort(byMemoryOrder);
  if (full) return { open: mine, locked: [] };
  return { open: mine.slice(0, FREE_MEMORY_LIMIT), locked: mine.slice(FREE_MEMORY_LIMIT) };
}
