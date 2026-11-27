import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { byWhoNeedsYou, newestWaitingFirst, waitingChatCount, waitingSince, waitingThreadsFirst } from './waiting';

const chat = (unreadCount: number, at: string, muted = false) => ({ unreadCount, muted, lastMessageAt: at });

describe('who is waiting', () => {
  it('dates a waiting chat by its newest line; nothing unread or muted is not waiting', () => {
    assert.equal(waitingSince(chat(2, '2026-11-25T10:00:00Z')), Date.parse('2026-11-25T10:00:00Z'));
    assert.equal(waitingSince(chat(0, '2026-11-25T10:00:00Z')), 0);
    assert.equal(waitingSince(chat(3, '2026-11-25T10:00:00Z', true)), 0);
  });

  it('counts chats and groups with anything unread on the badge, muted ones too', () => {
    assert.equal(waitingChatCount([chat(2, 'x'), chat(0, 'x'), chat(1, 'x', true)], [chat(4, 'x'), chat(0, 'x')]), 3);
  });

  it('lists unread chats newest first', () => {
    const list = newestWaitingFirst([
      { id: 'a', ...chat(1, '2026-11-25T08:00:00Z') },
      { id: 'b', ...chat(0, '2026-11-25T12:00:00Z') },
      { id: 'c', ...chat(5, '2026-11-25T11:00:00Z') },
    ]);
    assert.deepEqual(list.map((c) => c.id), ['c', 'a']);
  });

  it('merges unread chats and groups newest first so Today matches the Chats badge', () => {
    const threads = waitingThreadsFirst(
      [
        { id: 'c1', ...chat(1, '2026-11-25T09:00:00Z') },
        { id: 'c2', ...chat(0, '2026-11-25T13:00:00Z') },
      ],
      [
        { id: 'g1', ...chat(3, '2026-11-25T11:30:00Z') },
        { id: 'g2', ...chat(0, '2026-11-25T12:00:00Z') },
      ],
    );
    assert.deepEqual(
      threads.map((t) => `${t.kind}:${t.item.id}`),
      ['group:g1', 'chat:c1'],
    );
  });

  it('puts whoever waits before whoever you talked with last, then the closest bond', () => {
    const wrote = { waiting: 200, talkedAt: 10, intimacy: 1 };
    const talked = { waiting: 0, talkedAt: 500, intimacy: 9 };
    const close = { waiting: 0, talkedAt: 0, intimacy: 50 };
    assert.deepEqual([talked, close, wrote].sort(byWhoNeedsYou), [wrote, talked, close]);
  });
});
