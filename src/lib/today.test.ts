import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { awakeAt, freshDayNote, twoWidgets } from './today';

describe('calm Today', () => {
  it('shows the friend awake only in waking hours', () => {
    assert.equal(awakeAt(6), false);
    assert.equal(awakeAt(7), true);
    assert.equal(awakeAt(22), true);
    assert.equal(awakeAt(23), false);
    assert.equal(awakeAt(2), false);
  });

  it('takes the newest note of today under three hours old', () => {
    const now = Date.parse('2026-11-16T15:00:00Z');
    const ownDay = [
      { date: '2026-11-15', notes: [{ at: '2026-11-15T14:00:00Z', text: 'yesterday' }] },
      {
        date: '2026-11-16',
        notes: [
          { at: '2026-11-16T09:00:00Z', text: 'overslept' },
          { at: '2026-11-16T13:30:00Z', text: ' at practice ' },
          { at: '2026-11-16T12:10:00Z', text: 'lunch with Theo' },
        ],
      },
    ];
    assert.equal(freshDayNote(ownDay, '2026-11-16', now), 'at practice');
    // Over three hours old: nothing.
    assert.equal(freshDayNote(ownDay, '2026-11-16', Date.parse('2026-11-16T17:00:00Z')), undefined);
    // Another day: nothing, even when fresh by the clock.
    assert.equal(freshDayNote(ownDay, '2026-11-17', now), undefined);
    assert.equal(freshDayNote(undefined, '2026-11-16', now), undefined);
    assert.equal(freshDayNote([{ date: '2026-11-16', notes: [{ at: 'bad', text: 'x' }] }], '2026-11-16', now), undefined);
  });

  it('keeps the first two of four widgets in order', () => {
    const fallback = ['calls', 'diary'] as const;
    assert.deepEqual(twoWidgets(['calls', 'diary', 'date', 'sleep'], fallback), ['calls', 'diary']);
    assert.deepEqual(twoWidgets([null, 'radio', null, 'board'], fallback), ['radio', 'board']);
    assert.deepEqual(twoWidgets([null, null, 'gifts', null], fallback), ['gifts', null]);
    assert.deepEqual(twoWidgets([null, null, null, null], fallback), [null, null]);
    assert.deepEqual(twoWidgets(['date', 'date', 'bond'], fallback), ['date', 'bond']);
    assert.deepEqual(twoWidgets(['photos', null], fallback), ['photos', null]);
    assert.deepEqual(twoWidgets(undefined, fallback), ['calls', 'diary']);
  });
});
