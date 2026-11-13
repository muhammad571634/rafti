import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Conversation } from '@/types';

import { AWAY_MS, pickWelcome, shouldWelcome, welcomeLineKey } from './welcome-back';

const NOW = Date.parse('2026-10-29T20:00:00Z');
const base = { now: NOW, awayAt: NOW - AWAY_MS, onboarded: true, fromNotification: false, hasConversation: true };

function chat(id: string, at: string, unreadCount = 0, preview = 'hi'): Conversation {
  return { id, characterId: `c-${id}`, lastMessagePreview: preview, lastMessageAt: at, unreadCount, pinned: false, muted: false };
}

describe('shouldWelcome: only after an hour away', () => {
  it('welcomes after exactly an hour', () => assert.equal(shouldWelcome(base), true));
  it('stays quiet a moment before the hour', () => assert.equal(shouldWelcome({ ...base, awayAt: NOW - AWAY_MS + 1 }), false));
  it('welcomes when there is no saved away time yet', () => assert.equal(shouldWelcome({ ...base, awayAt: null }), true));
  it('stays quiet when the clock went backwards', () => assert.equal(shouldWelcome({ ...base, awayAt: NOW + 5000 }), false));
  it('stays quiet before onboarding is done', () => assert.equal(shouldWelcome({ ...base, onboarded: false }), false));
  it('stays quiet when a notification opened the app', () => assert.equal(shouldWelcome({ ...base, fromNotification: true }), false));
  it('stays quiet with no conversation', () => assert.equal(shouldWelcome({ ...base, hasConversation: false }), false));
});

describe('pickWelcome: the last character you talked to', () => {
  const all = () => true;

  it('picks the newest conversation', () => {
    const w = pickWelcome([chat('a', '2026-10-28T10:00:00Z'), chat('b', '2026-10-29T09:00:00Z'), chat('c', '2026-10-27T10:00:00Z')], all);
    assert.deepEqual(w, { conversationId: 'b', characterId: 'c-b', unreadLine: null });
  });

  it('brings an unread line along', () => {
    const w = pickWelcome([chat('a', '2026-10-29T09:00:00Z', 2, 'Good morning!')], all);
    assert.equal(w?.unreadLine, 'Good morning!');
  });

  it('ignores an empty unread preview', () => {
    const w = pickWelcome([chat('a', '2026-10-29T09:00:00Z', 1, '   ')], all);
    assert.equal(w?.unreadLine, null);
  });

  it('skips a conversation whose character is gone', () => {
    const w = pickWelcome([chat('a', '2026-10-28T10:00:00Z'), chat('b', '2026-10-29T09:00:00Z')], (id) => id !== 'c-b');
    assert.equal(w?.conversationId, 'a');
  });

  it('returns null with no conversations', () => assert.equal(pickWelcome([], all), null));
});

describe('welcomeLineKey: a line from the locale files', () => {
  it('names one of the four lines', () => assert.match(welcomeLineKey(NOW), /^welcomeBack\.line[1-4]$/));
  it('changes between visits an hour apart', () => assert.notEqual(welcomeLineKey(NOW), welcomeLineKey(NOW + AWAY_MS)));
});
