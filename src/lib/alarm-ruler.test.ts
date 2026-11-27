import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ALARM_QUICK_PRESETS,
  ALARM_STEP_MIN,
  MAX_RULER_MIN,
  minutesToNorm,
  normToSnappedMinutes,
  skyPhaseForMinutes,
  splitMinutes,
  wrapMinutes,
} from './alarm-ruler';

describe('alarm-ruler 24h 5-minute precision math', () => {
  it('maps boundary values and snaps to 5-minute steps cleanly', () => {
    assert.equal(minutesToNorm(0), 0);
    assert.equal(minutesToNorm(MAX_RULER_MIN), 1);
    assert.equal(normToSnappedMinutes(0), 0);
    assert.equal(normToSnappedMinutes(1), MAX_RULER_MIN);
    assert.equal(normToSnappedMinutes(-0.4), 0);
    assert.equal(normToSnappedMinutes(1.5), MAX_RULER_MIN);

    for (const preset of ALARM_QUICK_PRESETS) {
      const roundTripped = normToSnappedMinutes(minutesToNorm(preset));
      assert.equal(roundTripped, preset);
      assert.equal(roundTripped % ALARM_STEP_MIN, 0);
    }
  });

  it('wraps negative and >24h offsets cleanly', () => {
    assert.equal(wrapMinutes(-5), 1435);
    assert.equal(wrapMinutes(1440), 0);
    assert.equal(wrapMinutes(1445), 5);
    assert.deepEqual(splitMinutes(450), { hour: 7, minute: 30 });
  });

  it('classifies night, dawn, day, and evening sky phases', () => {
    assert.equal(skyPhaseForMinutes(120), 'night');
    assert.equal(skyPhaseForMinutes(420), 'dawn');
    assert.equal(skyPhaseForMinutes(780), 'day');
    assert.equal(skyPhaseForMinutes(1140), 'evening');
    assert.equal(skyPhaseForMinutes(1380), 'night');
  });
});
