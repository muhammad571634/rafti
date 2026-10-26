import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { threadLines } from '../ai/thread-prompt';
import { mindSections, nextTouch, reachReason, reasonThreadId } from './mind';
import { ideaCategory, threadReach } from './reply-ideas';
import type { Thread } from '@/types';

const at = (day: number, hour: number) => new Date(2026, 9, 26 + day, hour).toISOString();

const thread = (over: Partial<Thread> = {}): Thread => ({
  id: 'th1',
  characterId: 'c_kai',
  about: 'Exam',
  quote: 'I have an exam tomorrow at 9',
  createdAt: at(0, 14),
  touches: [],
  status: 'open',
  ...over,
});

describe('keeping in mind: what the user sees', () => {
  it('puts timed threads first by time, then the rest by their next text, then settled ones newest first', () => {
    const list = [
      thread({ id: 'late', happensAt: at(3, 9) }),
      thread({ id: 'task', touches: [{ id: 'task:0', at: at(1, 18), why: 'check', phase: 'check' }] }),
      thread({ id: 'soon', happensAt: at(1, 9) }),
      thread({ id: 'goal', kind: 'goal', touches: [{ id: 'goal:0', at: at(2, 20), why: 'goal', phase: 'goal' }] }),
      thread({ id: 'old', status: 'closed', outcome: 'good', closedAt: at(-2, 10) }),
      thread({ id: 'new', status: 'closed', outcome: 'off', closedAt: at(0, 10) }),
      thread({ id: 'other', characterId: 'c_mira', happensAt: at(0, 20) }),
    ];
    const all = mindSections(list);
    assert.deepEqual(all.soon.map((t) => t.id), ['other', 'soon', 'late']);
    assert.deepEqual(all.following.map((t) => t.id), ['task', 'goal']);
    assert.deepEqual(all.settled.map((t) => t.id), ['new', 'old']);
    assert.deepEqual(mindSections(list, 'c_mira').soon.map((t) => t.id), ['other']);
  });

  it('reads the next text as the earliest unsent one, and none once settled', () => {
    const t = thread({
      touches: [
        { id: 'a', at: at(1, 8), why: 'go', phase: 'leave', sent: true },
        { id: 'b', at: at(1, 12), why: 'ask', phase: 'after' },
        { id: 'c', at: at(0, 21), why: 'sleep', phase: 'eve', sent: true },
      ],
    });
    assert.equal(nextTouch(t)?.id, 'b');
    assert.equal(nextTouch({ ...t, status: 'closed' }), undefined);
  });
});

describe('why a friend wrote first', () => {
  it('reads every reach key', () => {
    assert.deepEqual(reachReason('thread:leave:th_1'), { source: 'thread', phase: 'leave', threadId: 'th_1' });
    assert.deepEqual(reachReason('care:headache:again'), { source: 'care', kind: 'headache', again: true });
    assert.deepEqual(reachReason('lead:sch_9'), { source: 'lead', scheduleId: 'sch_9' });
    assert.deepEqual(reachReason('quest:th_2'), { source: 'quest', threadId: 'th_2' });
    assert.deepEqual(reachReason('life:parent:lunch'), { source: 'life', group: 'parent', moment: 'lunch' });
    assert.deepEqual(reachReason('hello:sibling'), { source: 'hello', group: 'sibling' });
    assert.deepEqual(reachReason('ask:warm'), { source: 'ask' });
    assert.deepEqual(reachReason('pause:night'), { source: 'pause', why: 'night' });
    assert.equal(reachReason(undefined), null);
    assert.equal(reachReason('nonsense'), null);
    assert.equal(reasonThreadId(reachReason('quest:th_2')), 'th_2');
  });

  it('knows every thread phase, so "Still home" and "Wake me up" reach their thread', () => {
    for (const phase of ['before', 'leave', 'eve', 'after', 'check', 'goal', 'quest'] as const) {
      assert.equal(reachReason(threadReach(phase, 'th_1'))?.source, 'thread', phase);
      assert.equal(ideaCategory(threadReach(phase, 'th_1')), `ideas_thread_${phase}`);
    }
  });
});

describe('the model sees what the user changed', () => {
  it('marks a time the user set and lists threads they turned off', () => {
    const lines = threadLines([
      thread({ happensAt: at(1, 10), userSet: true }),
      thread({ id: 'th2', about: 'Gym', status: 'closed', outcome: 'quiet' }),
      thread({ id: 'th3', about: 'Dentist', status: 'closed', outcome: 'good' }),
    ]).join('\n');
    assert.match(lines, /they set this time themselves/);
    assert.match(lines, /NO TEXTS ABOUT[\s\S]*- Gym/);
    assert.doesNotMatch(lines, /Dentist/);
  });
});
