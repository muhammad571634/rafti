import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Character, Relationship, User } from '@/types';

import { chatParts } from './chat-prompt';
import { firstTextParts, type FirstTextRequest } from './first-text';
import { groupReplyParts } from './group-reply';
import { joinParts, type PromptPart } from './prompt-layout';
import { characterParts } from './rules';
import { ARCHETYPE_LINES, arcLines, bookWorldLines, nowLines, storyLines, TROPE_LINES, tieLines } from './world-prompt';

const vesper = {
  id: 'c_vesper',
  name: 'Vesper',
  handle: '@v',
  bio: 'Night alchemist.',
  category: 'fantasy',
  series: 'Moonlit Realm',
  accentIndex: 0,
  voiceReady: true,
  isOfficial: true,
  greeting: 'Careful.',
  tags: ['clever'],
  worldRole: 'Night alchemist',
  trope: 'second-chance',
  archetype: 'antihero',
  arc: {
    secret: 'He once brewed a forgetting potion for the user.',
    beats: [
      { atLevel: 2, title: 'The empty shelf', beat: 'Let slip that one shelf is labelled with your memories.' },
      { atLevel: 4, title: 'The first bottle', beat: 'Admit you know how they take their tea, before they ever told you.' },
      { atLevel: 6, title: 'What he brewed', beat: 'Tell them you brewed what took their memory.' },
    ],
  },
} as Character;
const sam = { id: 'u1', displayName: 'Sam', locale: 'en-US' } as User;
const bond = (level: number, arcDue?: number) => ({ characterId: 'c_vesper', level, levelTitle: 'Friend', arcDue }) as Relationship;

const world = {
  premise: 'A kingdom of endless night.',
  conflict: 'The Court is calling in every oath.',
  role: { title: 'The Oathbound', hook: 'You woke with a silver thread on your wrist.' },
  ties: [{ name: 'Lyra', kind: 'best friends' as const, note: 'She buys his herbs.' }],
  chapter: { title: 'The Summons', beat: 'Riders reached the Thorn Gate.' },
  event: { title: 'Full moon', note: 'The court sits in the open.' },
};

const tier = (parts: PromptPart[], name: string) => parts.find((p) => p.name === name)?.tier;
const text = (parts: PromptPart[], name: string) => parts.find((p) => p.name === name)?.text ?? '';

describe('the world in the prompt', () => {
  const parts = chatParts({
    character: vesper,
    user: sam,
    relationship: bond(4),
    lore: { worlds: [{ name: 'Moonlit Realm', about: 'A kingdom.', official: true }], entries: [], story: world },
    messages: [],
  });

  it('keeps the story and ties in the cached character tier', () => {
    assert.equal(tier(parts, 'worldStory'), 'character');
    assert.equal(tier(parts, 'ties'), 'character');
    assert.match(text(parts, 'worldStory'), /endless night/);
    assert.match(text(parts, 'worldStory'), /calling in every oath/);
    assert.match(text(parts, 'worldStory'), /The Oathbound/);
    assert.match(text(parts, 'ties'), /Lyra \(best friends\): She buys his herbs/);
  });

  it('keeps what changes in the turn tier', () => {
    assert.equal(tier(parts, 'now'), 'turn');
    assert.equal(tier(parts, 'arc'), 'turn');
    assert.match(text(parts, 'now'), /The Summons/);
    assert.match(text(parts, 'now'), /Full moon/);
  });

  it('plays the persona’s role, trope and archetype', () => {
    const persona = text(parts, 'persona');
    assert.match(persona, /Night alchemist/);
    assert.ok(persona.includes(TROPE_LINES['second-chance']));
    assert.ok(persona.includes(ARCHETYPE_LINES.antihero));
  });

  it('adds nothing for a character with no world or story', () => {
    const plain = chatParts({ character: { ...vesper, trope: undefined, archetype: undefined, arc: undefined, worldRole: undefined }, user: sam, messages: [] });
    assert.equal(text(plain, 'worldStory'), '');
    assert.equal(text(plain, 'ties'), '');
    assert.equal(text(plain, 'now'), '');
    assert.equal(text(plain, 'arc'), '');
  });
});

describe('the arc in the prompt', () => {
  it('never carries a beat or the secret before their level', () => {
    const early = arcLines(vesper.arc, 3).join('\n');
    assert.match(early, /empty shelf|labelled with your memories/);
    assert.doesNotMatch(early, /know how they take their tea/);
    assert.doesNotMatch(early, /forgetting potion/);
    assert.deepEqual(arcLines(vesper.arc, 1), []);
  });

  it('gives the secret with the last beat', () => {
    const end = arcLines(vesper.arc, 6).join('\n');
    assert.match(end, /forgetting potion/);
    assert.match(end, /Tell them you brewed/);
  });

  it('asks for the beat in this reply when it has just opened', () => {
    assert.match(arcLines(vesper.arc, 4, 4).join('\n'), /in this reply/);
    assert.doesNotMatch(arcLines(vesper.arc, 4).join('\n'), /in this reply/);
  });

  it('never claims an earlier beat was said', () => {
    assert.match(arcLines(vesper.arc, 4).join('\n'), /never claim you said it unless the chat shows it/);
    assert.doesNotMatch(arcLines(vesper.arc, 4).join('\n'), /Already came up/);
  });

  it('keeps the beat and the secret to a one-to-one reply: a first text or a group never sees them', () => {
    const reply = chatParts({ character: vesper, user: sam, relationship: bond(6, 6), messages: [] });
    assert.match(text(reply, 'arc'), /in this reply/);
    for (const parts of [characterParts(vesper, sam, bond(6, 6)), groupReplyParts({ character: vesper, others: [{ ...vesper, id: 'c_lyra', name: 'Lyra' }], user: sam, relationship: bond(6, 6), messages: [] })]) {
      assert.equal(text(parts, 'arc'), '');
      assert.doesNotMatch(parts.map((p) => p.text).join('\n'), /forgetting potion/);
    }
  });
});

describe('edges stay inside the content line', () => {
  it('a possessive or dangerous shape never controls the user', () => {
    assert.match(ARCHETYPE_LINES.devoted, /never/i);
    assert.match(ARCHETYPE_LINES.devoted, /friends/);
    assert.match(ARCHETYPE_LINES.antihero, /never/i);
    assert.match(TROPE_LINES.bodyguard, /their choice|their own/);
  });

  it('every line lets real life come first', () => {
    assert.match(storyLines(world).join('\n'), /real life/);
  });
});

describe('ties and now', () => {
  it('are empty without anything to say', () => {
    assert.deepEqual(tieLines([]), []);
    assert.deepEqual(nowLines({ ...world, chapter: undefined, event: undefined }), []);
  });
});

describe('a book the user made into a world', () => {
  it('says who the user is in it', () => {
    assert.match(bookWorldLines([{ name: 'Ashfall', role: 'The last courier' }]).join('\n'), /Ashfall.*The last courier/);
    assert.deepEqual(bookWorldLines([]), []);
  });
});

describe('world news as a first text', () => {
  it('lays out the chapter with the persona and asks for their own words', () => {
    const request = {
      kind: 'world',
      input: {
        character: vesper,
        user: sam,
        relationship: bond(4),
        news: { kind: 'chapter', title: 'The Summons', note: 'Riders reached the Thorn Gate.' },
        recent: [],
        now: '2026-10-28T07:30:00.000Z',
      },
    } as FirstTextRequest;
    const out = joinParts(firstTextParts(request));
    assert.match(out, /Vesper/);
    assert.match(out, /The Summons/);
    assert.match(out, /Riders reached the Thorn Gate/);
  });
});
