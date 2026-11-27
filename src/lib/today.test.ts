import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  awakeAt,
  findReadyNoteId,
  fourWidgets,
  freshDayNote,
  hoverSlotAt,
  nextHeroWakeAt,
  nextMidnightAt,
  placeWidgetInSlot,
  previewSlideForSlot,
  readyNoteIdOf,
  slotOrigin,
  swapWidgetSlots,
} from './today';

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
    assert.equal(freshDayNote(ownDay, '2026-11-16', Date.parse('2026-11-16T17:00:00Z')), undefined);
    assert.equal(freshDayNote(ownDay, '2026-11-17', now), undefined);
    assert.equal(freshDayNote(undefined, '2026-11-16', now), undefined);
    assert.equal(freshDayNote([{ date: '2026-11-16', notes: [{ at: 'bad', text: 'x' }] }], '2026-11-16', now), undefined);
  });

  it('schedules next midnight and hero light/presence boundaries accurately', () => {
    const afternoon = new Date(2026, 10, 25, 16, 45, 0, 0).getTime();
    assert.equal(nextMidnightAt(afternoon), new Date(2026, 10, 26, 0, 0, 0, 0).getTime());
    // Next hero boundary after 16:45 is evening at 17:00.
    assert.equal(nextHeroWakeAt(afternoon), new Date(2026, 10, 25, 17, 0, 0, 0).getTime());
    // Late at 23:30: next hero boundary is tomorrow dawn at 05:00.
    const lateNight = new Date(2026, 10, 25, 23, 30, 0, 0).getTime();
    assert.equal(nextHeroWakeAt(lateNight), new Date(2026, 10, 26, 5, 0, 0, 0).getTime());
    // When an active ownDay note expires before the next light boundary, wakes at note expiry first.
    const morning = new Date(2026, 10, 25, 12, 0, 0, 0).getTime();
    const noteAt = morning - 2 * 60 * 60 * 1000 - 50 * 60 * 1000; // 2h50m old -> expires in 10m (at 12:10 < 17:00)
    const ownDay = [{ date: '2026-11-25', notes: [{ at: new Date(noteAt).toISOString(), text: 'coffee' }] }];
    assert.equal(nextHeroWakeAt(morning, ownDay, '2026-11-25'), noteAt + 3 * 60 * 60 * 1000 + 1);
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

  it('computes 2x2 widget grid hover and live slide offsets cleanly', () => {
    const W = 170;
    const H = 170;
    const GAP = 12;
    assert.deepEqual(slotOrigin(0, W, H, GAP), { x: 0, y: 0 });
    assert.deepEqual(slotOrigin(1, W, H, GAP), { x: 182, y: 0 });
    assert.deepEqual(slotOrigin(2, W, H, GAP), { x: 0, y: 182 });
    assert.deepEqual(slotOrigin(3, W, H, GAP), { x: 182, y: 182 });

    // Small drag stays in slot 0 -> null
    assert.equal(hoverSlotAt(0, 20, 15, W, H, GAP), null);
    // Dragging slot 0 right into slot 1
    assert.equal(hoverSlotAt(0, 180, 10, W, H, GAP), 1);
    // Dragging slot 0 down into slot 2
    assert.equal(hoverSlotAt(0, 5, 185, W, H, GAP), 2);
    // Dragging slot 0 diagonally into slot 3
    assert.equal(hoverSlotAt(0, 185, 185, W, H, GAP), 3);

    // While slot 0 hovers over slot 2, slot 2 slides up by -182 into slot 0's spot; others stay at 0
    assert.deepEqual(previewSlideForSlot(2, 0, 2, W, H, GAP), { x: 0, y: -182 });
    assert.deepEqual(previewSlideForSlot(1, 0, 2, W, H, GAP), { x: 0, y: 0 });

    assert.deepEqual(swapWidgetSlots(['calls', 'diary', 'date', 'sleep'], 0, 2), ['date', 'diary', 'calls', 'sleep']);
    assert.deepEqual(swapWidgetSlots(['calls', null, 'date', 'sleep'], 2, 1), ['calls', 'date', null, 'sleep']);
  });

  it('places or swaps widgets in slots without dead taps', () => {
    const initial = ['calls', 'diary', 'date', 'sleep'] as const;
    assert.deepEqual(placeWidgetInSlot(initial, 1, 'diary'), ['calls', 'diary', 'date', 'sleep']);
    assert.deepEqual(placeWidgetInSlot(initial, 0, 'store'), ['store', 'diary', 'date', 'sleep']);
    // Picking an already-placed widget swaps it cleanly into the target slot.
    assert.deepEqual(placeWidgetInSlot(initial, 0, 'date'), ['date', 'diary', 'calls', 'sleep']);
    assert.deepEqual(placeWidgetInSlot(['calls', null, 'date', 'sleep'], 1, 'date'), ['calls', 'date', null, 'sleep']);
    // Out-of-bounds is a safe copy.
    assert.deepEqual(placeWidgetInSlot(initial, -1, 'store'), ['calls', 'diary', 'date', 'sleep']);
  });

  it('finds ready daily notes once per relevant input change and skips helpline days', () => {
    const today = new Date().toISOString().slice(0, 10);
    const base = {
      notes: [] as { id: string; characterId: string; status: 'composing' | 'ready'; date: string }[],
      blockedIds: [] as string[],
      characters: [{ id: 'c1' }, { id: 'c2' }],
      conversations: [
        { id: 'chat1', characterId: 'c1' },
        { id: 'chat2', characterId: 'c2' },
      ],
      messages: {
        chat1: [{ id: 'm1', card: 'helpline', createdAt: new Date().toISOString() }],
        chat2: [{ id: 'm2', createdAt: new Date().toISOString() }],
      },
    };
    assert.equal(findReadyNoteId(base as unknown as Parameters<typeof findReadyNoteId>[0]), undefined);

    const withReady = {
      ...base,
      notes: [
        { id: 'n1', characterId: 'c1', status: 'ready', date: today },
        { id: 'n2', characterId: 'c2', status: 'ready', date: today },
      ],
    };
    assert.equal(findReadyNoteId(withReady as unknown as Parameters<typeof findReadyNoteId>[0]), 'n2');

    const withBlocked = { ...withReady, blockedIds: ['c2'] };
    assert.equal(readyNoteIdOf(withBlocked as unknown as Parameters<typeof readyNoteIdOf>[0]), undefined);
    assert.equal(readyNoteIdOf(withReady as unknown as Parameters<typeof readyNoteIdOf>[0]), 'n2');
    // Cached exact reference hit.
    assert.equal(readyNoteIdOf(withReady as unknown as Parameters<typeof readyNoteIdOf>[0]), 'n2');
  });
});
