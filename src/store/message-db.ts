import * as SQLite from 'expo-sqlite';

import type { MessageDiff, MessagesByChat } from '@/lib/message-diff';
import type { MessagesPage, MessageSyncRequest } from '@/ai/session-types';
import type { Message } from '@/types';

/**
 * Chat messages on the device (B1.3a). Until now they rode in the one AsyncStorage save,
 * cut to 300 a chat / 4000 in all and rewritten whole on every change. Here each message is
 * a row, written only when it changes. Web keeps the old save (`message-db.web.ts`).
 *
 * A chat is read back in insert order (`rowid`): messages are appended, changed in place
 * (an upsert keeps its rowid) or cut; `diffMessages` rewrites a chat whose order changed.
 *
 * B1.3b: what the server has not seen yet. A row's `pending` is the number of the write that
 * last changed it (0 = sent); deletions and dropped chats wait in `outbox`. The server applies
 * a sync's drops and deletions before its upserts, so the order of the two never matters.
 */
export const messageDbAvailable = true;

const DB_NAME = 'messages.db';
const DB_VERSION = 2;
/** Set once the messages from the old AsyncStorage save are in the database. */
const IMPORTED_KEY = 'imported_store';

let opening: Promise<SQLite.SQLiteDatabase> | null = null;
/** The newest write's number; every write that changes rows takes the next one. */
let change = 0;

function db() {
  opening ??= open().catch((e) => {
    opening = null;
    throw e;
  });
  return opening;
}

async function open() {
  const database = await SQLite.openDatabaseAsync(DB_NAME);
  await database.execAsync('PRAGMA journal_mode = WAL');
  const row = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  if (version < 1) {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY NOT NULL,
        conversation_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        body TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS messages_conversation ON messages (conversation_id);
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
    `);
    version = 1;
  }
  if (version < 2) {
    // Every row saved before is new to the server.
    await database.execAsync(`
      ALTER TABLE messages ADD COLUMN pending INTEGER NOT NULL DEFAULT 1;
      CREATE INDEX IF NOT EXISTS messages_pending ON messages (pending) WHERE pending > 0;
      CREATE TABLE IF NOT EXISTS outbox (
        n INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL CHECK (kind IN ('chat', 'message')),
        key TEXT NOT NULL
      );
    `);
    version = 2;
  }
  await database.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
  const newest = await database.getFirstAsync<{ n: number | null }>('SELECT max(pending) AS n FROM messages');
  change = Math.max(change, newest?.n ?? 0);
  return database;
}

/** The old save was imported, so the database holds every message. */
export async function messagesImported() {
  const row = await (await db()).getFirstAsync<{ value: string }>('SELECT value FROM meta WHERE key = ?', IMPORTED_KEY);
  return row?.value === '1';
}

/** Copies the messages from the old save in one go and marks the import done. */
export async function importMessages(byChat: MessagesByChat) {
  await (await db()).withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('DELETE FROM messages');
    await upsertAll(
      txn,
      Object.entries(byChat).flatMap(([chatId, list]) => list.map((message) => ({ chatId, message }))),
      ++change,
    );
    await txn.runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', IMPORTED_KEY, '1');
  });
}

/** Every saved message, each chat in its order. Paging comes with the server sync (B1.3b). */
export async function loadMessages(): Promise<MessagesByChat> {
  const rows = await (await db()).getAllAsync<{ conversation_id: string; body: string }>(
    'SELECT conversation_id, body FROM messages ORDER BY rowid',
  );
  const byChat: MessagesByChat = {};
  for (const row of rows) (byChat[row.conversation_id] ??= []).push(JSON.parse(row.body) as Message);
  return byChat;
}

/** One exclusive transaction: all of the change lands, or none of it. */
export async function writeMessageDiff(diff: MessageDiff) {
  await (await db()).withExclusiveTransactionAsync(async (txn) => {
    for (const chatId of [...diff.droppedChats, ...diff.rewrittenChats]) {
      await txn.runAsync('DELETE FROM messages WHERE conversation_id = ?', chatId);
      await txn.runAsync("INSERT INTO outbox (kind, key) VALUES ('chat', ?)", chatId);
    }
    for (const id of diff.deletedIds) {
      await txn.runAsync('DELETE FROM messages WHERE id = ?', id);
      await txn.runAsync("INSERT INTO outbox (kind, key) VALUES ('message', ?)", id);
    }
    await upsertAll(txn, diff.upserts, ++change);
  });
}

/** How many messages the phone keeps (Profile, development builds). */
export async function countMessages() {
  const row = await (await db()).getFirstAsync<{ n: number }>('SELECT count(*) AS n FROM messages');
  return row?.n ?? 0;
}

/** Rows and deletions the server has not seen yet. */
export async function countUnsent() {
  const row = await (await db()).getFirstAsync<{ n: number }>(
    'SELECT (SELECT count(*) FROM messages WHERE pending > 0) + (SELECT count(*) FROM outbox) AS n',
  );
  return row?.n ?? 0;
}

/** One sync's worth of the outbox, with what `markSent` needs once the server took it. */
export interface OutboxBatch {
  request: MessageSyncRequest;
  /** The newest outbox entry in the batch. */
  lastOp: number;
  /** Each sent row and the write it was sent at. */
  rows: { id: string; pending: number }[];
}

/**
 * The next batch, or null when everything is sent. Every drop and deletion goes before any row:
 * a dropped chat whose rows were written again would otherwise lose them on the server.
 */
export async function readOutbox(limits: { upserts: number; deletedIds: number; droppedChats: number }): Promise<OutboxBatch | null> {
  const database = await db();
  const ops = await database.getAllAsync<{ n: number; kind: 'chat' | 'message'; key: string }>(
    'SELECT n, kind, key FROM outbox ORDER BY n LIMIT ?',
    limits.deletedIds + limits.droppedChats,
  );
  const droppedChats: string[] = [];
  const deletedIds: string[] = [];
  let lastOp = 0;
  for (const op of ops) {
    const list = op.kind === 'chat' ? droppedChats : deletedIds;
    if (list.length >= (op.kind === 'chat' ? limits.droppedChats : limits.deletedIds)) break;
    list.push(op.key);
    lastOp = op.n;
  }
  const more = await database.getFirstAsync<{ n: number }>('SELECT count(*) AS n FROM outbox WHERE n > ?', lastOp);
  const rows = more?.n
    ? []
    : await database.getAllAsync<{ id: string; conversation_id: string; body: string; pending: number }>(
        'SELECT id, conversation_id, body, pending FROM messages WHERE pending > 0 ORDER BY rowid LIMIT ?',
        limits.upserts,
      );
  if (!lastOp && !rows.length) return null;
  return {
    request: {
      droppedChats,
      deletedIds,
      upserts: rows.map((r) => ({ chatId: r.conversation_id, message: JSON.parse(r.body) as Message })),
    },
    lastOp,
    rows: rows.map(({ id, pending }) => ({ id, pending })),
  };
}

/** The server took the batch. A row changed again since it was read stays unsent. */
export async function markSent(batch: OutboxBatch) {
  await (await db()).withExclusiveTransactionAsync(async (txn) => {
    if (batch.lastOp) await txn.runAsync('DELETE FROM outbox WHERE n <= ?', batch.lastOp);
    for (const row of batch.rows) {
      await txn.runAsync('UPDATE messages SET pending = 0 WHERE id = ? AND pending = ?', row.id, row.pending);
    }
  });
}

/**
 * A page from the server (a new install restoring its chats), written as already sent. Rows the
 * phone already has are left as they are.
 */
export async function saveRestored(page: MessagesPage['messages']) {
  await (await db()).withExclusiveTransactionAsync(async (txn) => {
    for (const { chatId, message } of page) {
      await txn.runAsync(
        'INSERT OR IGNORE INTO messages (id, conversation_id, created_at, body, pending) VALUES (?, ?, ?, ?, 0)',
        message.id,
        chatId,
        message.createdAt,
        JSON.stringify(message),
      );
    }
  });
}

/** Everything goes: the account was deleted, so nothing is left to send either. */
export async function wipeMessages() {
  await (await db()).withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('DELETE FROM messages');
    await txn.runAsync('DELETE FROM outbox');
  });
}

async function upsertAll(txn: SQLite.SQLiteDatabase, upserts: MessageDiff['upserts'], pending: number) {
  if (!upserts.length) return;
  const statement = await txn.prepareAsync(
    `INSERT INTO messages (id, conversation_id, created_at, body, pending) VALUES ($id, $chat, $at, $body, $pending)
     ON CONFLICT(id) DO UPDATE SET conversation_id = excluded.conversation_id,
       created_at = excluded.created_at, body = excluded.body, pending = excluded.pending`,
  );
  try {
    for (const { chatId, message } of upserts) {
      await statement.executeAsync({
        $id: message.id,
        $chat: chatId,
        $at: message.createdAt,
        $body: JSON.stringify(message),
        $pending: pending,
      });
    }
  } finally {
    await statement.finalizeAsync();
  }
}
