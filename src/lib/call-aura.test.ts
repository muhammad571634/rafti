import assert from 'node:assert/strict';
import test from 'node:test';

import { auraCompanionRgb, auraStateEnergy, CALL_AURA_SCALE, parseHexRgb } from './call-aura';

test('parseHexRgb handles 6-digit, 3-digit, and invalid strings safely', () => {
  const coral = parseHexRgb('#F472B6');
  assert.ok(Math.abs(coral[0] - 244 / 255) < 1e-6);
  assert.ok(Math.abs(coral[1] - 114 / 255) < 1e-6);
  assert.ok(Math.abs(coral[2] - 182 / 255) < 1e-6);

  const short = parseHexRgb('#FFF');
  assert.deepEqual(short, [1, 1, 1]);

  const fallback = parseHexRgb('not-a-color');
  assert.equal(fallback.length, 3);
  assert.ok(fallback.every((v) => v >= 0 && v <= 1));
  assert.ok(CALL_AURA_SCALE >= 2);
});

test('auraCompanionRgb stays within [0, 1] and provides harmonic contrast', () => {
  const base = parseHexRgb('#818CF8');
  const comp = auraCompanionRgb('#818CF8');
  assert.equal(comp.length, 3);
  assert.ok(comp.every((v) => v >= 0 && v <= 1));
  assert.notDeepEqual(comp, base);
});

test('auraStateEnergy distinguishes silence, friend speaking, user listening, and thinking', () => {
  const silence = auraStateEnergy(0, 0, false);
  const friend = auraStateEnergy(0.85, 0, false);
  const user = auraStateEnergy(0, 0.9, false);
  const thinking = auraStateEnergy(0, 0, true);

  assert.ok(silence.ribbonGain > 0 && silence.ribbonGain < 0.25);
  assert.ok(friend.ribbonGain > 0.8);
  assert.equal(user.listenPull, 0.9);
  assert.equal(thinking.thinkGlow, 1);
  assert.ok(thinking.ribbonGain > silence.ribbonGain);
});
