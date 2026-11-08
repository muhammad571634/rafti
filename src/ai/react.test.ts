import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { cleanReact, REACT_RULES_LINES, reactParts, REACTS } from './react';
import { parseModelReply } from './reply-style';

describe('the friend reacts to your message', () => {
  it('keeps only the six sticker names', () => {
    for (const name of REACTS) assert.equal(cleanReact(name), name);
    assert.equal(cleanReact('heart'), undefined);
    assert.equal(cleanReact(''), undefined);
    assert.equal(cleanReact(3), undefined);
    assert.equal(cleanReact(null), undefined);
  });

  it('reads the react field from a reply, and leaves it out when there is none', () => {
    const reacted = parseModelReply('{"language":"English","crisis":false,"emotion":"happy","intensity":0.6,"messages":["no way!"],"react":"hyped"}');
    assert.equal(reacted.react, 'hyped');
    assert.deepEqual(reacted.bubbles, ['no way!']);
    const plain = parseModelReply('{"messages":["ok"],"react":"party"}');
    assert.equal(plain.react, undefined);
    assert.equal('react' in plain, false);
  });

  it('asks for it in a written chat, never on a call', () => {
    assert.equal(reactParts(false)[0].text, REACT_RULES_LINES.join(String.fromCharCode(10)));
    assert.equal(reactParts(true)[0].text, '');
  });
});
