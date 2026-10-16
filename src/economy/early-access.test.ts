import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { canAddCharacter, EARLY_ACCESS_DAYS, isNewCharacter, isReleased, opensToAllAt } from './early-access';

const NOW = Date.parse('2026-10-13T08:00:00.000Z');
const DAY = 86_400_000;
const releasedDaysAgo = (n: number) => ({ releasedAt: new Date(NOW - n * DAY).toISOString() });

describe('early access: new characters open to Pro first', () => {
  it('leaves characters without a release date open to everyone', () => {
    assert.equal(isNewCharacter({}, NOW), false);
    assert.equal(canAddCharacter({}, false, NOW), true);
    assert.equal(opensToAllAt({}), null);
  });

  it('opens a new character to Pro only during the first 7 days', () => {
    const fresh = releasedDaysAgo(2);
    assert.equal(isNewCharacter(fresh, NOW), true);
    assert.equal(canAddCharacter(fresh, true, NOW), true);
    assert.equal(canAddCharacter(fresh, false, NOW), false);
    assert.equal(opensToAllAt(fresh), NOW + (EARLY_ACCESS_DAYS - 2) * DAY);
  });

  it('opens to everyone after 7 days and leaves the New row', () => {
    const week = releasedDaysAgo(EARLY_ACCESS_DAYS);
    assert.equal(isNewCharacter(week, NOW), false);
    assert.equal(canAddCharacter(week, false, NOW), true);
  });

  it('hides a character before its release day, even from Pro', () => {
    const soon = releasedDaysAgo(-1);
    assert.equal(isReleased(soon, NOW), false);
    assert.equal(isNewCharacter(soon, NOW), false);
    assert.equal(canAddCharacter(soon, true, NOW), false);
  });
});
