import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { TurnPlan } from '@/lib/reply-engine';
import type { Character, User } from '@/types';

import { chatParts } from './chat-prompt';
import { joinParts } from './prompt-layout';
import { enforceStyle, parseModelReply, REPLY_SHAPE, replyStyleLines, turnLines } from './reply-style';
import { buildCharacterPrompt, buildGroupPrompt } from './rules';
import { CRISIS_CUE } from './safety';

const character: Character = {
  id: 'c_kai',
  name: 'Kai',
  handle: '@rafti',
  bio: 'Swim team captain.',
  category: 'school',
  accentIndex: 0,
  voiceReady: true,
  isOfficial: true,
  greeting: 'Hey.',
  tags: ['cheerful'],
};
const user = { id: 'u', displayName: 'Sam', locale: 'en' } as User;

const plan: TurnPlan = {
  style: 'mix',
  moves: ['react', 'followUp'],
  mood: { emotion: 'happy', intensity: 0.6, at: '2026-10-25T20:00:00.000Z' },
  words: 20,
  bubbles: 2,
  ask: true,
  memory: 'Loves rainy mornings.',
};

describe('reply style in the prompt', () => {
  it('goes in the one-to-one persona prompt only when the chat passes it', () => {
    const chat = buildCharacterPrompt(character, user, undefined, 'English', undefined, undefined, undefined, { style: 'story', length: 'long' });
    assert.match(chat, /REPLY STYLE:\n- Story: /);
    assert.match(chat, /- Length: Long/);
    assert.doesNotMatch(buildCharacterPrompt(character, user), /REPLY STYLE:/);
    assert.doesNotMatch(buildGroupPrompt(character, [], user), /REPLY STYLE:/);
  });

  it('puts the settings before the scene and lore, which change more often', () => {
    const lines = replyStyleLines({ style: 'talk', length: 'auto' });
    assert.equal(lines[0], 'REPLY STYLE:');
    assert.match(lines[1], /no asterisks/);
  });

  it('gives this turn as hints: the feeling, the moves, the size and whether to ask', () => {
    const text = turnLines(plan).join('\n');
    assert.match(text, /You feel happy \(0\.6 of 1\)/);
    assert.match(text, /react to what they said.*; then ask about what they just told you/);
    assert.match(text, /About 20 words in 2 messages/);
    assert.match(text, /End with a question/);
    assert.match(text, /"Loves rainy mornings\."/);
  });
});

describe('the model’s reply', () => {
  it('reads the JSON bubbles and the feeling it settled on', () => {
    const reply = parseModelReply('Sure! {"emotion":"shy","intensity":1.4,"messages":["*looks away* Hi.", " ", "You came."]}');
    assert.deepEqual(reply.bubbles, ['*looks away* Hi.', 'You came.']);
    assert.equal(reply.emotion, 'shy');
    assert.equal(reply.intensity, 1);
  });

  it('takes prose when there is no JSON, and drops an unknown feeling', () => {
    assert.deepEqual(parseModelReply('Hey.\n\nYou there?').bubbles, ['Hey.', 'You there?']);
    assert.equal(parseModelReply('{"emotion":"furious","messages":["Hm."]}').emotion, undefined);
  });

  it('holds Talk to no narration', () => {
    assert.deepEqual(enforceStyle(['*grins* Hey.', '*waves*'], 'talk'), ['Hey.']);
    assert.deepEqual(enforceStyle(['*grins* Hey.'], 'mix'), ['*grins* Hey.']);
  });

  it('reads the crisis mark only when it is a real true', () => {
    assert.equal(parseModelReply('{"crisis":true,"messages":["I am here."]}').crisis, true);
    assert.equal('crisis' in parseModelReply('{"crisis":"yes","messages":["Hm."]}'), false);
    assert.equal('crisis' in parseModelReply('{"crisis":false,"messages":["Hm."]}'), false);
    assert.match(REPLY_SHAPE, /"crisis":false[\s\S]*never for a joke/);
  });
});

describe('the crisis cue in the chat prompt', () => {
  const plan = { style: 'mix', moves: ['tease'], mood: { emotion: 'playful', intensity: 0.6 }, words: 20, bubbles: 1, ask: true } as unknown as TurnPlan;
  const input = { character, user, messages: [], plan };

  it('goes last before the shape and takes the turn plan’s place', () => {
    const parts = chatParts({ ...input, crisis: true });
    const names = parts.filter((p) => p.tier === 'turn' && p.text).map((p) => p.name);
    assert.deepEqual(names.slice(-2), ['crisis', 'shape']);
    assert.ok(!names.includes('hints'));
    assert.ok(joinParts(parts).includes(CRISIS_CUE.join('\n')));
    assert.ok(chatParts(input).some((p) => p.name === 'hints' && p.text.includes('tease')));
    assert.ok(!joinParts(chatParts(input)).includes('SAFETY NOW'));
  });
});
