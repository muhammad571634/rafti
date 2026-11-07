import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { dayBreak, runOf, showsTime } from './runs';
import type { Message } from '@/types';

let n = 0;
const at = (hour: number, minute: number, second = 0, day = 2) => new Date(2026, 10, day, hour, minute, second).toISOString();
const line = (createdAt: string, extra: Partial<Message> = {}): Message => ({
  id: `m${n++}`,
  conversationId: 'c',
  author: 'them',
  kind: 'text',
  text: 'hey',
  createdAt,
  ...extra,
});

describe('the time under a message', () => {
  it('stands once under lines from one speaker in the same minute', () => {
    const lines = [line(at(21, 3, 1)), line(at(21, 3, 20)), line(at(21, 3, 50))];
    assert.deepEqual(lines.map((_, i) => runOf(lines, i).showTime), [false, false, true]);
  });

  it('comes back when the minute changes', () => {
    assert.equal(showsTime(line(at(21, 3, 50)), line(at(21, 4, 1))), true);
  });

  it('comes back when the speaker changes', () => {
    assert.equal(showsTime(line(at(21, 3, 1)), line(at(21, 3, 2), { author: 'me' })), true);
    assert.equal(showsTime(line(at(21, 3, 1), { characterId: 'a' }), line(at(21, 3, 2), { characterId: 'b' })), true);
  });

  it('stands under the last line of the chat', () => {
    assert.equal(showsTime(line(at(21, 3)), undefined), true);
  });

  it('stands before a call or a card, which do not carry a line’s time', () => {
    assert.equal(showsTime(line(at(21, 3, 1)), line(at(21, 3, 2), { kind: 'call' })), true);
    assert.equal(showsTime(line(at(21, 3, 1)), line(at(21, 3, 2), { card: 'sceneEnd' })), true);
  });
});

describe('the day line between messages', () => {
  it('shows above the first message and on a new day', () => {
    assert.equal(dayBreak(undefined, line(at(21, 3))), true);
    assert.equal(dayBreak(line(at(23, 59)), line(at(0, 1, 0, 3))), true);
  });

  it('stays away after hours of quiet on the same day', () => {
    assert.equal(dayBreak(line(at(8, 30)), line(at(18, 54))), false);
  });
});

describe('a run of bubbles', () => {
  it('still ends after an hour of quiet, so the tail and avatar stay right', () => {
    const lines = [line(at(8, 30)), line(at(18, 54))];
    assert.equal(runOf(lines, 0).runEnd, true);
    assert.equal(runOf(lines, 1).runStart, true);
  });
});
