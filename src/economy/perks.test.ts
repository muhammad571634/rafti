import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { perkLimit, PERKS, planWouldAllowMore } from './perks';
import { startSubscription } from './plans';

describe('perks', () => {
  const now = Date.parse('2026-10-25T12:00:00.000Z');

  it('gives free users the free number and any plan the plan number', () => {
    assert.equal(perkLimit('personas', undefined, now), PERKS.personas.free);
    assert.equal(perkLimit('personas', startSubscription('basic', now), now), PERKS.personas.plan);
    assert.equal(perkLimit('ownScenes', startSubscription('pro', now, true), now), PERKS.ownScenes.plan);
  });

  it('offers a plan only where it would allow more', () => {
    assert.equal(planWouldAllowMore('personas', 1, PERKS.personas.free), true);
    assert.equal(planWouldAllowMore('personas', 0, PERKS.personas.free), false);
    assert.equal(planWouldAllowMore('personas', 5, PERKS.personas.plan), false);
  });
});
