import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseThreadOps, parseTouchReply, threadLines, touchParts, THREAD_RULES_LINES } from '../ai/thread-prompt';
import { joinParts } from '../ai/prompt-layout';
import { characters } from '../mock/characters';
import { mockOutcome, mockThread, mockTouchLine } from '../mock/threads';
import { addThread, closeThread, dueTouches, extendThread, lastAsked, markTouches, pruneThreads, ruleTouches, THREAD_RULES } from './threads';
import type { Thread, User } from '@/types';

// A Monday, 10:00 local time.
const now = new Date(2026, 9, 26, 10, 0);
const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, 26 + day, hour, minute).toISOString();

const thread = (over: Partial<Thread> = {}): Thread => ({
  id: 'th1',
  characterId: 'c_kai',
  about: 'Exam',
  quote: 'I have an exam tomorrow at 9',
  createdAt: now.toISOString(),
  happensAt: at(1, 9),
  touches: [],
  status: 'open',
  ...over,
});

describe('threads: the rules a model must keep', () => {
  it('keep texts in the future, before ones before the thing and the rest after it', () => {
    const touches = ruleTouches(
      [
        { at: at(0, 9), phase: 'after', why: 'in the past' },
        { at: at(1, 8, 15), phase: 'before', why: 'wish luck' },
        { at: at(1, 10), phase: 'before', why: 'too late for before' },
        { at: at(1, 8), phase: 'after', why: 'too early for after' },
        { at: at(1, 11, 30), phase: 'after', why: 'ask how it went' },
      ],
      'th1',
      now,
      at(1, 9),
    );
    assert.deepEqual(
      touches.map((t) => t.why),
      ['wish luck', 'ask how it went'],
    );
    assert.deepEqual(
      touches.map((t) => t.id),
      ['th1:0', 'th1:1'],
    );
  });

  it('move a night "how did it go?" to the morning and drop a night "good luck"', () => {
    const touches = ruleTouches(
      [
        { at: at(0, 23, 30), phase: 'after', why: 'late question' },
        { at: at(1, 3), phase: 'before', why: 'would wake them' },
      ],
      'th1',
      now,
    );
    assert.equal(touches.length, 1);
    assert.equal(touches[0].at, at(1, 8, 30));
  });

  it('space texts out and keep a few', () => {
    const drafts = Array.from({ length: 8 }, (_, i) => ({ at: at(0, 12, i * 10), phase: 'check' as const, why: `t${i}` }));
    const touches = ruleTouches(drafts, 'th1', now);
    assert.ok(touches.length <= THREAD_RULES.maxTouches);
    for (let i = 1; i < touches.length; i++) assert.ok(Date.parse(touches[i].at) - Date.parse(touches[i - 1].at) >= THREAD_RULES.minGapMs);
  });

  it('replace the same thing and keep a few open per friend', () => {
    let threads = addThread([], thread({ id: 'a', about: 'Exam' }));
    threads = addThread(threads, thread({ id: 'b', about: 'exam!' }));
    assert.deepEqual(
      threads.map((t) => t.id),
      ['b'],
    );
    for (let i = 0; i < 7; i++) threads = addThread(threads, thread({ id: `x${i}`, about: `thing ${i}`, createdAt: at(0, 11 + i) }));
    assert.equal(threads.filter((t) => t.characterId === 'c_kai' && t.status === 'open').length, THREAD_RULES.maxOpen);
  });

  it('send what is due, drop what passed long ago or was settled', () => {
    const t = thread({ touches: [{ id: 'th1:0', at: at(0, 9), why: 'check', phase: 'check' }, { id: 'th1:1', at: at(0, 5), why: 'old', phase: 'check' }] });
    assert.deepEqual(
      dueTouches([t], now).map((x) => x.step),
      ['send', 'skip'],
    );
    assert.deepEqual(
      dueTouches([closeThread([t], 'th1', 'off', now)[0]], now).map((x) => x.step),
      ['skip', 'skip'],
    );
    const marked = markTouches([t], new Set(['th1:0']));
    assert.equal(dueTouches(marked, now).length, 1);
  });

  it('know which thread the user is answering, ask again on "not yet", fade old ones', () => {
    const asked = thread({ touches: [{ id: 'th1:0', at: at(0, 9), why: 'check', phase: 'check', sent: true }] });
    assert.equal(lastAsked([asked], 'c_kai', now)?.id, 'th1');
    assert.equal(lastAsked([asked], 'c_kai', new Date(Date.parse(at(2, 10)))), null);
    const extended = extendThread([asked], 'th1', [{ at: at(1, 19), phase: 'check', why: 'ask again' }], now);
    assert.equal(extended[0].touches.length, 2);
    assert.equal(pruneThreads([asked], new Date(Date.parse(at(20, 10)))).length, 0);
    assert.equal(pruneThreads([asked], now).length, 1);
  });
});

describe('threads: the stand-in until the server', () => {
  it('follows a timed plan: luck and leaving before a big thing, "how did it go" after', () => {
    // What `detectPlan` returns for "I have an exam tomorrow at 9am" (it reads the clock through @/mock, so it stays out of tests).
    const found = mockThread('I have an exam tomorrow at 9am', now, { title: 'Exam', date: '2026-10-27', time: '09:00', when: 'tomorrow' })!;
    assert.deepEqual(
      found.touches.map((t) => t.phase),
      ['before', 'after'],
    );
    assert.equal(found.happensAt, at(1, 9));
  });

  it('reads Uzbek and Russian days and times, and keeps the user’s words', () => {
    const uz = mockThread('Ertaga soat 9 da imtihonim bor', now, null)!;
    assert.equal(uz.happensAt, at(1, 9));
    assert.equal(uz.quote, 'Ertaga soat 9 da imtihonim bor');
    assert.ok(mockThread('Завтра в 11 собеседование', now, null)?.happensAt);
    // A day without a future opens nothing.
    assert.equal(mockThread('Bugun charchadim', now, null), null);
  });

  it('opens a check for a task, a wish or results; never for a question', () => {
    assert.equal(mockThread('I have to finish the report', now, null)?.touches[0].phase, 'check');
    assert.equal(mockThread('Hisobotni tugatishim kerak', now, null)?.touches[0].phase, 'check');
    assert.ok(mockThread('I want to start running', now, null));
    assert.ok(mockThread('The results come next week', now, null));
    assert.equal(mockThread('Do you have to finish anything?', now, null), null);
  });

  it('hears how it went in three languages; "it\'s off" wins', () => {
    assert.equal(mockOutcome('It went well!'), 'good');
    assert.equal(mockOutcome("It's off actually"), 'off');
    assert.equal(mockOutcome('Yomon o‘tdi'.replace('‘', "'")), 'bad');
    assert.equal(mockOutcome('Tugatdim!'), 'done');
    assert.equal(mockOutcome('Сдал!'), 'good');
    assert.equal(mockOutcome('Nice weather'), null);
  });

  it('quotes the user instead of knowing the topic', () => {
    const t = thread({ quote: 'I have to finish the report' });
    const line = mockTouchLine(t, { id: 'th1:0', at: at(0, 14), why: 'check', phase: 'check' }, 'teasing', 'th1:0');
    assert.ok(line.startsWith('Oi! '));
  });
});

describe('threads: the model’s contract', () => {
  it('tells the model any topic can be a thread, and how to answer', () => {
    const rules = THREAD_RULES_LINES.join('\n');
    assert.match(rules, /Anything can be a thread, on any topic/);
    assert.match(rules, /"threads"/);
  });

  it('reads the model’s threads and drops what is malformed', () => {
    const ops = parseThreadOps(
      JSON.stringify({
        messages: ['ok'],
        threads: {
          add: [
            { about: 'Driving test', quote: 'my driving test is Friday', happensAt: at(4, 10), touches: [{ at: at(4, 9), phase: 'before', why: 'calm them down' }, { at: 'soon', phase: 'after', why: 'x' }] },
            { quote: 'no about' },
          ],
          close: [{ id: 'th1', outcome: 'good' }, { id: 'th2', outcome: 'maybe' }],
        },
      }),
    );
    assert.equal(ops.add.length, 1);
    assert.equal(ops.add[0].touches.length, 1);
    assert.deepEqual(ops.close, [{ id: 'th1', outcome: 'good' }]);
    assert.deepEqual(parseThreadOps('not json'), { add: [], move: [], close: [] });
  });

  it('lists the open threads with the next planned text', () => {
    const t = thread({ touches: [{ id: 'th1:0', at: at(1, 8, 15), why: 'wish luck', phase: 'before' }] });
    const lines = threadLines([t, thread({ id: 'th2', status: 'closed' })]).join('\n');
    assert.match(lines, /\[th1\] Exam/);
    assert.match(lines, /wish luck/);
    assert.doesNotMatch(lines, /th2/);
  });

  it('writes a text-first prompt from the thread and why, with no wording of ours', () => {
    const character = characters.find((c) => c.id === 'c_hana')!;
    const user = { displayName: 'Sam', locale: 'en' } as User;
    const t = thread();
    const touch = { id: 'th1:0', at: at(1, 8, 15), why: 'wish luck and check they are leaving', phase: 'before' as const };
    const prompt = joinParts(touchParts({ character, user, thread: t, touch, recent: [], now }));
    assert.match(prompt, /texting first, unprompted/);
    assert.match(prompt, /wish luck and check they are leaving/);
    assert.match(prompt, /I have an exam tomorrow at 9/);
    assert.match(prompt, /temper \(sulky\)/);
  });

  it('reads the text-first answer; a broken one is a skip', () => {
    const reply = parseTouchReply('{"skip":false,"messages":["Good luck!! 💪","You studied so hard."],"ideas":[{"label":"Thanks!","text":"Thank you!"}]}');
    assert.deepEqual(reply.lines, ['Good luck!! 💪', 'You studied so hard.']);
    assert.equal(reply.ideas.length, 1);
    assert.equal(parseTouchReply('{"skip":true,"messages":[]}').skip, true);
    assert.equal(parseTouchReply('oops').skip, true);
  });
});
