import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { writeMockReply } from '../../mock/reply-writer';
import type { Character, MemoryItem, Message, Relationship } from '@/types';

import { chatRhythm, pace, planTurn, replyPrefs } from './flow';
import { planReply } from './index';
import { currentMood, feel, temperamentFor } from './mood';
import { cutSegments, plainText, segments, segmentWords, speechOnly } from './narration';
import { readMessage } from './read';
import type { TurnContext } from './types';

const NOW = Date.parse('2026-10-25T20:00:00.000Z');
const HOUR = 3_600_000;
const at = new Date(NOW).toISOString();

const character: Character = {
  id: 'c_kai',
  name: 'Kai Arden',
  handle: '@rafti',
  bio: 'Swim team captain.',
  category: 'school',
  series: 'Seaside Academy',
  accentIndex: 0,
  voiceReady: true,
  isOfficial: true,
  greeting: 'Hey.',
  tags: ['cheerful', 'sporty'],
};

const bond: Relationship = {
  characterId: 'c_kai',
  intimacy: 300,
  level: 3,
  levelTitle: 'Friends',
  nextLevelAt: 400,
  streakDays: 2,
  anniversary: at,
  backgroundId: 'bg_1',
  voiceReplies: false,
  messagesFirst: true,
};

let seq = 0;
const me = (text: string): Message => ({ id: `m${++seq}`, conversationId: 'c', author: 'me', kind: 'text', text, createdAt: at });
const them = (text: string): Message => ({ id: `m${++seq}`, conversationId: 'c', author: 'them', kind: 'text', text, createdAt: at });
const memory = (text: string): MemoryItem =>
  ({ id: `mem${++seq}`, characterId: 'c_kai', text, source: 'chat', createdAt: at, pinned: false }) as MemoryItem;

/** A fixed sequence, so a plan comes out the same every run. */
const fixed = (value: number) => () => value;

const ctx = (history: Message[], extra: Partial<TurnContext> = {}): TurnContext => ({
  character,
  relationship: bond,
  history,
  memories: [],
  trigger: 'message',
  now: NOW,
  random: fixed(0.5),
  ...extra,
});

describe('reading a message', () => {
  it('hears a question without a question mark, and a bad day', () => {
    const read = readMessage(me('tell me about your day, mine was a bad day'));
    assert.equal(read.question, true);
    assert.ok(read.cues.includes('sad'));
    assert.ok(read.valence < 0);
  });

  it('marks "ok" and "lol" as giving nothing to work with', () => {
    assert.equal(readMessage(me('ok')).lowEffort, true);
    assert.equal(readMessage(me('lol')).lowEffort, true);
    assert.equal(readMessage(me('I finally passed the exam today')).lowEffort, false);
  });

  it('takes a photo as effort, even with no words', () => {
    const read = readMessage({ ...me(''), kind: 'image', text: undefined });
    assert.deepEqual(read.cues, ['photo']);
    assert.equal(read.lowEffort, false);
  });
});

describe('mood', () => {
  it('starts from their temperament and fades back to it', () => {
    const t = temperamentFor(character);
    assert.equal(t.baseline, 'happy');
    const worried = { emotion: 'worried' as const, intensity: 0.8, at: new Date(NOW - 4 * HOUR).toISOString() };
    // Two half-lives: 0.8 → 0.2, still felt; a few more and it is gone.
    assert.equal(currentMood(worried, t, NOW).emotion, 'worried');
    assert.equal(currentMood({ ...worried, at: new Date(NOW - 8 * HOUR).toISOString() }, t, NOW).emotion, 'happy');
  });

  it('is moved by what you say, the way their temperament takes it', () => {
    const shy = temperamentFor({ ...character, tags: ['shy'] });
    const rest = currentMood(undefined, shy, NOW);
    const hit = feel(rest, readMessage(me('I miss you')), 'message', shy, bond, NOW);
    assert.equal(hit.emotion, 'shy');
    const sad = feel(rest, readMessage(me('I had an awful day')), 'message', shy, bond, NOW);
    assert.equal(sad.emotion, 'worried');
  });
});

describe('planning a turn', () => {
  it('comforts before anything else when you are down', () => {
    const { plan } = planReply(ctx([me('I am so stressed about the exams')]));
    assert.equal(plan.moves[0], 'comfort');
    assert.equal(plan.mood.emotion, 'worried');
  });

  it('answers a question, and does not ask a third question in a row', () => {
    const history = [me('hi'), them('How was school?'), me('fine'), them('What did you eat?'), me('what are you doing?')];
    assert.equal(chatRhythm(history).askedInRow, 2);
    const { plan } = planReply(ctx(history, { random: fixed(0) }));
    assert.equal(plan.moves[0], 'answer');
    assert.equal(plan.ask, false);
  });

  it('steers a flat chat somewhere new, or back to a memory', () => {
    const history = [me('ok'), them('Okay then.'), me('lol')];
    const flat = planReply(ctx(history, { random: fixed(0.9) })).plan;
    assert.ok(flat.moves.includes('newTopic'));
    const recalled = planReply(ctx(history, { random: fixed(0.1), memories: [memory('Loves rainy mornings.')] })).plan;
    assert.ok(recalled.moves.includes('recall'));
    assert.equal(recalled.memory, 'Loves rainy mornings.');
    assert.equal(recalled.ask, true);
  });

  it('says goodbye without a question or a follow-up text', () => {
    const { plan } = planReply(ctx([me('good night, going to sleep')]));
    assert.deepEqual(plan.moves, ['farewell']);
    assert.equal(plan.ask, false);
    assert.equal(plan.nudgeAfterMs, undefined);
  });

  it('follows the chat’s length and style', () => {
    const long = me('So today I went to the beach with my sister and we found this tiny café by the pier');
    const short = planReply(ctx([long], { relationship: { ...bond, replyLength: 'short', replyStyle: 'talk' } })).plan;
    const auto = planReply(ctx([long])).plan;
    const story = planReply(ctx([long], { relationship: { ...bond, replyLength: 'long', replyStyle: 'story' } })).plan;
    assert.ok(short.words < auto.words && auto.words < story.words);
    assert.equal(story.bubbles, 1);
    assert.ok(story.moves.includes('scene'));
  });

  it('defaults to Mixed and Auto for chats saved before the setting', () => {
    assert.deepEqual(replyPrefs(bond), { style: 'mix', length: 'auto' });
    assert.deepEqual(replyPrefs(undefined), { style: 'mix', length: 'auto' });
  });

  it('may text once more after leaving you a question, only when they may reach out', () => {
    const history = [me('I finally finished my painting of the harbour today')];
    const t = temperamentFor(character);
    const read = readMessage(history[0]);
    const mood = currentMood(undefined, t, NOW);
    const open = planTurn(ctx(history, { random: fixed(0.1) }), t, read, mood);
    assert.ok(open.nudgeAfterMs && open.nudgeAfterMs >= 60_000);
    const closed = planTurn(ctx(history, { random: fixed(0.1), relationship: { ...bond, messagesFirst: false } }), t, read, mood);
    assert.equal(closed.nudgeAfterMs, undefined);
    // The text they send when you went quiet never schedules another.
    const nudge = planReply(ctx([...history, them('That sounds amazing!')], { trigger: 'silence', random: fixed(0.1) })).plan;
    assert.deepEqual(nudge.moves, ['nudge']);
    assert.equal(nudge.nudgeAfterMs, undefined);
  });

  it('paces bubbles like typing: longer lines take longer', () => {
    const [a, b] = pace(['Hi.', 'This one is a much longer line to type out on a phone.'], readMessage(undefined), fixed(0.5));
    assert.ok(b > a - 500);
    assert.ok(a >= 500);
  });
});

describe('narration', () => {
  it('splits *actions* from speech', () => {
    assert.deepEqual(segments('*leans in* You came.'), [
      { kind: 'action', text: 'leans in' },
      { kind: 'speech', text: ' You came.' },
    ]);
  });

  it('leaves narration out of the voice note and the asterisks out of previews', () => {
    assert.equal(speechOnly('*grins* Hey. *waves*'), 'Hey.');
    assert.equal(plainText('*grins* Hey.'), 'grins Hey.');
  });
});

describe('the mock writer', () => {
  const write = (history: Message[], style: 'talk' | 'mix' | 'story', random = fixed(0.4)) => {
    const c = ctx(history, { relationship: { ...bond, replyStyle: style }, random });
    return writeMockReply(planReply(c).plan, c);
  };

  it('writes one narrated block in Story, and no narration in Talk', () => {
    const story = write([me('what are you doing tonight?')], 'story');
    assert.equal(story.length, 1);
    assert.match(story[0], /\*Kai /);
    const talk = write([me('what are you doing tonight?')], 'talk');
    assert.ok(talk.length >= 1);
    assert.ok(talk.every((b) => !b.includes('*')));
  });

  it('does not say a line again that it said in the chat', () => {
    const history = [me('hi')];
    const first = write(history, 'talk', fixed(0)).join(' ');
    const second = write([...history, them(first), me('hi')], 'talk', fixed(0)).join(' ');
    assert.notEqual(first, second);
  });

  it('asks about one of their interests now and then', () => {
    const c = ctx([me('I spent the whole afternoon at the harbour today')], { random: fixed(0.1) });
    // A turn that ends on a question of its own choosing (no follow-up already asking).
    const plan = { ...planReply(c).plan, moves: ['react' as const], ask: true };
    const lines = writeMockReply(plan, c, { interests: ['Surfing'] });
    assert.match(lines.join(' '), /surfing/);
  });
});

describe('cutSegments (a reply revealed word by word)', () => {
  const parts = segments('*leans in* You came. I waited.');

  it('counts words as it cuts them', () => {
    assert.equal(segmentWords(parts), 6);
    assert.deepEqual(cutSegments(parts, 99), parts);
  });

  it('keeps a half-shown action italic and never shows an asterisk', () => {
    assert.deepEqual(cutSegments(parts, 1), [{ kind: 'action', text: 'leans ' }]);
    const three = cutSegments(parts, 3);
    assert.deepEqual(three.map((p) => p.kind), ['action', 'speech']);
    assert.equal(three.map((p) => p.text).join(''), 'leans in You ');
  });

  it('shows nothing for zero words', () => {
    assert.deepEqual(cutSegments(parts, 0), []);
  });
});
