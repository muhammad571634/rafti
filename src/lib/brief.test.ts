import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { briefLine } from '../mock/brief';
import { BRIEF_MAX, briefFor, morningBrief } from './brief';
import type { ScheduleItem, Thread } from '@/types';

const morning = new Date(2026, 9, 27, 8, 0);
const at = (hour: number, minute = 0, dayOffset = 0) => new Date(2026, 9, 27 + dayOffset, hour, minute).toISOString();

const thread = (id: string, characterId: string, about: string, happensAt: string, extra: Partial<Thread> = {}): Thread => ({
  id,
  characterId,
  about,
  quote: about,
  createdAt: at(0, 0, -1),
  happensAt,
  kind: 'plan',
  touches: [
    { id: `${id}:0`, at: at(8, 15), why: 'luck', phase: 'before' },
    { id: `${id}:1`, at: at(11, 30), why: 'how did it go', phase: 'after' },
  ],
  status: 'open',
  ...extra,
});

const plan = (id: string, characterId: string, title: string, time?: string, extra: Partial<ScheduleItem> = {}): ScheduleItem => ({
  id,
  characterId,
  title,
  date: '2026-10-27',
  ...(time ? { time } : {}),
  createdAt: at(0, 0, -1),
  reminded: false,
  ...extra,
});

describe('morning brief', () => {
  it('lists one friend’s things still ahead today, soonest first, and covers their luck text', () => {
    const brief = briefFor(
      'kai',
      [plan('p1', 'kai', 'Gym', '18:00'), plan('p0', 'kai', 'Early run', '07:00'), plan('p2', 'kai', 'Call grandma')],
      [thread('t1', 'kai', 'exam', at(9))],
      morning,
    );
    assert.deepEqual(
      brief?.items.map((x) => [x.title, x.time]),
      [
        ['exam', '09:00'],
        ['Gym', '18:00'],
        ['Call grandma', undefined],
      ],
    );
    assert.deepEqual(brief?.covers, ['t1:0']);
  });

  it('leaves out other days, goals, settled or already-wished things, and plans said by a thread', () => {
    const wished = thread('t2', 'kai', 'interview', at(14));
    wished.touches[0].sent = true;
    const brief = briefFor(
      'kai',
      [plan('p3', 'kai', 'Exam', '09:00'), plan('p4', 'kai', 'Dentist', '10:00', { date: '2026-10-28' }), plan('p5', 'kai', 'Lunch', '13:00', { followedUp: true })],
      [
        thread('t1', 'kai', 'exam', at(9), { scheduleId: 'p3' }),
        wished,
        thread('t3', 'kai', 'less TikTok', at(9), { kind: 'goal' }),
        thread('t4', 'kai', 'trip', at(9, 0, 1)),
        thread('t5', 'kai', 'report', at(16), { status: 'closed', outcome: 'done' }),
      ],
      morning,
    );
    assert.deepEqual(brief?.items.map((x) => x.title), ['exam']);
  });

  it('knows a thing with no time from its good-luck text', () => {
    const brief = briefFor('kai', [], [thread('t6', 'kai', 'the exam today', '', { happensAt: undefined, kind: 'follow' })], morning);
    assert.deepEqual(brief?.items, [{ title: 'the exam today', time: undefined, threadId: 't6' }]);
    assert.deepEqual(brief?.covers, ['t6:0']);
  });

  it('comes from the closest friend who holds something, says at most a few things, or nothing', () => {
    const plans = [plan('a', 'iris', 'A', '09:00'), plan('b', 'iris', 'B', '10:00'), plan('c', 'iris', 'C', '11:00'), plan('d', 'iris', 'D', '12:00'), plan('e', 'kai', 'E', '09:30')];
    const brief = morningBrief(['hana', 'iris', 'kai'], plans, [], morning);
    assert.equal(brief?.characterId, 'iris');
    assert.equal(brief?.items.length, BRIEF_MAX);
    assert.equal(morningBrief(['hana'], plans, [], morning), null);
  });

  it('says the things with their times in the friend’s temper, the same words every time', () => {
    const items = [
      { title: 'exam', time: '09:00' },
      { title: 'gym', time: '18:00' },
    ];
    const line = briefLine(items, 'warm', 'seed');
    assert.match(line, /Today: exam at 09:00 and gym at 18:00\./);
    assert.equal(line, briefLine(items, 'warm', 'seed'));
    assert.match(briefLine([{ title: 'exam', time: '09:00' }], 'shy', 'x'), /Exam at 09:00 today\./);
  });
});
