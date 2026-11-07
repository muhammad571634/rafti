import type { LedgerEntry, Message, Moment, MomentKind } from '@/types';

/**
 * Everything is saved under one AsyncStorage key; on Android a value over ~2 MB fails to load
 * and the whole save is lost (audit 2026-10-13). On the phone messages now live in SQLite
 * (`src/store/message-db.ts`, B1.3a); these caps apply only while they do not (web, or before the
 * one-time import), when the save keeps the newest part.
 */
export const SAVED_MESSAGES_PER_CHAT = 300;
export const SAVED_MESSAGES_TOTAL = 4000;
export const SAVED_LEDGER_ENTRIES = 3000;
/** Everyday moments (notes, calls, plans, games…) kept per friend; milestones are never dropped. */
export const SAVED_MOMENTS_PER_FRIEND = 150;

/** The newest messages of each chat, then the newest overall; each chat keeps its order. */
export function capMessages(
  byChat: Record<string, Message[]>,
  perChat = SAVED_MESSAGES_PER_CHAT,
  total = SAVED_MESSAGES_TOTAL,
): Record<string, Message[]> {
  const trimmed = Object.fromEntries(
    Object.entries(byChat).map(([id, list]) => [id, list.length > perChat ? list.slice(-perChat) : list]),
  );
  const count = Object.values(trimmed).reduce((sum, list) => sum + list.length, 0);
  if (count <= total) return trimmed;

  // Over the total: drop the oldest messages across all chats (at most `total` stay).
  const stamps = Object.values(trimmed)
    .flat()
    .map((m) => Date.parse(m.createdAt))
    .sort((a, b) => b - a);
  const cutoff = stamps[total];
  return Object.fromEntries(
    Object.entries(trimmed).map(([id, list]) => [id, list.filter((m) => Date.parse(m.createdAt) > cutoff)]),
  );
}

/** The newest history lines; the ledger is kept newest first. */
export function capLedger(ledger: LedgerEntry[], max = SAVED_LEDGER_ENTRIES) {
  return ledger.length > max ? ledger.slice(0, max) : ledger;
}

/**
 * Milestones are the bond's story (how you met, each level, each chapter that opened, each photo
 * together): few, and kept for as long as the bond lasts.
 */
const MILESTONES: ReadonlySet<MomentKind> = new Set<MomentKind>(['met', 'levelUp', 'arc', 'photo']);

/**
 * Us' timeline grows with every note, call and plan; the save keeps every milestone and the newest
 * `perFriend` everyday moments of each friend, so a long bond never pushes the save past what
 * Android can load. Order is kept (moments are saved oldest first).
 */
export function capMoments(moments: Moment[], perFriend = SAVED_MOMENTS_PER_FRIEND): Moment[] {
  const everyday = new Map<string, number>();
  for (const m of moments) if (!MILESTONES.has(m.kind)) everyday.set(m.characterId, (everyday.get(m.characterId) ?? 0) + 1);
  if (![...everyday.values()].some((n) => n > perFriend)) return moments;

  // Walk newest first so each friend keeps their latest everyday moments, then restore the order.
  const kept = new Map<string, number>();
  const keep = new Set<Moment>();
  for (let i = moments.length - 1; i >= 0; i--) {
    const m = moments[i];
    if (MILESTONES.has(m.kind)) {
      keep.add(m);
      continue;
    }
    const n = kept.get(m.characterId) ?? 0;
    if (n < perFriend) {
      kept.set(m.characterId, n + 1);
      keep.add(m);
    }
  }
  return moments.filter((m) => keep.has(m));
}
