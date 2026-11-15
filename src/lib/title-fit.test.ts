import assert from 'node:assert/strict';
import { test } from 'node:test';

import { breaksMidWord, fitsOnOneLine, nextWordScale, titleFit } from './title-fit';

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

test('a word split across lines is found', () => {
  assert.equal(breaksMidWord(['Regne', 'rische Straße']), true);
  assert.equal(breaksMidWord(['Große Sc', 'hwester']), true);
  assert.equal(breaksMidWord(['Regnerische ', 'Straße']), false);
  assert.equal(breaksMidWord(['Mit Sam', ' schlafen']), false);
  assert.equal(breaksMidWord(['Mitteilungs-', 'einstellungen']), false);
  assert.equal(breaksMidWord(['One line']), false);
});

test('scripts without spaces never count as a broken word', () => {
  assert.equal(breaksMidWord(['今日はとても', 'いい天気です']), false);
  assert.equal(breaksMidWord(['สวัสดีครับ', 'วันนี้']), false);
});

test('the scale steps down to a floor', () => {
  assert.equal(nextWordScale(1), 0.92);
  assert.equal(nextWordScale(0.64), null);
});
