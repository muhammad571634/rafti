import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CALL_LINE_CHARS, CALL_LINES_KEPT, callCue, callMessages, callText, captionMs, keptCallLines } from './call-prompt';
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

  it('holds a caption about as long as it takes to say', () => {
    assert.equal(captionMs('Hi'), 1800);
    assert.equal(captionMs('one two three four five six seven eight nine ten eleven twelve thirteen'), 5000);
    assert.equal(captionMs('word '.repeat(80)), 7000);
  });
});
