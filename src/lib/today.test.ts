import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { awakeAt, freshDayNote, fourWidgets } from './today';

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

  it('fills the saved widgets up to four with the defaults', () => {
    const defaults = ['calls', 'diary', 'date', 'sleep'] as const;
    assert.deepEqual(fourWidgets(['calls', 'diary'], defaults), ['calls', 'diary', 'date', 'sleep']);
    assert.deepEqual(fourWidgets(['radio', 'board'], defaults), ['radio', 'board', 'calls', 'diary']);
    assert.deepEqual(fourWidgets(['gifts', null], defaults), ['gifts', 'calls', 'diary', 'date']);
    assert.deepEqual(fourWidgets([null, 'diary'], defaults), ['diary', 'calls', 'date', 'sleep']);
    assert.deepEqual(fourWidgets(['photos', 'radio', 'board', 'bond'], defaults), ['photos', 'radio', 'board', 'bond']);
    assert.deepEqual(fourWidgets(['date', 'date', 'bond'], defaults), ['date', 'bond', 'calls', 'diary']);
    assert.deepEqual(fourWidgets(['a', 'b', 'c', 'd', 'e'], defaults).length, 4);
    assert.deepEqual(fourWidgets(undefined, defaults), ['calls', 'diary', 'date', 'sleep']);
    assert.deepEqual(fourWidgets([null, null], defaults), ['calls', 'diary', 'date', 'sleep']);
  });
});
