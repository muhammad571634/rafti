import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ARC_LEVELS } from '../lib/world-story';
import { contentProblems } from '../lib/create-character';
import { characters } from './characters';
import { officialLorebooks } from './lorebooks';
import { officialScenes } from './scenes';
import { WORLDS } from './worlds';

const official = characters.filter((c) => c.isOfficial);
const castOf = (series: string) => official.filter((c) => c.series === series);

describe('the official cast', () => {
  it('is 55 people in seven worlds', () => {
    assert.equal(official.length, 55);
    assert.equal(WORLDS.length, 7);
    assert.deepEqual(new Set(official.map((c) => c.series)).size, 7);
    assert.equal(new Set(official.map((c) => c.id)).size, 55);
    assert.equal(new Set(official.map((c) => c.handle)).size, 55);
  });

  it('adds three worlds of five, about half of them women', () => {
    const added = WORLDS.slice(4);
    assert.deepEqual(added.map((w) => w.series), ['Velvet District', 'Gilded Empire', 'Ice & Arena']);
    const people = added.flatMap((w) => castOf(w.series));
    for (const w of added) assert.equal(castOf(w.series).length, 5, w.series);
    assert.equal(people.filter((c) => c.gender === 'female').length, 8);
    assert.equal(people.filter((c) => c.gender === 'male').length, 7);
  });

  it('is all adults with a full profile', () => {
    for (const c of official) {
      assert.ok(c.age && c.age >= 20, c.name);
      for (const field of [c.tagline, c.look, c.backstory, c.definition, c.quirk, c.opening] as const) assert.ok(field?.trim(), c.name);
      assert.ok(c.tagline!.length <= 50, `${c.name}: tagline ${c.tagline!.length}`);
      assert.ok(c.look!.length <= 300, `${c.name}: look ${c.look!.length}`);
      assert.ok(c.likes?.length && c.dislikes?.length && c.starters?.length && c.greetings?.length, c.name);
      assert.ok(c.starters!.length <= 3 && c.starters!.every((s) => s.length <= 100), c.name);
      assert.ok(c.greetings!.every((g) => g.length <= 200), c.name);
      assert.deepEqual(contentProblems(`${c.bio} ${c.greeting}`), [], c.name);
    }
  });

  it('gives everyone a role, a trope, a shape and an arc', () => {
    for (const c of official) {
      assert.ok(c.worldRole?.trim(), c.name);
      assert.ok(c.trope, c.name);
      assert.ok(c.archetype, c.name);
      assert.deepEqual(c.arc?.beats.map((b) => b.atLevel), [...ARC_LEVELS], c.name);
      assert.ok(c.arc?.secret.trim(), c.name);
      for (const b of c.arc!.beats) {
        assert.ok(b.title.trim() && b.title.length <= 34, `${c.name}: ${b.title}`);
        assert.ok(b.beat.trim() && b.beat.length <= 320, `${c.name}: ${b.beat}`);
      }
    }
  });

  it('never repeats a trope inside a world', () => {
    for (const w of WORLDS) {
      const tropes = castOf(w.series).map((c) => c.trope);
      assert.equal(new Set(tropes).size, tropes.length, w.series);
    }
  });
});

describe('every world', () => {
  const ids = new Set(official.map((c) => c.id));

  it('has a story that holds together', () => {
    for (const w of WORLDS) {
      const { story } = w;
      assert.ok(story.premise.trim() && story.conflict.trim() && story.userRole.title.trim() && story.userRole.hook.trim(), w.series);
      assert.ok(castOf(w.series).some((c) => c.id === story.entry.characterId), `${w.series}: entry host`);
      const scene = officialScenes.find((s) => s.id === story.entry.sceneId);
      assert.ok(scene?.opening?.trim(), `${w.series}: entry scene`);
      assert.equal(scene?.series, w.series);
    }
  });

  it('ties only its own cast, each pair once', () => {
    for (const w of WORLDS) {
      const cast = new Set(castOf(w.series).map((c) => c.id));
      assert.ok(w.story.ties.length >= 3, w.series);
      const pairs = w.story.ties.map((t) => [t.a, t.b].sort().join('+'));
      assert.equal(new Set(pairs).size, pairs.length, w.series);
      for (const t of w.story.ties) {
        assert.ok(ids.has(t.a) && ids.has(t.b), `${w.series}: ${t.a} ${t.b}`);
        assert.ok(cast.has(t.a) && cast.has(t.b), `${w.series}: ${t.a} ${t.b}`);
        assert.notEqual(t.a, t.b);
      }
      assert.ok(w.story.ties.some((t) => t.kind === 'black cat × golden retriever'), `${w.series}: the pair`);
    }
  });

  it('has a season of weekly chapters from day 0', () => {
    for (const w of WORLDS) {
      const chapters = w.story.season.chapters;
      assert.equal(chapters.length, 6, w.series);
      assert.equal(chapters[0].opensOnDay, 0, w.series);
      chapters.forEach((c, i) => assert.equal(c.opensOnDay, i * 7, `${w.series}: ${c.id}`));
      assert.equal(new Set(chapters.map((c) => c.id)).size, 6, w.series);
    }
  });

  it('has two events that can come round', () => {
    for (const w of WORLDS) {
      assert.equal(w.story.events.length, 2, w.series);
      for (const e of w.story.events) {
        if (e.every === 'week') assert.ok(e.weekday !== undefined && e.weekday >= 0 && e.weekday <= 6, e.id);
        if (e.every === 'month') assert.ok(e.day && e.day <= 28, e.id);
        if (e.every === 'year') assert.ok(e.month && e.day, e.id);
        assert.ok(e.days >= 1 && e.line.trim(), e.id);
        assert.equal(e.round.choices.length, 3, e.id);
      }
    }
  });

  it('has a quiz the host can check, and a frame', () => {
    for (const w of WORLDS) {
      assert.ok(w.quiz.length >= 8, w.series);
      for (const q of w.quiz) {
        assert.ok(q.answer >= 0 && q.answer <= 3 && q.options[q.answer], q.text);
        assert.equal(new Set(q.options).size, 4, q.text);
      }
      assert.equal(w.selfQuiz.length, 7, w.series);
      assert.equal(w.dateRounds.length, 2, w.series);
      assert.ok(w.frame.caption, w.series);
    }
  });

  it('has a book, and the book knows its cast', () => {
    for (const w of WORLDS) {
      const book = officialLorebooks.find((b) => b.series === w.series);
      assert.ok(book, w.series);
      for (const c of castOf(w.series)) assert.ok(book!.entries.some((e) => e.characterId === c.id), c.name);
    }
  });
});
