import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { MemoryItem, ScheduleItem } from '@/types';

import { aboutOf, countByTab, groupMemories, memoryGroup, tabOf, upcomingPlans } from './memory-groups';

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
    assert.equal(memoryGroup(memory('4', { type: 'promise' })), 'promises');
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

describe('promises', () => {
  it('puts every promise in Story, whoever made it, but leaves a pinned chat line where it is', () => {
    assert.equal(tabOf(memory('p1', { type: 'promise' })), 'story');
    assert.equal(tabOf(memory('p2', { type: 'promise', about: 'them' })), 'story');
    assert.equal(tabOf(memory('q', { type: 'promise', about: 'you', quote: { messageId: 'm', author: 'me' } })), 'you');
  });

  it('leads Story with Promises and counts them there', () => {
    const list = [memory('moment', { about: 'story' }), memory('kept', { type: 'promise', about: 'them' })];
    assert.deepEqual(
      groupMemories(list, 'story').map((g) => [g.key, g.items.map((m) => m.id)]),
      [
        ['promises', ['kept']],
        ['moments', ['moment']],
      ],
    );
    assert.deepEqual(groupMemories(list, 'them'), []);
    assert.deepEqual(countByTab(list), { story: 2, them: 0, you: 0 });
  });
});

describe('upcomingPlans', () => {
  const plan = (id: string, date: string, time?: string, characterId = 'c_theo'): ScheduleItem => ({ id, characterId, title: id, date, time, createdAt: at, reminded: false });

  it("keeps this friend's plans from today on, soonest first, all-day before timed", () => {
    const list = [plan('later', '2026-11-25', '09:00'), plan('past', '2026-11-19'), plan('timed', '2026-11-20', '18:00'), plan('allDay', '2026-11-20'), plan('other', '2026-11-21', undefined, 'c_mia')];
    assert.deepEqual(
      upcomingPlans(list, 'c_theo', '2026-11-20').map((p) => p.id),
      ['allDay', 'timed', 'later'],
    );
  });
});
