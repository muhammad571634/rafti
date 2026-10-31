import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { careLine } from '../mock/care';
import type { CareItem } from '@/types';

import { addCare, CARE_KINDS, CARE_OPEN_MAX, careCue, careDueAt, careStep, closeCare, detectCare, saysBetter } from './care';

const item = (id: string, extra: Partial<CareItem> = {}): CareItem => ({
  id,
  characterId: 'c_kai',
  kind: 'headache',
  dueAt: '2026-10-25T15:00:00.000Z',
  createdAt: '2026-10-25T12:00:00.000Z',
  ...extra,
});

describe('detectCare', () => {
  it('hears how the user is, in English and a little Uzbek and Russian', () => {
    assert.equal(detectCare('ugh I have such a headache'), 'headache');
    assert.equal(detectCare('boshim og‘riyapti'.replace('‘', "'")), 'headache');
    assert.equal(detectCare('I think I got a cold'), 'sick');
    assert.equal(detectCare('couldn’t sleep at all'.replace('’', "'")), 'tired');
    assert.equal(detectCare('we had a fight again'), 'fight');
    assert.equal(detectCare('i feel alone tonight'), 'lonely');
    assert.equal(detectCare('skipped lunch, too busy'), 'hungry');
    assert.equal(detectCare('голова болит'), 'headache');
    assert.equal(detectCare('see you at the cinema'), null);
  });

  it('knows when they are better', () => {
    assert.ok(saysBetter('feeling better now, thanks'));
    assert.ok(saysBetter('tuzaldim'));
    assert.ok(!saysBetter('still bad'));
  });
});

describe('careDueAt', () => {
  it('waits a few hours, and never asks at night', () => {
    const noon = new Date(2026, 9, 25, 12, 0);
    assert.equal(careDueAt('headache', noon).getHours(), 15);
    const late = careDueAt('headache', new Date(2026, 9, 25, 21, 0));
    assert.equal(late.getDate(), 26);
    assert.equal(late.getHours(), 9);
    const small = careDueAt('hungry', new Date(2026, 9, 26, 6, 0));
    assert.equal(small.getDate(), 26);
    assert.equal(small.getHours(), 9);
  });
});

describe('check-ins', () => {
  it('keeps one per kind and a few per friend', () => {
    const one = addCare([], item('a'));
    assert.equal(addCare(one, item('b')).length, 1);
    const two = addCare(one, item('b', { kind: 'tired' }));
    assert.equal(two.length, CARE_OPEN_MAX);
    assert.equal(addCare(two, item('c', { kind: 'sad' })).length, CARE_OPEN_MAX);
    assert.equal(addCare(two, item('d', { kind: 'sad', characterId: 'c_theo' })).length, 3);
  });

  it('asks inside its window, skips after, and closes when they are better', () => {
    const open = item('a');
    assert.equal(careStep(open, new Date('2026-10-25T14:00:00.000Z')), null);
    assert.equal(careStep(open, new Date('2026-10-25T16:00:00.000Z')), 'ask');
    assert.equal(careStep(open, new Date('2026-10-25T23:00:00.000Z')), 'skip');
    assert.equal(careStep(closeCare([open], 'c_kai')[0], new Date('2026-10-25T16:00:00.000Z')), null);
  });

  it('has a line and a server cue for every kind, the same line for the same check-in', () => {
    for (const kind of CARE_KINDS) {
      assert.ok(careLine(kind, 'x').length > 0);
      assert.equal(careLine(kind, 'seed'), careLine(kind, 'seed'));
      assert.match(careCue(kind).join('\n'), /You are writing first/);
    }
  });
});
