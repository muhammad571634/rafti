import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { deckForHour, greetingKeys, isQuietHour, partOfDay } from './night-hour';

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

describe('the quiet hour and greetings', () => {
  it('is quiet only at night', () => {
    assert.equal(isQuietHour('night'), true);
    assert.equal(isQuietHour('evening'), false);
  });

  it('names both keys of the greeting', () => {
    assert.deepEqual(greetingKeys('night'), { title: 'onboarding.dayNight', line: 'onboarding.dayNightLine' });
  });
});
