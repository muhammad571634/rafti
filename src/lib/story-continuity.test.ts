/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Character, MemoryItem, Message, Relationship } from '@/types';

import { buildStoryContinuityContext, type StoryContinuityContextInput } from './story-continuity';

const NOW = Date.parse('2026-10-12T12:00:00.000Z');
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW - days * DAY).toISOString();

const character: Character = {
  id: 'c_theo',
  name: 'Theo',
  handle: '@rafti',
  bio: 'Quiet library regular.',
  category: 'school',
  series: 'Seaside Academy',
  accentIndex: 0,
  voiceReady: true,
  isOfficial: true,
  greeting: 'Hey.',
  tags: ['calm'],
};

const relationship: Relationship = {
  characterId: 'c_theo',
  intimacy: 900,
  level: 10,
  levelTitle: 'Close friend',
  nextLevelAt: 1000,
  streakDays: 4,
  anniversary: ago(30),
  backgroundId: 'bg_1',
  voiceReplies: false,
  messagesFirst: true,
};

let seq = 0;
const memory = (text: string, extra: Partial<MemoryItem> = {}): MemoryItem => ({
  id: `mem_${++seq}`,
  characterId: 'c_theo',
  text,
  source: 'chat',
  createdAt: ago(1),
  pinned: false,
  ...extra,
});

const message = (text: string | undefined, minutesAgo: number, extra: Partial<Message> = {}): Message => ({
  id: `msg_${++seq}`,
  conversationId: 'conv_theo',
  author: 'me',
  kind: 'text',
  ...(text === undefined ? {} : { text }),
  createdAt: new Date(NOW - minutesAgo * 60_000).toISOString(),
  ...extra,
});

const build = (overrides: Partial<StoryContinuityContextInput> = {}, now: number = NOW) =>
  buildStoryContinuityContext(
    { character, relationship, recentMessages: [], memories: [], currentUserMessage: '', ...overrides },
    now,
  );

const ids = (context: ReturnType<typeof build>) => context.relevantMemories.map((m) => m.id);

describe('buildStoryContinuityContext', () => {
  it('1. returns the same output for the same input', () => {
    const memories = [memory('Drinks peach tea.'), memory('Exam on Friday.', { pinned: true }), memory('Likes rain.')];
    const recentMessages = [message('tea later?', 2), message('sure', 1, { author: 'them' })];
    const input = { memories, recentMessages, currentUserMessage: 'peach tea after the exam?' };
    assert.deepEqual(build(input), build(input));
    assert.deepEqual(build(input), build({ ...input, memories: memories.slice().reverse() }));
  });

  it('2. keeps recent messages chronological and bounded, including a limit of zero', () => {
    const recentMessages = [message('third', 1), message('first', 3), message('second', 2)];
    assert.deepEqual(build({ recentMessages, maxRecentMessages: 2 }).recentMessages.map((m) => m.text), ['second', 'third']);
    assert.deepEqual(build({ recentMessages }).recentMessages.map((m) => m.text), ['first', 'second', 'third']);
    assert.equal(build({ recentMessages, maxRecentMessages: 0 }).recentMessages.length, 0);
  });

  it("3. never returns another character's memories", () => {
    const memories = [memory('Peach tea fan.', { characterId: 'c_kai', pinned: true }), memory('Peach tea fan.')];
    const context = build({ memories, currentUserMessage: 'peach tea' });
    assert.deepEqual(ids(context), [memories[1].id]);
  });

  it('4. deduplicates the same memory text, keeping the pinned or newest copy', () => {
    const older = memory('Drinks peach tea.', { createdAt: ago(9) });
    const pinned = memory('drinks  PEACH tea!', { createdAt: ago(5), pinned: true });
    const context = build({ memories: [older, pinned], currentUserMessage: 'peach tea' });
    assert.deepEqual(ids(context), [pinned.id]);
  });

  it('5. ranks pinned memories above unpinned ones with the same relevance', () => {
    const plain = memory('Likes the rooftop garden.', { createdAt: ago(1) });
    const pinned = memory('Rooftop garden is their spot.', { createdAt: ago(20), pinned: true });
    const context = build({ memories: [plain, pinned], currentUserMessage: 'rooftop garden' });
    assert.deepEqual(ids(context), [pinned.id, plain.id]);
  });

  it('6. does not flood the context for low-information messages', () => {
    const memories = [
      memory('Their exam week ends on Friday and they are nervous about it.'),
      memory('Hates being called by their full name.'),
      memory('Walked home in the rain and liked it.'),
      memory('Said you are easier to talk to than anyone.'),
    ];
    for (const text of ['how are you', 'hey', 'ok', 'what are you doing', 'and the', '...', '']) {
      assert.ok(build({ memories, currentUserMessage: text }).relevantMemories.length <= 2, `"${text}" pulled too many memories`);
    }
    // Only real words count: "the" and "and" must not match.
    assert.deepEqual(ids(build({ memories, currentUserMessage: 'about the rain' })), [memories[2].id]);
  });

  it('7. survives invalid timestamps and does not let them outrank valid relevant memories', () => {
    const broken = memory('Peach tea fan.', { createdAt: 'not a date' });
    const valid = memory('Peach tea, never coffee.', { createdAt: ago(2) });
    const context = build({ memories: [broken, valid], currentUserMessage: 'peach tea' });
    assert.equal(context.relevantMemories[0].id, valid.id);
    assert.ok(context.relevantMemories.every((m) => Number.isFinite(m.relevanceScore)));
    const recent = build({ recentMessages: [message('a', 1), message('b', 0, { createdAt: 'bad' })] });
    assert.equal(recent.recentMessages.length, 2);
    // A broken reference time must not turn every score into NaN.
    const nanNow = build({ memories: [valid], currentUserMessage: 'peach tea' }, Number.NaN);
    assert.deepEqual(ids(nanNow), [valid.id]);
    assert.ok(nanNow.relevantMemories.every((m) => Number.isFinite(m.relevanceScore)));
  });

  it('8. clamps limits to safe non-negative bounds', () => {
    const many = Array.from({ length: 60 }, (_, i) => message(`m${i}`, 60 - i));
    const mems = Array.from({ length: 40 }, (_, i) => memory(`Peach tea note ${i}`, { pinned: true }));
    assert.deepEqual(build({ maxRecentMessages: -5, maxMemories: -1 }).limits, { maxRecentMessages: 0, maxMemories: 0 });
    assert.deepEqual(build({ maxRecentMessages: 1e9, maxMemories: 1e9 }).limits, { maxRecentMessages: 30, maxMemories: 20 });
    assert.deepEqual(build({ maxRecentMessages: Infinity, maxMemories: Infinity }).limits, { maxRecentMessages: 30, maxMemories: 20 });
    assert.deepEqual(build({ maxRecentMessages: Number.NaN, maxMemories: 2.9 }).limits, { maxRecentMessages: 12, maxMemories: 2 });
    const big = build({ recentMessages: many, memories: mems, currentUserMessage: 'peach tea', maxRecentMessages: 99, maxMemories: 99 });
    assert.equal(big.recentMessages.length, 30);
    assert.equal(big.relevantMemories.length, 20);
  });

  it('9. never leaks local image or audio URIs', () => {
    const recentMessages = [
      message(undefined, 3, { kind: 'image', imageUri: 'file:///private/photo.jpg' }),
      message(undefined, 2, { kind: 'voice', durationSec: 4 }),
      message(undefined, 1, { kind: 'voice', transcript: 'see you soon' }),
    ];
    const context = build({ recentMessages });
    assert.ok(!JSON.stringify(context).includes('file://'));
    assert.deepEqual(context.recentMessages.map((m) => m.text), ['[Image message]', '[Voice message]', 'see you soon']);
  });

  it('10. does not present relationship level as consent', () => {
    const context = build();
    assert.ok(context.relationship);
    assert.equal('intimacy' in context.relationship, false);
    assert.match(context.relationship.note, /game progress/i);
  });

  it('leaves out app-only rows and turns call rows into placeholders', () => {
    const recentMessages = [
      message('hi', 5),
      message('Theo is an AI character', 4, { kind: 'system' }),
      message(undefined, 3, { kind: 'call', durationSec: 60 }),
      message(undefined, 2, { kind: 'call', missed: true }),
      message('typing…', 1, { pending: true }),
    ];
    assert.deepEqual(build({ recentMessages }).recentMessages.map((m) => m.text), ['hi', '[Call]', '[Missed call]']);
  });
});
