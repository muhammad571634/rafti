/**
 * Who is waiting for you: one rule for Today's hero, Today's waiting card and the Chats tab badge
 * (simplify plan 2026-11-25 §1). The badge counts chats with something unread (people waiting, as
 * WhatsApp does), each row shows its own message count.
 */

/** The parts of a one-to-one chat or a group the rule reads. */
export interface WaitingInput {
  unreadCount: number;
  muted: boolean;
  lastMessageAt: string;
}

export type WaitingThread<C extends WaitingInput, G extends WaitingInput> =
  | { kind: 'chat'; item: C; at: number }
  | { kind: 'group'; item: G; at: number };

/**
 * When their unread line came, or 0 when nothing is waiting. A muted chat never claims Today's
 * picture (muted means "not now"); it still counts on the badge and in its own row.
 */
export function waitingSince(chat: WaitingInput): number {
  if (chat.unreadCount <= 0 || chat.muted) return 0;
  return Date.parse(chat.lastMessageAt) || 0;
}

/** The Chats tab's badge: chats and groups with anything unread. */
export function waitingChatCount(chats: readonly WaitingInput[], groups: readonly WaitingInput[]): number {
  return chats.filter((c) => c.unreadCount > 0).length + groups.filter((g) => g.unreadCount > 0).length;
}

/** Unread chats, newest line first: the order Today lists them in. */
export function newestWaitingFirst<T extends WaitingInput>(chats: readonly T[]): T[] {
  return chats.filter((c) => c.unreadCount > 0).sort((a, b) => (Date.parse(b.lastMessageAt) || 0) - (Date.parse(a.lastMessageAt) || 0));
}

/**
 * Unread one-to-one chats and group chats together, newest message first, so Today's "Waiting for
 * you" card and the Chats tab badge never disagree when a group chat has unread lines.
 */
export function waitingThreadsFirst<C extends WaitingInput, G extends WaitingInput>(
  chats: readonly C[],
  groups: readonly G[],
): WaitingThread<C, G>[] {
  const merged: WaitingThread<C, G>[] = [
    ...chats.filter((c) => c.unreadCount > 0).map((item) => ({ kind: 'chat' as const, item, at: Date.parse(item.lastMessageAt) || 0 })),
    ...groups.filter((g) => g.unreadCount > 0).map((item) => ({ kind: 'group' as const, item, at: Date.parse(item.lastMessageAt) || 0 })),
  ];
  return merged.sort((a, b) => b.at - a.at);
}

/**
 * Today's hero order: whoever wrote to you and waits (newest first), then whoever you talked with
 * last, then the closest bond. Before 0z369 it was only "talked with last", so a new line from
 * someone else sat in the card under the picture of a friend who had said nothing new.
 */
export function byWhoNeedsYou(
  a: { waiting: number; talkedAt: number; intimacy: number },
  b: { waiting: number; talkedAt: number; intimacy: number },
): number {
  return b.waiting - a.waiting || b.talkedAt - a.talkedAt || b.intimacy - a.intimacy;
}
