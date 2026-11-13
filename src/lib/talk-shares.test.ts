import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { monthStart, talkShares } from './talk-shares';
import type { Message } from '@/types';

const at = (iso: string, extra: Partial<Message> = {}): Message => ({ id: iso + Math.random(), conversationId: 'x', author: 'me', kind: 'text', text: 'hi', createdAt: iso, ...extra });
const since = Date.parse('2026-11-01T00:00:00.000Z');
const many = (n: number, extra: Partial<Message> = {}) => Array.from({ length: n }, () => at('2026-11-05T10:00:00.000Z', extra));

describe('who you talked with this month (Us orbs)', () => {
  const chats = [
    { conversationId: 'a', characterId: 'mia' },
    { conversationId: 'b', characterId: 'clara' },
    { conversationId: 'c', characterId: 'milo' },
    { conversationId: 'd', characterId: 'roman' },
  ];

  it('keeps the top three and their percents add up to 100', () => {
    const shares = talkShares(chats, { a: many(46), b: many(31), c: many(23), d: many(5) }, since);
    assert.deepEqual(shares.map((s) => s.characterId), ['mia', 'clara', 'milo']);
    assert.equal(shares.reduce((sum, s) => sum + s.percent, 0), 100);
    assert.deepEqual(shares.map((s) => s.percent), [46, 31, 23]);
  });

  it('rounds three equal chats to 100, not 99', () => {
    const shares = talkShares(chats.slice(0, 3), { a: many(1), b: many(1), c: many(1) }, since);
    assert.equal(shares.reduce((sum, s) => sum + s.percent, 0), 100);
  });

  it('counts only this month, real lines, not failed or pending ones', () => {
    const shares = talkShares(
      chats.slice(0, 2),
      {
        a: [...many(3), at('2026-10-30T10:00:00.000Z'), at('2026-11-02T10:00:00.000Z', { kind: 'system' }), at('2026-11-02T10:00:00.000Z', { failed: true })],
        b: [...many(1), at('2026-11-02T10:00:00.000Z', { pending: true })],
      },
      since,
    );
    assert.deepEqual(shares.map((s) => s.lines), [3, 1]);
  });

  it('shows nothing for one friend or none', () => {
    assert.deepEqual(talkShares(chats, { a: many(10) }, since), []);
    assert.deepEqual(talkShares(chats, {}, since), []);
  });

  it('the month starts on the first at local midnight', () => {
    const start = new Date(monthStart(new Date(2026, 10, 11, 15, 30)));
    assert.equal(start.getDate(), 1);
    assert.equal(start.getHours(), 0);
    assert.equal(start.getMonth(), 10);
  });
});
