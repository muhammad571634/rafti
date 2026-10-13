import type { MemoryItem, MemorySource } from '@/types';

import { detectCrisis } from './safety';

/**
 * What may become a lasting memory. A crisis message is answered in the moment
 * (helpline card, warm reply) but never kept as a fact the character brings up
 * later (docs/backend-plan.md 12.12, 14.7). The check is the same phrase list the
 * chat uses, so ordinary sadness or a bad day is still remembered.
 */

const MAX_DIARY_LINE = 120;

/** The text to keep, or null when it is empty or reads like a crisis. */
export function rememberableText(text: string): string | null {
  const clean = text.trim();
  if (!clean || detectCrisis(clean)) return null;
  return clean;
}

/**
 * The line a shared diary page leaves as a memory: its first sentence. A page with
 * a crisis line anywhere in it leaves nothing, even when the first sentence is calm.
 */
export function diaryMemoryLine(body: string): string | null {
  if (detectCrisis(body)) return null;
  const first = body.trim().split(/(?<=[.!?])\s/)[0]?.slice(0, MAX_DIARY_LINE) ?? '';
  return rememberableText(first);
}

/** Adds a memory in front of the list; a crisis or empty text leaves the list as it was. */
export function withMemory(
  memories: MemoryItem[],
  input: { id: string; characterId: string; text: string; source: MemorySource; createdAt: string },
): MemoryItem[] {
  const text = rememberableText(input.text);
  if (text === null) return memories;
  return [{ id: input.id, characterId: input.characterId, text, source: input.source, createdAt: input.createdAt, pinned: false }, ...memories];
}

/** Drops crisis memories saved before this guard existed (runs on every load). */
export function withoutCrisisMemories(memories: MemoryItem[]): MemoryItem[] {
  return memories.filter((memory) => !detectCrisis(memory.text));
}
