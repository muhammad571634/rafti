import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { friendHueIndex } from './friend-color';

describe("a friend's colour", () => {
  it('is the same every time for the same friend', () => {
    assert.equal(friendHueIndex('hana', 8), friendHueIndex('hana', 8));
    assert.equal(friendHueIndex('c_1730000000_ab', 8), friendHueIndex('c_1730000000_ab', 8));
  });

  it('always lands inside the palette', () => {
    for (const id of ['', 'a', 'hana', 'theo', 'Prince Aurelian', 'Ивa', '小美', 'x'.repeat(500)]) {
      const i = friendHueIndex(id, 8);
      assert.ok(Number.isInteger(i) && i >= 0 && i < 8, `${id} → ${i}`);
    }
  });

  it('spreads a cast over most of the hues', () => {
    const ids = ['hana', 'theo', 'aurelian', 'ezra', 'ivy', 'seraphine', 'erik', 'kai', 'iris', 'ronan', 'maniki', 'luca'];
    const used = new Set(ids.map((id) => friendHueIndex(id, 8)));
    assert.ok(used.size >= 5, `only ${used.size} hues for ${ids.length} friends`);
  });

  it('gives an empty palette index 0', () => {
    assert.equal(friendHueIndex('hana', 0), 0);
  });
});
