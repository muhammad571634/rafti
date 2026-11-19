import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { cleanCard, parseReview, reviewPrompt } from './community';

describe('community card and review (0z300)', () => {
  it('keeps only shared fields, cut to size, and needs a name and a greeting', () => {
    const card = cleanCard({ name: '  Levi  ', greeting: 'Tch.', avatarUri: 'file:///x.jpg', definition: 'private', arc: { secret: 's' }, tags: ['cold', '', 5], age: 12, accentIndex: 70 });
    assert.deepEqual(card, { name: 'Levi', greeting: 'Tch.', tags: ['cold'], age: 18, accentIndex: 6 });
    assert.equal(cleanCard({ name: 'Levi' }), null);
  });

  it('asks the review to pass fan characters and refuse real people', () => {
    const prompt = reviewPrompt({ name: 'Levi', greeting: 'Tch.' });
    assert.match(prompt, /fan characters/);
    assert.match(prompt, /realPerson/);
  });

  it('reads the verdict, and anything unreadable as busy', () => {
    assert.deepEqual(parseReview('{"ok":true}'), { ok: true });
    assert.deepEqual(parseReview('```json\n{"ok":false,"reason":"minor"}\n```'), { ok: false, reason: 'minor' });
    assert.deepEqual(parseReview('{"ok":false,"reason":"weird"}'), { ok: false, reason: 'harm' });
    assert.deepEqual(parseReview('sure!'), { ok: false, reason: 'busy' });
  });
});
