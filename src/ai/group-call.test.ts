import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { callSpeakers, GROUP_CALL_FORM, groupCallCue, groupCallMessages, groupCallResponders, type GroupCallLine } from './group-call';

const members = ['kai', 'theo', 'hana'];
const names = { kai: 'Kai', theo: 'Theo', hana: 'Hana' };

describe('group calls on the model', () => {
  it('opens with two hellos, the second after the first', () => {
    const { responders, crisis } = groupCallResponders(members, names, [], ['kai', 'theo']);
    assert.equal(crisis, false);
    assert.deepEqual(responders, ['hana', 'kai']);
    assert.match(groupCallCue({ opening: true }).join('\n'), /JUST CALLED THE GROUP/);
    assert.match(groupCallCue({ opening: true, first: 'Hana' }).join('\n'), /Hana said hello first/);
  });

  it('every turn is spoken: the call form leads, and the cue stays within the server limit of 8', () => {
    for (const cue of [groupCallCue({ opening: false }), groupCallCue({ opening: false, first: 'Kai' }), groupCallCue({ opening: true, first: 'Kai' })]) {
      assert.deepEqual(cue.slice(0, GROUP_CALL_FORM.length), GROUP_CALL_FORM);
      assert.ok(cue.length <= 8);
    }
    assert.match(groupCallCue({ opening: false, first: 'Kai' }).join('\n'), /Kai just answered/);
  });

  it('a member the user names answers; the call counts as speaking, so the quiet one comes next', () => {
    const said: GroupCallLine[] = [
      { author: 'them', text: 'Hey!', characterId: 'hana' },
      { author: 'them', text: 'Hi.', characterId: 'kai' },
      { author: 'me', text: 'Theo, how was the trip?' },
    ];
    assert.deepEqual(groupCallResponders(members, names, said, []).responders, ['theo', 'hana']);
    assert.deepEqual(callSpeakers(said), ['hana', 'kai']);
    // Second turn of the user: one answers (pickResponders' odd/even rhythm).
    const next = [...said, { author: 'them' as const, text: 'Long.', characterId: 'theo' }, { author: 'me' as const, text: 'Nice' }];
    assert.equal(groupCallResponders(members, names, next, []).responders.length, 1);
  });

  it('a crisis gets one answer, and says so', () => {
    const { responders, crisis } = groupCallResponders(members, names, [{ author: 'me', text: 'I want to die.' }], []);
    assert.equal(crisis, true);
    assert.equal(responders.length, 1);
  });

  it('puts the call after the chat: the user as voice, each member under their own id', () => {
    const messages = groupCallMessages(
      [
        { author: 'them', text: 'Hey!', characterId: 'hana' },
        { author: 'me', text: 'Salom', language: 'Uzbek' },
      ],
      'g1',
      '2026-11-04T10:00:00Z',
    );
    assert.equal(messages[0].characterId, 'hana');
    assert.equal(messages[0].text, 'Hey!');
    assert.equal(messages[1].kind, 'voice');
    assert.equal(messages[1].transcript, 'Salom');
    assert.equal(messages[1].transcriptLanguage, 'Uzbek');
  });
});
