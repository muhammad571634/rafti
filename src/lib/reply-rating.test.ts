import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Message } from '@/types';

import { ratingOf, replyAround, tasteLines, withRating } from './reply-rating';

const at = '2026-10-27T20:00:00.000Z';
const me = (id: string, text = 'hi'): Message => ({ id, conversationId: 'c', author: 'me', kind: 'text', text, createdAt: at });
const them = (id: string, extra: Partial<Message> = {}): Message => ({
  id,
  conversationId: 'c',
  author: 'them',
  kind: 'text',
  text: `line ${id}`,
  createdAt: at,
  ...extra,
});

describe('a reply’s vote', () => {
  it('is the vote cast, else 👍 for a happy sticker; sad is not a vote', () => {
    assert.equal(ratingOf([them('a'), them('b', { reaction: 'love' })]), 'up');
    assert.equal(ratingOf([them('a', { reaction: 'sad' })]), undefined);
    assert.equal(ratingOf([them('a', { rating: 'down' }), them('b', { reaction: 'laugh' })]), 'down');
  });

  it('sits on the first line, and 👎 takes happy stickers back but keeps sad', () => {
    const [a, b] = [them('a', { reaction: 'sad' }), them('b', { reaction: 'wow' })];
    const down = [withRating(a, true, 'down', 'long'), withRating(b, false, 'down', 'long')];
    assert.deepEqual(
      down.map((m) => [m.rating, m.offReason, m.reaction]),
      [
        ['down', 'long', 'sad'],
        [undefined, undefined, undefined],
      ],
    );
    assert.equal(withRating(down[0], true, undefined).rating, undefined);
  });

  it('finds the reply around any of its lines, between your turns', () => {
    const list = [me('m1'), them('r1'), me('m2'), them('r2'), them('r3'), me('m3')];
    assert.deepEqual(replyAround(list, 'r3').map((m) => m.id), ['r2', 'r3']);
    assert.deepEqual(replyAround(list, 'r1').map((m) => m.id), ['r1']);
  });
});

describe('what the votes tell the model', () => {
  it('keeps the newest liked lines and every reason marked down', () => {
    const list = [
      them('a', { text: 'Old favourite', rating: 'up' }),
      them('b', { text: 'Ha, stop it', reaction: 'laugh' }),
      them('c', { text: 'Rambling', rating: 'down', offReason: 'long' }),
      them('d', { text: 'Fine', reaction: 'sad' }),
    ];
    const lines = tasteLines(list);
    assert.ok(lines.includes('- Old favourite') && lines.includes('- Ha, stop it'));
    assert.ok(!lines.some((l) => l.includes('Rambling') || l.includes('Fine')));
    assert.ok(lines.some((l) => l.includes('too long')));
    assert.deepEqual(tasteLines([them('x')]), []);
  });
});
