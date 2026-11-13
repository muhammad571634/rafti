import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { MemoryItem } from '@/types';

import { aboutOf, countByTab, groupMemories, memoryGroup } from './memory-groups';

const at = '2026-10-24T20:00:00.000Z';
const memory = (id: string, extra: Partial<MemoryItem> = {}): MemoryItem => ({
  id,
  characterId: 'c_theo',
  text: id,
  source: 'chat',
  createdAt: at,
  pinned: false,
  ...extra,
});

describe('aboutOf', () => {
  it('treats memories from before the tabs as about you', () => {
    assert.equal(aboutOf(memory('a')), 'you');
    assert.equal(aboutOf(memory('b', { about: 'them' })), 'them');
  });
});

describe('memoryGroup', () => {
  it('splits Story into pinned chat lines and moments', () => {
    assert.equal(memoryGroup(memory('q', { about: 'story', quote: { messageId: 'm', author: 'them' } })), 'pinnedChat');
    assert.equal(memoryGroup(memory('s', { about: 'story' })), 'moments');
  });

  it('sorts facts about you by their kind', () => {
    assert.equal(memoryGroup(memory('1', { type: 'preference' })), 'likes');
    assert.equal(memoryGroup(memory('2', { type: 'dislike' })), 'notFan');
    assert.equal(memoryGroup(memory('3', { type: 'schedule' })), 'plans');
    assert.equal(memoryGroup(memory('4', { type: 'promise' })), 'plans');
    assert.equal(memoryGroup(memory('5', { type: 'habit' })), 'habits');
    assert.equal(memoryGroup(memory('6', { type: 'personal_fact' })), 'life');
    assert.equal(memoryGroup(memory('7')), 'life');
  });
});

describe('groupMemories', () => {
  const list = [
    memory('dislike', { type: 'dislike' }),
    memory('like', { type: 'preference' }),
    memory('fact'),
    memory('them', { about: 'them' }),
    memory('quote', { about: 'story', quote: { messageId: 'm', author: 'me' } }),
  ];

  it('shows one tab under its headings in a fixed order, keeping the input order inside', () => {
    assert.deepEqual(
      groupMemories(list, 'you').map((g) => [g.key, g.items.map((m) => m.id)]),
      [
        ['likes', ['like']],
        ['life', ['fact']],
        ['notFan', ['dislike']],
      ],
    );
  });

  it('leaves out empty headings', () => {
    assert.deepEqual(groupMemories(list, 'story').map((g) => g.key), ['pinnedChat']);
    assert.deepEqual(groupMemories([], 'them'), []);
  });
});

describe('countByTab', () => {
  it('counts each tab', () => {
    assert.deepEqual(countByTab([memory('a'), memory('b', { about: 'them' }), memory('c', { about: 'story' }), memory('d')]), {
      story: 1,
      them: 1,
      you: 2,
    });
  });
});
