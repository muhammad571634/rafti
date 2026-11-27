import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Message } from '@/types';

import { diffMessages, isEmptyDiff } from './message-diff';

const msg = (chat: string, n: number, text = `hi ${n}`) =>
  ({ id: `${chat}_${n}`, conversationId: chat, author: 'me', kind: 'text', text, createdAt: '2026-10-27T08:00:00.000Z' }) as Message;

const ids = (d: ReturnType<typeof diffMessages>) => d.upserts.map((u) => u.message.id);

describe('diffMessages: only what changed is written', () => {
  it('finds nothing when the record and its arrays are the same', () => {
    const a = [msg('a', 0)];
    assert.ok(isEmptyDiff(diffMessages({ a }, { a })));
  });

  it('writes appended messages, in order', () => {
    const a = [msg('a', 0), msg('a', 1)];
    const d = diffMessages({ a }, { a: [...a, msg('a', 2), msg('a', 3)] });
    assert.deepEqual(ids(d), ['a_2', 'a_3']);
    assert.deepEqual(d.upserts.map((u) => u.chatId), ['a', 'a']);
    assert.deepEqual([d.deletedIds, d.droppedChats, d.rewrittenChats], [[], [], []]);
  });

  it('writes a message changed in place, by reference', () => {
    const a = [msg('a', 0), msg('a', 1)];
    const d = diffMessages({ a }, { a: [a[0], { ...a[1], text: 'edited' }] });
    assert.deepEqual(ids(d), ['a_1']);
  });

  it('deletes messages cut from a chat', () => {
    const a = [msg('a', 0), msg('a', 1), msg('a', 2)];
    const d = diffMessages({ a }, { a: [a[0], a[2]] });
    assert.deepEqual(d.deletedIds, ['a_1']);
    assert.deepEqual(ids(d), []);
  });

  it('drops a chat that is gone and writes a new one', () => {
    const a = [msg('a', 0)];
    const d = diffMessages({ a }, { b: [msg('b', 0)] });
    assert.deepEqual(d.droppedChats, ['a']);
    assert.deepEqual(ids(d), ['b_0']);
  });

  it('skips untouched chats', () => {
    const a = [msg('a', 0)];
    const d = diffMessages({ a, b: [msg('b', 0)] }, { a, b: [msg('b', 1)] });
    assert.deepEqual(ids(d), ['b_1']);
    assert.deepEqual(d.deletedIds, ['b_0']);
  });

  it('rewrites a chat when a new message lands before a kept one', () => {
    const a = [msg('a', 0), msg('a', 1)];
    const d = diffMessages({ a }, { a: [a[0], msg('a', 9), a[1]] });
    assert.deepEqual(d.rewrittenChats, ['a']);
    assert.deepEqual(ids(d), ['a_0', 'a_9', 'a_1']);
    assert.deepEqual(d.deletedIds, []);
  });

  it('rewrites a chat when kept messages change order', () => {
    const a = [msg('a', 0), msg('a', 1)];
    const d = diffMessages({ a }, { a: [a[1], a[0]] });
    assert.deepEqual(d.rewrittenChats, ['a']);
    assert.deepEqual(ids(d), ['a_1', 'a_0']);
  });

  it('a reply swapped for another version is a cut plus an append, not a rewrite', () => {
    const a = [msg('a', 0), msg('a', 1), msg('a', 2)];
    const d = diffMessages({ a }, { a: [a[0], msg('a', 3)] });
    assert.deepEqual(d.rewrittenChats, []);
    assert.deepEqual(d.deletedIds, ['a_1', 'a_2']);
    assert.deepEqual(ids(d), ['a_3']);
  });

  it('an emptied chat deletes every row but stays', () => {
    const a = [msg('a', 0), msg('a', 1)];
    const d = diffMessages({ a }, { a: [] });
    assert.deepEqual(d.deletedIds, ['a_0', 'a_1']);
    assert.deepEqual(d.droppedChats, []);
  });
});
