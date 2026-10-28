import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { cleanMemoryPass, MEMORY_RULES, memoryPassParts, parseMemoryPass, PASS_OPS_MAX } from './memory-pass';
import { joinParts } from './prompt-layout';

const request = {
  character: { name: 'Kai Arden', series: 'Seaside Academy', bio: 'Swim-team ace.' },
  user: { displayName: 'Sam', locale: 'en-US' },
  summary: 'They met at the pool.',
  facts: [{ id: 'm1', text: 'Has a dog', about: 'you' as const }],
  before: [{ author: 'them' as const, text: 'How was class?' }],
  lines: [
    { author: 'me' as const, text: 'my beagle Biscuit ate my socks again', at: '2026-10-28T10:00:00Z' },
    { author: 'them' as const, text: 'Biscuit is a menace.', at: '2026-10-28T10:01:00Z' },
  ],
  now: '2026-10-28T10:05:00Z',
};

describe('the memory pass (B2)', () => {
  it('lays out the cached rules, what it remembers with ids, the summary and the new lines', () => {
    const parts = memoryPassParts(request);
    assert.equal(parts[0].tier, 'global');
    assert.equal(parts[0].text, MEMORY_RULES);
    const text = joinParts(parts);
    assert.match(text, /- \[m1\] \(you\) Has a dog/);
    assert.match(text, /SUMMARY SO FAR: They met at the pool\./);
    assert.match(text, /JUST BEFORE \(already read\):\nKai Arden: How was class\?/);
    assert.match(text, /NEW SINCE LAST TIME:\nSam: my beagle Biscuit ate my socks again\nKai Arden: Biscuit is a menace\./);
  });

  it('keeps only important, sure facts and changes only facts it was shown', () => {
    const raw = JSON.stringify({
      summary: ' They met at the pool; Biscuit keeps stealing socks. ',
      ops: [
        { op: 'update', id: 'm1', text: 'Has a beagle called Biscuit who steals socks' },
        { op: 'add', text: 'Likes the pool', about: 'you', importance: 0.3, confidence: 0.9 },
        { op: 'add', text: 'Maybe a cat person', about: 'you', importance: 0.8, confidence: 0.4 },
        { op: 'add', text: 'Exam on Friday', about: 'you', type: 'schedule', importance: 0.8, confidence: 0.9, until: '2026-10-31' },
        { op: 'forget', id: 'nope' },
        { op: 'update', id: 'm1', text: 'twice' },
        { op: 'sing' },
      ],
    });
    const result = parseMemoryPass(`Sure: ${raw}`, new Set(['m1']));
    assert.equal(result.summary, 'They met at the pool; Biscuit keeps stealing socks.');
    assert.deepEqual(result.ops, [
      { op: 'update', id: 'm1', text: 'Has a beagle called Biscuit who steals socks' },
      { op: 'add', text: 'Exam on Friday', about: 'you', type: 'schedule', importance: 0.8, until: '2026-10-31' },
    ]);
    assert.deepEqual(parseMemoryPass('not json', new Set()), { ops: [] });
    const flood = JSON.stringify({ ops: Array.from({ length: 20 }, (_, i) => ({ op: 'add', text: `Fact ${i}`, importance: 0.9, confidence: 0.9 })) });
    assert.equal(parseMemoryPass(flood, new Set()).ops.length, PASS_OPS_MAX);
  });

  it('takes a request from the wire, cut to size, or nothing when it has no new lines', () => {
    const clean = cleanMemoryPass(JSON.parse(JSON.stringify(request)));
    assert.equal(clean?.lines.length, 2);
    assert.equal(clean?.facts[0].id, 'm1');
    assert.equal(cleanMemoryPass({ ...request, lines: [] }), null);
    assert.equal(cleanMemoryPass({ ...request, character: {} }), null);
  });
});
