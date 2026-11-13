import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { type CreateForm, firstProblemSection, hasContent, problemsBySection, readSavedCreation, sameForm, sectionOf } from './create-flow';

const empty: CreateForm = {
  photoRights: false,
  name: '',
  tagline: '',
  age: '',
  traits: [],
  style: 'casual',
  role: 'friend',
  bio: '',
  look: '',
  quirk: '',
  greeting: '',
  opening: '',
  greetings: [],
  definition: '',
  starters: [],
  height: '',
  backstory: '',
  likes: '',
  dislikes: '',
  opinions: [],
  category: 'original',
};

describe('the create chain (0z149)', () => {
  it('sends each problem to the card that fixes it', () => {
    assert.equal(sectionOf('name'), 'who');
    assert.equal(sectionOf('photoRights'), 'who');
    assert.equal(sectionOf('voiceConsent'), 'voice');
    assert.equal(sectionOf('explicit'), 'personality');
  });

  it('shows one problem per card and takes the button to the highest card', () => {
    assert.deepEqual(problemsBySection(['voice', 'age', 'name']), { voice: 'voice', who: 'age' });
    assert.equal(firstProblemSection(['voice', 'explicit']), 'personality');
    assert.equal(firstProblemSection([]), undefined);
  });

  it('keeps a creation only when it holds something', () => {
    assert.equal(hasContent(empty), false);
    assert.equal(hasContent({ ...empty, name: 'Nova' }), true);
    assert.equal(hasContent({ ...empty, imageUri: 'file:///a.jpg' }), true);
  });

  it('reads back a recent, well-formed creation and drops the rest', () => {
    const now = Date.parse('2026-11-08T12:00:00Z');
    const saved = (savedAt: string, form: CreateForm = { ...empty, name: 'Nova' }) => JSON.stringify({ v: 1, savedAt, form });
    assert.equal(readSavedCreation(saved('2026-11-08T11:00:00Z'), now)?.form.name, 'Nova');
    assert.equal(readSavedCreation(saved('2026-10-30T11:00:00Z'), now), null);
    assert.equal(readSavedCreation(saved('2026-11-08T11:00:00Z', empty), now), null);
    assert.equal(readSavedCreation('{broken', now), null);
    assert.equal(readSavedCreation(null, now), null);
  });

  it('tells an untouched edit from a changed one', () => {
    assert.equal(sameForm({ ...empty, name: 'Nova' }, { ...empty, name: 'Nova' }), true);
    assert.equal(sameForm({ ...empty, name: 'Nova' }, { ...empty, name: 'Nova ' }), false);
  });
});
