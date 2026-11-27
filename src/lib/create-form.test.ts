import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BLANK, cleanList, fieldPatch, initialsOf, isTrait } from './create-form';

describe('create form', () => {
  it('fills each rewritten field where the form keeps it', () => {
    assert.deepEqual(fieldPatch('bio', 'Me.'), { bio: 'Me.' });
    assert.deepEqual(fieldPatch('relation', 'Your ex'), { relation: 'Your ex' });
    assert.deepEqual(fieldPatch('greetings', ['Hi', 'Hey']), { greetings: ['Hi', 'Hey'] });
    assert.deepEqual(fieldPatch('opinions', 'One'), { opinions: ['One'] });
    assert.deepEqual(fieldPatch('likes', ['tea', 'rain']), { likes: 'tea, rain' });
    assert.deepEqual(fieldPatch('tagline', ['a', 'b']), { tagline: 'a\nb' });
    assert.deepEqual(fieldPatch('dialog', '{{char}}: hi'), { definition: '{{char}}: hi' });
  });

  it('draws two initials, or ? with no name', () => {
    assert.equal(initialsOf('alisa vetrova smith'), 'AV');
    assert.equal(initialsOf('  '), '?');
  });

  it('clears an empty list and trims the rest', () => {
    assert.equal(cleanList([' ', '']), undefined);
    assert.deepEqual(cleanList([' a ', '', 'b']), ['a', 'b']);
  });

  it('starts blank with no traits and knows a trait from a tag', () => {
    assert.deepEqual(BLANK.traits, []);
    assert.equal(isTrait('not-a-trait-tag'), false);
  });
});
