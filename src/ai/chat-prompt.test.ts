import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { TurnPlan } from '@/lib/reply-engine';
import type { Character, LoreEntry, Lorebook, MemoryItem, Message, Relationship, User } from '@/types';

import { steerMarker } from '../lib/chat-steer';
import { lorePrompt, recentLines } from '../lib/lorebook';

import type { ChatPromptInput } from './chat-prompt';
import { offCue } from '../lib/reply-rating';

import { chatParts, chatTurns, FACTS_MAX, factLines, layoutChatPrompt, PINNED_MAX, pinnedLines } from './chat-prompt';
import { CHARACTER_RULES } from './rules';
import { followUserLanguage } from './reply-language';
import { toneCue } from './tone';

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
    // The rules, then how threads work: the same for every chat, so cached once.
    assert.ok(global.text.startsWith(CHARACTER_RULES));
    assert.match(global.text, /\nTHREADS: /);
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

describe('votes in the prompt (👍 👎)', () => {
  const said = (id: string, text: string, extra: Partial<Message> = {}): Message =>
    ({ id, conversationId: 'c', author: 'them', kind: 'text', text, createdAt: '2026-10-27T20:00:00.000Z', ...extra }) as Message;

  it('tells ↻ after 👎 what to fix, and carries the votes in the turn tier', () => {
    const parts = chatParts({
      character: kai,
      user: sam,
      messages: [said('a', 'Ha, stop it', { reaction: 'laugh' })],
      redo: ['First try.'],
      redoOff: 'listen',
    });
    assert.ok(parts.find((p) => p.name === 'redo')?.text.includes(offCue('listen')));
    const taste = parts.find((p) => p.name === 'taste');
    assert.equal(taste?.tier, 'turn');
    assert.ok(taste?.text.includes('- Ha, stop it'));
  });
});

describe('factLines (B2: what they know)', () => {
  const fact = (id: string, text: string, extra: Partial<MemoryItem> = {}): MemoryItem => ({
    id,
    characterId: 'c_kai',
    text,
    source: 'chat',
    createdAt: `2026-10-${id.padStart(2, '0')}T10:00:00Z`,
    pinned: false,
    ...extra,
  });

  it('carries every open fact, the most important then the newest, never pins or old ones', () => {
    const lines = factLines([
      fact('1', 'Likes rain'),
      fact('2', 'Dog called Biscuit', { importance: 0.9 }),
      fact('3', 'Lives in Namangan', { status: 'superseded', supersededBy: '4' }),
      fact('4', 'Moved to Tashkent'),
      fact('5', 'Pinned one', { pinned: true }),
    ]);
    assert.deepEqual(lines, [
      'WHAT YOU KNOW (from your chats; true in your story; use it when it fits, never as a list):',
      '- About them: Dog called Biscuit',
      '- About them: Moved to Tashkent',
      '- About them: Likes rain',
    ]);
    assert.deepEqual(factLines([]), []);
  });

  it('caps the count and the text, and sits in the cached chat tier before the summary', () => {
    const many = Array.from({ length: FACTS_MAX + 10 }, (_, i) => fact(String((i % 28) + 1), `Fact number ${i}`));
    assert.equal(factLines(many).length, FACTS_MAX + 1);
    const long = Array.from({ length: 40 }, (_, i) => fact('9', `${i} ${'x'.repeat(200)}`));
    assert.ok(factLines(long).join('\n').length < 5200);
    const parts = chatParts({ character: kai, user: sam, messages: [], facts: [fact('2', 'Dog called Biscuit')], summary: 'They met at the pool.' });
    const names = parts.filter((p) => p.tier === 'chat' && p.text).map((p) => p.name);
    assert.ok(names.indexOf('facts') < names.indexOf('summary'), names.join());
  });
});

describe('the tone of a text', () => {
  const said = [{ id: 'm1', conversationId: 'c', author: 'me', kind: 'text', text: 'Come here.', tone: 'flirty', createdAt: '' }] as Message[];
  const cueOf = (crisis: boolean) => chatParts({ character: kai, user: sam, messages: said, cue: ['A game cue.', ...(toneCue(said) ?? [])], crisis }).find((p) => p.name === 'cue')?.text ?? '';

  it('rides in the cue of this reply', () => {
    assert.match(cueOf(false), /HOW THEY SAID IT/);
  });

  it('is gone in a crisis, and the rest of the cue stays', () => {
    assert.doesNotMatch(cueOf(true), /HOW THEY SAID IT/);
    assert.match(cueOf(true), /A game cue/);
  });
});

describe('the clock and what they set up together reach the reply (0z135)', () => {
  const clock = { now: '2026-11-07T13:20:00.000Z', utcOffsetMin: 300 };
  const parts = chatParts({
    character: kai,
    user: sam,
    messages: [],
    clock,
    together: { plans: [{ title: 'Coffee at the pier', date: '2026-11-08', time: '18:30' }], wakes: [{ hour: 7, minute: 0, repeat: [] }] },
    threads: [
      { id: 't1', characterId: 'c_kai', about: 'exam', quote: 'exam tomorrow', status: 'open', happensAt: '2026-11-08T04:00:00.000Z', touches: [], createdAt: clock.now } as never,
    ],
  });
  const text = (name: string) => parts.find((p) => p.name === name)?.text ?? '';

  it('tells the friend the hour where the user is, in the turn tier', () => {
    assert.match(text('clock'), /Saturday 2026-11-07 18:20/);
    assert.equal(parts.find((p) => p.name === 'clock')?.tier, 'turn');
  });

  it('lists the plan and the wake-up made in the app', () => {
    assert.match(text('together'), /"Coffee at the pier"/);
    assert.match(text('together'), /wake them up at 07:00/);
  });

  it('writes thread times on the same clock', () => {
    assert.match(text('threads'), /2026-11-08 09:00/);
  });

  it('adds nothing without them', () => {
    const bare = chatParts({ character: kai, user: sam, messages: [] });
    assert.equal(bare.find((p) => p.name === 'clock')?.text ?? '', '');
    assert.equal(bare.find((p) => p.name === 'together')?.text ?? '', '');
  });
});

describe('chatParts: setting things up from the chat (0z136)', () => {
  const rules = (mode?: 'call') => chatParts({ character: kai, user: sam, messages: [], mode }).find((p) => p.name === 'setupRules');
  it('rides in the cached global tier of a chat reply', () => {
    assert.equal(rules()?.tier, 'global');
    assert.match(rules()?.text ?? '', /"setup"/);
  });
  it('is left out of a call, which has no card to tap', () => {
    assert.equal(rules('call')?.text ?? '', '');
  });
  it('tells the friend where its offers stand, in the turn tier', () => {
    const card = { id: 'k', conversationId: 'c', author: 'them', kind: 'system', card: 'setup', createdAt: '2026-11-07T14:33:00.000Z', setup: { kind: 'alarm', title: '', date: '2026-11-08', time: '07:00', repeat: [] } } as const;
    const offers = chatParts({ character: kai, user: sam, messages: [card as never] }).find((p) => p.name === 'offers');
    assert.equal(offers?.tier, 'turn');
    assert.match(offers?.text ?? '', /07:00: not set yet/);
  });
  it('reminds the turn of an ungiven gender by name, following a persona over the profile', () => {
    const they = (input: Parameters<typeof chatParts>[0]) => chatParts(input).find((p) => p.name === 'they');
    const heProfile = { ...sam, pronouns: 'he' } as User;
    const theyPersona = { id: 'p1', name: 'Rook', pronouns: 'they', profile: false } as const;
    const cue = they({ character: kai, user: heProfile, persona: theyPersona, messages: [] });
    assert.equal(cue?.tier, 'turn');
    assert.match(cue?.text ?? '', /Rook has not given theirs/);
    assert.equal(they({ character: kai, user: { ...sam, pronouns: 'they' } as User, persona: { id: 'p2', name: 'Max', pronouns: 'he', profile: false }, messages: [] })?.text ?? '', '');
    assert.match(they({ character: kai, user: { ...sam, pronouns: 'they' } as User, messages: [] })?.text ?? '', /Sam has not given theirs/);
  });
});

describe('the cached REPLY LANGUAGE names no language once they have written (0z187)', () => {
  const said = (text: string): Message => ({ id: text, conversationId: 'c', author: 'me', kind: 'text', text, createdAt: '2026-11-09T13:25:00.000Z' });
  const language = (messages: Message[]) =>
    chatParts({ character: kai, user: sam, messages, replyLanguage: followUserLanguage('en-US') }).find((p) => p.name === 'language')!.text;
  it('drops the phone language a light model named for a Turkish line', () => {
    assert.doesNotMatch(language([said('Sadece seni özledim.')]), /English/);
    assert.match(language([]), /English/);
  });
});
