import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Message } from '@/types';

import { canRewindTo, lastExchange, laterCount, shareQuote } from './chat-turns';

const at = '2026-10-24T20:00:00.000Z';
const me = (id: string, text = 'hi'): Message => ({ id, conversationId: 'c', author: 'me', kind: 'text', text, createdAt: at });
const them = (id: string, text = 'hey'): Message => ({ id, conversationId: 'c', author: 'them', kind: 'text', text, createdAt: at });
const card = (id: string, kind: Message['card']): Message => ({ id, conversationId: 'c', author: 'them', kind: 'system', card: kind, createdAt: at });

describe('lastExchange', () => {
  it('is your newest message and their lines after it', () => {
    const list = [them('g'), me('m1'), them('r1'), me('m2'), them('r2'), them('r3')];
    const exchange = lastExchange(list);
    assert.equal(exchange?.anchor.id, 'm2');
    assert.deepEqual(exchange?.burst.map((m) => m.id), ['r2', 'r3']);
    assert.equal(exchange?.crisis, false);
  });

  it('leaves system lines out of the reply', () => {
    const exchange = lastExchange([me('m'), card('n', 'aiNotice'), them('r'), card('q', 'voiceQuota')]);
    assert.deepEqual(exchange?.burst.map((m) => m.id), ['r']);
  });

  it('marks a reply that came with the helpline card', () => {
    assert.equal(lastExchange([me('m'), card('h', 'helpline'), them('r')])?.crisis, true);
  });

  it('is empty while they have not answered, and null before you write', () => {
    assert.deepEqual(lastExchange([them('g'), me('m')])?.burst, []);
    assert.equal(lastExchange([them('g')]), null);
    assert.equal(lastExchange(undefined), null);
  });
});

describe('canRewindTo', () => {
  const list = [them('g'), me('m1'), them('r1'), me('m2'), them('r2')];

  it('is offered on their lines before your newest message', () => {
    assert.equal(canRewindTo(list, 'g'), true);
    assert.equal(canRewindTo(list, 'r1'), true);
  });

  it('is not offered on their newest reply, your own lines or system lines', () => {
    assert.equal(canRewindTo(list, 'r2'), false);
    assert.equal(canRewindTo(list, 'm1'), false);
    assert.equal(canRewindTo([card('n', 'aiNotice'), me('m')], 'n'), false);
    assert.equal(canRewindTo(list, 'nope'), false);
  });
});

describe('laterCount', () => {
  it('counts the messages a rewind deletes, not system lines', () => {
    const list = [them('g'), me('m1'), card('n', 'aiNotice'), them('r1'), me('m2')];
    assert.equal(laterCount(list, 'g'), 3);
    assert.equal(laterCount(list, 'm2'), 0);
    assert.equal(laterCount(list, 'nope'), 0);
  });
});

describe('shareQuote', () => {
  const steer = (id: string): Message => ({ ...card(id, 'continue'), author: 'me' });
  const voice = (id: string): Message => ({ ...them(id), kind: 'voice', text: undefined });

  it('is your newest line and their newest written line after it', () => {
    const quote = shareQuote([them('g'), me('m1'), them('r1'), me('m2'), them('r2'), them('r3')]);
    assert.equal(quote?.mine?.id, 'm2');
    assert.equal(quote?.theirs.id, 'r3');
  });

  it('skips a voice note at the end of their reply', () => {
    assert.equal(shareQuote([me('m'), them('r'), voice('v')])?.theirs.id, 'r');
  });

  it('shows theirs alone after a continue, and their greeting before you write', () => {
    const quote = shareQuote([them('g'), me('m'), them('r1'), steer('s'), them('r2')]);
    assert.equal(quote?.mine, undefined);
    assert.equal(quote?.theirs.id, 'r2');
    assert.deepEqual(shareQuote([them('g')]), { mine: undefined, theirs: them('g') });
  });

  it('is null while their reply has no words yet', () => {
    assert.equal(shareQuote([them('g'), me('m')]), null);
    assert.equal(shareQuote([me('m'), voice('v')]), null);
    assert.equal(shareQuote([me('m'), them('r', '  ')]), null);
    assert.equal(shareQuote(undefined), null);
  });
});
