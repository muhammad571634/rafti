import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BIO_MAX, contentProblems, GREETING_MAX, MASK_MAX, MIN_AGE, NAME_MAX, OPENING_MAX, RELATION_MAX, SCENARIO_MAX, TAGLINE_MAX, TRAITS } from './create-character';
import { allNew, NEW_BELOW, shelf, TEMPLATES, TROPES, trendingIds, type TemplateStats } from './templates';

describe('story templates (template-library.md §2)', () => {
  it('are 100 with unique ids and names, split 55 him / 40 her / 5 any', () => {
    assert.equal(TEMPLATES.length, 100);
    assert.equal(new Set(TEMPLATES.map((t) => t.id)).size, 100);
    assert.equal(new Set(TEMPLATES.map((t) => t.card.name)).size, 100);
    const count = (g?: string) => TEMPLATES.filter((t) => t.card.gender === g).length;
    assert.deepEqual([count('male'), count('female'), count(undefined)], [55, 40, 5]);
  });

  it('fill every shelf', () => {
    for (const trope of TROPES) assert.ok(TEMPLATES.some((t) => t.trope === trope), trope);
  });

  it('are adults with traits from the Create list and clean words', () => {
    const traits = new Set<string>(TRAITS);
    for (const { id, card } of TEMPLATES) {
      assert.ok((card.age ?? 0) >= MIN_AGE, id);
      assert.equal(card.tags?.length, 3, id);
      for (const tag of card.tags ?? []) assert.ok(traits.has(tag), `${id}: ${tag}`);
      const text = [card.name, card.tagline, card.bio, card.mask, card.scenario, card.opening, card.greeting, card.relation].join(' ');
      assert.deepEqual(contentProblems(text), [], id);
      assert.ok(!/\{\{(?!char\}\}|user\}\})/.test(text), `${id}: unknown placeholder`);
    }
  });
});

describe('story templates fit Create (Make it yours opens them there)', () => {
  it('keep every field inside the form’s limits', () => {
    const limits = { name: NAME_MAX, tagline: TAGLINE_MAX, bio: BIO_MAX, greeting: GREETING_MAX, opening: OPENING_MAX, scenario: SCENARIO_MAX, relation: RELATION_MAX, mask: MASK_MAX } as const;
    for (const { id, card } of TEMPLATES) {
      for (const [field, max] of Object.entries(limits)) {
        const value = String((card as Record<string, unknown>)[field] ?? '');
        assert.ok(value.length <= max, `${id}.${field}: ${value.length} > ${max}`);
      }
    }
  });
});

describe('shelf order and trending (template-library.md §3)', () => {
  const stats: Record<string, TemplateStats> = {
    t_lucas: { chats: 50, week: 40, owns: 3 },
    t_dominic: { chats: 900, week: 5, owns: 10 },
    t_ezra: { chats: 20, week: 12, owns: 0 },
  };

  it('puts this week first, all-time breaks ties, the rest as written', () => {
    const list = shelf('closeToHome', stats).map((t) => t.id);
    assert.deepEqual(list.slice(0, 3), ['t_dominic', 't_lucas', 't_ezra']);
    assert.equal(list[3], 't_gabriel');
  });

  it('mixes the shelves on For you while nobody has used them', () => {
    const first = shelf('forYou', {}).slice(0, TROPES.length);
    assert.equal(new Set(first.map((t) => t.trope)).size, TROPES.length);
  });

  it('marks at most three with real weekly people', () => {
    const marked = trendingIds(shelf('forYou', stats), stats);
    assert.deepEqual([...marked].sort(), ['t_ezra', 't_lucas']);
    assert.ok(![...marked].some((id) => (stats[id]?.week ?? 0) < NEW_BELOW));
  });
});

describe('allNew', () => {
  const list = [{ id: 'a' }, { id: 'b' }];
  it('is true while nobody has used any card', () => {
    assert.equal(allNew(list, {}, new Set()), true);
  });
  it('is false once one card has a count or a trending mark', () => {
    assert.equal(allNew(list, { a: { chats: NEW_BELOW, owns: 0, week: 0 } as TemplateStats }, new Set()), false);
    assert.equal(allNew(list, {}, new Set(['b'])), false);
  });
});
