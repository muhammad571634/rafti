import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { addDayNotes, cleanDayNotes, cleanOwnDay, ownDayLines, ownDayOf, DAY_NOTES_MAX } from './own-day';
import { layoutChatPrompt } from './chat-prompt';
import { parseModelReply } from './reply-style';
import type { Character, User } from '@/types';

const at = (iso: string) => new Date(iso);

describe('cleanDayNotes', () => {
  it('keeps a few short, distinct strings', () => {
    assert.deepEqual(cleanDayNotes(['  overslept,   burned the toast ', 'Overslept, burned the toast', 3, '', 'gym at 18:00', 'a', 'b']), [
      'overslept, burned the toast',
      'gym at 18:00',
      'a',
    ]);
  });
  it('drops anything that is not a list', () => {
    assert.deepEqual(cleanDayNotes('went out'), []);
    assert.deepEqual(cleanDayNotes(undefined), []);
  });
  it('cuts a long note', () => {
    assert.equal(cleanDayNotes(['x'.repeat(200)])[0].length, 80);
  });
});

describe('addDayNotes', () => {
  it('adds today’s notes once, with their time', () => {
    let logs = addDayNotes(undefined, ['overslept'], at('2026-11-08T04:00:00Z'), '2026-11-08');
    logs = addDayNotes(logs, ['OVERSLEPT', 'made ramen'], at('2026-11-08T07:00:00Z'), '2026-11-08');
    assert.deepEqual(logs, [
      {
        date: '2026-11-08',
        notes: [
          { at: '2026-11-08T04:00:00.000Z', text: 'overslept' },
          { at: '2026-11-08T07:00:00.000Z', text: 'made ramen' },
        ],
      },
    ]);
  });
  it('keeps only today and the last day before it', () => {
    let logs = addDayNotes(undefined, ['mon'], at('2026-11-02T10:00:00Z'), '2026-11-02');
    logs = addDayNotes(logs, ['wed'], at('2026-11-04T10:00:00Z'), '2026-11-04');
    logs = addDayNotes(logs, ['fri'], at('2026-11-06T10:00:00Z'), '2026-11-06');
    assert.deepEqual(logs.map((l) => l.date), ['2026-11-04', '2026-11-06']);
  });
  it('keeps the newest notes of a long day', () => {
    let logs = addDayNotes(undefined, [], at('2026-11-08T04:00:00Z'), '2026-11-08');
    for (let i = 0; i < DAY_NOTES_MAX + 3; i += 1) logs = addDayNotes(logs, [`thing ${i}`], at('2026-11-08T04:00:00Z'), '2026-11-08');
    assert.equal(logs[0].notes.length, DAY_NOTES_MAX);
    assert.equal(logs[0].notes[DAY_NOTES_MAX - 1].text, `thing ${DAY_NOTES_MAX + 2}`);
  });
  it('does not add a note whose words are all in one already there', () => {
    let logs = addDayNotes(undefined, ['overslept, missed the bus'], at('2026-11-08T04:00:00Z'), '2026-11-08');
    logs = addDayNotes(logs, ['missed bus', 'missed the train'], at('2026-11-08T05:00:00Z'), '2026-11-08');
    assert.deepEqual(logs[0].notes.map((n) => n.text), ['overslept, missed the bus', 'missed the train']);
  });
  it('makes no empty day', () => {
    assert.deepEqual(addDayNotes(undefined, [], at('2026-11-08T04:00:00Z'), '2026-11-08'), []);
  });
});

describe('ownDayOf and cleanOwnDay', () => {
  const logs = [
    { date: '2026-11-07', notes: [{ at: '2026-11-07T15:00:00.000Z', text: 'band practice ran late' }] },
    { date: '2026-11-08', notes: [{ at: '2026-11-08T04:00:00.000Z', text: 'overslept' }] },
  ];
  it('sends today and the last day', () => {
    assert.deepEqual(ownDayOf(logs, '2026-11-08'), {
      today: [{ at: '2026-11-08T04:00:00.000Z', text: 'overslept' }],
      before: { date: '2026-11-07', notes: ['band practice ran late'] },
    });
  });
  it('on a new day, yesterday’s today is the last day', () => {
    assert.deepEqual(ownDayOf(logs, '2026-11-09'), { today: [], before: { date: '2026-11-08', notes: ['overslept'] } });
  });
  it('sends nothing when there is nothing', () => {
    assert.equal(ownDayOf(undefined, '2026-11-08'), undefined);
  });
  it('the server keeps what is well formed', () => {
    assert.deepEqual(cleanOwnDay({ today: [{ at: 'nope', text: 'x' }, { at: '2026-11-08T04:00:00Z', text: ' ran ' }], before: { date: 'bad', notes: ['y'] } }), {
      today: [{ at: '2026-11-08T04:00:00.000Z', text: 'ran' }],
    });
    assert.equal(cleanOwnDay('x'), undefined);
    assert.equal(cleanOwnDay({ today: [], before: { date: '2026-11-07', notes: [] } }), undefined);
  });
});

describe('ownDayLines', () => {
  const clock = { now: '2026-11-08T13:00:00.000Z', utcOffsetMin: 300 };
  it('names the hour on their clock and yesterday', () => {
    assert.deepEqual(ownDayLines({ today: [{ at: '2026-11-08T04:10:00.000Z', text: 'overslept' }], before: { date: '2026-11-07', notes: ['band practice', 'pizza'] } }, clock), [
      'YOUR DAY SO FAR (you said these; they happened):',
      '- 09:10 overslept',
      'YOUR LAST DAY (yesterday): band practice; pizza.',
      'Anything new of your own day in this reply goes into "day".',
    ]);
  });
  it('names an older day by its weekday', () => {
    assert.deepEqual(ownDayLines({ today: [], before: { date: '2026-11-05', notes: ['exam'] } }, clock), ['YOUR LAST DAY (Thursday 2026-11-05): exam.', 'Anything new of your own day in this reply goes into "day".']);
  });
});

describe('the reply prompt and the reply', () => {
  const character = { id: 'c1', name: 'Hana', persona: 'A painter.', greeting: 'Hi', tags: [], category: 'daily' } as unknown as Character;
  const user = { id: 'u1', displayName: 'Sam', locale: 'en-US' } as User;
  it('carries the rule in the cached tier and the notes in the turn', () => {
    const layout = layoutChatPrompt({
      character,
      user,
      messages: [{ id: 'm1', conversationId: 'k', author: 'me', kind: 'text', text: 'what are you up to?', createdAt: '2026-11-08T13:00:00.000Z' }],
      clock: { now: '2026-11-08T13:00:00.000Z', utcOffsetMin: 300 },
      ownDay: { today: [{ at: '2026-11-08T04:10:00.000Z', text: 'overslept' }] },
    });
    const text = JSON.stringify(layout);
    assert.ok(text.includes('YOUR OWN DAY:'));
    assert.ok(text.includes('- 09:10 overslept'));
  });
  it('reads the model’s day field', () => {
    assert.deepEqual(parseModelReply('{"messages":["just got back from the market"],"day":["went to the market"]}').day, ['went to the market']);
    assert.equal(parseModelReply('{"messages":["hey"]}').day, undefined);
  });
});

describe('a group member reads their own day and the hour (0z145)', () => {
  it('the group prompt has the clock and the notes', async () => {
    const { layoutGroupReply } = await import('./group-reply');
    const hana = { id: 'c1', name: 'Hana', tags: [] } as unknown as Character;
    const kai = { id: 'c2', name: 'Kai', tags: [] } as unknown as Character;
    const layout = layoutGroupReply({
      character: hana,
      others: [kai],
      user: { id: 'u', displayName: 'Sam', locale: 'en-US' } as User,
      messages: [{ id: 'm', conversationId: 'g', author: 'me', kind: 'text', text: 'what are you two up to?', createdAt: '2026-11-08T13:00:00.000Z' }],
      clock: { now: '2026-11-08T13:00:00.000Z', utcOffsetMin: 300 },
      ownDay: { today: [{ at: '2026-11-08T04:10:00.000Z', text: 'overslept' }] },
    });
    const text = JSON.stringify(layout);
    assert.ok(text.includes('18:00'));
    assert.ok(text.includes('- 09:10 overslept'));
  });
});
