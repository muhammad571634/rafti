import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { nextAlarmAt, repeatKind, ringsWithin } from './alarms';

// Wednesday, Oct 14 2026, 22:00 local time.
const NOW = new Date(2026, 9, 14, 22, 0, 0, 0);

describe('nextAlarmAt: when an alarm rings next', () => {
  it('rings tomorrow when the time has passed today', () => {
    assert.equal(nextAlarmAt({ hour: 6, minute: 45, repeat: [] }, NOW).toString(), new Date(2026, 9, 15, 6, 45).toString());
  });

  it('rings later today when the time is still ahead', () => {
    assert.equal(nextAlarmAt({ hour: 23, minute: 30, repeat: [] }, NOW).toString(), new Date(2026, 9, 14, 23, 30).toString());
  });

  it('skips to the next repeat day', () => {
    // Saturday and Sunday only: the next ring is Saturday, Oct 17.
    assert.equal(nextAlarmAt({ hour: 9, minute: 30, repeat: [0, 6] }, NOW).toString(), new Date(2026, 9, 17, 9, 30).toString());
  });
});

describe('ringsWithin: what is handed to the OS', () => {
  it('gives one ring for a one-time alarm', () => {
    assert.equal(ringsWithin({ hour: 7, minute: 0, repeat: [] }, NOW).length, 1);
  });

  it('gives every weekday ring in the next 7 days', () => {
    const rings = ringsWithin({ hour: 6, minute: 45, repeat: [1, 2, 3, 4, 5] }, NOW);
    assert.deepEqual(rings.map((d) => d.getDate()), [15, 16, 19, 20, 21]);
  });
});

describe('repeatKind: the Repeat row', () => {
  it('names the common sets', () => {
    assert.equal(repeatKind([]), 'never');
    assert.equal(repeatKind([5, 4, 3, 2, 1]), 'weekdays');
    assert.equal(repeatKind([6, 0]), 'weekends');
    assert.equal(repeatKind([0, 1, 2, 3, 4, 5, 6]), 'everyDay');
    assert.equal(repeatKind([1, 3]), 'days');
  });
});
