import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Moment, MomentKind } from '../types';
import { groupMoments } from './moment-groups';

let n = 0;
/** A moment at a local time on 2026-11-dd. */
const at = (kind: MomentKind, day: number, hour: number, extra: Partial<Moment> = {}): Moment => ({
  id: `m${++n}`,
  characterId: 'hana',
  kind,
  createdAt: new Date(2026, 10, day, hour, 0).toISOString(),
  ...extra,
});

describe("Us' moment rows", () => {
  it('folds a day of secret notes into one row with a count, newest first', () => {
    const notes = [at('secretNote', 7, 13), at('secretNote', 7, 12), at('secretNote', 7, 11)];
    const rows = groupMoments(notes);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].count, 3);
    assert.equal(rows[0].moment.id, notes[0].id);
  });

  it('keeps notes of different days apart', () => {
    const rows = groupMoments([at('secretNote', 7, 9), at('secretNote', 6, 22)]);
    assert.deepEqual(
      rows.map((r) => r.count),
      [1, 1],
    );
  });

  it('never merges kinds that carry their own words or picture', () => {
    const rows = groupMoments([
      at('call', 7, 13, { params: { duration: '1:01' } }),
      at('call', 7, 12, { params: { duration: '12 min' } }),
      at('plan', 7, 11, { params: { title: 'Rent' } }),
      at('plan', 7, 10, { params: { title: 'Cinema' } }),
      at('photo', 7, 9, { photoId: 'p1' }),
      at('photo', 7, 8, { photoId: 'p2' }),
    ]);
    assert.equal(rows.length, 6);
  });

  it('only merges a run: another kind in between starts a new row', () => {
    const rows = groupMoments([at('board', 5, 15), at('board', 5, 14), at('levelUp', 5, 13), at('board', 5, 12)]);
    assert.deepEqual(
      rows.map((r) => [r.moment.kind, r.count]),
      [
        ['board', 2],
        ['levelUp', 1],
        ['board', 1],
      ],
    );
  });

  it('gives nothing for nothing', () => {
    assert.deepEqual(groupMoments([]), []);
  });
});
