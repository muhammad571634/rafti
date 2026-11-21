import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { MemoryItem } from '@/types';

import { applyMemoryPass, archiveExpired } from './memory-ops';

const now = new Date('2026-10-28T10:00:00Z');
const fact = (id: string, text: string, extra: Partial<MemoryItem> = {}): MemoryItem => ({
  id,
  characterId: 'c_kai',
  text,
  source: 'chat',
  createdAt: '2026-10-01T10:00:00Z',
  pinned: false,
  ...extra,
});
let n = 0;
const newId = () => `new${++n}`;

describe('applying a memory pass (B2)', () => {
  it('adds, rewrites, replaces with the past kept, and forgets', () => {
    const before = [fact('a', 'Has a dog'), fact('b', 'Lives in Namangan', { pinned: true }), fact('c', 'Hates mornings'), fact('z', 'Other friend’s fact', { characterId: 'c_iris' })];
    const after = applyMemoryPass(
      before,
      'c_kai',
      {
        ops: [
          { op: 'add', text: 'Exam on Friday', about: 'you', type: 'schedule', importance: 0.8, until: '2026-10-31' },
          { op: 'update', id: 'a', text: 'Has a beagle called Biscuit' },
          { op: 'supersede', id: 'b', text: 'Moved to Tashkent in October', about: 'you', importance: 0.8 },
          { op: 'forget', id: 'c' },
          { op: 'forget', id: 'z' },
        ],
      },
      now,
      newId,
    );
    const byText = (text: string) => after.find((m) => m.text === text);
    assert.ok(byText('Exam on Friday') && byText('Exam on Friday')?.until === '2026-10-31');
    assert.equal(after.find((m) => m.id === 'a')?.text, 'Has a beagle called Biscuit');
    const moved = byText('Moved to Tashkent in October')!;
    assert.equal(moved.pinned, true, 'the pin moves to the new fact');
    assert.deepEqual([after.find((m) => m.id === 'b')?.status, after.find((m) => m.id === 'b')?.supersededBy, after.find((m) => m.id === 'b')?.pinned], ['superseded', moved.id, false]);
    assert.ok(!after.some((m) => m.id === 'c'));
    assert.ok(after.some((m) => m.id === 'z'), 'another friend’s fact is never touched');
  });

  it('never keeps a crisis line or a copy, and leaves word-for-word pins as they are', () => {
    const quote = fact('q', 'You make me laugh', { pinned: true, quote: { messageId: 'm9', author: 'them' } as MemoryItem['quote'] });
    const after = applyMemoryPass(
      [fact('a', 'Has a beagle'), quote],
      'c_kai',
      {
        ops: [
          { op: 'add', text: 'I want to die', about: 'you', importance: 0.9 },
          { op: 'add', text: 'has a beagle', about: 'you', importance: 0.9 },
          { op: 'update', id: 'q', text: 'Rewritten quote' },
        ],
      },
      now,
      newId,
    );
    assert.equal(after.length, 2);
    assert.equal(after.find((m) => m.id === 'q')?.text, 'You make me laugh');
  });

  it('archives a plan a month after its day, unless it is pinned', () => {
    const aged = archiveExpired([fact('old', 'Exam on Sept 1', { until: '2026-09-01' }), fact('soon', 'Trip in November', { until: '2026-11-10' }), fact('kept', 'Wedding day', { until: '2026-09-01', pinned: true })], now);
    assert.deepEqual(aged.map((m) => m.status ?? 'active'), ['archived', 'active', 'active']);
  });
});
