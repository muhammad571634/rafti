import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildStreamLinePrompt, streamLineParts } from '../ai/content-prompts';
import { layoutPrompt } from '../ai/prompt-layout';
import { mockStreamLine } from '../mock/streams';
import type { Character, Stream, User } from '@/types';

import {
  checkStream,
  fillTopic,
  isPaused,
  isPlaying,
  lineMessage,
  nextSpeaker,
  nextTarget,
  parseStreamLine,
  STREAM_FIRST_LINES,
  STREAM_LINE_MAX,
  STREAM_MAX_LINES,
  STREAM_MORE_LINES,
} from './streams';

const stream = (lines: number, target: number, stopped?: boolean): Stream => ({
  id: 's1',
  characterIds: ['c_kai', 'c_theo'],
  topic: 'Swap jobs for a day',
  lines: Array.from({ length: lines }, (_, i) => ({ id: `l${i}`, characterId: i % 2 ? 'c_theo' : 'c_kai', text: `Line ${i}`, createdAt: '' })),
  target,
  ...(stopped ? { stopped } : {}),
  createdAt: '2026-10-25T00:00:00.000Z',
});

describe('checkStream', () => {
  it('needs two different characters and a topic', () => {
    assert.deepEqual(checkStream({ characterIds: ['a', 'b'], topic: 'Pizza' }), []);
    assert.deepEqual(checkStream({ characterIds: ['a', 'a'], topic: 'Pizza' }), ['pair']);
    assert.deepEqual(checkStream({ characterIds: ['a'], topic: ' ' }), ['pair', 'topic']);
  });

  it('keeps crises, minors and explicit topics out', () => {
    assert.deepEqual(checkStream({ characterIds: ['a', 'b'], topic: 'I want to kill myself' }), ['crisis']);
    assert.deepEqual(checkStream({ characterIds: ['a', 'b'], topic: 'Back in high school' }), ['minors']);
    assert.deepEqual(checkStream({ characterIds: ['a', 'b'], topic: 'nsfw' }), ['explicit']);
  });

  it('puts the watcher in a topic idea', () => {
    assert.equal(fillTopic('Plan a surprise for {user}', 'Sam'), 'Plan a surprise for Sam');
  });
});

describe('rounds and turns', () => {
  it('takes turns, the first one opening', () => {
    assert.equal(nextSpeaker(stream(0, 8)), 'c_kai');
    assert.equal(nextSpeaker(stream(3, 8)), 'c_theo');
  });

  it('starts with 8 lines, adds 6 a round and stops at the cap', () => {
    assert.equal(nextTarget(undefined), STREAM_FIRST_LINES);
    assert.equal(nextTarget(stream(8, 8)), 8 + STREAM_MORE_LINES);
    assert.equal(nextTarget(stream(24, 24)), STREAM_MAX_LINES);
    assert.equal(nextTarget(stream(STREAM_MAX_LINES, STREAM_MAX_LINES)), null);
  });

  it('tells playing from paused and done', () => {
    assert.ok(isPlaying(stream(3, 8)) && !isPaused(stream(3, 8)));
    assert.ok(!isPlaying(stream(3, 8, true)) && isPaused(stream(3, 8, true)));
    assert.ok(!isPlaying(stream(8, 8)) && !isPaused(stream(8, 8, true)));
  });

  it('draws a line as a bubble from its character', () => {
    assert.deepEqual(lineMessage('s1', { id: 'l1', characterId: 'c_theo', text: 'Hi', createdAt: 'x' }), {
      id: 'l1',
      conversationId: 's1',
      author: 'them',
      kind: 'text',
      text: 'Hi',
      characterId: 'c_theo',
      createdAt: 'x',
    });
  });
});

describe('the model’s line', () => {
  it('reads the JSON and drops a name or quotes put in front', () => {
    assert.equal(parseStreamLine('{"line":"Kai: Not a chance."}', ['Kai Arden', 'Kai']), 'Not a chance.');
    assert.equal(parseStreamLine('```json\n{"line":"“Fine.”"}\n```', ['Kai']), 'Fine.');
    assert.equal(parseStreamLine('{"line":"  "}', ['Kai']), null);
    assert.equal(parseStreamLine('not json', ['Kai']), null);
    assert.ok(parseStreamLine(JSON.stringify({ line: 'word '.repeat(100) }), [])!.length <= STREAM_LINE_MAX);
  });

  it('asks for one line in the speaker’s voice, with the other, the topic and what was said', () => {
    const kai = { id: 'c_kai', name: 'Kai Arden', bio: 'Swimmer.', greeting: 'Hi.', tags: [], series: 'Seaside Academy' } as unknown as Character;
    const theo = { id: 'c_theo', name: 'Theo Lancaster', series: 'Seaside Academy' } as unknown as Character;
    const castor = { id: 'c_castor', name: 'Lord Castor', series: 'Moonlit Realm' } as unknown as Character;
    const user = { displayName: 'Sam', locale: 'en-US' } as User;
    const prompt = buildStreamLinePrompt({ character: kai, user }, theo, 'Swap jobs for a day', [{ name: 'Theo Lancaster', text: 'I would be great at swimming.' }], {
      index: 7,
      total: 8,
    });
    assert.match(prompt, /YOUR PERSONA:\nName: Kai Arden/);
    assert.match(prompt, /talking with Theo Lancaster \(from Seaside Academy\); you already know each other/);
    assert.match(prompt, /The topic: Swap jobs for a day/);
    assert.match(prompt, /Sam is watching the two of you/);
    assert.match(prompt, /SO FAR:\nTheo Lancaster: I would be great at swimming\./);
    assert.match(prompt, /last line for now/);
    assert.match(prompt, /Shape: \{"line":""\}/);
    const opening = buildStreamLinePrompt({ character: kai, user }, castor, 'Pizza', [], { index: 0, total: 8 });
    assert.match(opening, /you just met/);
    assert.match(opening, /You open/);
    assert.doesNotMatch(opening, /SO FAR|last line/);
  });

  it('caches the speaker’s persona and the stream for every line, and sends what was said after it', () => {
    const kai = { id: 'c_kai', name: 'Kai Arden', bio: 'Swimmer.', greeting: 'Hi.', tags: [], series: 'Seaside Academy' } as unknown as Character;
    const theo = { id: 'c_theo', name: 'Theo Lancaster', series: 'Seaside Academy' } as unknown as Character;
    const user = { displayName: 'Sam', locale: 'en-US' } as User;
    const first = layoutPrompt(streamLineParts({ character: kai, user }, theo, 'Pizza', [], { index: 0, total: 8 }));
    const third = layoutPrompt(streamLineParts({ character: kai, user }, theo, 'Pizza', [{ name: 'Theo Lancaster', text: 'Pineapple.' }], { index: 2, total: 8 }));
    assert.deepEqual(third.system, first.system);
    assert.match(first.system.at(-1)?.text ?? '', /MODE: STREAM[\s\S]*\n\nYou are talking with Theo Lancaster/);
    assert.match(third.turn, /^THIS LINE:\n- React to what Theo Lancaster just said[\s\S]*SO FAR:\nTheo Lancaster: Pineapple\./);
  });
});

describe('mock lines', () => {
  it('opens on the topic, closes each round and never repeats a line in a full stream', () => {
    // Rounds end on lines 8, 14, 20 and 26.
    const ends = new Set([7, 13, 19, 25]);
    for (const id of ['s1', 's2', 'stream_abc']) {
      const lines = Array.from({ length: STREAM_MAX_LINES }, (_, i) => mockStreamLine(id, i, ends.has(i), 'Theo', 'Pizza'));
      assert.match(lines[0], /Pizza/);
      assert.equal(new Set(lines).size, lines.length, id);
      assert.equal(mockStreamLine(id, 3, false, 'Theo', 'Pizza'), lines[3]);
    }
  });
});
