import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Character, User } from '@/types';

import { baseLanguage, FOLLOW_USER_LANGUAGE, languageCue, lockedReplyLanguage } from './reply-language';
import { buildCharacterPrompt } from './rules';

describe('lockedReplyLanguage', () => {
  it('uses the app language before the user writes', () => {
    assert.equal(lockedReplyLanguage(undefined, [], 'en-US'), 'en');
    assert.equal(lockedReplyLanguage(undefined, [undefined], 'en'), 'en');
  });

  it("locks to the user's first message", () => {
    assert.equal(lockedReplyLanguage(undefined, ['ru'], 'en'), 'ru');
  });

  it('keeps the lock for one message in another language', () => {
    assert.equal(lockedReplyLanguage('ru', ['ru', 'en'], 'en'), 'ru');
  });

  it('moves after two messages in a row in the new language', () => {
    assert.equal(lockedReplyLanguage('ru', ['ru', 'en', 'en'], 'en'), 'en');
  });

  it('does not move on two different languages', () => {
    assert.equal(lockedReplyLanguage('ru', ['en', 'es'], 'en'), 'ru');
  });

  it('ignores messages too short to tell', () => {
    assert.equal(lockedReplyLanguage('ru', ['en', undefined, 'en'], 'en'), 'en');
    assert.equal(lockedReplyLanguage('ru', ['en', undefined, ''], 'en'), 'ru');
  });

  it('treats regional tags as one language', () => {
    assert.equal(baseLanguage('pt-BR'), 'pt');
    assert.equal(lockedReplyLanguage('pt-BR', ['pt', 'pt_PT'], 'en'), 'pt');
  });
});

describe('languageCue: any language, read off their own words', () => {
  it('quotes their last two lines, cut when long, and is empty before they write', () => {
    assert.deepEqual(languageCue([]), []);
    assert.deepEqual(languageCue(['  ']), []);
    const [cue] = languageCue(['hi', 'こんにちは', 'お元気ですか？']);
    assert.match(cue, /^LANGUAGE: write every message in the language their latest messages are in \("こんにちは \/ お元気ですか？"\)/);
    assert.ok(languageCue(['a'.repeat(400)])[0].includes(`"${'a'.repeat(160)}…"`));
  });

  it('names no language itself', () => {
    assert.doesNotMatch(FOLLOW_USER_LANGUAGE + languageCue(['hola'])[0], /English,|Spanish|Russian|Uzbek/);
  });
});

describe('buildCharacterPrompt reply language', () => {
  const character = { name: 'Kai', bio: 'A barista.', tags: ['warm'], greeting: 'Hi!' } as unknown as Character;
  const user = { displayName: 'Sam', locale: 'en' } as unknown as User;

  it('names the locked language', () => {
    assert.match(buildCharacterPrompt(character, user, undefined, 'ru'), /REPLY LANGUAGE: ru\b/);
  });

  it("falls back to the user's app language", () => {
    assert.match(buildCharacterPrompt(character, user), /REPLY LANGUAGE: en\b/);
  });
});
