import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BEDTIME_DEFAULT_STEP,
  BEDTIME_SCALE_ANCHORS,
  BEDTIME_TIMERS,
  bedtimeHaloEnergy,
  clampUnit,
  endsAtParts,
  normToStepIndex,
  stepIndexToNorm,
  xToNorm,
} from './bedtime-timer';

describe('bedtime-timer', () => {
  it('keeps default step at 20 min and every scale anchor inside BEDTIME_TIMERS', () => {
    assert.equal(BEDTIME_TIMERS[BEDTIME_DEFAULT_STEP], 20);
    for (const anchor of BEDTIME_SCALE_ANCHORS) {
      assert.ok(BEDTIME_TIMERS.includes(anchor), `anchor ${anchor} must exist in BEDTIME_TIMERS`);
    }
  });

  it('clamps non-finite and out-of-range values cleanly', () => {
    assert.equal(clampUnit(-0.4), 0);
    assert.equal(clampUnit(1.8), 1);
    assert.equal(clampUnit(Number.NaN), 0);
    assert.equal(clampUnit(Number.POSITIVE_INFINITY), 0);
    assert.equal(clampUnit(0.35), 0.35);
  });

  it('round-trips every step index cleanly through normalized positions', () => {
    const count = BEDTIME_TIMERS.length;
    for (let i = 0; i < count; i++) {
      const norm = stepIndexToNorm(i, count);
      assert.equal(normToStepIndex(norm, count), i);
    }
    assert.equal(stepIndexToNorm(-3, count), 0);
    assert.equal(stepIndexToNorm(99, count), 1);
    assert.equal(normToStepIndex(-1, count), 0);
    assert.equal(normToStepIndex(2, count), count - 1);
    assert.equal(stepIndexToNorm(0, 1), 0);
    assert.equal(normToStepIndex(0.5, 1), 0);
  });

  it('maps pointer x inside inset bounds cleanly', () => {
    assert.equal(xToNorm(12, 312, 12), 0);
    assert.equal(xToNorm(300, 312, 12), 1);
    assert.equal(xToNorm(156, 312, 12), 0.5);
    assert.equal(xToNorm(-50, 312, 12), 0);
    assert.equal(xToNorm(500, 312, 12), 1);
    assert.equal(xToNorm(10, 20, 12), 0);
  });

  it('computes timer end clock across midnight boundaries', () => {
    const evening = new Date(2026, 10, 26, 22, 45, 0);
    assert.deepEqual(endsAtParts(evening, 20), { hour: 23, minute: 5 });

    const late = new Date(2026, 10, 26, 23, 45, 0);
    assert.deepEqual(endsAtParts(late, 30), { hour: 0, minute: 15 });
    assert.deepEqual(endsAtParts(late, 120), { hour: 1, minute: 45 });
  });

  it('lifts DotMatrix halo energy while scrubbing and deepens with longer duration', () => {
    const shortRest = bedtimeHaloEnergy(0, BEDTIME_TIMERS.length, false);
    const longRest = bedtimeHaloEnergy(BEDTIME_TIMERS.length - 1, BEDTIME_TIMERS.length, false);
    const shortDrag = bedtimeHaloEnergy(0, BEDTIME_TIMERS.length, true);
    const longDrag = bedtimeHaloEnergy(BEDTIME_TIMERS.length - 1, BEDTIME_TIMERS.length, true);
    assert.ok(longRest > shortRest);
    assert.ok(shortDrag > longRest);
    assert.ok(longDrag > shortDrag);
    assert.ok(longDrag <= 1);
  });
});
