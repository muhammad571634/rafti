import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { overlay } from './overlay';

describe('overlay: lays translated content over the English object', () => {
  it('replaces a non-empty string', () => {
    assert.equal(overlay('Hello', 'Привет'), 'Привет');
  });

  it('keeps the English string if translation is empty or whitespace', () => {
    assert.equal(overlay('Hello', ''), 'Hello');
    assert.equal(overlay('Hello', '   '), 'Hello');
    assert.equal(overlay('Hello', null), 'Hello');
    assert.equal(overlay('Hello', undefined), 'Hello');
  });

  it('keeps English array when translation has the wrong length', () => {
    const en = ['one', 'two', 'three'];
    const tr = ['один', 'два'];
    assert.deepEqual(overlay(en, tr), en);

    const trLong = ['один', 'два', 'три', 'четыре'];
    assert.deepEqual(overlay(en, trLong), en);
  });

  it('overlays plain array of the same length', () => {
    const en = ['one', 'two'];
    const tr = ['один', 'два'];
    assert.deepEqual(overlay(en, tr), ['один', 'два']);
  });

  it('matches id-keyed array by id', () => {
    const en = [
      { id: 'c1', name: 'Kai', bio: 'Swimmer' },
      { id: 'c2', name: 'Theo', bio: 'Student' },
    ];
    const tr = {
      c2: { bio: 'Студент' },
      c1: { bio: 'Пловец' },
    };
    const res = overlay(en, tr);
    assert.deepEqual(res, [
      { id: 'c1', name: 'Kai', bio: 'Пловец' },
      { id: 'c2', name: 'Theo', bio: 'Студент' },
    ]);
  });

  it('matches key-keyed array by key', () => {
    const en = [
      { key: 'k1', intro: 'Welcome' },
      { key: 'k2', intro: 'Greetings' },
    ];
    const tr = {
      k1: { intro: 'Добро пожаловать' },
    };
    const res = overlay(en, tr);
    assert.deepEqual(res, [
      { key: 'k1', intro: 'Добро пожаловать' },
      { key: 'k2', intro: 'Greetings' },
    ]);
  });

  it('ignores unknown keys in translation', () => {
    const en = { bio: 'Swimmer', tagline: 'Fast' };
    const tr = { bio: 'Пловец', extraField: 'should be ignored', another: 123 };
    const res = overlay(en, tr);
    assert.deepEqual(res, { bio: 'Пловец', tagline: 'Fast' });
  });

  it('never overwrites ids or untranslated metadata', () => {
    const en = { id: 'c_kai', count: 42, bio: 'Hello' };
    const tr = { id: 'c_hacked', count: 99, bio: 'Привет' };
    const res = overlay(en, tr);
    assert.deepEqual(res, { id: 'c_kai', count: 42, bio: 'Привет' });
  });
});
