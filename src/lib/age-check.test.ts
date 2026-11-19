import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseModelReply } from '../ai/reply-style';
import { buildGroupPrompt } from '../ai/rules';
import { characters } from '../mock/characters';
import { currentUser } from '../mock/user';
import type { User } from '@/types';

import { adultYear, ageDoubt, ageLines, ageUnclear, confirmedAge, withAgeDoubt } from './age-check';

const now = new Date('2026-11-19T12:00:00Z');
const adult: User = { ...currentUser, birthYear: 1998, onboardedAt: '2026-11-01T00:00:00Z', ageCheck: undefined };

describe('age assurance (0z289)', () => {
  it('is clear for an onboarded adult, unclear without a year or after a chat doubt', () => {
    assert.equal(ageDoubt(adult, now), null);
    assert.equal(ageDoubt({ ...adult, birthYear: undefined }, now), 'noYear');
    assert.equal(ageDoubt({ ...adult, onboardedAt: undefined, birthYear: undefined }, now), null);
    assert.equal(ageDoubt(withAgeDoubt(adult, now), now), 'chat');
    assert.ok(ageUnclear({ ...adult, birthYear: 2012 }, now));
  });

  it('counts 18 the way the onboarding gate does', () => {
    assert.ok(adultYear(2008, now));
    assert.ok(!adultYear(2009, now));
    assert.ok(!adultYear(1800, now));
  });

  it('raises a doubt once, keeping its first date', () => {
    const first = withAgeDoubt(adult, now);
    const again = withAgeDoubt(first, new Date('2026-12-01T00:00:00Z'));
    assert.equal(again.ageCheck?.at, now.toISOString());
  });

  it('clears a doubt with an adult year and locks it for good with a minor one', () => {
    const doubted = withAgeDoubt({ ...adult, birthYear: undefined }, now);
    const cleared = confirmedAge(doubted, 1995, now);
    assert.equal(cleared.ageCheck, undefined);
    assert.equal(cleared.birthYear, 1995);
    assert.equal(ageDoubt(cleared, now), null);

    const locked = confirmedAge(doubted, 2011, now);
    assert.equal(ageDoubt(locked, now), 'locked');
    assert.equal(locked.birthYear, undefined);
    assert.equal(ageDoubt(confirmedAge(locked, 1990, now), now), 'locked');
  });

  it('tells every character to stay careful only while the age is unclear', () => {
    assert.deepEqual(ageLines(adult, now), []);
    const lines = ageLines(withAgeDoubt(adult, now), now).join(' ');
    assert.match(lines, /AGE NOT CONFIRMED/);
    assert.match(lines, /No romance or flirting/);
    assert.match(lines, /Nothing sexual at all/);
    const [character, other] = characters;
    assert.match(buildGroupPrompt(character, [other], withAgeDoubt(adult)), /AGE NOT CONFIRMED/);
    assert.doesNotMatch(buildGroupPrompt(character, [other], adult), /AGE NOT CONFIRMED/);
  });

  it('reads the model’s minor flag only when it is true', () => {
    assert.equal(parseModelReply('{"crisis":false,"minor":true,"messages":["hey"]}').minor, true);
    assert.equal(parseModelReply('{"crisis":false,"minor":"yes","messages":["hey"]}').minor, undefined);
    assert.equal(parseModelReply('{"crisis":false,"messages":["hey"]}').minor, undefined);
  });
});
