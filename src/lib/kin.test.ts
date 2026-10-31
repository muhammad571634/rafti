import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildCharacterPrompt } from '../ai/rules';
import { familyHello, lifeLine } from '../mock/kin';
import type { Character, Relationship, User } from '@/types';

import { FAMILY_LABELS, FAMILY_NAME_MAX, familyName, familyOf, isFamilyLabel, kinGroup, lifeKey, lifeMoments, rankForKin } from './kin';

describe('family labels', () => {
  it('put a friend in a family group; other labels stay out', () => {
    assert.equal(kinGroup('Mom'), 'parent');
    assert.equal(kinGroup('Little brother'), 'sibling');
    assert.equal(kinGroup('Grandpa'), 'grandparent');
    assert.equal(kinGroup('Crush'), null);
    assert.equal(kinGroup(undefined), null);
    assert.ok(FAMILY_LABELS.every(isFamilyLabel));
  });

  it('keep a day: Mom at lunch and in the evening, a call on Sunday', () => {
    const monday = new Date(2026, 9, 26);
    const sunday = new Date(2026, 9, 25);
    assert.deepEqual(lifeMoments('parent', monday).map((m) => m.key), ['lunch', 'evening']);
    assert.deepEqual(lifeMoments('parent', sunday).map((m) => m.key), ['lunch', 'evening', 'sunday']);
    assert.deepEqual(lifeMoments('sibling', new Date(2026, 9, 24)).map((m) => m.key), ['evening', 'weekend']);
  });

  it('say the same line for the same moment', () => {
    const key = lifeKey('2026-10-26', 'c_kai', 'lunch');
    assert.equal(lifeLine('parent', 'lunch', key), lifeLine('parent', 'lunch', key));
    assert.match(lifeLine('parent', 'lunch', key), /lunch|eat/i);
  });

  it('tell the model it is family and never romantic', () => {
    const character = { id: 'c_kai', name: 'Kai', bio: 'Swimmer.', greeting: 'Hi.', tags: [] } as unknown as Character;
    const user = { displayName: 'Sam', locale: 'en' } as User;
    const bond = { level: 30, levelTitle: 'Beloved', label: 'Mom', nickname: 'Onam' } as Relationship;
    const prompt = buildCharacterPrompt(character, user, bond);
    assert.match(prompt, /you are family: their Mom/);
    assert.match(prompt, /Never romantic or flirty/);
    assert.doesNotMatch(prompt, /they call you their Mom/);
    assert.match(prompt, /they call you "Onam"/);
  });

  it('keep one person per role', () => {
    const holders = familyOf({ a: { label: 'Mom' }, b: { label: 'Best friend' }, c: { label: 'Dad' }, d: { label: 'Mom' } });
    assert.deepEqual(holders, { Mom: 'a', Dad: 'c' });
    assert.deepEqual(familyOf({ a: { label: 'Mom' } }, () => false), {});
  });

  it('go by the name the user gives, else the role', () => {
    assert.equal(familyName('  Onam  ', 'Mom'), 'Onam');
    assert.equal(familyName('   ', 'Dad'), 'Dad');
    assert.equal(familyName('x'.repeat(50), 'Dad').length, FAMILY_NAME_MAX);
  });

  it('offer women first for Mom and men first for Dad', () => {
    const people = [{ id: 'kai', gender: 'male' }, { id: 'own' }, { id: 'lyra', gender: 'female' }, { id: 'theo', gender: 'male' }];
    assert.deepEqual(rankForKin(people, 'Mom').map((p) => p.id), ['lyra', 'kai', 'theo', 'own']);
    assert.deepEqual(rankForKin(people, 'Big brother').map((p) => p.id), ['kai', 'theo', 'lyra', 'own']);
  });

  it('say hello like family', () => {
    assert.equal(familyHello('parent', 'c_kai'), familyHello('parent', 'c_kai'));
    assert.ok(familyHello('grandparent', 'x').length > 0);
  });
});
