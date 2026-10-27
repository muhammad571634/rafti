import * as SQLite from 'expo-sqlite';

import type { MessageDiff, MessagesByChat } from '@/lib/message-diff';
import type { Message } from '@/types';

/**
 * Chat messages on the device (B1.3a). Until now they rode in the one AsyncStorage save,
 * cut to 300 a chat / 4000 in all and rewritten whole on every change. Here each message is
 * a row, written only when it changes. Web keeps the old save (`message-db.web.ts`).
 *
 * A chat is read back in insert order (`rowid`): messages are appended, changed in place
 * (an upsert keeps its rowid) or cut; `diffMessages` rewrites a chat whose order changed.
 */
export const messageDbAvailable = true;

const DB_NAME = 'messages.db';
const DB_VERSION = 1;
/** Set once the messages from the old AsyncStorage save are in the database. */
const IMPORTED_KEY = 'imported_store';

let opening: Promise<SQLite.SQLiteDatabase> | null = null;

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
  await database.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
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
    }
    for (const id of diff.deletedIds) await txn.runAsync('DELETE FROM messages WHERE id = ?', id);
    await upsertAll(txn, diff.upserts);
  });
}

/** How many messages the phone keeps (Profile, development builds). */
export async function countMessages() {
  const row = await (await db()).getFirstAsync<{ n: number }>('SELECT count(*) AS n FROM messages');
  return row?.n ?? 0;
}

async function upsertAll(txn: SQLite.SQLiteDatabase, upserts: MessageDiff['upserts']) {
  if (!upserts.length) return;
  const statement = await txn.prepareAsync(
    `INSERT INTO messages (id, conversation_id, created_at, body) VALUES ($id, $chat, $at, $body)
     ON CONFLICT(id) DO UPDATE SET conversation_id = excluded.conversation_id,
       created_at = excluded.created_at, body = excluded.body`,
  );
  try {
    for (const { chatId, message } of upserts) {
      await statement.executeAsync({
        $id: message.id,
        $chat: chatId,
        $at: message.createdAt,
        $body: JSON.stringify(message),
      });
    }
  } finally {
    await statement.finalizeAsync();
  }
}
