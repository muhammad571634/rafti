import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Conversation, MemoryItem } from '@/types';

import { MEMORY_SYNC_LIMITS } from '../ai/session-types';
import { changedKeys, joinRemote, memorySignatures, memorySyncBatch, stillDirty } from './memory-sync';

const fact = (id: string, characterId = 'c_kai', extra: Partial<MemoryItem> = {}): MemoryItem => ({
  id,
  characterId,
  text: `fact ${id}`,
  source: 'chat',
  createdAt: '2026-10-01T10:00:00Z',
  pinned: false,
  ...extra,
});
const chat = (id: string, extra: Partial<Conversation> = {}) => ({ id, characterId: 'c_kai', ...extra }) as Conversation;

describe('the memory on its way to the server (B2.3)', () => {
  it('tells which character and which chat changed, came or went', () => {
    const before = memorySignatures([fact('a'), fact('b', 'c_ivy')], [chat('k', { summary: 'Met.' }), chat('plain')]);
    const after = memorySignatures([fact('a', 'c_kai', { pinned: true }), fact('n', 'c_zed')], [chat('k', { summary: 'Met.', memoryMark: 'm3' })]);
    assert.deepEqual(changedKeys(before, after).sort(), ['c:c_ivy', 'c:c_kai', 'c:c_zed', 'h:k']);
    assert.deepEqual(changedKeys(after, after), []);
  });

  it('sends each dirty character whole, an emptied one empty, and each chat with what it has', () => {
    const batch = memorySyncBatch(['c:c_kai', 'c:c_gone', 'h:k', 'h:gone'], [fact('a'), fact('b'), fact('i', 'c_ivy')], [chat('k', { summary: 'Met at the pool.', memoryMark: 'm3' })]);
    assert.deepEqual(
      batch?.request.characters.map((c) => [c.characterId, c.items.map((m) => m.id)]),
      [['c_kai', ['a', 'b']], ['c_gone', []]],
    );
    assert.deepEqual(batch?.request.chats, [{ chatId: 'k', summary: 'Met at the pool.', mark: 'm3' }, { chatId: 'gone' }]);
    assert.equal(memorySyncBatch([], [fact('a')], []), null);
  });

  it('keeps a sync inside the limits: active facts first, then the newest', () => {
    const many = Array.from({ length: MEMORY_SYNC_LIMITS.items + 5 }, (_, i) =>
      fact(`f${i}`, 'c_kai', { createdAt: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(), status: i < 10 ? 'active' : 'archived' }),
    );
    const items = memorySyncBatch(['c:c_kai'], many, [])!.request.characters[0].items;
    assert.equal(items.length, MEMORY_SYNC_LIMITS.items);
    assert.deepEqual(items.slice(0, 10).map((m) => m.status), Array(10).fill('active'));
    assert.ok(!items.some((m) => m.id === 'f10'), 'the oldest archived fact waits');
    const keys = Array.from({ length: MEMORY_SYNC_LIMITS.characters + 3 }, (_, i) => `c:c_${i}`);
    assert.equal(memorySyncBatch(keys, [], [])!.request.characters.length, MEMORY_SYNC_LIMITS.characters);
  });

  it('keeps dirty what was not sent or changed on the way', () => {
    const memories = [fact('a'), fact('i', 'c_ivy')];
    const { sent } = memorySyncBatch(['c:c_kai', 'c:c_ivy'], memories, [])!;
    const changed = [fact('a'), fact('i', 'c_ivy', { text: 'new' })];
    assert.deepEqual(stillDirty(['c:c_kai', 'c:c_ivy', 'h:k'], sent, changed, []), ['c:c_ivy', 'h:k']);
    // An emptied character, sent empty, is done.
    const empty = memorySyncBatch(['c:c_gone'], [], [])!;
    assert.deepEqual(stillDirty(['c:c_gone'], empty.sent, [], []), []);
  });

  it('joins the server’s copy without losing what the phone holds', () => {
    const joined = joinRemote(
      [fact('a')],
      [chat('k', { summary: 'Phone’s.' }), chat('new')],
      {
        characters: [
          { characterId: 'c_kai', items: [fact('old')] },
          { characterId: 'c_ivy', items: [fact('i', 'c_ivy'), fact('a', 'c_ivy')] },
        ],
        chats: [{ chatId: 'k', summary: 'Server’s.' }, { chatId: 'new', summary: 'They met.', mark: 'm9' }, { chatId: 'elsewhere', summary: 'x' }],
      },
    );
    assert.deepEqual(joined.memories.map((m) => `${m.characterId}:${m.id}`), ['c_kai:a', 'c_ivy:i']);
    assert.deepEqual(
      joined.conversations.map((c) => [c.id, c.summary, c.memoryMark]),
      [['k', 'Phone’s.', undefined], ['new', 'They met.', 'm9']],
    );
  });
});
