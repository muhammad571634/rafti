import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { characters } from '../mock/characters';
import { currentUser } from '../mock/user';

import { buildDraftPrompt } from './character-draft';
import { buildGroupPrompt, CHARACTER_RULES } from './rules';

describe('fan characters (0z293)', () => {
  const [official, other] = characters;
  const made = { ...official, id: 'u_gojo', isOfficial: false, name: 'Gojo Satoru' };

  it('lets a user-made character play someone from a story, never a real person', () => {
    assert.match(CHARACTER_RULES, /FAN CHARACTERS/);
    assert.match(CHARACTER_RULES, /Sigmazam's own characters are original/);
    assert.match(CHARACTER_RULES, /real person/);
    assert.doesNotMatch(CHARACTER_RULES, /owned by another company/);
  });

  it('marks only user-made characters as made by a user', () => {
    assert.match(buildGroupPrompt(made, [other], currentUser), /Made by a user\./);
    assert.doesNotMatch(buildGroupPrompt(official, [other], currentUser), /Made by a user\./);
  });

  it('asks the draft writer for fan takes in their own words, without the "owned" refusal', () => {
    const prompt = buildDraftPrompt({ idea: 'Gojo from Jujutsu Kaisen as my roommate', sparks: [], language: 'English' } as never);
    assert.match(prompt, /fan fiction/);
    assert.doesNotMatch(prompt, /"refused":"owned"/);
    assert.match(prompt, /"refused":"realPerson"/);
    assert.match(prompt, /Never a minor or a school student/);
  });
});
