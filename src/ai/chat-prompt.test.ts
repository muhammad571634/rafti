import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { TurnPlan } from '@/lib/reply-engine';
import type { Character, LoreEntry, Lorebook, MemoryItem, Message, Relationship, User } from '@/types';

import { steerMarker } from '../lib/chat-steer';
import { lorePrompt, recentLines } from '../lib/lorebook';

import type { ChatPromptInput } from './chat-prompt';
import { chatTurns, layoutChatPrompt, PINNED_MAX, pinnedLines } from './chat-prompt';
import { CHARACTER_RULES } from './rules';

const kai = {
  id: 'c_kai',
  name: 'Kai Arden',
  handle: '@rafti',
  bio: 'Swim-team ace.',
  category: 'school',
  series: 'Seaside Academy',
  accentIndex: 0,
  voiceReady: true,
  isOfficial: true,
  greeting: 'Hey, you.',
  tags: ['cheerful'],
} as Character;
const sam = { id: 'u1', displayName: 'Sam', locale: 'en-US', job: 'Nurse' } as User;
const bond = (level: number) => ({ characterId: 'c_kai', level, levelTitle: 'Friend' }) as Relationship;

const entry = (id: string, name: string, keywords: string[]): LoreEntry => ({ id, kind: 'place', name, keywords, text: `${name} is here.` });
const seaside: Lorebook = {
  id: 'w_seaside',
  name: 'Seaside Academy',
  about: 'A university town by the sea.',
  entries: [entry('pier', 'The pier', ['pier'])],
  characterIds: [],
  series: 'Seaside Academy',
  official: true,
  createdAt: '',
};
const ours: Lorebook = {
  id: 'b_ours',
  name: 'Our story',
  about: 'We met on the night ferry.',
  entries: [entry('ferry', 'The ferry', ['ferry'])],
  characterIds: ['c_kai'],
  createdAt: '',
};

let seq = 0;
const line = (author: 'me' | 'them', text: string, extra: Partial<Message> = {}): Message => ({
  id: `m${++seq}`,
  conversationId: 'conv_kai',
  author,
  kind: 'text',
  text,
  createdAt: new Date(Date.UTC(2026, 9, 25, 12, 0, seq)).toISOString(),
  ...extra,
});

const memory = (id: string, text: string, extra: Partial<MemoryItem> = {}): MemoryItem => ({
  id,
  characterId: 'c_kai',
  text,
  source: 'chat',
  createdAt: '2026-10-10T08:00:00.000Z',
  pinned: true,
  ...extra,
});

const plan = (ask: boolean): TurnPlan => ({
  style: 'mix',
  moves: ['react'],
  mood: { emotion: 'happy', intensity: 0.5, at: '2026-10-25T12:00:00.000Z' },
  words: 20,
  bubbles: 1,
  ask,
});

describe('chatTurns', () => {
  it('reads the chat one turn per side, a skip as the user’s turn and a continue as nothing', () => {
    const messages = [
      line('them', 'Hey, you.'),
      line('me', 'hi'),
      line('me', 'long day'),
      line('them', 'Tell me.'),
      { ...steerMarker('conv_kai', 'continue'), id: 'c1' },
      line('them', 'Actually, wait.'),
      { ...steerMarker('conv_kai', 'skip', 'nextMorning'), id: 's1' },
      line('them', 'Morning!'),
      line('me', 'still sending', { pending: true }),
      line('me', '', { kind: 'voice', text: undefined, transcript: 'voice words' }),
    ];
    assert.deepEqual(chatTurns(messages), [
      { role: 'assistant', text: 'Hey, you.' },
      { role: 'user', text: 'hi\nlong day' },
      { role: 'assistant', text: 'Tell me.\nActually, wait.' },
      { role: 'user', text: '[Time skip: The next morning]' },
      { role: 'assistant', text: 'Morning!' },
      { role: 'user', text: 'voice words' },
    ]);
  });
});

describe('layoutChatPrompt', () => {
  const messages = [line('them', 'Hey, you.'), line('me', 'The ferry was late again.')];
  const input: ChatPromptInput = {
    character: kai,
    user: sam,
    relationship: bond(3),
    replyLanguage: 'en',
    scene: { sceneId: 's', title: 'Night ferry', setting: 'On deck.', startedAt: '' },
    lore: lorePrompt([seaside, ours], recentLines(messages), kai.id),
    prefs: { style: 'story', length: 'long' },
    pinned: [memory('p1', 'Sam hates the cold.')],
    summary: 'They talked about swimming.',
    messages,
    memories: [{ text: 'Sam’s sister is visiting.', pinned: false }],
    steer: { kind: 'skip', skip: 'nextMorning' },
    plan: plan(true),
  };
  const layout = layoutChatPrompt(input);
  const [global, character, chat] = layout.system;

  it('puts the rules, then their persona and world, then the chat’s own settings', () => {
    assert.deepEqual(
      layout.system.map((b) => b.tier),
      ['global', 'character', 'chat'],
    );
    assert.equal(global.text, CHARACTER_RULES);
    assert.match(character.text, /^YOUR PERSONA:\nName: Kai Arden/);
    assert.match(character.text, /- Seaside Academy: A university town/);
    assert.doesNotMatch(character.text, /Sam|Our story|REPLY LANGUAGE/);
    for (const block of ['notes the user wrote', 'REPLY LANGUAGE: en', 'THE USER:\nName: Sam', 'REPLY STYLE:', 'ALWAYS REMEMBER', 'YOUR STORY SO FAR']) {
      assert.ok(chat.text.includes(block), block);
    }
    assert.ok(chat.text.endsWith('They talked about swimming.'), 'the summary sits right before the history');
  });

  it('keeps what changes between replies out of the cached part, after the history', () => {
    for (const block of ['YOUR BOND', 'CURRENT SCENE', 'WORLD NOTES', 'BRINGS TO MIND', 'NEXT: Time skip', 'THIS TURN', 'Reply with JSON only']) {
      assert.ok(!layout.system.some((b) => b.text.includes(block)), block);
    }
    const order = ['YOUR BOND', 'CURRENT SCENE', 'WORLD NOTES', 'BRINGS TO MIND', 'NEXT: Time skip', 'THIS TURN', 'Reply with JSON only'].map((block) =>
      layout.turn.indexOf(block),
    );
    assert.ok(order.every((at, i) => at >= 0 && (i === 0 || at > order[i - 1])), String(order));
    assert.match(layout.turn, /- The ferry \(place\): The ferry is here\./);
    assert.deepEqual(layout.history, [{ role: 'user', text: 'The ferry was late again.' }]);
  });

  it('gives every user the same rules and persona for an official character', () => {
    const mo = { id: 'u2', displayName: 'Mo', locale: 'uz' } as User;
    const other = layoutChatPrompt({ character: kai, user: mo, lore: lorePrompt([seaside], [], kai.id), messages });
    assert.deepEqual(other.system.slice(0, 2), layout.system.slice(0, 2));
    assert.notEqual(other.system[2].text, chat.text);
  });

  it('keeps its cached prefix from reply to reply in a warm chat', () => {
    const chatSoFar = [line('them', 'Hey, you.')];
    let before: ReturnType<typeof layoutChatPrompt> | undefined;
    // `null` is a time skip in place of a message.
    const said = ['hi', 'the pier is pretty today', 'my sister is visiting', null, 'night ferry tonight?'];
    said.forEach((text, i) => {
      chatSoFar.push(text === null ? { ...steerMarker('conv_kai', 'skip', 'evening'), id: `skip${i}` } : line('me', text));
      const now = layoutChatPrompt({
        ...input,
        messages: chatSoFar,
        // What changes between replies: a level up, the lore and memories the words bring up, the plan, a skip.
        relationship: bond(3 + i),
        lore: lorePrompt([seaside, ours], recentLines(chatSoFar), kai.id),
        memories: i % 2 ? [{ text: 'Sam’s sister is visiting.' }] : [],
        steer: text === null ? { kind: 'skip', skip: 'evening' } : undefined,
        plan: plan(i % 2 === 0),
      });
      if (before) {
        assert.deepEqual(now.system, before.system, `system blocks changed at reply ${i}`);
        assert.deepEqual(now.history.slice(0, before.history.length), before.history, `history prefix changed at reply ${i}`);
        assert.notEqual(now.turn, before.turn);
      }
      before = now;
      chatSoFar.push(line('them', `reply ${i}`), line('them', `and more ${i}`));
    });
  });

  it('cuts a long chat in whole steps', () => {
    const long = [line('them', 'Hey, you.')];
    for (let i = 0; i < 22; i++) long.push(line('me', `q${i}`), line('them', `a${i}`));
    // 45 turns: the cut sits on turn 20, their reply there is left out too.
    const cut = layoutChatPrompt({ character: kai, user: sam, messages: long });
    assert.equal(cut.cut, 21);
    assert.deepEqual(cut.history[0], { role: 'user', text: 'q10' });
  });
});

describe('pinnedLines', () => {
  it('keeps one order whatever order the memories come in, the newest pins only', () => {
    const pins = Array.from({ length: PINNED_MAX + 5 }, (_, i) => memory(`p${i}`, `fact ${i}`, { createdAt: new Date(Date.UTC(2026, 9, 1 + i)).toISOString() }));
    const lines = pinnedLines(pins);
    assert.deepEqual(pinnedLines([...pins].reverse()), lines);
    assert.equal(lines.length, PINNED_MAX + 1);
    assert.equal(lines[1], '- About them: fact 5');
    assert.equal(lines.at(-1), `- About them: fact ${PINNED_MAX + 4}`);
  });

  it('says whose each memory is and keeps a pinned line word for word', () => {
    const lines = pinnedLines([
      memory('a1', 'Hates the cold.', { createdAt: '2026-10-01T00:00:00.000Z', about: 'them' }),
      memory('a2', 'The ferry night.', { createdAt: '2026-10-02T00:00:00.000Z', about: 'story' }),
      memory('a3', 'I will never forget this.', { createdAt: '2026-10-03T00:00:00.000Z', about: 'story', quote: { messageId: 'm1', author: 'me' } }),
      memory('a4', 'Old job.', { createdAt: '2026-10-04T00:00:00.000Z', status: 'superseded' }),
    ]);
    assert.deepEqual(lines.slice(1), ['- About you: Hates the cold.', '- Your story: The ferry night.', '- They said: "I will never forget this."']);
  });
});
