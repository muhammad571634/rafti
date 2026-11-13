import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Character, Thread, User } from '@/types';

import { cleanFirstText, firstTextParts, type FirstTextRequest } from './first-text';
import { joinParts } from './prompt-layout';
import { parseTouchReply, TOUCH_SHAPE } from './thread-prompt';

const kai = { id: 'c_kai', name: 'Kai Arden', handle: '@k', bio: 'Swim-team ace.', category: 'school', accentIndex: 0, voiceReady: false, isOfficial: true, greeting: 'Hey.', tags: ['cheerful'] } as Character;
const sam = { id: 'u1', displayName: 'Sam', locale: 'en-US' } as User;
const now = '2026-10-28T07:30:00.000Z';
const line = (author: 'me' | 'them', text: string) => ({ id: text, conversationId: 'c', author, kind: 'text', text, createdAt: now });
const exam = { id: 't1', characterId: 'c_kai', kind: 'follow', about: 'chemistry exam', quote: 'exam at 10', happensAt: '2026-10-28T10:00:00.000Z', status: 'open', touches: [], createdAt: now } as unknown as Thread;

const requests: FirstTextRequest[] = [
  { kind: 'thread', input: { character: kai, user: sam, thread: exam, touch: { id: 'x', at: now, phase: 'before', why: 'luck before the exam' }, recent: [line('me', 'exam at 10')], now } },
  { kind: 'brief', input: { character: kai, user: sam, brief: { characterId: 'c_kai', items: [{ title: 'Chemistry exam', time: '10:00' }], covers: [] }, recent: [], now } },
  { kind: 'day', input: { character: kai, user: sam, today: [line('me', 'the exam went fine')], threads: [exam], now } },
  { kind: 'week', input: { character: kai, user: sam, week: { days: 5, messages: 40, wins: ['chemistry exam'], winCount: 1, quests: 0, pages: 0 }, now } },
] as FirstTextRequest[];

describe('first texts (B1.4a): one request shape for the four kinds', () => {
  it('lays out each kind with the persona, what it is about and the touch shape', () => {
    const expected = { thread: 'chemistry exam', brief: 'Chemistry exam at 10:00', day: 'how their day was', week: 'Sunday evening' };
    for (const request of requests) {
      const text = joinParts(firstTextParts(request));
      assert.match(text, /Kai Arden/, request.kind);
      assert.ok(text.includes(expected[request.kind]), request.kind);
      assert.ok(text.includes(TOUCH_SHAPE), request.kind);
    }
  });

  it('survives the trip through JSON: the time comes back as a date', () => {
    for (const request of requests) {
      const clean = cleanFirstText(JSON.parse(JSON.stringify(request)));
      assert.ok(clean, request.kind);
      assert.doesNotThrow(() => firstTextParts(clean!));
    }
    assert.match(joinParts(firstTextParts(requests[0])), /2026-10-28 07:30/);
  });

  it('refuses what the prompt code cannot lay out', () => {
    assert.equal(cleanFirstText(null), null);
    assert.equal(cleanFirstText({ kind: 'poem', input: requests[0].input }), null);
    assert.equal(cleanFirstText({ kind: 'thread', input: { ...requests[0].input, now: 'soon' } }), null);
    assert.equal(cleanFirstText({ kind: 'thread', input: { ...requests[0].input, thread: undefined } }), null);
    assert.equal(cleanFirstText({ kind: 'brief', input: { ...requests[1].input, brief: { items: [] } } }), null);
    assert.equal(cleanFirstText({ kind: 'week', input: { ...requests[3].input, week: { days: 'many' } } }), null);
    assert.equal(cleanFirstText({ kind: 'day', input: { ...requests[2].input, character: { name: '' } } }), null);
  });

  it('tells the time on the user\'s clock, and drops an impossible offset', () => {
    const tashkent = { ...requests[1], input: { ...requests[1].input, utcOffsetMin: 300 } } as FirstTextRequest;
    const text = joinParts(firstTextParts(tashkent));
    assert.match(text, /It is 2026-10-28 12:30 where they are/);
    assert.match(text, /none of it has happened yet/);
    const thread = joinParts(firstTextParts({ ...requests[0], input: { ...requests[0].input, utcOffsetMin: 300 } } as FirstTextRequest));
    assert.match(thread, /chemistry exam \(2026-10-28 15:00\)/);
    const odd = cleanFirstText(JSON.parse(JSON.stringify({ ...tashkent, input: { ...tashkent.input, utcOffsetMin: 5000 } })));
    assert.equal((odd?.input as { utcOffsetMin?: number }).utcOffsetMin, undefined);
  });

  it('keeps only the last lines of a long chat', () => {
    const long = Array.from({ length: 100 }, (_, i) => line('me', `line ${i}`));
    const clean = cleanFirstText({ kind: 'day', input: { ...requests[2].input, today: long } });
    assert.equal((clean?.input as { today: unknown[] }).today.length, 40);
  });
});

describe('first texts read the friend\'s own day (0z145)', () => {
  const ownDay = { today: [{ at: '2026-10-28T06:00:00.000Z', text: 'early swim practice' }] };
  it('every kind carries the notes and the rule', () => {
    for (const request of requests) {
      const text = joinParts(firstTextParts({ ...request, input: { ...request.input, ownDay } } as FirstTextRequest));
      assert.ok(text.includes('- 06:00 early swim practice'), request.kind);
      assert.ok(text.includes('YOUR OWN DAY:'), request.kind);
    }
  });
  it('the server keeps a good ownDay and drops a broken one', () => {
    const good = cleanFirstText(JSON.parse(JSON.stringify({ ...requests[0], input: { ...requests[0].input, ownDay } })));
    assert.deepEqual(good?.input.ownDay, ownDay);
    const bad = cleanFirstText(JSON.parse(JSON.stringify({ ...requests[0], input: { ...requests[0].input, ownDay: { today: 'x' } } })));
    assert.equal(bad?.input.ownDay, undefined);
  });
  it('the answer brings the day field, never on a skip', () => {
    assert.deepEqual(parseTouchReply('{"messages":["morning! just out of the pool"],"day":["swam at 7"]}').day, ['swam at 7']);
    assert.equal(parseTouchReply('{"skip":true,"messages":[],"day":["swam"]}').day, undefined);
    // The language the model named, for the server log (0z186).
    assert.equal(parseTouchReply('{"language":"Uzbek","messages":["omad!"]}').language, 'Uzbek');
    assert.equal(parseTouchReply('{"messages":["good luck!"]}').language, undefined);
  });
});
