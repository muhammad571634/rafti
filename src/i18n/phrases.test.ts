import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { FAMILY_LABELS } from '../lib/kin';
import { INTEREST_OPTIONS } from '../lib/profile';
import { allReachKeys, ideasFor } from '../lib/reply-ideas';
import { characters } from '../mock/characters';
import { TIERS } from '../mock/user';
import { WORLDS } from '../mock/worlds';

const dir = join(import.meta.dirname, 'locales');
const phrasesOf = (file: string): Record<string, string> => JSON.parse(readFileSync(join(dir, file), 'utf8')).phrases ?? {};

/** Every reply idea the app can show (a push's buttons, the "May I text you?" answers), from every table. */
function allIdeas() {
  const reaches = [...allReachKeys(), 'ask', 'lead', 'quest', 'pause:break', 'pause:night'];
  return reaches.flatMap(ideasFor);
}

describe('phrases: the English words kept as data, in every screen language', () => {
  const english = phrasesOf('en.json');
  const words = [
    ...FAMILY_LABELS,
    ...TIERS.flatMap((tier) => [tier.title, ...tier.labels]),
    ...INTEREST_OPTIONS,
    ...allIdeas().flatMap((idea) => [idea.label, idea.text]),
    ...WORLDS.map((w) => w.series),
    // The circles Find groups the cast under (`Character.series`).
    ...characters.flatMap((c) => (c.series ? [c.series] : [])),
  ];

  it('covers every label, tier, interest and reply idea', () => {
    const missing = [...new Set(words)].filter((word) => !(word in english));
    assert.deepEqual(missing, []);
  });

  it('has every phrase in every locale, never empty', () => {
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'en.json')) {
      const local = phrasesOf(file);
      const gaps = Object.keys(english).filter((word) => !local[word]?.trim());
      assert.deepEqual(gaps, [], file);
    }
  });
});
