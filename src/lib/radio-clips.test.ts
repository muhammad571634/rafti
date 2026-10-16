import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CLIP_LINE_MAX,
  CLIP_TITLE_MAX,
  checkClip,
  cleanLines,
  clipCost,
  clipDuration,
  clipTitle,
  clipUnlocked,
  lineAt,
  lineSeconds,
} from './radio-clips';

describe('clipCost', () => {
  it('charges 1 shell per 5 lines, never less than 1', () => {
    assert.equal(clipCost(0), 1);
    assert.equal(clipCost(1), 1);
    assert.equal(clipCost(5), 1);
    assert.equal(clipCost(6), 2);
  });
});

describe('cleanLines', () => {
  it('trims, squeezes spaces and drops empty lines', () => {
    assert.deepEqual(cleanLines(['  Good   morning ', '', '   ', 'Coffee?']), ['Good morning', 'Coffee?']);
  });

  it('keeps at most 5 lines, each cut to size', () => {
    const lines = cleanLines(['a', 'b', 'c', 'd', 'e', 'f', 'x'.repeat(CLIP_LINE_MAX + 20)]);
    assert.deepEqual(lines, ['a', 'b', 'c', 'd', 'e']);
    assert.equal(cleanLines(['x'.repeat(CLIP_LINE_MAX + 20)])[0].length, CLIP_LINE_MAX);
  });
});

describe('timing', () => {
  const lines = ['Good morning, sleepyhead.', 'The sun is up and so is your coffee.'];

  it('gives short lines a floor and longer lines more time', () => {
    assert.equal(lineSeconds('Hi'), 1.2);
    assert.ok(lineSeconds(lines[1]) > lineSeconds(lines[0]));
  });

  it('rounds the clip up to whole seconds', () => {
    assert.equal(clipDuration(lines), Math.ceil(lineSeconds(lines[0]) + lineSeconds(lines[1])));
  });

  it('finds the line being said and stays on the last one at the end', () => {
    assert.equal(lineAt(lines, 0), 0);
    assert.equal(lineAt(lines, lineSeconds(lines[0]) + 0.1), 1);
    assert.equal(lineAt(lines, 99), 1);
    assert.equal(lineAt([], 3), 0);
  });
});

describe('clipTitle', () => {
  it('uses the typed name, else the first line', () => {
    assert.equal(clipTitle('  Wake up  ', ['Hi']), 'Wake up');
    assert.equal(clipTitle('', ['Good morning']), 'Good morning');
  });

  it('shortens a long first line', () => {
    const title = clipTitle('', ['word '.repeat(20).trim()]);
    assert.ok(title.length <= CLIP_TITLE_MAX);
    assert.ok(title.endsWith('…'));
  });
});

describe('checkClip', () => {
  it('needs at least one line', () => {
    assert.equal(checkClip(['', '  ']), 'noLines');
  });

  it('does not voice a crisis line', () => {
    assert.equal(checkClip(['Good night', 'I want to die']), 'crisis');
  });

  it('passes an ordinary clip', () => {
    assert.equal(checkClip(['Good luck on your exam!']), null);
  });
});

describe('clipUnlocked', () => {
  it('opens clips without a level, and level-gated ones at that level', () => {
    assert.equal(clipUnlocked(undefined, 0), true);
    assert.equal(clipUnlocked(5, 4), false);
    assert.equal(clipUnlocked(5, 5), true);
    assert.equal(clipUnlocked(5, undefined), false);
  });
});
