import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildCharacterPrompt } from '../ai/rules';
import type { Character, Persona, User } from '@/types';

import {
  addTopicLine,
  checkPersona,
  defaultPersona,
  personaFor,
  personaList,
  PROFILE_PERSONA,
} from './personas';

const user = { displayName: 'Sam', locale: 'en-US', pronouns: 'they', job: 'Nurse', about: 'Night owl.' } as User;
const knight: Persona = { id: 'p1', name: 'Ser Ada', pronouns: 'she', about: 'A wandering knight.', createdAt: '2026-10-25T00:00:00.000Z' };
const pilot: Persona = { id: 'p2', name: 'Vik', about: 'Cargo pilot.', createdAt: '2026-10-25T00:00:00.000Z' };
const state = { user, personas: [knight, pilot], chatPersonas: {} as Record<string, string> };

describe('personas', () => {
  it('lists the profile first, then the user’s own', () => {
    assert.deepEqual(personaList(state).map((p) => [p.id, p.profile]), [
      [PROFILE_PERSONA, true],
      ['p1', false],
      ['p2', false],
    ]);
  });

  it('uses the chat’s pick, else the default, else the profile', () => {
    assert.equal(personaFor('c1', state).name, 'Sam');
    assert.equal(personaFor('c1', { ...state, defaultPersonaId: 'p2' }).name, 'Vik');
    assert.equal(personaFor('c1', { ...state, defaultPersonaId: 'p2', chatPersonas: { c1: 'p1' } }).name, 'Ser Ada');
    // The profile can be picked for one chat even when another persona is the default.
    assert.equal(personaFor('c1', { ...state, defaultPersonaId: 'p2', chatPersonas: { c1: PROFILE_PERSONA } }).name, 'Sam');
    // A deleted persona falls back.
    assert.equal(personaFor('c1', { ...state, chatPersonas: { c1: 'gone' } }).name, 'Sam');
    assert.equal(defaultPersona({ ...state, defaultPersonaId: 'gone' }).profile, true);
  });

  it('checks the name, the limit and the content rules', () => {
    assert.deepEqual(checkPersona({ name: 'Ada', about: '' }, 0, 1), []);
    assert.deepEqual(checkPersona({ name: ' ', about: '' }, 0, 1), ['name']);
    assert.deepEqual(checkPersona({ name: 'Ada', about: '' }, 1, 1), ['full']);
    assert.deepEqual(checkPersona({ name: 'Ada', about: 'A high school student' }, 0, 5), ['minors']);
  });

  it('starts a topic line, once', () => {
    assert.equal(addTopicLine('', 'Likes'), 'Likes: ');
    assert.equal(addTopicLine('Tall.  ', 'Likes'), 'Tall.\nLikes: ');
    assert.equal(addTopicLine('Tall.\nLikes: ', 'Likes'), 'Tall.\nLikes: ');
  });
});

describe('buildCharacterPrompt with a persona', () => {
  const character = { id: 'c', name: 'Mira', bio: 'Keeps a lighthouse.', greeting: 'Hi.', tags: [] } as unknown as Character;

  it('describes the persona instead of the profile', () => {
    const prompt = buildCharacterPrompt(character, user, undefined, 'English', personaFor('c1', { ...state, defaultPersonaId: 'p1' }));
    assert.match(prompt, /THE USER:\nName: Ser Ada\nPronouns: she\nThis is the persona/);
    assert.match(prompt, /About them, in their words: A wandering knight\./);
    assert.doesNotMatch(prompt, /Nurse|Night owl/);
  });

  it('keeps the profile when the chat uses it', () => {
    const prompt = buildCharacterPrompt(character, user, undefined, 'English', personaFor('c1', state));
    assert.match(prompt, /Name: Sam\nPronouns: they\nJob: Nurse/);
  });
});
