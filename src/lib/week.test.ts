import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { weekLine } from '../mock/week';
import { recapAt, WEEK_REACH, weeklyRecap, weekWith } from './week';
import type { DiaryEntry, Message, Thread } from '@/types';

// Sunday 1 November 2026, 18:30.
const sunday = new Date(2026, 10, 1, 18, 30);
const at = (daysAgo: number, hour = 12) => new Date(2026, 10, 1 - daysAgo, hour).toISOString();
let n = 0;
const mine = (createdAt: string): Message => ({ id: `m${n++}`, conversationId: 'c', author: 'me', kind: 'text', text: 'hi', createdAt });
const closed = (characterId: string, about: string, outcome: Thread['outcome'], closedAt: string, kind: Thread['kind'] = 'plan'): Thread => ({
  id: `t${n++}`,
  characterId,
  about,
  quote: about,
  createdAt: at(8),
  kind,
  touches: [],
  status: 'closed',
  outcome,
  closedAt,
});
const page = (date: string, mood: DiaryEntry['mood'], sharedWithCharacterId?: string): DiaryEntry => ({
  id: `d${n++}`,
  date,
  title: 't',
  body: 'b',
  mood,
  images: [],
  sharedWithCharacterId,
  accentIndex: 0,
});

describe('weekly recap', () => {
  it('counts only this week with that friend: days, messages, their wins, their quests and shared pages', () => {
    const chat = [mine(at(0)), mine(at(0, 15)), mine(at(2)), mine(at(5)), mine(at(9))];
    const threads = [
      closed('kai', 'the exam', 'good', at(3)),
      closed('kai', 'the report', 'done', at(1)),
      closed('kai', 'the trip', 'off', at(2)),
      closed('kai', 'a walk outside', 'done', at(1), 'quest'),
      closed('iris', 'her thing', 'good', at(1)),
      closed('kai', 'old exam', 'good', at(10)),
    ];
    const diary = [page('2026-10-31', 'happy', 'kai'), page('2026-10-30', 'happy', 'kai'), page('2026-10-29', 'tired', 'kai'), page('2026-10-31', 'blue')];
    assert.deepEqual(weekWith('kai', chat, threads, diary, sunday), {
      days: 3,
      messages: 4,
      wins: ['the exam', 'the report'],
      winCount: 2,
      quests: 1,
      pages: 3,
      mood: 'happy',
    });
  });

  it('comes from the friend of the most days, needs two days, and comes once a week', () => {
    const chats = { kai: [mine(at(0)), mine(at(1))], iris: [mine(at(0)), mine(at(2)), mine(at(4))], hana: [mine(at(0))] };
    const state = { writers: ['kai', 'iris', 'hana'], chats, threads: [], diary: [] };
    assert.equal(weeklyRecap(state, sunday)?.characterId, 'iris');
    assert.equal(weeklyRecap({ ...state, writers: ['hana'] }, sunday), null);
    const sent = { ...chats, kai: [...chats.kai, { ...mine(at(0, 18)), author: 'them' as const, reach: WEEK_REACH }] };
    assert.equal(weeklyRecap({ ...state, chats: sent }, sunday), null);
  });

  it('is on Sunday evening only', () => {
    assert.equal(recapAt(new Date(2026, 10, 1))?.getHours(), 18);
    assert.equal(recapAt(new Date(2026, 10, 2)), null);
  });

  it('says what happened, in their temper, and never what did not', () => {
    const line = weekLine({ days: 5, messages: 40, wins: ['the exam', 'the report'], winCount: 2, quests: 1, pages: 2, mood: 'happy' }, 'warm', 's');
    assert.match(line, /We talked 5 days out of 7\./);
    assert.match(line, /Your wins: the exam and the report 🎉/);
    assert.match(line, /1 real-life quest too/);
    assert.match(line, /happy one/);
    const quiet = weekLine({ days: 2, messages: 3, wins: [], winCount: 0, quests: 0, pages: 0 }, 'shy', 's');
    assert.doesNotMatch(quiet, /wins|quest|diary/i);
  });
});
