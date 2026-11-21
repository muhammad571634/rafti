import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { captionLevels, createEchoGate, dbToLevel, ECHO_LEARN_MS, rmsLevel } from './call-level';

describe('dbToLevel: a mic meter reading as 0-1', () => {
  it('maps the quiet room to 0 and close speech to 1, clamped', () => {
    assert.equal(dbToLevel(-70), 0);
    assert.equal(dbToLevel(-55), 0);
    assert.equal(dbToLevel(-35), 0.5);
    assert.equal(dbToLevel(-15), 1);
    assert.equal(dbToLevel(0), 1);
  });
  it('reads a missing or broken meter as silence', () => {
    assert.equal(dbToLevel(undefined), 0);
    assert.equal(dbToLevel(Number.NaN), 0);
    assert.equal(dbToLevel(-Infinity), 0);
  });
});

describe('rmsLevel: voice samples as 0-1', () => {
  it('is 0 for silence and no frames, and grows with loudness', () => {
    assert.equal(rmsLevel([]), 0);
    assert.equal(rmsLevel([0, 0, 0]), 0);
    assert.ok(rmsLevel([0.1, -0.1]) < rmsLevel([0.25, -0.25]));
    assert.equal(rmsLevel([1, -1]), 1);
  });
});

describe('captionLevels: the rhythm of a line with no voice', () => {
  it('opens on vowels, closes on spaces and holds after a full stop', () => {
    const levels = captionLevels('Hi there. Ok');
    assert.ok(levels.length > 3);
    assert.ok(levels.some((l) => l === 0));
    assert.ok(Math.max(...levels) > 0.5);
    for (const l of levels) assert.ok(l >= 0 && l <= 1);
  });
  it('moves for scripts without Latin vowels', () => {
    assert.ok(Math.max(...captionLevels('こんにちは')) > 0.5);
    assert.ok(Math.max(...captionLevels('Привет')) > 0.5);
  });
  it('is empty for an empty line', () => {
    assert.deepEqual(captionLevels(''), []);
  });
});

describe('createEchoGate: talking over their voice', () => {
  it('uses the base bar while their voice is quiet', () => {
    const gate = createEchoGate(-35);
    assert.equal(gate.hear(-30, false, 0), true);
    assert.equal(gate.hear(-40, false, 150), false);
  });

  it('learns the echo, ignores it, and lets a louder user through', () => {
    const gate = createEchoGate(-35);
    let t = 1000;
    // Their voice from the speaker reads -28 dB at the mic: louder than the base bar.
    for (; t < 1000 + ECHO_LEARN_MS; t += 150) assert.equal(gate.hear(-28, true, t), false);
    assert.equal(gate.hear(-28, true, t), false);
    t += 150;
    assert.equal(gate.hear(-26, true, t), false);
    t += 150;
    // The user, close to the phone, over the echo.
    assert.equal(gate.hear(-15, true, t), true);
  });

  it('starts over with each of their lines', () => {
    const gate = createEchoGate(-35);
    for (let t = 0; t <= ECHO_LEARN_MS + 150; t += 150) gate.hear(-20, true, t);
    assert.equal(gate.hear(-15, true, 900), false);
    // Their line ended; the next one is quieter and is learned again.
    gate.hear(-50, false, 1000);
    for (let t = 2000; t <= 2000 + ECHO_LEARN_MS + 150; t += 150) gate.hear(-40, true, t);
    assert.equal(gate.hear(-25, true, 3000), true);
  });

  it('never counts a broken reading', () => {
    const gate = createEchoGate(-35);
    assert.equal(gate.hear(undefined, false, 0), false);
    assert.equal(gate.hear(Number.NaN, true, 0), false);
  });
});
