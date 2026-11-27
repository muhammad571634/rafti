import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { searchMessages } from './chat-search';
import type { Message } from '@/types';

let n = 0;
const msg = (extra: Partial<Message>): Message => ({
  id: `m${n++}`,
  conversationId: 'c',
  author: 'them',
  kind: 'text',
  createdAt: new Date(2026, 10, 8, 10, n).toISOString(),
  ...extra,
});

describe('searchMessages', () => {
  it('shows a voice reply once, as its text bubble', () => {
    const said = 'İmza kampanyası tam bir kaos.  Şimdiyse sadece buraları toparlıyorum.';
    const voice = msg({ kind: 'voice', transcript: said });
    const first = msg({ text: 'İmza kampanyası tam bir kaos.' });
    const second = msg({ text: 'Şimdiyse sadece buraları toparlıyorum.' });
    assert.deepEqual(searchMessages([voice, first, second], 'kampanya').map((m) => m.id), [first.id]);
  });

  it('keeps a voice note whose words are not repeated', () => {
    const voice = msg({ author: 'me', kind: 'voice', transcript: 'how was the campaign' });
    const typed = msg({ author: 'me', text: 'and the campaign posters?' });
    assert.deepEqual(searchMessages([voice, typed], 'campaign').map((m) => m.id), [typed.id, voice.id]);
  });

  it('keeps a voice note followed by the other side', () => {
    const voice = msg({ author: 'me', kind: 'voice', transcript: 'campaign' });
    const reply = msg({ author: 'them', text: 'campaign' });
    assert.equal(searchMessages([voice, reply], 'campaign').length, 2);
  });

  it('needs two letters', () => {
    assert.deepEqual(searchMessages([msg({ text: 'a' })], 'a'), []);
    assert.deepEqual(searchMessages(undefined, 'abc'), []);
  });
});
