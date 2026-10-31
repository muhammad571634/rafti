import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildSceneOpeningPrompt } from '../ai/content-prompts';
import { buildCharacterPrompt, buildGroupPrompt } from '../ai/rules';
import { characters } from '../mock/characters';
import { officialLorebooks } from '../mock/lorebooks';
import type { Character, LoreEntry, Lorebook, Message, User } from '@/types';

import {
  booksFor,
  checkLoreEntry,
  checkLorebook,
  keywordsOf,
  LORE_ABOUT_MAX,
  LORE_KEYWORD_MAX,
  LORE_KEYWORDS_MAX,
  LORE_MAX_ENTRIES,
  LORE_NAME_MAX,
  LORE_TEXT_MAX,
  lorePrompt,
  mentions,
  normalLore,
  parseKeywords,
  recentLines,
  triggeredLore,
} from './lorebook';
import { activeScene } from './scenes';

const entry = (id: string, name: string, keywords: string[], text = `${name} is here.`, extra: Partial<LoreEntry> = {}): LoreEntry => ({
  id,
  kind: 'place',
  name,
  keywords,
  text,
  ...extra,
});

const book = (id: string, entries: LoreEntry[], extra: Partial<Lorebook> = {}): Lorebook => ({
  id,
  name: id,
  about: '',
  entries,
  characterIds: [],
  createdAt: '2026-10-25T00:00:00.000Z',
  ...extra,
});

const said = (word: string, keyword: string) => mentions(normalLore(word), normalLore(keyword));

describe('checks', () => {
  it('needs a name and room under the limit for a book', () => {
    assert.deepEqual(checkLorebook({ name: 'Our café', about: '' }, 0, 1), []);
    assert.deepEqual(checkLorebook({ name: ' ', about: '' }, 0, 1), ['name']);
    assert.deepEqual(checkLorebook({ name: 'Two', about: '' }, 1, 1), ['full']);
  });

  it('needs a name and a text for an entry, and keeps crises, minors and explicit lore out', () => {
    const ok = { name: 'The pier', keywords: ['pier'], text: 'A wooden pier.' };
    assert.deepEqual(checkLoreEntry(ok, 0, 15), []);
    assert.deepEqual(checkLoreEntry({ ...ok, name: '', text: '' }, 0, 15), ['name', 'text']);
    assert.deepEqual(checkLoreEntry(ok, 15, 15), ['full']);
    assert.deepEqual(checkLoreEntry({ ...ok, text: 'I want to kill myself on the pier' }, 0, 15), ['crisis']);
    assert.deepEqual(checkLoreEntry({ ...ok, keywords: ['high school'] }, 0, 15), ['minors']);
    assert.deepEqual(checkLoreEntry({ ...ok, text: 'nsfw' }, 0, 15), ['explicit']);
  });
});

describe('keywords', () => {
  it('reads the editor field into clean keywords, each once', () => {
    assert.deepEqual(parseKeywords('pier,  the docks ; Pier\nx, boardwalk'), ['pier', 'the docks', 'boardwalk']);
    assert.equal(parseKeywords('a,b,c,dd,ee,ff,gg,hh,ii').length, LORE_KEYWORDS_MAX);
    assert.equal(parseKeywords('x'.repeat(50))[0].length, LORE_KEYWORD_MAX);
  });

  it('counts the name as a keyword and keeps the first spelling', () => {
    assert.deepEqual(keywordsOf({ name: 'The Pier', keywords: ['pier', 'PIER', 'boardwalk', 'x'] }), ['The Pier', 'pier', 'boardwalk']);
  });

  it('matches short words whole and lets long ones take an ending', () => {
    assert.ok(said('Is Kai coming?', 'Kai'));
    assert.ok(said('That was Kai’s towel', 'Kai'));
    assert.ok(!said('Kaito says hi', 'Kai'));
    assert.ok(!said('a riot outside', 'Rio'));
    assert.ok(said('Two LANTERNS were lit', 'lantern'));
    assert.ok(said('Kutubxonaga boraylik', 'kutubxona'));
    assert.ok(said('Meet me at the fire   station', 'fire station'));
    assert.ok(!said('unlantern', 'lantern'));
  });

  it('reads texts and voice transcripts, not system lines', () => {
    const at = '2026-10-25T00:00:00.000Z';
    const messages: Message[] = [
      { id: '1', conversationId: 'c', author: 'me', kind: 'text', text: 'old', createdAt: at },
      { id: '2', conversationId: 'c', author: 'them', kind: 'system', card: 'scene', text: 'Night ferry', createdAt: at },
      { id: '3', conversationId: 'c', author: 'them', kind: 'voice', transcript: 'by the pier', createdAt: at },
      { id: '4', conversationId: 'c', author: 'me', kind: 'image', imageUri: 'x', createdAt: at },
      { id: '5', conversationId: 'c', author: 'me', kind: 'text', text: 'new', createdAt: at },
    ];
    assert.deepEqual(recentLines(messages), ['old', 'by the pier', 'new']);
    assert.deepEqual(recentLines(messages, 2), ['by the pier', 'new']);
  });
});

describe('triggeredLore', () => {
  const pier = entry('pier', 'The pier', ['pier']);
  const cats = entry('cats', 'Campus cats', ['cats']);
  const kai = entry('kai', 'Kai Arden', ['Kai'], 'Swim-team ace.', { kind: 'person', characterId: 'c_kai' });
  const world = book('world', [pier, cats, kai]);

  it('brings up what the chat mentions, in book order', () => {
    const hits = triggeredLore([world], ['the cats again', 'see you at the pier?']);
    assert.deepEqual(hits.map((h) => [h.entry.id, h.keyword, h.ago]), [
      ['pier', 'The pier', 0],
      ['cats', 'cats', 1],
    ]);
    assert.deepEqual(triggeredLore([world], ['hello']), []);
  });

  it('leaves out the character’s own entry', () => {
    assert.deepEqual(triggeredLore([world], ['kai, wait!']).map((h) => [h.entry.id, h.keyword]), [['kai', 'Kai']]);
    assert.deepEqual(triggeredLore([world], ['Kai, wait!'], 'c_kai'), []);
  });

  it('keeps the newest mentions when there are too many or too much text', () => {
    const many = book(
      'many',
      Array.from({ length: 6 }, (_, i) => entry(`e${i}`, `Place${i}`, [])),
    );
    const lines = many.entries.map((e) => `going to ${e.name}`);
    const hits = triggeredLore([many], lines);
    assert.equal(hits.length, LORE_MAX_ENTRIES);
    // The two oldest mentions are the ones left out.
    assert.deepEqual(hits.map((h) => h.entry.id), ['e2', 'e3', 'e4', 'e5']);

    const long = book('long', [entry('a', 'Alpha', [], 'x'.repeat(700)), entry('b', 'Bravo', [], 'y'.repeat(700))]);
    assert.deepEqual(triggeredLore([long], ['alpha', 'bravo']).map((h) => h.entry.id), ['b']);
  });

  it('serves a character from their world’s book and the user’s books linked to them', () => {
    const official = [book('seaside', [], { series: 'Seaside Academy', official: true }), book('moon', [], { series: 'Moonlit Realm', official: true })];
    const own = [book('mine', [], { characterIds: ['c_kai'] }), book('other', [], { characterIds: ['c_theo'] })];
    assert.deepEqual(booksFor({ id: 'c_kai', series: 'Seaside Academy' }, own, official).map((b) => b.id), ['seaside', 'mine']);
    assert.deepEqual(booksFor({ id: 'c_new' }, own, official), []);
  });
});

describe('world books in the prompt', () => {
  const character = { id: 'c_kai', name: 'Kai Arden', bio: 'Swim-team ace.', greeting: 'Hi.', tags: [], series: 'Seaside Academy' } as unknown as Character;
  const user = { displayName: 'Sam', locale: 'en-US' } as User;
  const seaside = officialLorebooks.find((b) => b.series === 'Seaside Academy')!;
  const mine = book('mine', [entry('dog', 'Biscuit', ['dog'], 'Sam’s old beagle.')], { name: 'Our story', about: 'We met on the night ferry.', characterIds: ['c_kai'] });
  const lore = lorePrompt([seaside, mine], ['Did you feed the cats?', 'Biscuit says hi'], character.id);

  it('carries every book’s lines after the persona and the notes it brought up last', () => {
    const scene = activeScene({ id: 's', title: 'Night ferry', setting: 'A ferry.', createdAt: '' });
    const prompt = buildCharacterPrompt(character, user, undefined, 'English', undefined, scene, lore);
    const world = prompt.indexOf('YOUR WORLD');
    assert.ok(world > prompt.indexOf('YOUR PERSONA:') && world < prompt.indexOf('THE USER:'));
    assert.match(prompt, /- Seaside Academy: A university town/);
    assert.match(prompt, /- Our story \(notes the user wrote for your story\): We met/);
    const notes = prompt.indexOf('WORLD NOTES');
    assert.ok(notes > prompt.indexOf('CURRENT SCENE'));
    assert.match(prompt, /- Campus cats \(thing\): A small colony/);
    assert.match(prompt, /- Biscuit \(place\): Sam’s old beagle/);
    assert.doesNotMatch(prompt, /Kai Arden \(person\)/);
  });

  it('keeps "who you are here" for a book with no about, and prints no empty world line', () => {
    const roleOnly = lorePrompt([book('b', [], { name: 'Ashfall', about: '  ', userRole: 'The last courier' })], []);
    assert.deepEqual(roleOnly.worlds, [{ name: 'Ashfall', about: '', official: false, role: 'The last courier' }]);
    const prompt = buildCharacterPrompt(character, user, undefined, 'English', undefined, undefined, roleOnly);
    assert.match(prompt, /Who the user is in Ashfall: The last courier/);
    assert.doesNotMatch(prompt, /Ashfall[^\n]*notes the user wrote/);
  });

  it('leaves the blocks out when there is nothing to say', () => {
    const quiet = buildCharacterPrompt(character, user, undefined, 'English', undefined, undefined, lorePrompt([book('b', [])], ['hi']));
    assert.doesNotMatch(quiet, /YOUR WORLD|WORLD NOTES/);
    assert.doesNotMatch(buildCharacterPrompt(character, user), /YOUR WORLD|WORLD NOTES/);
  });

  it('reaches group chats and the scene opener too', () => {
    assert.match(buildGroupPrompt(character, [], user, undefined, 'English', undefined, lore), /WORLD NOTES/);
    const scene = activeScene({ id: 's', title: 'Night ferry', setting: 'A ferry.', createdAt: '' });
    assert.match(buildSceneOpeningPrompt({ character, user, lore }, scene), /YOUR WORLD/);
  });
});

describe('the worlds’ books', () => {
  it('has one book per world, within every limit and the content rules', () => {
    assert.deepEqual(officialLorebooks.map((b) => b.series), ['Seaside Academy', 'Moonlit Realm', 'NEON TIDE', 'Tidepool Café', 'Velvet District', 'Gilded Empire', 'Ice & Arena']);
    for (const b of officialLorebooks) {
      assert.ok(b.official && b.name.length <= LORE_NAME_MAX && b.about.length <= LORE_ABOUT_MAX, b.name);
      assert.deepEqual(checkLorebook(b, 0, 1), [], b.name);
      assert.equal(new Set(b.entries.map((e) => e.id)).size, b.entries.length, b.name);
      for (const e of b.entries) {
        assert.ok(e.name.length <= LORE_NAME_MAX && e.text.length <= LORE_TEXT_MAX, e.name);
        assert.ok(e.keywords.length <= LORE_KEYWORDS_MAX && e.keywords.every((k) => k.length <= LORE_KEYWORD_MAX), e.name);
        assert.deepEqual(checkLoreEntry(e, 0, 100), [], e.name);
        // A keyword that only repeats the name adds nothing (the name always counts).
        assert.equal(keywordsOf(e).length, e.keywords.length + 1, e.name);
      }
    }
  });

  it('knows every official character of the world by their short name', () => {
    for (const c of characters.filter((x) => x.isOfficial && x.series !== 'My Creations')) {
      const b = officialLorebooks.find((x) => x.series === c.series);
      assert.ok(b?.entries.some((e) => e.characterId === c.id), c.name);
    }
    const moonlit = officialLorebooks.find((b) => b.series === 'Moonlit Realm')!;
    assert.deepEqual(triggeredLore([moonlit], ['Have you seen Castor today?'], 'c_kael').map((h) => h.entry.name), ['Lord Castor']);
  });
});
