import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { barsFor, resampleWave, waveFromMeter, WAVE_BARS } from './voice-wave';

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
});
