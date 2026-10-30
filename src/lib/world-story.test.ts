import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CharacterArc, WorldChapter, WorldEvent, WorldStory } from '@/types';

import {
  ARC_LEVELS,
  arcStage,
  beatsCrossed,
  chapterAt,
  dueWorldNews,
  isEventOn,
  tiesOf,
  worldDay,
  worldJoinedAt,
  worldPromptOf,
} from './world-story';

const arc: CharacterArc = {
  secret: 'He kept the letter.',
  beats: [
    { atLevel: 2, title: 'A', beat: 'first' },
    { atLevel: 4, title: 'B', beat: 'second' },
    { atLevel: 6, title: 'C', beat: 'third' },
  ],
};

const chapter = (id: string, opensOnDay: number): WorldChapter => ({ id, title: id, beat: `${id} beat`, opensOnDay });
const round = { line: 'x', choices: [] };
const event = (over: Partial<WorldEvent>): WorldEvent => ({ id: 'e', title: 'E', when: 'w', note: 'n', every: 'week', days: 1, line: 'l', round, ...over });

const story: WorldStory = {
  genre: 'campus',
  tone: { edge: 'cozy', heat: 'warm' },
  premise: 'A campus by the sea.',
  conflict: 'The board wants to sell the pier.',
  userRole: { title: 'Transfer student', hook: 'You just arrived.' },
  entry: { sceneId: 'scene_x', characterId: 'c_a' },
  ties: [
    { a: 'c_a', b: 'c_b', kind: 'rivals', note: 'They fight.' },
    { a: 'c_c', b: 'c_a', kind: 'exes', note: 'They dated.' },
    { a: 'c_b', b: 'c_c', kind: 'siblings', note: 'They share a mother.' },
  ],
  season: { title: 'S', chapters: [chapter('one', 0), chapter('two', 7), chapter('three', 14)] },
  events: [event({ id: 'sat', every: 'week', weekday: 6 })],
};

const day = (text: string) => new Date(`${text}T12:00:00`);

describe('arcs: what a character holds back opens with the bond', () => {
  it('opens beats at the planned levels', () => {
    assert.deepEqual(ARC_LEVELS, [2, 4, 6]);
    assert.deepEqual(arcStage(arc, 0), { opened: [], now: undefined, next: arc.beats[0], secretOut: false });
    assert.deepEqual(arcStage(arc, 1).opened, []);
    const third = arcStage(arc, 5);
    assert.deepEqual(third.opened.map((b) => b.title), ['A', 'B']);
    assert.equal(third.now?.title, 'B');
    assert.equal(third.next?.title, 'C');
    assert.equal(third.secretOut, false);
  });

  it('lets the secret out only with the last beat', () => {
    const end = arcStage(arc, 40);
    assert.equal(end.now?.title, 'C');
    assert.equal(end.next, undefined);
    assert.equal(end.secretOut, true);
  });

  it('finds the beats a level-up crossed, once each', () => {
    assert.deepEqual(beatsCrossed(arc, 1, 2).map((b) => b.title), ['A']);
    assert.deepEqual(beatsCrossed(arc, 1, 5).map((b) => b.title), ['A', 'B']);
    assert.deepEqual(beatsCrossed(arc, 2, 3), []);
    assert.deepEqual(beatsCrossed(arc, 6, 9), []);
    assert.deepEqual(beatsCrossed(undefined, 0, 9), []);
  });
});

describe('the season: chapters open by the days since the user joined the world', () => {
  it('counts whole local days from the join', () => {
    assert.equal(worldDay('2026-10-01T23:30:00', day('2026-10-02')), 1);
    assert.equal(worldDay('2026-10-01T01:00:00', day('2026-10-01')), 0);
    assert.equal(worldDay(undefined, day('2026-10-02')), 0);
  });

  it('shows the newest open chapter and stays on the last', () => {
    const joined = '2026-10-01T09:00:00';
    assert.equal(chapterAt(story.season, joined, day('2026-10-01'))?.id, 'one');
    assert.equal(chapterAt(story.season, joined, day('2026-10-07'))?.id, 'one');
    assert.equal(chapterAt(story.season, joined, day('2026-10-08'))?.id, 'two');
    assert.equal(chapterAt(story.season, joined, day('2027-01-08'))?.id, 'three');
  });

  it('dates the world from the first friend made there', () => {
    const bonds = { c_a: { anniversary: '2026-10-05T00:00:00.000Z' }, c_b: { anniversary: '2026-10-01T00:00:00.000Z' }, c_z: { anniversary: '2020-01-01T00:00:00.000Z' } };
    assert.equal(worldJoinedAt(['c_a', 'c_b', 'c_c'], bonds), '2026-10-01T00:00:00.000Z');
    assert.equal(worldJoinedAt(['c_c'], bonds), undefined);
  });
});

describe('world events come round on the calendar', () => {
  it('a weekly one is on on its weekday', () => {
    const sat = event({ every: 'week', weekday: 6 });
    assert.equal(isEventOn(sat, day('2026-10-31')), true);
    assert.equal(isEventOn(sat, day('2026-10-30')), false);
  });

  it('a monthly one runs from its day for its days', () => {
    const moon = event({ every: 'month', day: 14, days: 2 });
    assert.equal(isEventOn(moon, day('2026-10-13')), false);
    assert.equal(isEventOn(moon, day('2026-10-14')), true);
    assert.equal(isEventOn(moon, day('2026-10-15')), true);
    assert.equal(isEventOn(moon, day('2026-10-16')), false);
  });

  it('a yearly one crosses a month and a new year', () => {
    const ball = event({ every: 'year', month: 12, day: 30, days: 4 });
    assert.equal(isEventOn(ball, day('2026-12-29')), false);
    assert.equal(isEventOn(ball, day('2026-12-31')), true);
    assert.equal(isEventOn(ball, day('2027-01-02')), true);
    assert.equal(isEventOn(ball, day('2027-01-03')), false);
  });
});

describe('ties', () => {
  it('names the other one, whichever side the speaker is on', () => {
    assert.deepEqual(tiesOf(story.ties, 'c_a', (id) => id.toUpperCase()), [
      { name: 'C_B', kind: 'rivals', note: 'They fight.' },
      { name: 'C_C', kind: 'exes', note: 'They dated.' },
    ]);
  });
});

describe('what a chat carries of its world', () => {
  it('gives the story, the role, the speaker’s ties and what is on now', () => {
    const prompt = worldPromptOf(story, 'c_a', (id) => id, '2026-10-01T09:00:00', day('2026-10-31'));
    assert.equal(prompt.premise, story.premise);
    assert.equal(prompt.role.title, 'Transfer student');
    assert.equal(prompt.ties.length, 2);
    assert.equal(prompt.chapter?.title, 'three');
    assert.equal(prompt.event?.title, 'E');
  });
});

describe('world news: a chapter or an event a friend brings up', () => {
  const args = { worldKey: 'seaside', story, joinedAt: '2026-10-01T09:00:00' };

  it('says the chapter the day it opens, not on the day the user joined', () => {
    assert.equal(dueWorldNews({ ...args, now: day('2026-10-01') }), null);
    assert.equal(dueWorldNews({ ...args, now: day('2026-10-08') })?.key, 'seaside:chapter:two');
    assert.equal(dueWorldNews({ ...args, now: day('2026-10-09') }), null);
  });

  it('says an event the day it starts', () => {
    const news = dueWorldNews({ ...args, now: day('2026-10-31') });
    assert.equal(news?.key, 'seaside:event:sat:2026-10-31');
    assert.equal(news?.kind, 'event');
  });

  it('skips a world the user has not joined', () => {
    assert.equal(dueWorldNews({ ...args, joinedAt: undefined, now: day('2026-10-31') }), null);
  });
});
