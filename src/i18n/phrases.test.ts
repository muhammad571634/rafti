import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { FAMILY_LABELS } from '../lib/kin';
import { INTEREST_OPTIONS } from '../lib/profile';
import { allReachKeys, everydayIdeas, ideasFor } from '../lib/reply-ideas';
import { TIERS } from '../mock/user';
import { WORLDS } from '../mock/worlds';

const dir = join(import.meta.dirname, 'locales');
const phrasesOf = (file: string): Record<string, string> => JSON.parse(readFileSync(join(dir, file), 'utf8')).phrases ?? {};

/** Every reply idea the app can show, from every table and the everyday pool. */
function allIdeas() {
  const reaches = [...allReachKeys(), 'ask', 'lead', 'quest', 'pause:break', 'pause:night'];
  const everyday = [
    ...everydayIdeas('Do you like rain?', 'a'),
    ...everydayIdeas('What did you eat?', 'a'),
    ...Array.from({ length: 64 }, (_, i) => everydayIdeas('I saw a cat today.', `seed${i}`)).flat(),
  ];
  return [...reaches.flatMap(ideasFor), ...everyday];
}

describe('phrases: the English words kept as data, in every screen language', () => {
  const english = phrasesOf('en.json');
  const words = [
    ...FAMILY_LABELS,
    ...TIERS.flatMap((tier) => [tier.title, ...tier.labels]),
    ...INTEREST_OPTIONS,
    ...allIdeas().flatMap((idea) => [idea.label, idea.text]),
    ...WORLDS.map((w) => w.series),
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
