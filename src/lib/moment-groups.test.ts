import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { BoardPost, DateRecord, DiaryEntry, Moment, MomentKind, ScheduleItem, SecretNote } from '../types';
import { buildTimeline, filtersWith, groupByDay, momentLines, type MomentRecords, momentTarget, planHappened, recentRows } from './moment-groups';

let n = 0;
/** A local time on 2026-11-dd. */
const on = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute).toISOString();
const moment = (kind: MomentKind, day: number, hour: number, extra: Partial<Moment> = {}): Moment => ({
  id: `m${++n}`,
  characterId: 'hana',
  kind,
  createdAt: on(day, hour),
  ...extra,
});
const plan = (date: string, time?: string, extra: Partial<ScheduleItem> = {}): ScheduleItem => ({
  id: `p${++n}`,
  characterId: 'hana',
  title: 'Cinema',
  date,
  ...(time ? { time } : {}),
  createdAt: on(1, 9),
  reminded: false,
  ...extra,
});
const note = (id: string, date: string, extra: Partial<SecretNote> = {}): SecretNote => ({
  id,
  characterId: 'hana',
  date,
  prompt: 'What do you miss most?',
  myNote: 'You',
  theirNote: 'Your voice notes',
  status: 'exchanged',
  ...extra,
});
const post = (id: string, createdAt: string): BoardPost => ({ id, characterId: 'hana', text: 'Good luck!', style: 'cloud', createdAt, replyAt: createdAt, replied: false });
const none: MomentRecords = { notes: [], boardPosts: [], dates: [], diary: [], calls: [], photos: [] };
const NOW = new Date(2026, 10, 9, 18, 0);
const build = (moments: Moment[], plans: ScheduleItem[] = [], records: Partial<MomentRecords> = {}, filter: Parameters<typeof buildTimeline>[0]['filter'] = 'all') =>
  buildTimeline({ moments, plans, records: { ...none, ...records }, filter, now: NOW });

describe('when a plan joins the moments', () => {
  it('once its day has gone by, or its hour today has come', () => {
    assert.equal(planHappened({ date: '2026-11-08' }, NOW), true);
    assert.equal(planHappened({ date: '2026-11-09', time: '18:00' }, NOW), true);
    assert.equal(planHappened({ date: '2026-11-09', time: '18:01' }, NOW), false);
    assert.equal(planHappened({ date: '2026-11-09' }, NOW), false, 'no hour: it is today all day long');
    assert.equal(planHappened({ date: '2026-11-10', time: '09:00' }, NOW), false);
  });
});

describe("Us' timeline", () => {
  it('shows a plan from its schedule on its own day, never the "planned" line from the day it was made', () => {
    const items = build([moment('plan', 2, 10, { params: { title: 'Cinema' } })], [plan('2026-11-08', '20:00'), plan('2026-11-12', '20:00')]);
    assert.equal(items.length, 1);
    assert.equal(items[0].kind, 'plan');
    assert.equal(items[0].at, on(8, 20));
  });

  it('a removed plan is gone with its schedule', () => {
    assert.deepEqual(build([moment('plan', 2, 10, { params: { title: 'Cinema' }, refId: 'gone' })]), []);
  });

  it('is newest first across moments and plans', () => {
    const items = build([moment('call', 7, 22), moment('quiz', 9, 13)], [plan('2026-11-08', '20:00')]);
    assert.deepEqual(
      items.map((i) => i.kind),
      ['quiz', 'plan', 'call'],
    );
  });

  it('ties a row to its record by refId', () => {
    const items = build([moment('secretNote', 9, 18, { refId: 'n2' }), moment('board', 9, 17, { refId: 'b1' })], [], {
      notes: [note('n1', '2026-11-09'), note('n2', '2026-11-09', { prompt: 'Second' })],
      boardPosts: [post('b1', on(1, 9))],
    });
    assert.equal(items.find((i) => i.kind === 'secretNote')?.note?.prompt, 'Second');
    assert.equal(items.find((i) => i.kind === 'board')?.post?.id, 'b1');
  });

  it("finds an older moment's record: notes of its day one each, the rest made in the same minute", () => {
    const dates: DateRecord[] = [{ id: 'd1', characterId: 'hana', placeId: 'x', title: 'Studio', hearts: 9, maxHearts: 12, ending: 'sweet', createdAt: on(8, 21) }];
    const diary: DiaryEntry[] = [
      { id: 'e1', date: '2026-11-08', title: 'Quiet Sunday', body: '', mood: 'calm' as DiaryEntry['mood'], images: [], accentIndex: 0, reply: { characterId: 'hana', text: 'Hi', createdAt: on(8, 16) } },
    ];
    const items = build(
      [moment('secretNote', 9, 0), moment('secretNote', 9, 18), moment('board', 9, 12), moment('dating', 8, 21), moment('diary', 8, 16)],
      [],
      { notes: [note('n1', '2026-11-09'), note('n2', '2026-11-09'), note('n3', '2026-11-08')], boardPosts: [post('b1', on(9, 12)), post('b2', on(9, 15))], dates, diary },
    );
    const notes = items.filter((i) => i.kind === 'secretNote').map((i) => i.note?.id);
    assert.deepEqual([...notes].sort(), ['n1', 'n2'], 'two moments of a day get two notes of that day');
    assert.equal(items.find((i) => i.kind === 'board')?.post?.id, 'b1');
    assert.equal(items.find((i) => i.kind === 'dating')?.date?.id, 'd1');
    assert.equal(items.find((i) => i.kind === 'diary')?.entry?.id, 'e1');
  });

  it('finds a note begun on an earlier day and swapped later', () => {
    const items = build([moment('secretNote', 9, 0), moment('secretNote', 9, 18)], [], { notes: [note('n1', '2026-11-09'), note('n2', '2026-11-07'), note('n3', '2026-11-10')] });
    assert.deepEqual(
      items.map((i) => i.note?.id),
      ['n2', 'n1'],
      'the 00:00 one takes the note of its day, the 18:00 one the older note; never a note begun after it',
    );
  });

  it('drops the row of a deleted board note, diary page or photo, and keeps a far match out', () => {
    const photo = { id: 'ph1', characterId: 'hana', style: 'polaroid' as const, createdAt: on(9, 13), seed: 1 };
    const items = build(
      [moment('board', 9, 12), moment('diary', 9, 11), moment('photo', 9, 10, { photoId: 'gone' }), moment('photo', 9, 13, { photoId: 'ph1' }), moment('call', 9, 9)],
      [],
      { boardPosts: [post('b1', on(9, 15))], photos: [photo] },
    );
    assert.deepEqual(
      items.map((i) => i.kind),
      ['photo', 'call'],
    );
    assert.equal(items[0].photo?.id, 'ph1');
  });

  it('keeps an older note or date it cannot find, with its own words missing', () => {
    const items = build([moment('secretNote', 9, 12), moment('dating', 9, 11, { params: { title: 'Studio' } })]);
    assert.equal(items.length, 2);
  });

  it("never reads another friend's record", () => {
    const items = build([moment('secretNote', 9, 12)], [], { notes: [note('n1', '2026-11-09', { characterId: 'kai' })] });
    assert.equal(items[0].note, undefined);
  });

  it('filters: together, words, milestones; an empty one is not offered', () => {
    const moments = [moment('secretNote', 9, 1), moment('dating', 9, 2), moment('levelUp', 9, 3, { params: { level: 11 } })];
    assert.deepEqual(
      build(moments, [], {}, 'words').map((i) => i.kind),
      ['secretNote'],
    );
    assert.deepEqual(
      build(moments, [], {}, 'milestones').map((i) => i.kind),
      ['levelUp'],
    );
    assert.deepEqual(filtersWith(build(moments)), ['together', 'words', 'milestones']);
    assert.deepEqual(filtersWith(build([moment('call', 9, 1)])), ['together']);
  });
});

describe('the days', () => {
  it('puts each day under its own header, big moments apart from the rest, order kept', () => {
    const days = groupByDay(build([moment('secretNote', 9, 18), moment('quiz', 9, 13), moment('levelUp', 7, 21), moment('call', 7, 22)]));
    assert.deepEqual(
      days.map((d) => [d.day, d.milestones.map((i) => i.kind), d.items.map((i) => i.kind)]),
      [
        ['2026-11-09', [], ['secretNote', 'quiz']],
        ['2026-11-07', ['levelUp'], ['call']],
      ],
    );
  });

  it('gives nothing for nothing', () => {
    assert.deepEqual(groupByDay([]), []);
  });

  it('flattens into lines with each row placed in its card', () => {
    const lines = momentLines(groupByDay(build([moment('secretNote', 9, 18), moment('quiz', 9, 13), moment('levelUp', 7, 21), moment('call', 7, 22)])));
    assert.deepEqual(
      lines.map((l) => (l.type === 'row' ? `row:${l.item.kind}:${l.first ? 'F' : ''}${l.last ? 'L' : ''}` : l.type === 'day' ? `day:${l.day}` : `big:${l.item.kind}`)),
      ['day:2026-11-09', 'row:secretNote:F', 'row:quiz:L', 'day:2026-11-07', 'big:levelUp', 'row:call:FL'],
    );
  });
});

describe('what Us shows', () => {
  const many = (days: number[]) => build(days.map((day, i) => moment('quiz', day, 23 - (i % 20))));

  it('the last week, at most ten rows', () => {
    assert.equal(recentRows(many([9, 9, 8, 3, 3, 2]), NOW).length, 5, 'the 3rd of November is in the week (9th back to 3rd), the 2nd is not');
    assert.equal(recentRows(many(Array.from({ length: 30 }, () => 9)), NOW).length, 10);
  });

  it('a quiet week still shows the newest three, and a short story all of it', () => {
    assert.equal(recentRows(many([1, 1, 1, 1]), NOW).length, 3);
    assert.equal(recentRows(many([1]), NOW).length, 1);
    assert.deepEqual(recentRows([], NOW), []);
  });
});

describe('where a row leads', () => {
  const to = (kind: MomentKind, extra: Partial<Moment> = {}) => momentTarget({ kind, moment: moment(kind, 7, 9, extra) });

  it('opens the place it happened', () => {
    assert.equal(to('secretNote'), '/secret-note/hana');
    assert.equal(to('board'), '/board');
    assert.equal(to('diary'), '/diary/mine');
    assert.equal(to('call'), '/call-history');
    assert.equal(to('dating'), '/date/album');
    assert.equal(to('quiz'), '/quiz/hana');
    assert.equal(to('photo', { photoId: 'p 1' }), '/photo/p%201');
  });

  it("tells the bond's story on the profile", () => {
    for (const kind of ['met', 'levelUp', 'arc'] as const) assert.equal(to(kind), '/character/hana');
  });

  it('leaves a plan to the screen, and a photo without a picture where it is', () => {
    assert.equal(momentTarget({ kind: 'plan' }), undefined);
    assert.equal(to('photo'), undefined);
  });
});
