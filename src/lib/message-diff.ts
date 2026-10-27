import type { Message } from '@/types';

/** Every chat's messages, keyed by conversation or group id (the store's `messages`). */
export type MessagesByChat = Record<string, Message[]>;

/**
 * What changed between two saves of `messages`, for the on-device database (B1.3a).
 * The database reads a chat back in insert order, so a chat whose kept messages moved,
 * or that gained a message before one it kept, is written again whole (`rewrittenChats`).
 */
export interface MessageDiff {
  /** New or changed messages, in array order; every message of a rewritten chat. */
  upserts: { chatId: string; message: Message }[];
  /** Messages gone from a chat that is still there. */
  deletedIds: string[];
  /** Chats gone from the record: all their rows go. */
  droppedChats: string[];
  /** Chats whose rows are deleted first, then inserted again from `upserts`. */
  rewrittenChats: string[];
}

/**
 * Compares by reference: the store replaces a message object when it changes and keeps
 * it otherwise, so an unchanged chat array (or message) costs nothing.
 */
export function diffMessages(prev: MessagesByChat, next: MessagesByChat): MessageDiff {
  const diff: MessageDiff = { upserts: [], deletedIds: [], droppedChats: [], rewrittenChats: [] };

  for (const chatId of Object.keys(prev)) {
    if (!next[chatId]) diff.droppedChats.push(chatId);
  }

  for (const [chatId, after] of Object.entries(next)) {
    const before = prev[chatId] ?? [];
    if (before === after) continue;

    const old = new Map(before.map((m) => [m.id, m]));
    const kept = new Set(after.map((m) => m.id));

    if (!keepsOrder(before, after, old, kept)) {
      diff.rewrittenChats.push(chatId);
      after.forEach((message) => diff.upserts.push({ chatId, message }));
      continue;
    }
    before.forEach((m) => {
      if (!kept.has(m.id)) diff.deletedIds.push(m.id);
    });
    after.forEach((message) => {
      if (old.get(message.id) !== message) diff.upserts.push({ chatId, message });
    });
  }
  return diff;
}

/** Kept messages stay in their old order and every new one comes after them. */
function keepsOrder(before: Message[], after: Message[], old: Map<string, Message>, kept: Set<string>) {
  const stayed = before.filter((m) => kept.has(m.id));
  let i = 0;
  let seenNew = false;
  for (const m of after) {
    if (!old.has(m.id)) {
      seenNew = true;
      continue;
    }
    if (seenNew || stayed[i]?.id !== m.id) return false;
    i++;
  }
  return i === stayed.length;
}

export const isEmptyDiff = (d: MessageDiff) =>
  !d.upserts.length && !d.deletedIds.length && !d.droppedChats.length && !d.rewrittenChats.length;
