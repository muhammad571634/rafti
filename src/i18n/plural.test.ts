import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { installPluralRules, pluralCategory } from './plural';

describe('plural forms on an engine without Intl.PluralRules', () => {
  it('matches the real rules for every language the app speaks', () => {
    for (const locale of ['en', 'ru', 'es', 'pt-BR', 'fr', 'de', 'it', 'tr', 'id', 'vi', 'th', 'ja', 'ko', 'zh-Hant']) {
      const real = new Intl.PluralRules(locale);
      for (let n = 0; n <= 1200; n++) assert.equal(pluralCategory(locale, n), real.select(n), `${locale} ${n}`);
    }
  });

  it('says what Russian needs', () => {
    assert.deepEqual([1, 2, 5, 11, 21, 22, 33, 112].map((n) => pluralCategory('ru', n)), ['one', 'few', 'many', 'many', 'one', 'few', 'few', 'many']);
  });

  it('fills the gap and leaves a real one alone', () => {
    const real = Intl.PluralRules;
    installPluralRules();
    assert.equal(Intl.PluralRules, real);
    try {
      (Intl as unknown as { PluralRules?: unknown }).PluralRules = undefined;
      installPluralRules();
      const rules = new Intl.PluralRules('ru');
      assert.equal(rules.select(2), 'few');
      assert.deepEqual(rules.resolvedOptions().pluralCategories, ['one', 'few', 'many', 'other']);
      assert.equal(new Intl.PluralRules('ja').resolvedOptions().pluralCategories.length, 1);
    } finally {
      Intl.PluralRules = real;
    }
  });
});
