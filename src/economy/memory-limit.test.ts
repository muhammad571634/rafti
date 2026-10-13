import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { MemoryItem } from '@/types';

import { FREE_MEMORY_LIMIT, hasFullMemory, splitMemories } from './memory-limit';
import { startSubscription } from './plans';

const NOW = Date.parse('2026-10-13T08:00:00.000Z');
const MIN = 60_000;

/** `count` memories for one character, the first one oldest. */
function memories(count: number, characterId = 'c_kai'): MemoryItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${characterId}_${i}`,
    characterId,
    text: `fact ${i}`,
    source: 'chat',
    createdAt: new Date(NOW - (count - i) * MIN).toISOString(),
    pinned: false,
  }));
}

describe('hasFullMemory: who sees every memory', () => {
  it('is false without a plan and true on Basic, Pro and the trial', () => {
    assert.equal(hasFullMemory(undefined, NOW), false);
    assert.equal(hasFullMemory(startSubscription('basic', NOW), NOW), true);
    assert.equal(hasFullMemory(startSubscription('pro', NOW), NOW), true);
    assert.equal(hasFullMemory(startSubscription('proAnnual', NOW, true), NOW), true);
  });
});

describe('splitMemories: 20 open memories per character on the free plan', () => {
  it('locks nothing at 20 or fewer', () => {
    const { open, locked } = splitMemories(memories(FREE_MEMORY_LIMIT), 'c_kai', false);
    assert.equal(open.length, FREE_MEMORY_LIMIT);
    assert.equal(locked.length, 0);
  });

  it('keeps the newest 20 open and locks the oldest', () => {
    const { open, locked } = splitMemories(memories(25), 'c_kai', false);
    assert.equal(open.length, 20);
    assert.deepEqual(locked.map((m) => m.id), ['c_kai_4', 'c_kai_3', 'c_kai_2', 'c_kai_1', 'c_kai_0']);
    assert.equal(open[0].id, 'c_kai_24');
  });

  it('keeps a pinned memory open even when it is old', () => {
    const list = memories(25);
    list[0] = { ...list[0], pinned: true };
    const { open, locked } = splitMemories(list, 'c_kai', false);
    assert.equal(open[0].id, 'c_kai_0');
    assert.equal(locked.some((m) => m.id === 'c_kai_0'), false);
    assert.equal(locked.length, 5);
  });

  it('counts each character on its own', () => {
    const list = [...memories(15, 'c_kai'), ...memories(15, 'c_mira')];
    assert.equal(splitMemories(list, 'c_kai', false).locked.length, 0);
    assert.equal(splitMemories(list, 'c_mira', false).open.length, 15);
  });

  it('opens everything with a plan', () => {
    const { open, locked } = splitMemories(memories(40), 'c_kai', true);
    assert.equal(open.length, 40);
    assert.equal(locked.length, 0);
  });
});
