import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Message } from '@/types';

import { CALL_LINE_CHARS, CALL_LINES_KEPT, callCue, callMessages, callText, captionMs, keptCallLines } from './call-prompt';
import { chatTurns } from './chat-prompt';
import { spokenCue } from './voice-prompt';

describe('calls on the model', () => {
  it('opens with who placed the call, then answers without a cue', () => {
    assert.match(callCue('user', [])[0], /JUST CALLED YOU/);
    assert.match(callCue('character', [])[0], /YOU CALLED THEM/);
    assert.deepEqual(callCue('user', [{ author: 'them', text: 'Hey' }]), []);
  });

  it('puts the call after the chat: the user as voice, so the spoken language is heard', () => {
    const messages = callMessages(
      [
        { author: 'them', text: 'Hey you.' },
        { author: 'me', text: 'Salom', language: 'Uzbek' },
      ],
      'c1',
      '2026-11-03T10:00:00Z',
    );
    assert.equal(messages[0].text, 'Hey you.');
    assert.equal(messages[1].kind, 'voice');
    assert.equal(messages[1].transcript, 'Salom');
    assert.match(spokenCue(messages)?.[0] ?? '', /Uzbek/);
  });

  it('keeps the last lines of a call, cut, and reads them back for the model', () => {
    const said = Array.from({ length: CALL_LINES_KEPT + 5 }, (_, i) => ({ author: i % 2 ? ('me' as const) : ('them' as const), text: `line ${i} ${'x'.repeat(CALL_LINE_CHARS)}` }));
    const kept = keptCallLines([...said, { author: 'me', text: '   ' }]);
    assert.equal(kept.length, CALL_LINES_KEPT);
    assert.ok(kept.every((l) => l.text.length <= CALL_LINE_CHARS));
    assert.equal(callText(undefined), '[Call]');
    assert.equal(callText([{ author: 'me', text: 'Hi' }, { author: 'them', text: 'Hey' }]), '[Voice call]\nUser: Hi\nCharacter: Hey');
  });

  it('never cuts a kept line on half an emoji', () => {
    const text = `${'x'.repeat(CALL_LINE_CHARS - 1)}\u{1F600}`;
    assert.equal(keptCallLines([{ author: 'me', text }])[0].text, 'x'.repeat(CALL_LINE_CHARS - 1));
  });

  it('reads a call row in the chat as turns under each speaker', () => {
    const row: Message = {
      id: 'm1',
      conversationId: 'c1',
      author: 'them',
      kind: 'call',
      createdAt: '2026-11-03T10:00:00Z',
      callLines: [
        { author: 'them', text: 'Hey.' },
        { author: 'me', text: 'Hi!' },
      ],
    };
    const after: Message = { id: 'm2', conversationId: 'c1', author: 'me', kind: 'text', text: 'That was nice', createdAt: '2026-11-03T10:05:00Z' };
    assert.deepEqual(chatTurns([row, after]), [
      { role: 'assistant', text: '[Voice call] Hey.' },
      { role: 'user', text: 'Hi!\nThat was nice' },
    ]);
    assert.deepEqual(chatTurns([{ ...row, callLines: undefined }]), [{ role: 'assistant', text: '[Call]' }]);
  });

  it('holds a caption about as long as it takes to say', () => {
    assert.equal(captionMs('Hi'), 1800);
    assert.equal(captionMs('one two three four five six seven eight nine ten eleven twelve thirteen'), 5000);
    assert.equal(captionMs('word '.repeat(80)), 7000);
  });
});
