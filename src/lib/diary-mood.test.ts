import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DIARY_MOOD_HEX,
  DIARY_MOOD_RGB,
  DIARY_MOODS,
  diaryMoodIndex,
  diaryMoodIndexAt,
  diaryMoodNorm,
  diaryMoodRadius,
  diaryMoodRgb,
  diaryMoodRgba,
} from './diary-mood';

describe('diary-mood', () => {
  it('keeps all 5 DiaryMood values aligned with RGB and hex stops', () => {
    assert.equal(DIARY_MOODS.length, 5);
    assert.equal(DIARY_MOOD_RGB.length, DIARY_MOODS.length);
    assert.equal(DIARY_MOOD_HEX.length, DIARY_MOODS.length);
    assert.equal(diaryMoodIndex('soft'), 2);
    assert.equal(diaryMoodIndex('tired'), 0);
    assert.equal(diaryMoodIndex('excited'), 4);
  });

  it('round-trips every mood index through normalized positions cleanly', () => {
    for (let i = 0; i < DIARY_MOODS.length; i++) {
      const n = diaryMoodNorm(i);
      assert.equal(diaryMoodIndexAt(n), i);
    }
    assert.equal(diaryMoodIndexAt(-0.5), 0);
    assert.equal(diaryMoodIndexAt(2.5), 4);
    assert.equal(diaryMoodIndexAt(Number.NaN), 0);
  });

  it('interpolates mood colors continuously within sRGB bounds', () => {
    const low = diaryMoodRgb(0);
    const high = diaryMoodRgb(1);
    assert.deepEqual(low, [...DIARY_MOOD_RGB[0]]);
    assert.deepEqual(high, [...DIARY_MOOD_RGB[4]]);
    const mid = diaryMoodRgba(0.5, 0.25);
    assert.match(mid, /^rgba\(\d+,\d+,\d+,0\.25\)$/);
  });

  it('morphs cleanly from spiky (low) to smooth circle (mid) to 7-petal bloom (high)', () => {
    // At soft (norm ~ 0.456 -> m = 0.5), radius should be nearly circular across all angles
    const circleAt0 = diaryMoodRadius(0, (0.5 - 0.08) / 0.92);
    const circleAtQuarter = diaryMoodRadius(Math.PI / 11, (0.5 - 0.08) / 0.92);
    assert.ok(Math.abs(circleAt0 - circleAtQuarter) < 0.001);

    // At tired (norm = 0), spike peak at phi=0 exceeds trough at phi=pi/11
    assert.ok(diaryMoodRadius(0, 0) > diaryMoodRadius(Math.PI / 11, 0) + 0.2);

    // At excited (norm = 1), petal crest at phi=0 exceeds notch at phi=pi/7
    assert.ok(diaryMoodRadius(0, 1) > diaryMoodRadius(Math.PI / 7, 1) + 0.2);
  });
});
