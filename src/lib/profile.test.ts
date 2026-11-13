import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { birthdayLabel, monthNames } from './profile';

describe('the birthday reads in the app language (0z156)', () => {
  it('writes month and day the way the language does', () => {
    assert.equal(birthdayLabel('11-08', 'en'), 'Nov 8');
    assert.equal(birthdayLabel('11-08', 'tr'), '8 Kas');
    assert.equal(birthdayLabel('02-29', 'en'), 'Feb 29');
  });

  it('shows nothing for a missing or broken value', () => {
    assert.equal(birthdayLabel(undefined), undefined);
    assert.equal(birthdayLabel('xx'), undefined);
  });

  it('names twelve months in the language, January first', () => {
    const tr = monthNames('tr');
    assert.equal(tr.length, 12);
    assert.equal(tr[0], 'Oca');
    assert.equal(monthNames('en')[11], 'Dec');
  });
});
