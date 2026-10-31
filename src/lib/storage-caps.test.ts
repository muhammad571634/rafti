import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { LedgerEntry, Message } from '@/types';

import { capLedger, capMessages } from './storage-caps';

const T0 = Date.parse('2026-10-13T08:00:00.000Z');

/** `count` messages in one chat, one minute apart, starting `start` minutes after T0. */
function chat(id: string, count: number, start = 0): Message[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${id}_${i}`,
    conversationId: id,
    author: 'me',
    kind: 'text',
    text: `hi ${i}`,
    createdAt: new Date(T0 + (start + i) * 60_000).toISOString(),
  })) as Message[];
}

describe('capMessages: the save stays small', () => {
  it('keeps short chats as they are', () => {
    const byChat = { a: chat('a', 5) };
    assert.deepEqual(capMessages(byChat, 300, 4000), byChat);
  });

  it('keeps the newest messages of a long chat, in order', () => {
    const kept = capMessages({ a: chat('a', 10) }, 4, 100).a;
    assert.deepEqual(kept.map((m) => m.id), ['a_6', 'a_7', 'a_8', 'a_9']);
  });

  it('drops the oldest messages across chats when over the total', () => {
    const kept = capMessages({ old: chat('old', 5, 0), fresh: chat('fresh', 5, 100) }, 300, 6);
    assert.equal(kept.fresh.length, 5);
    assert.deepEqual(kept.old.map((m) => m.id), ['old_4']);
  });
});

describe('capLedger: newest history lines only', () => {
  it('keeps the first entries of a newest-first list', () => {
    const ledger = Array.from({ length: 5 }, (_, i) => ({ id: `l${i}` })) as LedgerEntry[];
    assert.deepEqual(capLedger(ledger, 3).map((e) => e.id), ['l0', 'l1', 'l2']);
  });
});
