import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { chatTurns } from '../ai/chat-prompt';
import { boardNoteText, messageText } from './story-continuity';
import type { Message } from '@/types';

const note: Message = { id: 'b1', conversationId: 'c', author: 'me', kind: 'system', card: 'board', text: 'Show me your painting tomorrow', createdAt: '2026-11-07T16:05:00.000Z' };

describe('a board note lives in the friend’s chat (0z138)', () => {
  it('reads as the user’s side, marked as pinned on the board', () => {
    assert.equal(messageText(note), '[Pinned for you on the board] Show me your painting tomorrow');
    const turns = chatTurns([note, { id: 'm2', conversationId: 'c', author: 'them', kind: 'text', text: 'Fine, tomorrow.', createdAt: '2026-11-07T16:05:08.000Z' }]);
    assert.deepEqual(turns.map((t) => t.role), ['user', 'assistant']);
  });
  it('an empty note says nothing', () => {
    assert.equal(boardNoteText('  '), null);
    assert.equal(messageText({ ...note, text: '' }), null);
  });
});
