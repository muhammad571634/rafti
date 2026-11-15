import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { birthdayLabel, monthNames, profileCompletion } from './profile';

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

describe('profileCompletion', () => {
  const base = { displayName: '', interests: [] } as unknown as Parameters<typeof profileCompletion>[0];
  it('counts the seven parts the edit screen shows', () => {
    assert.equal(profileCompletion(base), 0);
    assert.equal(profileCompletion({ ...base, displayName: 'Sukut' }), 14);
    assert.equal(profileCompletion({ ...base, displayName: 'Sukut', interests: ['Music'] }), 29);
    assert.equal(
      profileCompletion({ ...base, avatarUri: 'file://a.jpg', displayName: 'Sukut', pronouns: 'he', birthday: '03-14', job: 'Dev', interests: ['Music'], about: 'Hi' } as typeof base),
      100,
    );
  });
  it('does not count blank words', () => {
    assert.equal(profileCompletion({ ...base, displayName: '   ', job: ' ', about: '\n' } as typeof base), 0);
  });
});
