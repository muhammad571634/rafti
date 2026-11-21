import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { deckForHour, greetingKeys, hourLead, hourVolume, isQuietHour, leadFirst, partOfDay } from './night-hour';

const PICKS = ['c_milo', 'c_caleb', 'c_mia', 'c_sam'];

describe('partOfDay: the hour into a mood', () => {
  it('splits the day at 5, 12 and 18', () => {
    assert.deepEqual([0, 4, 5, 11, 12, 17, 18, 23].map(partOfDay), ['night', 'night', 'morning', 'morning', 'afternoon', 'afternoon', 'evening', 'evening']);
  });

  it('wraps hours outside 0-23', () => {
    assert.equal(partOfDay(24), 'night');
    assert.equal(partOfDay(-1), 'evening');
  });
});

describe('deckForHour: who the deck opens on', () => {
  it('leads with Mia after midnight and keeps the rest in order', () => {
    assert.deepEqual(deckForHour(PICKS, 'night'), ['c_mia', 'c_milo', 'c_caleb', 'c_sam']);
  });

  it('leads with Milo in the evening (already first)', () => {
    assert.deepEqual(deckForHour(PICKS, 'evening'), PICKS);
  });

  it('never adds a friend who is not in the picks', () => {
    assert.deepEqual(deckForHour(['c_milo', 'c_caleb'], 'night'), ['c_milo', 'c_caleb']);
  });
});

describe('leadFirst: the friend of the hour leads a row', () => {
  const row = [{ id: 'c_caleb' }, { id: 'c_milo' }, { id: 'c_ava' }];
  const pool = [...row, { id: 'c_mia' }, { id: 'c_sam' }];
  const id = (c: { id: string }) => c.id;

  it('moves the friend already on the row to the front', () => {
    assert.deepEqual(leadFirst(row, id, 'evening').map(id), ['c_milo', 'c_caleb', 'c_ava']);
  });

  it('brings them from the pool when the row lacks them', () => {
    assert.deepEqual(leadFirst(row, id, 'night', pool).map(id), ['c_mia', 'c_caleb', 'c_milo', 'c_ava']);
  });

  it('changes nothing when nobody has them', () => {
    assert.deepEqual(leadFirst(row, id, 'morning').map(id), ['c_caleb', 'c_milo', 'c_ava']);
    assert.equal(hourLead('morning'), 'c_sam');
  });
});

describe('hourVolume: softer after midnight', () => {
  it('halves a sound from 00:00 to 04:59 only', () => {
    assert.equal(hourVolume(0.6, 0), 0.3);
    assert.equal(hourVolume(0.6, 4), 0.3);
    assert.equal(hourVolume(0.6, 5), 0.6);
    assert.equal(hourVolume(0.6, 23), 0.6);
  });
});

describe('the quiet hour and greetings', () => {
  it('is quiet only at night', () => {
    assert.equal(isQuietHour('night'), true);
    assert.equal(isQuietHour('evening'), false);
  });

  it('names both keys of the greeting', () => {
    assert.deepEqual(greetingKeys('night'), { title: 'onboarding.dayNight', line: 'onboarding.dayNightLine' });
  });
});
