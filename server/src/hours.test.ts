import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { localHour, TalkHours } from './hours.ts';

const at = (iso: string) => Date.parse(iso);

describe('talk hours by the user’s own clock', () => {
  it('turns server time into the user’s hour, across midnight both ways', () => {
    assert.equal(localHour(at('2026-11-11T18:30:00Z'), 300), 23); // Tashkent, UTC+5
    assert.equal(localHour(at('2026-11-11T20:10:00Z'), 300), 1);
    assert.equal(localHour(at('2026-11-11T03:00:00Z'), -300), 22); // New York, UTC-5
    assert.equal(localHour(at('2026-11-11T00:00:00Z'), 330), 5); // India, UTC+5:30
  });

  it('counts replies and different accounts per hour, then starts over', () => {
    const h = new TalkHours();
    const t = at('2026-11-11T17:05:00Z'); // 22:05 in Tashkent
    h.count(t, 300, 'a');
    h.count(t, 300, 'a');
    h.count(t, 300, 'b');
    h.count(at('2026-11-11T19:00:00Z'), 300, 'a'); // 00:00
    h.count(t, undefined, 'c');
    assert.equal(h.flush(), '[hours] 0:1/1 22:3/2 noclock=1');
    assert.equal(h.flush(), null);
  });
});
