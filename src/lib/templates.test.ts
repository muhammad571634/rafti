import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { contentProblems, MIN_AGE, TRAITS } from './create-character';
import { NEW_BELOW, shelf, TEMPLATES, TROPES, trendingIds, type TemplateStats } from './templates';

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

  it('marks at most three with real weekly people', () => {
    const marked = trendingIds(shelf('forYou', stats), stats);
    assert.deepEqual([...marked].sort(), ['t_ezra', 't_lucas']);
    assert.ok(![...marked].some((id) => (stats[id]?.week ?? 0) < NEW_BELOW));
  });
});
