import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ideaAnswer } from '../mock/reply-ideas';
import { mockBreakLine, mockMove, mockNightLine, mockOutcome, mockQuest, mockThread, QUEST_REWARD } from '../mock/threads';
import { LIFE, lateNight, sittingMinutes } from './life';
import { ideasFor } from './reply-ideas';
import { TEMPERS } from './temper';
import { beforeThing, moveThread, nextPlan, ruleTouches } from './threads';
import type { Message, Thread } from '@/types';

// A Monday, 10:00 local time.
const now = new Date(2026, 9, 26, 10, 0);
const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, 26 + day, hour, minute).toISOString();
const msg = (id: string, minute: number, author: 'me' | 'them' = 'me'): Message => ({
  id,
  conversationId: 'c',
  author,
  kind: 'text',
  text: id,
  createdAt: new Date(now.getTime() + minute * 60_000).toISOString(),
});

describe('real life first', () => {
  it('knows the night by the evening it began, and the day as no night', () => {
    assert.equal(lateNight(new Date(2026, 9, 27, 1, 15)), '2026-10-26');
    assert.equal(lateNight(new Date(2026, 9, 27, 0, 10)), null);
    assert.equal(lateNight(new Date(2026, 9, 27, 6, 0)), null);
  });

  it('measures the sitting back to the last long gap, and none after one', () => {
    const messages = [msg('a', 0), msg('b', 50), msg('c', 60), msg('d', 85)];
    assert.equal(sittingMinutes(messages, now.getTime() + 86 * 60_000), 36);
    assert.equal(sittingMinutes(messages, now.getTime() + 200 * 60_000), 0);
  });

  it('lets a goal go on for days and asks how it is going', () => {
    const goal = mockThread('I want to use TikTok less', now, null)!;
    assert.equal(goal.kind, 'goal');
    assert.deepEqual(
      goal.touches.map((t) => t.phase),
      ['goal', 'goal', 'goal'],
    );
    assert.equal(mockThread('Telefonni kamaytirmoqchiman', now, null)?.kind, 'goal');
    assert.equal(mockThread('Хочу меньше сидеть в тиктоке', now, null)?.kind, 'goal');
  });

  it('hears a plan move, and "postponed to 10" is a move, not "it\'s off"', () => {
    assert.deepEqual(mockMove('The exam moved to 10'), { hour: 10, minute: 0 });
    assert.deepEqual(mockMove('pushed to 3pm'), { hour: 15, minute: 0 });
    assert.deepEqual(mockMove("Imtihon soat 11 ga ko'chdi"), { hour: 11, minute: 0 });
    assert.deepEqual(mockMove('перенесли на 12:30'), { hour: 12, minute: 30 });
    assert.equal(mockMove('I am 20 now'), null);
    assert.equal(mockOutcome('postponed to 10'), null);
  });

  it('moves a plan’s texts with it and drops what fell in the past', () => {
    const thread: Thread = {
      id: 'th1',
      characterId: 'c_kai',
      kind: 'plan',
      about: 'Exam',
      quote: 'exam at 13',
      createdAt: now.toISOString(),
      happensAt: at(0, 13),
      touches: ruleTouches(
        [
          { at: at(0, 12, 15), phase: 'leave', why: 'time to go' },
          { at: at(0, 15, 30), phase: 'after', why: 'how did it go' },
        ],
        'th1',
        now,
        at(0, 13),
      ),
      status: 'open',
    };
    const [moved] = moveThread([thread], 'th1', at(0, 10, 30), now);
    assert.equal(moved.happensAt, at(0, 10, 30));
    // The leave text would be 9:45, already past: dropped. The after text moves to 13:00.
    assert.deepEqual(
      moved.touches.map((t) => [t.phase, t.at]),
      [['after', at(0, 13)]],
    );
    assert.equal(nextPlan([thread], 'c_kai', now)?.id, 'th1');
  });

  it('keeps sleep-early, luck and time-to-go before the thing', () => {
    assert.ok(beforeThing('eve') && beforeThing('leave') && beforeThing('before'));
    assert.ok(!beforeThing('after') && !beforeThing('goal') && !beforeThing('quest'));
  });

  it('gives a small quest with an offer, and pays for it', () => {
    const { quest, offer } = mockQuest('th42');
    assert.ok(offer.includes(quest));
    assert.ok(QUEST_REWARD > 0);
    assert.deepEqual(
      ideasFor('quest:th42').map((i) => i.intent),
      ['yes', 'no'],
    );
    assert.match(ideaAnswer('quest:th42', 'yes', 's'), /\w/);
  });

  it('asks when to remind of a plan, a break and sleep, each with answers that fit', () => {
    assert.deepEqual(
      ideasFor('lead:sch1').map((i) => i.intent),
      ['lead30', 'lead60', 'off'],
    );
    assert.equal(ideasFor('pause:night').length, 2);
    assert.match(ideaAnswer('pause:night', 'rough', 's'), /stay|here/i);
    assert.match(ideaAnswer('thread:goal:th1', 'rough', 's'), /okay|happens/i);
    for (const temper of TEMPERS) {
      assert.ok(mockBreakLine(temper, 's') && mockNightLine(temper, 's'));
    }
  });

  it('sets its numbers sensibly', () => {
    assert.ok(LIFE.questFromHour < LIFE.questToHour);
    assert.ok(LIFE.wakeEarliestHour >= 4);
  });
});
