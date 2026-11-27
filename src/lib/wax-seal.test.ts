import assert from 'node:assert/strict';
import test from 'node:test';

import type { SecretNote } from '@/types';
import {
  secretNoteDisplayDay,
  secretNoteStreak,
  WAX_CRACK_BRANCHES,
  WAX_SHARDS,
  waxOutlinePath,
  waxPaletteFor,
  waxSealTier,
} from './wax-seal';

const noteOn = (date: string, status: SecretNote['status'] = 'exchanged', depth?: number): SecretNote => ({
  id: `n-${date}-${status}`,
  characterId: 'clara',
  date,
  prompt: 'Q',
  myNote: 'hi',
  theirNote: 'hey',
  status,
  depth,
});

test('secretNoteStreak counts consecutive exchanged days anchored at today or yesterday', () => {
  const now = new Date('2026-11-27T12:00:00Z');
  assert.equal(secretNoteStreak([], now), 0);
  assert.equal(secretNoteStreak([noteOn('2026-11-27', 'ready')], now), 0);

  // Active streak awaiting today's seal break (yesterday + 2 days ago)
  const twoDays = [noteOn('2026-11-26'), noteOn('2026-11-25'), noteOn('2026-11-25')];
  assert.equal(secretNoteStreak(twoDays, now), 2);
  assert.equal(secretNoteDisplayDay(twoDays, false, now), 3);

  // Gap breaks older history
  const gapped = [noteOn('2026-11-27'), noteOn('2026-11-26'), noteOn('2026-11-24')];
  assert.equal(secretNoteStreak(gapped, now), 2);
  assert.equal(secretNoteDisplayDay(gapped, true, now), 2);

  // Stale streak (2 days ago only) resets to 0
  assert.equal(secretNoteStreak([noteOn('2026-11-25')], now), 0);
  assert.equal(secretNoteDisplayDay([noteOn('2026-11-25')], false, now), 1);
});

test('waxSealTier upgrades at Day 3 (pearl), Day 7 (gold), and depth keepsakes', () => {
  assert.equal(waxSealTier(1, false), 'friend');
  assert.equal(waxSealTier(2, false), 'friend');
  assert.equal(waxSealTier(3, false), 'pearl');
  assert.equal(waxSealTier(6, false), 'pearl');
  assert.equal(waxSealTier(7, false), 'gold');
  assert.equal(waxSealTier(1, true), 'gold');
});

test('waxPaletteFor and geometry helpers produce valid stops, paths, and shatter specs', () => {
  const friendPal = waxPaletteFor('friend', '#F472B6');
  const pearlPal = waxPaletteFor('pearl', '#F472B6');
  const goldPal = waxPaletteFor('gold', '#F472B6');
  assert.equal(friendPal.accent, '#F472B6');
  assert.notEqual(friendPal.deep, friendPal.rim);
  assert.notEqual(pearlPal.accent, goldPal.accent);

  const outline = waxOutlinePath(60, 60, 39);
  assert.ok(outline.startsWith('M') && outline.endsWith('Z'));
  assert.equal(WAX_CRACK_BRANCHES.length, 5);
  assert.ok(WAX_SHARDS.some((s) => s.kind === 'halfLeft'));
  assert.ok(WAX_SHARDS.some((s) => s.kind === 'halfRight'));
});
