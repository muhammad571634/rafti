import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { barsFor, nextVoiceSpeed, resampleWave, voiceScrubFraction, voiceSecondAt, waveFromMeter, WAVE_BARS } from './voice-wave';

describe('a voice note\'s wave', () => {
  it('keeps WAVE_BARS bars from the meter, the loudest at 1', () => {
    const readings = Array.from({ length: 50 }, (_, i) => (i === 20 ? -10 : -45));
    const wave = waveFromMeter(readings);
    assert.equal(wave.length, WAVE_BARS);
    assert.equal(Math.max(...wave), 1);
    assert.ok(wave.every((v) => v >= 0.08 && v <= 1));
  });

  it('gives a quiet speaker a shape of their own', () => {
    const wave = waveFromMeter([-55, -40, -55, -40]);
    assert.equal(Math.max(...wave), 1);
    assert.ok(Math.min(...wave) < 0.5);
  });

  it('returns nothing without readings', () => {
    assert.deepEqual(waveFromMeter([]), []);
    assert.deepEqual(waveFromMeter([Number.NEGATIVE_INFINITY]), []);
  });

  it('resamples down by the loudest and up by the nearest', () => {
    assert.deepEqual(resampleWave([0.1, 0.9, 0.2, 0.3], 2), [0.9, 0.3]);
    assert.deepEqual(resampleWave([0.1, 0.9], 4), [0.1, 0.1, 0.9, 0.9]);
  });

  it('draws longer notes wider, within the bubble', () => {
    assert.equal(barsFor(1), 14);
    assert.equal(barsFor(10), 22);
    assert.equal(barsFor(60), WAVE_BARS);
  });

  it('cycles playback speed 1 -> 1.5 -> 2 -> 1', () => {
    assert.equal(nextVoiceSpeed(1), 1.5);
    assert.equal(nextVoiceSpeed(1.5), 2);
    assert.equal(nextVoiceSpeed(2), 1);
  });

  it('clamps scrub coordinates and rounds playback seconds cleanly', () => {
    assert.equal(voiceScrubFraction(4, 204, 4), 0);
    assert.equal(voiceScrubFraction(200, 204, 4), 1);
    assert.equal(voiceScrubFraction(102, 204, 4), 0.5);
    assert.equal(voiceScrubFraction(-20, 204, 4), 0);
    assert.equal(voiceScrubFraction(400, 204, 4), 1);
    assert.equal(voiceSecondAt(0.5, 24), 12);
    assert.equal(voiceSecondAt(1.4, 24), 24);
    assert.equal(voiceSecondAt(0.5, 0), 0);
  });
});
