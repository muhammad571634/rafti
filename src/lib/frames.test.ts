import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { frameLook, toggleSticker } from './frames';

describe('frameLook', () => {
  it('takes the color, its ink and a light pattern', () => {
    const look = frameLook({ color: 'pink', pattern: 'dots', stickers: ['sun'], caption: ' my favorite ' });
    assert.equal(look.bg, '#FFB8CB');
    assert.equal(look.ink, '#8E2A4E');
    assert.equal(look.pattern, 'dots');
    assert.equal(look.caption, 'my favorite');
  });

  it('falls back to white and drops an empty caption', () => {
    const look = frameLook({ color: 'nope', pattern: 'none', stickers: [], caption: '  ' });
    assert.equal(look.bg, '#FFFFFF');
    assert.equal(look.caption, undefined);
  });
});

describe('toggleSticker', () => {
  it('adds, removes, and keeps the newest two', () => {
    assert.deepEqual(toggleSticker([], 'sun'), ['sun']);
    assert.deepEqual(toggleSticker(['sun'], 'sun'), []);
    assert.deepEqual(toggleSticker(['sun', 'cake'], 'fish'), ['cake', 'fish']);
  });
});
