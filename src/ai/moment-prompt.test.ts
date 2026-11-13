import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MAX_CUE_LINES } from './first-text';
import { datePhotoCue, photoCue, pushCue } from './moment-prompt';

describe('the brief for a Photo Booth picture', () => {
  it('with the user in it: side by side, and the friend never invents how anyone looks', () => {
    const cue = photoCue('polaroid', true);
    assert.ok(cue.length <= MAX_CUE_LINES, `${cue.length} lines`);
    assert.match(cue[0], /polaroid/);
    assert.match(cue.join('\n'), /cannot see the picture/);
  });

  it('without a selfie (a picture from before): the friend alone', () => {
    const cue = photoCue('film', false);
    assert.match(cue[0], /picture of you/);
    assert.doesNotMatch(cue.join('\n'), /side/);
  });
});

describe('the brief for a pushed line', () => {
  it('fits what the server keeps, so its last rule is never cut', () => {
    for (const days of [undefined, 1, 2, 3, 5, 7, 14]) {
      const cue = pushCue('Still quiet?', days, true);
      assert.ok(cue.length <= MAX_CUE_LINES, `${cue.length} lines with comeback ${days}`);
      assert.match(cue.at(-1)!, /real pain/);
    }
  });

  it('asks for buttons only when they are the model’s to write', () => {
    assert.equal(pushCue('Hey').some((line) => line.includes('"ideas"')), false);
    assert.equal(pushCue('Hey', undefined, true).some((line) => line.includes('"ideas"')), true);
  });
});

describe('the brief for a date polaroid sent to another friend (0z157)', () => {
  it('fits, names the date and never lets them describe the picture', () => {
    const cue = datePhotoCue('Hana', 'Night market, with Hana', 'sweet', false);
    assert.ok(cue.length <= MAX_CUE_LINES, `${cue.length} lines`);
    assert.match(cue[0], /date with Hana/);
    assert.match(cue[0], /very well/);
    assert.match(cue.join('\n'), /cannot see the picture/);
    assert.match(cue.join('\n'), /do not know Hana/);
  });

  it('says they know the partner when both live in one world', () => {
    assert.match(datePhotoCue('Ronan', 'Velvet bar', 'funny', true).join('\n'), /You know Ronan/);
  });
});
