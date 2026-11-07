import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Character, User } from '@/types';

import { characters } from '../mock/characters';
import { mockDraftReply } from '../mock/character-drafts';
import { redoCue } from '../lib/chat-turns';
import { actionOf, parseDraft, withOpening } from './character-draft';
import { chatParts } from './chat-prompt';
import { characterParts } from './rules';

const hugo = { id: 'c_hugo', name: 'Hugo', handle: '@h', bio: 'Vet.', category: 'daily', accentIndex: 0, voiceReady: false, isOfficial: true, greeting: 'Meet today’s guest.', greetings: ['Back again?'], tags: ['warm'], opening: '*holds up a puppy*', quirk: 'Overworks himself for strays.' } as Character;
const sam = { id: 'u1', displayName: 'Sam', locale: 'en-US' } as User;
const text = (parts: { text: string }[]) => parts.map((p) => p.text).join('\n');

describe('charm: openings, quirks and new versions for every character', () => {
  it('puts the opening action before the main greeting, except in plain texting', () => {
    assert.equal(withOpening(hugo, hugo.greeting, 'mix'), '*holds up a puppy* Meet today’s guest.');
    assert.equal(withOpening(hugo, hugo.greeting, 'story'), '*holds up a puppy* Meet today’s guest.');
    assert.equal(withOpening(hugo, hugo.greeting, 'talk'), 'Meet today’s guest.');
    // An extra greeting sets its own scene; a character without an opening is unchanged.
    assert.equal(withOpening(hugo, 'Back again?', 'mix'), 'Back again?');
    assert.equal(withOpening({ greeting: 'Hi.' }, 'Hi.', 'mix'), 'Hi.');
  });

  it('keeps an opening as one *action*, however it was written', () => {
    assert.equal(actionOf('looks up, smiling'), '*looks up, smiling*');
    assert.equal(actionOf('**waves**  hello*'), '*waves hello*');
    assert.equal(actionOf('  '), '');
  });

  it('gives the model the quirk as part of who they are', () => {
    assert.match(text(characterParts(hugo, sam)), /Something endearing about you .*Overworks himself for strays\./);
    assert.doesNotMatch(text(characterParts({ ...hugo, quirk: undefined }, sam)), /endearing/);
  });

  it('tells the model what earlier versions said on ↻, and nothing otherwise', () => {
    const cue = redoCue(['Aww, rest then.', 'Come here, I’ll make tea.']);
    assert.match(cue.join('\n'), /- Aww, rest then\./);
    assert.match(cue.join('\n'), /different take/);
    const parts = chatParts({ character: hugo, user: sam, messages: [], redo: ['Aww, rest then.'] });
    assert.match(text(parts), /NEW VERSION/);
    assert.doesNotMatch(text(chatParts({ character: hugo, user: sam, messages: [] })), /NEW VERSION/);
  });

  it('writes an opening and a quirk into every quick-create draft', () => {
    const result = parseDraft(mockDraftReply({ idea: 'A calm baker by the sea', sparks: [], language: 'English' }));
    assert.ok(result.ok);
    if (result.ok) {
      assert.match(result.draft.opening, /^\*.+\*$/);
      assert.ok(result.draft.quirk.length > 0);
    }
  });

  it('gives every official character an opening and a healthy quirk (the custom one is built by the user)', () => {
    const cast = characters.filter((c) => c.isOfficial && c.id !== 'c_oppa');
    assert.ok(cast.length >= 40);
    for (const c of cast) {
      assert.match(c.opening ?? '', /^\*[^*]+\*$/, c.id);
      assert.ok((c.quirk ?? '').length > 10, c.id);
      assert.doesNotMatch(`${c.opening} ${c.quirk}`, /possessive|jealous|control|guilt/i, c.id);
    }
  });
});
