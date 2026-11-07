import type { MemoryItem } from '@/types';

import type { MemoryPassResult } from '../ai/memory-pass';
import { rememberableText } from '../ai/memory-guard';

/**
 * Applies a memory pass (src/ai/memory-pass.ts) to the saved memories, and ages them (backend-plan
 * §12.2). Pure: the store calls it with the result and a clock.
 *
 * - add: a new active fact, unless the same text is already there or it reads like a crisis.
 * - update: the fact's new wording, same id, so a pin and the Memories screen keep it.
 * - supersede: the old fact becomes the past (`superseded`, pointing at the new one) and leaves
 *   the prompt; the new one keeps its pin.
 * - forget: the fact is gone, as if deleted on the Memories screen.
 */

/** Days after a plan or event's date before its fact is archived. */
export const ARCHIVE_AFTER_DAYS = 30;

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function applyMemoryPass(
  memories: readonly MemoryItem[],
  characterId: string,
  result: MemoryPassResult,
  now: Date,
  newId: () => string,
): MemoryItem[] {
  let next = [...memories];
  const mine = (id: string) => next.find((m) => m.id === id && m.characterId === characterId);
  const createdAt = now.toISOString();
  const exists = (text: string) => next.some((m) => m.characterId === characterId && (m.status ?? 'active') === 'active' && same(m.text, text));

  for (const op of result.ops) {
    switch (op.op) {
      case 'add': {
        const text = rememberableText(op.text);
        if (!text || exists(text)) break;
        next = [{ id: newId(), characterId, text, source: 'chat', createdAt, pinned: false, about: op.about, type: op.type, importance: op.importance, until: op.until }, ...next];
        break;
      }
      case 'update': {
        const text = rememberableText(op.text);
        const old = mine(op.id);
        if (!text || !old || old.quote) break;
        next = next.map((m) => (m.id === op.id ? { ...m, text } : m));
        break;
      }
      case 'supersede': {
        const text = rememberableText(op.text);
        const old = mine(op.id);
        if (!text || !old) break;
        const id = newId();
        const fresh: MemoryItem = { id, characterId, text, source: 'chat', createdAt, pinned: old.pinned, about: op.about, type: op.type, importance: op.importance, until: op.until };
        next = [fresh, ...next.map((m) => (m.id === op.id ? { ...m, status: 'superseded' as const, supersededBy: id, pinned: false } : m))];
        break;
      }
      case 'forget':
        if (mine(op.id)) next = next.filter((m) => m.id !== op.id);
        break;
    }
  }
  return archiveExpired(next, now);
}

/** Facts whose plan or event was more than `ARCHIVE_AFTER_DAYS` ago: archived, out of the prompt. */
export function archiveExpired(memories: readonly MemoryItem[], now: Date): MemoryItem[] {
  const cutoff = now.getTime() - ARCHIVE_AFTER_DAYS * 86_400_000;
  let changed = false;
  const next = memories.map((m) => {
    if (!m.until || (m.status ?? 'active') !== 'active' || m.pinned || Date.parse(`${m.until}T23:59:59Z`) >= cutoff) return m;
    changed = true;
    return { ...m, status: 'archived' as const };
  });
  return changed ? next : [...memories];
}
