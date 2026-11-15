import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fitsOnOneLine, titleFit } from './title-fit';

test('a long single word shrinks on one line', () => {
  assert.equal(fitsOnOneLine('Mitteilungseinstellungen'), true);
  assert.deepEqual(titleFit('Mitteilungseinstellungen'), { numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: 0.55 });
});

test('short words and phrases wrap as usual', () => {
  assert.equal(fitsOnOneLine('Store'), false);
  assert.equal(fitsOnOneLine('Notification settings'), false);
  assert.equal(fitsOnOneLine('  Schlafenszeit  '), false);
  assert.deepEqual(titleFit('Mit Sam schlafen'), {});
});

test('non-text children are left alone', () => {
  assert.deepEqual(titleFit(undefined), {});
  assert.deepEqual(titleFit(42), {});
});
