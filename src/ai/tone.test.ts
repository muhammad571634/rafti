import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Message, MessageTone } from '@/types';

import { MESSAGE_TONES, toneCue, whispered, withoutTone } from './tone';

const line = (author: Message['author'], tone?: MessageTone, more: Partial<Message> = {}): Message => ({
  id: `${author}-${Math.random()}`,
  conversationId: 'c',
  author,
  kind: 'text',
  text: 'words',
  tone,
  createdAt: '2026-11-02T00:00:00.000Z',
  ...more,
});
const READ = { readAt: '2026-11-02T00:00:01.000Z' };

describe('toneCue', () => {
  it('has words for every tone, and keeps the safety rules above it', () => {
    for (const tone of MESSAGE_TONES) {
      const cue = toneCue([line('me', tone)])?.join(' ') ?? '';
      assert.match(cue, /^HOW THEY SAID IT: They /);
      assert.match(cue, /never changes "crisis"/);
      assert.match(cue, /under 18, your rules win/);
    }
  });

  it('never tells the model a joke is not meant', () => {
    assert.doesNotMatch(toneCue([line('me', 'playful')])?.join(' ') ?? '', /literally/);
  });

  // No cue at all, not an empty one: a photo's own cue is `cue ?? imageCue()`.
  it('is silent for a plain text', () => {
    assert.equal(toneCue([line('me')]), undefined);
    assert.equal(toneCue([]), undefined);
  });

  it('follows the latest text only', () => {
    assert.equal(toneCue([line('me', 'whisper'), line('me')]), undefined);
    assert.match(toneCue([line('me'), line('me', 'serious')])?.[0] ?? '', /seriously/);
  });

  it('ends once a reply has read the text', () => {
    assert.equal(toneCue([line('me', 'playful', READ), line('them')]), undefined);
  });

  it('survives a reply to an earlier text landing after it', () => {
    assert.match(toneCue([line('me', undefined, READ), line('me', 'playful'), line('them')])?.[0] ?? '', /playfully/);
  });

  it('is heard again when ↻ has taken the old answer away', () => {
    assert.match(toneCue([line('me', 'serious', READ)])?.[0] ?? '', /seriously/);
  });

  it('looks past a system card under the text', () => {
    assert.match(toneCue([line('me', 'flirty', READ), line('them', undefined, { kind: 'system' })])?.[0] ?? '', /flirting/);
  });
});

describe('whispered (0z179: a whisper is answered in a few soft words)', () => {
  it('is their last text, whispered and not yet answered', () => {
    assert.equal(whispered([line('them'), line('me', 'whisper')]), true);
    assert.equal(whispered([line('me', 'whisper', READ), line('them')]), false);
    assert.equal(whispered([line('me', 'playful')]), false);
    assert.equal(whispered([]), false);
  });
});

describe('withoutTone', () => {
  it('takes the tone out and leaves a game cue alone', () => {
    assert.deepEqual(withoutTone(['A game cue.', ...(toneCue([line('me', 'flirty')]) ?? [])]), ['A game cue.']);
  });
});
