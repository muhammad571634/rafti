import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Character, User } from '@/types';

import { baseLanguage, FOLLOW_USER_LANGUAGE, followsUser, followUserLanguage, languageCue, languageName, lockedReplyLanguage, noteLanguage } from './reply-language';
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
  it('takes one whole message in another language as a switch, a word or two as nothing', () => {
    const [cue] = languageCue(['Kötüyüm bugün', 'Bugun kuning qanday otdi?']);
    assert.match(cue, /A whole message in another language is a switch/);
    assert.match(cue, /A word or two from another language .* changes nothing/);
    assert.match(cue, /never a neighbour of it/);
  });

  it('says their latest message sets the language, never earlier replies or the notes (0z187)', () => {
    // The A51: after ~170 English replies a Turkish line got "language":"Turkish" and English bubbles.
    const [cue] = languageCue(['Sadece seni özledim.']);
    assert.match(cue, /\*actions\* included/);
    assert.match(cue, /neither your own earlier replies .* nor your notes, memories and summary set it/);
  });

  it('names one note language from the app language', () => {
    assert.equal(noteLanguage('pt-BR'), languageName('pt-BR'));
    assert.match(noteLanguage('pt-BR'), /Portuguese/);
    assert.equal(noteLanguage(undefined), 'English');
    assert.equal(noteLanguage(' '), 'English');
  });

  it('quotes their newest line as the newest and the one before as context, cut when long; before they write, names the phone’s language', () => {
    assert.deepEqual(languageCue([]), []);
    assert.deepEqual(languageCue(['  ']), []);
    assert.deepEqual(languageCue([], 'th-TH'), ["LANGUAGE: they have not written to you yet: write every message in Thai (Thailand), their phone's language."]);
    assert.doesNotMatch(languageCue(['hola'], 'th-TH')[0], /Thai/);
    const [cue] = languageCue(['hi', 'こんにちは', 'うん']);
    assert.match(cue, /^LANGUAGE: write every message in the language their latest message is in, the one most of its words are in \(their latest message: "うん"; the one before it: "こんにちは"\)/);
    // The A51 chat (0z178): the newest line is named as the newest, the older one only as context.
    assert.match(languageCue(['honestly your paintings are boring'])[0], /\(their latest message: "honestly your paintings are boring"\)/);
    assert.ok(languageCue(['a'.repeat(400)])[0].includes(`"${'a'.repeat(160)}…"`));
  });

  it('names no language itself, only the phone’s as the fallback before they write', () => {
    assert.doesNotMatch(FOLLOW_USER_LANGUAGE + languageCue(['hola'])[0], /Spanish|Russian|Japanese|Turkish|Uzbek/);
    assert.match(followUserLanguage('ja-JP'), /before they have written, or when it is unclear, Japanese \(Japan\) \(their phone's language\)\./);
    assert.match(FOLLOW_USER_LANGUAGE, /when it is unclear, English\./);
    assert.ok(followsUser(followUserLanguage('th-TH')) && followsUser(FOLLOW_USER_LANGUAGE));
    assert.ok(!followsUser('Spanish') && !followsUser(undefined));
    assert.equal(languageName('not a tag!'), 'not a tag!');
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
