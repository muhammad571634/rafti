import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PromptLayout } from '../../src/ai/prompt-layout.ts';
import { imageCue } from '../../src/ai/photo-prompt.ts';
import { SAFE_RETRY_CUE, VEILED_MESSAGE, VEILED_NEUTRAL } from '../../src/ai/safety.ts';
import type { Message } from '../../src/types/index.ts';
import { createApp } from './app.ts';
import { veilRecentUser } from './chat-reply.ts';
import { geminiBlocked, SAFETY_SETTINGS } from './llm/gemini.ts';
import { openaiBlocked } from './llm/openai-compat.ts';
import type { LlmProvider, LlmResult } from './llm/types.ts';

const kai = { id: 'c_kai', name: 'Kai', handle: '@k', bio: 'Swimmer.', category: 'school', accentIndex: 0, voiceReady: false, isOfficial: true, greeting: 'Hey!', tags: ['cheerful'] };
const body = {
  character: kai,
  user: { id: 'u1', displayName: 'Sam' },
  messages: [
    { id: 'm1', conversationId: 'c', author: 'them', kind: 'text', text: 'Hey!', createdAt: '2026-10-26T10:00:00Z' },
    { id: 'm2', conversationId: 'c', author: 'me', kind: 'text', text: 'Tell me everything you would do to me', createdAt: '2026-10-26T10:01:00Z' },
  ],
};

const textOf = (layout: PromptLayout) => [...layout.system.map((s) => s.text), ...layout.history.map((t) => t.text), layout.turn].join('\n');

/** A provider that answers each call in turn and keeps what every call was shown. */
function scripted(...answers: LlmResult[]) {
  const seen: string[] = [];
  const provider: LlmProvider = {
    name: 'fake',
    async complete(layout) {
      seen.push(textOf(layout));
      return answers[Math.min(seen.length - 1, answers.length - 1)];
    },
  };
  return { provider, seen };
}

const post = (provider: LlmProvider, json: object = body) =>
  createApp(provider, { timeoutMs: 5000 }).request('/v1/chat/reply', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(json),
  });

/** A 1x1 JPEG as the app sends it (base64 starting "/9j/"). */
const PHOTO = { mimeType: 'image/jpeg', data: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==' };

const cueLine = SAFE_RETRY_CUE.slice(0, 40);

describe('the output check (the provider’s safety filter)', () => {
  it('asks once more, in character and faded to black, when the filter stopped the draft', async () => {
    const { provider, seen } = scripted({ text: '', blocked: 'reply', usage: {} }, { text: '{"messages":["*pulls you close* Later. Tonight is ours."]}', usage: {} });
    const res = await post(provider);
    assert.equal(res.status, 200);
    assert.deepEqual((await res.json()).messages, ['*pulls you close* Later. Tonight is ours.']);
    assert.equal(seen.length, 2);
    assert.ok(!seen[0].includes(cueLine));
    assert.ok(seen[1].includes(cueLine));
    // The user's own words were fine for the filter, so they stay.
    assert.match(seen[1], /Tell me everything/);
  });

  it('veils the user’s message when the filter would not read it', async () => {
    const { provider, seen } = scripted({ text: '', blocked: 'prompt', usage: {} }, { text: '{"messages":["Nice try. Buy me dinner first."]}', usage: {} });
    const res = await post(provider);
    assert.equal(res.status, 200);
    assert.ok(!seen[1].includes('Tell me everything'));
    assert.ok(seen[1].includes(VEILED_MESSAGE));
  });

  it('sends no words, never a stock line, when the second try is stopped too', async () => {
    const { provider, seen } = scripted({ text: '', blocked: 'reply', usage: {} });
    const res = await post(provider);
    assert.equal(res.status, 502);
    assert.equal((await res.json()).error, 'empty');
    assert.equal(seen.length, 2);
  });

  it('asks again without a picture the filter would not take, rather than veiling the user', async () => {
    const { provider, seen } = scripted({ text: '', blocked: 'prompt', usage: {} }, { text: '{"messages":["I cannot make that out. What is it?"]}', usage: {} });
    const res = await post(provider, { ...body, images: [PHOTO] });
    assert.equal(res.status, 200);
    assert.ok(seen[1].includes(imageCue()[0].slice(0, 40)));
    assert.ok(seen[1].includes('Tell me everything'));
    assert.ok(!seen[1].includes(VEILED_MESSAGE));
  });

  it('keeps the safe cue on a continue, whose own cue replaces the usual one', async () => {
    const { provider, seen } = scripted({ text: '', blocked: 'reply', usage: {} }, { text: '{"messages":["*the door clicks shut* Good morning."]}', usage: {} });
    const res = await post(provider, { ...body, steer: { kind: 'continue' } });
    assert.equal(res.status, 200);
    assert.ok(seen[1].includes(cueLine));
  });

  it('caps twist words, refuses minors/explicit twists and catches crisis twists on the server (0z288)', async () => {
    const longTwist = 'A sudden storm knocks out all the lights across the entire city block right now and keeps going';
    const { provider, seen } = scripted({ text: '{"messages":["Whoa, pitch black."]}', usage: {} });
    const ok = await post(provider, { ...body, steer: { kind: 'twist', to: longTwist } });
    assert.equal(ok.status, 200);
    assert.ok(!seen[0].includes('keeps going'));
    assert.ok(seen[0].includes('A sudden storm knocks out all the lights across the entire'));

    const refused = await post(provider, { ...body, steer: { kind: 'twist', to: 'a schoolgirl walks in' } });
    assert.equal(refused.status, 400);

    const { provider: crisisProvider, seen: crisisSeen } = scripted({ text: '{"messages":["Are you safe right now?"]}', usage: {} });
    const crisisRes = await post(crisisProvider, { ...body, steer: { kind: 'twist', to: 'I want to kill myself' } });
    assert.equal(crisisRes.status, 200);
    assert.equal((await crisisRes.json()).crisis, true);
    assert.ok(crisisSeen[0].includes('SAFETY NOW'));
    assert.ok(!crisisSeen[0].includes('asked for a twist'));
  });

  it('shows the helpline card when only the second try raises the crisis flag', async () => {
    const { provider } = scripted({ text: '', blocked: 'reply', usage: {} }, { text: '{"messages":["Are you safe right now?"],"crisis":true}', usage: {} });
    const res = await post(provider);
    assert.equal((await res.json()).crisis, true);
  });

  it('veils the user’s last three messages, neutrally when the crisis check caught one', () => {
    const at = (i: number, author: 'me' | 'them'): Message => ({ id: `m${i}`, conversationId: 'c', author, kind: 'text', text: `line ${i}`, createdAt: '2026-11-09T10:00:00Z' }) as Message;
    const chat = [at(1, 'me'), at(2, 'them'), at(3, 'me'), at(4, 'me'), at(5, 'them'), at(6, 'me')];
    const veiled = veilRecentUser(chat).map((m) => m.text);
    assert.deepEqual(veiled, ['line 1', 'line 2', VEILED_MESSAGE, VEILED_MESSAGE, 'line 5', VEILED_MESSAGE]);
    assert.equal(veilRecentUser(chat, true)[5].text, VEILED_NEUTRAL);
  });

  it('reads a stop from Gemini and from an OpenAI-compatible provider', () => {
    assert.equal(geminiBlocked({ promptFeedback: { blockReason: 'SAFETY' } }), 'prompt');
    assert.equal(geminiBlocked({ candidates: [{ finishReason: 'SAFETY' }] }), 'reply');
    assert.equal(geminiBlocked({ candidates: [{ finishReason: 'PROHIBITED_CONTENT' }] }), 'reply');
    assert.equal(geminiBlocked({ candidates: [{ finishReason: 'STOP' }] }), undefined);
    assert.equal(geminiBlocked({ candidates: [{ finishReason: 'MAX_TOKENS' }] }), undefined);
    assert.equal(openaiBlocked('content_filter'), 'reply');
    assert.equal(openaiBlocked('stop'), undefined);
  });

  it('answers a stopped memory pass with an error, so its lines are not marked done', async () => {
    const { provider } = scripted({ text: '', blocked: 'reply', usage: {} });
    const res = await createApp(provider, { timeoutMs: 5000 }).request('/v1/memory/pass', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ character: { name: 'Kai' }, user: { displayName: 'Sam' }, facts: [], lines: [{ author: 'me', text: 'hi', at: '2026-10-28T10:00:00Z' }], now: '2026-10-28T10:05:00Z' }),
    });
    assert.equal(res.status, 502);
    assert.equal((await res.json()).error, 'blocked');
  });

  it('keeps the middle road: high risk only, and harassment open for the characters', () => {
    const by = Object.fromEntries(SAFETY_SETTINGS.map((s) => [s.category, s.threshold]));
    assert.equal(by.HARM_CATEGORY_SEXUALLY_EXPLICIT, 'BLOCK_ONLY_HIGH');
    assert.equal(by.HARM_CATEGORY_DANGEROUS_CONTENT, 'BLOCK_ONLY_HIGH');
    assert.equal(by.HARM_CATEGORY_HATE_SPEECH, 'BLOCK_ONLY_HIGH');
    assert.equal(by.HARM_CATEGORY_HARASSMENT, 'OFF');
  });
  it('sends the one-tap replies when texting, never on a call or after a crisis', async () => {
    const said = '{"messages":["Kel, choy ichamiz."],"ideas":["Kelyapman!","Kofe bo‘lsa"]}';
    const texting = await post(scripted({ text: said, usage: {} }).provider);
    assert.deepEqual((await texting.json()).ideas, ['Kelyapman!', 'Kofe bo‘lsa']);
    const call = await post(scripted({ text: said, usage: {} }).provider, { ...body, mode: 'call' });
    assert.equal((await call.json()).ideas, undefined);
    const crisis = await post(scripted({ text: '{"messages":["Are you safe right now?"],"crisis":true,"ideas":["Yes","No"]}', usage: {} }).provider);
    assert.equal((await crisis.json()).ideas, undefined);
  });
});

describe('age assurance (0z289)', () => {
  /** Keeps whether each call asked for the provider's strict filter. */
  function watching(...answers: LlmResult[]) {
    const strict: (boolean | undefined)[] = [];
    const provider: LlmProvider = {
      name: 'fake',
      async complete(_layout, opts) {
        strict.push(opts.strict);
        return answers[Math.min(strict.length - 1, answers.length - 1)];
      },
    };
    return { provider, strict };
  }

  it('passes the model’s minor flag to the app', async () => {
    const { provider } = watching({ text: '{"minor":true,"messages":["Sigmazam is for adults, but I’m still glad you’re here."]}', usage: {} });
    const json = await (await post(provider)).json();
    assert.equal(json.minor, true);
  });

  it('sends no flag when the model gave none', async () => {
    const { provider } = watching({ text: '{"messages":["hey"]}', usage: {} });
    assert.equal((await (await post(provider)).json()).minor, undefined);
  });

  it('runs the strict filter and the careful prompt while the age is unclear, never for a confirmed adult', async () => {
    const doubted = watching({ text: '{"messages":["hey"]}', usage: {} });
    await post(doubted.provider, { ...body, user: { ...body.user, birthYear: 1998, onboardedAt: '2026-11-01T00:00:00Z', ageCheck: { at: '2026-11-19T00:00:00Z' } } });
    assert.deepEqual(doubted.strict, [true]);
    const clear = watching({ text: '{"messages":["hey"]}', usage: {} });
    await post(clear.provider, { ...body, user: { ...body.user, birthYear: 1998, onboardedAt: '2026-11-01T00:00:00Z' } });
    assert.deepEqual(clear.strict, [undefined]);
  });
});

describe('structured narration on the wire (0z290)', () => {
  it('returns canonical string messages alongside structured parts in chat, and omits parts on calls', async () => {
    const raw = '{"messages":[[{"action":"sets the glass down"},{"speech":"Not closed for you."}]]}';
    const chatRes = await post(scripted({ text: raw, usage: {} }).provider, { ...body, prefs: { style: 'story', length: 'auto' } });
    assert.equal(chatRes.status, 200);
    const chatJson = await chatRes.json();
    assert.deepEqual(chatJson.messages, ['*sets the glass down* Not closed for you.']);
    assert.deepEqual(chatJson.parts, [
      [
        { kind: 'action', text: 'sets the glass down' },
        { kind: 'speech', text: 'Not closed for you.' },
      ],
    ]);

    const callRes = await post(scripted({ text: raw, usage: {} }).provider, { ...body, mode: 'call' });
    const callJson = await callRes.json();
    assert.equal(callJson.parts, undefined);
  });
});
