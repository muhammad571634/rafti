import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseDefinition } from '../ai/character-draft';
import { CHARACTER_PROFILES } from '../mock/character-profiles';
import { characters } from '../mock/characters';

import { heightLabel } from './character-facts';
import {
  BACKSTORY_MAX,
  DEFINITION_MAX,
  GREETING_MAX,
  HEIGHT_MAX,
  HEIGHT_MIN,
  LOOK_MAX,
  MIN_AGE,
  MORE_GREETINGS_MAX,
  STARTER_MAX,
  STARTERS_MAX,
  TAGLINE_MAX,
  THING_MAX,
  THINGS_MAX,
} from './create-character';

describe('heightLabel', () => {
  it('reads feet and inches in the US, centimetres elsewhere', () => {
    assert.equal(heightLabel(184, 'en-US'), '6′0″');
    assert.equal(heightLabel(170, 'en-US'), '5′7″');
    assert.equal(heightLabel(184, 'en-GB'), '184 cm');
  });
});

describe('the official cast’s profiles', () => {
  const entries = Object.entries(CHARACTER_PROFILES);

  it('cover every official character', () => {
    for (const c of characters.filter((x) => x.isOfficial)) assert.ok(CHARACTER_PROFILES[c.id], c.id);
  });

  it('belong to official characters, who are adults', () => {
    for (const [id, p] of entries) {
      const character = characters.find((c) => c.id === id);
      assert.ok(character?.isOfficial, id);
      assert.ok((p.age ?? 0) >= MIN_AGE, id);
      assert.equal(character.tagline, p.tagline, id);
    }
  });

  it('keep to the creation form’s limits', () => {
    for (const [id, p] of entries) {
      assert.ok((p.tagline ?? '').length <= TAGLINE_MAX, `${id} tagline`);
      assert.ok((p.look ?? '').length <= LOOK_MAX, `${id} look`);
      assert.ok((p.greetings ?? []).length <= MORE_GREETINGS_MAX, `${id} greetings`);
      for (const g of p.greetings ?? []) assert.ok(g.length <= GREETING_MAX, `${id} greeting: ${g}`);
      assert.ok((p.starters ?? []).length <= STARTERS_MAX, `${id} starters`);
      for (const s of p.starters ?? []) assert.ok(s.length <= STARTER_MAX, `${id} starter: ${s}`);
      assert.ok((p.backstory ?? '').length <= BACKSTORY_MAX, `${id} backstory`);
      assert.ok((p.definition ?? '').length <= DEFINITION_MAX, `${id} definition`);
      assert.ok(p.heightCm !== undefined && p.heightCm >= HEIGHT_MIN && p.heightCm <= HEIGHT_MAX, `${id} height`);
      for (const things of [p.likes ?? [], p.dislikes ?? []]) {
        assert.ok(things.length <= THINGS_MAX, `${id} things`);
        for (const t of things) assert.ok(t.length <= THING_MAX, `${id} thing: ${t}`);
      }
    }
  });

  it('write their sample dialog with other people, in whole turns', () => {
    for (const [id, p] of entries) {
      const turns = parseDefinition(p.definition ?? '');
      assert.ok(turns.length >= 4, id);
      assert.ok(turns.every((turn) => turn.speaker === '{{char}}' || turn.speaker === '{{random_user_1}}'), id);
    }
  });
});
