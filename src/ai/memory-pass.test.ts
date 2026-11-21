import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { cleanMemoryPass, MEMORY_RULES, memoryPassParts, parseMemoryPass, PASS_OPS_MAX } from './memory-pass';import { joinParts } from './prompt-layout';

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

  it('keeps every note in one language, the user’s app language, whatever the chat is in (0z187)', () => {
    // A chat that moved between Turkish, English and Uzbek left Hana's facts in three languages, and
    // the mix pulled her replies into the wrong one (the A51, 0z186).
    const text = joinParts(memoryPassParts({ ...request, user: { displayName: 'Ana', locale: 'es-ES' }, lines: [{ author: 'me', text: 'bugun juda charchadim', at: '2026-10-28T10:00:00Z' }] }));
    assert.match(text, /NOTE LANGUAGE: [^.\n]*Spanish/);
    assert.match(text, /whatever language the chat is in/);
    assert.match(text, /the summary in English/);
    // No quote of the chat's words to take the language from.
    assert.doesNotMatch(text, /their latest message/);
    // Old facts in another language are given back in it, a few a pass.
    assert.match(text, /"update"[^\n]*same meaning/);
    assert.match(joinParts(memoryPassParts({ ...request, user: { displayName: 'Sam' } })), /NOTE LANGUAGE: English/);
    // Pinned facts and the user's own words (no owner) are never rewritten.
    assert.match(text, /not pinned and not their own words/);
    // Through the server's clean, as in production (it fills `about`, so the source marks own words).
    const wire = cleanMemoryPass({ ...request, facts: [{ id: 'm2', text: 'Seni özledim hana', source: 'diary' }, { id: 'm3', text: 'glass of water: done', source: 'chat' }, { id: 'm4', text: 'x y z', source: 'nope' }] })!;
    const quoted = joinParts(memoryPassParts(wire));
    assert.match(quoted, /- \[m2\] \(you, their own words\) Seni özledim hana/);
    assert.match(quoted, /- \[m3\] \(you\) glass of water: done/);
    assert.equal(wire.facts[2].source, undefined);
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

describe('the own-day catch (0z147)', () => {
  const withDay = { ...request, utcOffsetMin: 300, ownDay: ['overslept, missed the bus'] };

  it('dates the new lines, lists the day so far and asks for what is missing', () => {
    const text = joinParts(memoryPassParts(withDay));
    assert.match(text, /NEW SINCE LAST TIME:\n\[2026-10-28 15:00\] Sam: my beagle/);
    assert.match(text, /KAI ARDEN'S OWN DAY, NOTED SO FAR TODAY \(2026-10-28\):\n- overslept, missed the bus/);
    assert.match(text, /"day":\["few words"\]\}$/m);
  });

  it('stays out when the app asks for no catch', () => {
    const text = joinParts(memoryPassParts(request));
    assert.doesNotMatch(text, /OWN DAY|"day"|\[2026-/);
  });

  it('reads the notes from the answer and cleans what the app sends', () => {
    assert.deepEqual(parseMemoryPass('{"ops":[],"day":["painted the pier at dawn","painted the pier at dawn"]}', new Set()).day, ['painted the pier at dawn']);
    assert.equal(parseMemoryPass('{"ops":[]}', new Set()).day, undefined);
    // A restated list is not new.
    assert.deepEqual(parseMemoryPass('{"ops":[],"day":["overslept","missed the bus","tea at the studio"]}', new Set(), ['overslept, missed the bus']).day, ['tea at the studio']);
    assert.equal(parseMemoryPass('{"ops":[],"day":["missed the bus"]}', new Set(), ['overslept, missed the bus']).day, undefined);
    assert.deepEqual(cleanMemoryPass({ ...withDay, ownDay: [' a  b ', 3, ''] })?.ownDay, ['a b']);
    assert.equal(cleanMemoryPass(request)?.ownDay, undefined);
  });
});
