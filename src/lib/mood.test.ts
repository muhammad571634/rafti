import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { bandCentre, isMoodBand, MOOD_BANDS, moodBand, moodColor, moodPath, moodRadius, moodTone } from './mood';

describe('mood check-in', () => {
  it('splits the slider into seven equal bands and clamps past the ends', () => {
    assert.equal(moodBand(-0.4), 0);
    assert.equal(moodBand(0), 0);
    assert.equal(moodBand(0.5), 3);
    assert.equal(moodBand(0.999), 6);
    assert.equal(moodBand(1), 6);
    assert.equal(moodBand(3), 6);
    for (let b = 0; b < MOOD_BANDS; b++) assert.equal(moodBand(bandCentre(b)), b);
  });

  it('settles a band in its middle', () => {
    assert.equal(bandCentre(3), 0.5);
    assert.equal(bandCentre(-2), bandCentre(0));
    assert.equal(bandCentre(9), bandCentre(6));
  });

  it('is a circle in the middle, spiky at the heavy end and petalled at the good end', () => {
    for (let i = 0; i < 12; i++) assert.ok(Math.abs(moodRadius(i, 0.5) - 1) < 1e-9);
    // Heavy: a peak reaches the full radius, the valleys sink to the smaller body.
    assert.ok(Math.abs(moodRadius(0, 0) - 1) < 1e-9);
    assert.ok(moodRadius(Math.PI / 11, 0) < 0.6);
    // Wonderful: lobes at full radius, notches 30 % in.
    assert.ok(Math.abs(moodRadius(0, 1) - 1) < 1e-9);
    assert.ok(Math.abs(moodRadius(Math.PI / 7, 1) - 0.7) < 1e-9);
    for (let i = 0; i < 50; i++) {
      const r = moodRadius(i * 0.37, i / 49);
      assert.ok(r > 0.5 && r <= 1 + 1e-9);
    }
  });

  it('blends the palette and stays a valid colour at and past the ends', () => {
    assert.equal(moodColor(0), 'rgba(92,51,204,1)');
    assert.equal(moodColor(1, 0.5), 'rgba(255,135,31,0.5)');
    assert.equal(moodColor(-1), moodColor(0));
    assert.match(moodColor(0.37), /^rgba\(\d{1,3},\d{1,3},\d{1,3},1\)$/);
  });

  it('draws a closed path inside its box', () => {
    const d = moodPath(100, 0.2, 0.3, 24);
    assert.ok(d.startsWith('M') && d.endsWith('Z'));
    const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
    assert.equal(nums.length, 48);
    for (const n of nums) assert.ok(n >= 0 && n <= 100);
  });

  it('accepts only known bands and names their tone', () => {
    assert.ok(isMoodBand(0) && isMoodBand(6));
    assert.ok(!isMoodBand(7) && !isMoodBand(-1) && !isMoodBand(2.5) && !isMoodBand('3'));
    assert.deepEqual([0, 2, 3, 4, 6].map(moodTone), ['low', 'low', 'mid', 'high', 'high']);
  });
});
