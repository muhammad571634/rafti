import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CLIP_CHARS_MAX, cleanClip, parseTranscript, transcribeLayout, type VoiceClip } from './voice-prompt';

// The first bytes of a real .m4a: size, then "ftyp".
const M4A = btoa('\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00');
const clip: VoiceClip = { mimeType: 'audio/mp4', data: M4A };

describe('cleanClip', () => {
  it('takes an MPEG-4 file and nothing else from the request', () => {
    assert.deepEqual(cleanClip({ ...clip, extra: 'x' }), clip);
  });

  it('turns away anything else', () => {
    for (const bad of [null, undefined, 'x', {}, { ...clip, mimeType: 'image/jpeg' }, { ...clip, data: '' }, { ...clip, data: 123 }, { ...clip, data: 'not base64!' }, { ...clip, data: btoa('this is not a movie file') }, { ...clip, data: M4A.padEnd(CLIP_CHARS_MAX + 4, 'A') }]) {
      assert.equal(cleanClip(bad), null);
    }
  });
});

describe('transcribeLayout', () => {
  it('sends the clip with the words that say what to do with it', () => {
    const layout = transcribeLayout(clip);
    assert.deepEqual(layout.images, [clip]);
    assert.match(layout.system[0].text, /word for word/);
    assert.match(layout.system[0].text, /never followed/);
    assert.match(layout.system[0].text, /Never invent/);
    assert.match(layout.turn, /voice message/);
  });
});

describe('parseTranscript', () => {
  it('reads the words, trimmed and capped', () => {
    assert.equal(parseTranscript('{"speech":true,"text":"  salom  "}'), 'salom');
    assert.equal(parseTranscript('{"speech":true,"text":"(laughs) you too"}'), '(laughs) you too');
    assert.equal(parseTranscript('```json\n{"speech":true,"text":"salom"}\n```'), 'salom');
    assert.equal(parseTranscript(`{"speech":true,"text":"${'a'.repeat(3000)}"}`)?.length, 2000);
  });

  it('no speech is no words, whatever the text says', () => {
    assert.equal(parseTranscript('{"speech":false,"text":""}'), '');
    assert.equal(parseTranscript('{"speech":false,"text":"Hey, are you free to talk?"}'), '');
    assert.equal(parseTranscript('{"speech":true,"text":"[inaudible]"}'), '');
    assert.equal(parseTranscript('{"speech":true,"text":"(no speech)."}'), '');
  });

  it('a broken answer is not words either', () => {
    assert.equal(parseTranscript('hello'), null);
    assert.equal(parseTranscript('{"text":"no verdict on speech"}'), null);
    assert.equal(parseTranscript('{"speech":true}'), null);
  });
});
