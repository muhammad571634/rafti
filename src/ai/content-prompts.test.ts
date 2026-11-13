import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseStreamLine, STREAM_LINE_MAX } from './content-prompts';

describe('parseStreamLine: the model’s stream line, cleaned (B1.4b)', () => {
  it('takes the line, without the speaker’s name or quotes in front', () => {
    assert.equal(parseStreamLine('{"line":"Race you to the pier?"}', 'Kai Arden'), 'Race you to the pier?');
    assert.equal(parseStreamLine('Sure! {"line":"Kai: \\"Race you?\\""}', 'Kai Arden'), 'Race you?');
    assert.equal(parseStreamLine('{"line":"Kai Arden: fine."}', 'Kai Arden'), 'fine.');
    // Another name in front is part of the line ("Mira: …" said by Kai stays as written).
    assert.equal(parseStreamLine('{"line":"Mira, you wish."}', 'Kai Arden'), 'Mira, you wish.');
  });

  it('gives null for a broken or empty answer, and keeps a long line short', () => {
    assert.equal(parseStreamLine('no json', 'Kai'), null);
    assert.equal(parseStreamLine('{"line":"   "}', 'Kai'), null);
    assert.equal(parseStreamLine('{"text":"hi"}', 'Kai'), null);
    assert.equal(parseStreamLine(`{"line":"${'a'.repeat(500)}"}`, 'Kai')?.length, STREAM_LINE_MAX);
  });
});
