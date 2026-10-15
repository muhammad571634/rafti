import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Character, User } from '@/types';

import { baseLanguage, lockedReplyLanguage } from './reply-language';
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
