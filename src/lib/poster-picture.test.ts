import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Character } from '@/types';

import { posterCharacter } from './poster-picture';

const base = { id: 'c_x', name: 'Mira', avatarUri: 'file:///pictures/picture-1.jpg' } as Character;

describe('posterCharacter (an uploaded picture never goes on a poster)', () => {
  it('drops a picture the user put in from their phone', () => {
    assert.equal(posterCharacter({ ...base, isOfficial: false }).avatarUri, undefined);
  });
  it('keeps a picture we drew', () => {
    assert.equal(posterCharacter({ ...base, isOfficial: false, pictureDrawn: true }).avatarUri, base.avatarUri);
  });
  it('keeps the official cast as it is', () => {
    const official = { ...base, isOfficial: true };
    assert.equal(posterCharacter(official), official);
  });
});
