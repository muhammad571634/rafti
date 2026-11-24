import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Character } from '@/types';

import { relationLines } from '../ai/world-prompt';
import { BEAT_MAX, BEAT_TITLE_MAX, contentProblems, EXCEPTION_MAX, HISTORY_MAX, MASK_MAX, QUIRK_MAX, SECRET_MAX, THING_MAX, THINGS_MAX } from './create-character';
import { TEMPLATE_STORIES, withTemplateStory } from './template-stories';
import { TEMPLATES } from './templates';
import { ARC_LEVELS } from './world-story';

const texts = (id: string) => {
  const s = TEMPLATE_STORIES[id];
  return [s.history, s.mask, s.exception, s.quirk, s.arc.secret, ...s.arc.beats.flatMap((b) => [b.title, b.beat]), ...s.likes, ...s.dislikes];
};

describe('template stories (0z331)', () => {
  it('give every one of the 100 templates a story, and nothing else', () => {
    assert.deepEqual(Object.keys(TEMPLATE_STORIES).sort(), TEMPLATES.map((t) => t.id).sort());
  });

  it('open in three beats at the arc levels, like the official cast', () => {
    for (const [id, s] of Object.entries(TEMPLATE_STORIES)) {
      assert.deepEqual(
        s.arc.beats.map((b) => b.atLevel),
        [...ARC_LEVELS],
        id,
      );
    }
  });

  it('fit Create\'s limits, so Make it yours and Edit keep every word', () => {
    for (const [id, s] of Object.entries(TEMPLATE_STORIES)) {
      assert.ok(s.history.length <= HISTORY_MAX, `${id} history ${s.history.length}`);
      assert.ok(s.mask.length <= MASK_MAX, `${id} mask ${s.mask.length}`);
      assert.ok(s.exception.length <= EXCEPTION_MAX, `${id} exception ${s.exception.length}`);
      assert.ok(s.quirk.length <= QUIRK_MAX, `${id} quirk`);
      assert.ok(s.arc.secret.length <= SECRET_MAX, `${id} secret ${s.arc.secret.length}`);
      for (const b of s.arc.beats) {
        assert.ok(b.title.length <= BEAT_TITLE_MAX, `${id} title "${b.title}"`);
        assert.ok(b.beat.length <= BEAT_MAX, `${id} beat`);
      }
      for (const list of [s.likes, s.dislikes]) {
        assert.ok(list.length >= 2 && list.length <= THINGS_MAX, `${id} list size`);
        for (const x of list) assert.ok(x && x.length <= THING_MAX && !x.includes(','), `${id} thing "${x}"`);
      }
    }
  });

  it('say "you" for the character, never he or she, so a renamed or regendered copy still fits', () => {
    // A he/she/his/her in a story names someone else in their life (a mother, a brother): only those.
    const others = /\b(mother|father|sister|brother|daughter|wife|grandmother|son)\b/i;
    for (const id of Object.keys(TEMPLATE_STORIES)) {
      for (const text of texts(id)) {
        if (/\b(he|she|his|her|him|himself|herself)\b/i.test(text)) assert.match(text, others, `${id}: "${text}"`);
      }
    }
  });

  it('stay inside the content line and keep the name out', () => {
    for (const t of TEMPLATES) {
      const all = texts(t.id).join(' ');
      assert.deepEqual(contentProblems(all), [], t.id);
      assert.ok(!new RegExp(`\\b${t.card.name}\\b`).test(all), `${t.id} names itself`);
    }
  });

  it('mark the strangers, whose prompt drops "you already know each other"', () => {
    const strangers = Object.entries(TEMPLATE_STORIES).filter(([, s]) => s.justMet).map(([id]) => id);
    assert.ok(strangers.includes('t_robin') && strangers.includes('t_seraphine'));
    assert.ok(!strangers.includes('t_noah'));
    const lines = (justMet?: boolean) => relationLines({ relation: 'x', history: 'y', justMet }).join('\n');
    assert.match(lines(true), /only just met/);
    assert.doesNotMatch(lines(true), /never act as if you had just met/);
    assert.match(lines(false), /You already know each other/);
  });
});

describe('withTemplateStory', () => {
  const story = TEMPLATE_STORIES.t_noah;
  const base = { fromTemplate: 't_noah' } as Pick<Character, 'fromTemplate' | 'history' | 'mask' | 'exception' | 'quirk' | 'likes' | 'dislikes' | 'arc' | 'justMet'>;

  it('fills a hi copy, and swaps the card\'s short mask that gives the secret away', () => {
    const card = TEMPLATES.find((t) => t.id === 't_noah')!.card.mask!;
    const filled = withTemplateStory({ ...base, mask: card }, story, [card]);
    assert.equal(filled.history, story.history);
    assert.equal(filled.mask, story.mask);
    assert.equal(filled.arc, story.arc);
    assert.deepEqual(filled.likes, story.likes);
  });

  it('keeps what the user wrote in Create and an arc already written', () => {
    const arc = { secret: 'mine', beats: [{ atLevel: 2, title: 'a', beat: 'b' }] };
    const own = { ...base, history: 'Ours', mask: 'My own mask', likes: ['tea'], arc };
    const filled = withTemplateStory(own, story, ['Acts like nothing changed; the job was you.']);
    assert.equal(filled.history, 'Ours');
    assert.equal(filled.mask, 'My own mask');
    assert.deepEqual(filled.likes, ['tea']);
    assert.equal(filled.arc, arc);
    assert.equal(filled.exception, story.exception);
  });

  it('leaves other characters, and a full one, as the same object', () => {
    const plain = { history: '' } as typeof base;
    assert.equal(withTemplateStory(plain, story), plain);
    const full = withTemplateStory(base, story);
    assert.equal(withTemplateStory(full, story, [story.mask]), full);
  });
});
