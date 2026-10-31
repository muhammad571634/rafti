import type { LedgerEntry, Message } from '@/types';

/**
 * Everything is saved under one AsyncStorage key; on Android a value over ~2 MB fails to load
 * and the whole save is lost (audit 2026-10-13). On the phone messages now live in SQLite
 * (`src/store/message-db.ts`, B1.3a); these caps apply only while they do not (web, or before the
 * one-time import), when the save keeps the newest part.
 */
export const SAVED_MESSAGES_PER_CHAT = 300;
export const SAVED_MESSAGES_TOTAL = 4000;
export const SAVED_LEDGER_ENTRIES = 3000;

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
