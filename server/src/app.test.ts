import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { cleanLocale, cleanTimeZone, createApp } from './app.ts';
import type { BootstrapInput, BootstrapResult, Db, UsageEvent } from './db/types.ts';
import { toContents } from './llm/gemini.ts';
import { LlmBusyError, type LlmProvider } from './llm/types.ts';

const kai = { id: 'c_kai', name: 'Kai', handle: '@k', bio: 'Swimmer.', category: 'school', accentIndex: 0, voiceReady: false, isOfficial: true, greeting: 'Hey!', tags: ['cheerful'] };
const body = {
  character: kai,
  user: { id: 'u1', displayName: 'Sam' },
  messages: [
    { id: 'm1', conversationId: 'c', author: 'them', kind: 'text', text: 'Hey!', createdAt: '2026-10-26T10:00:00Z' },
    { id: 'm2', conversationId: 'c', author: 'me', kind: 'text', text: 'I had a long day', createdAt: '2026-10-26T10:01:00Z' },
  ],
  redo: ['Aww, rest then.'],
};

const post = (app: ReturnType<typeof createApp>, json: unknown) =>
  app.request('/v1/chat/reply', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(json) });

describe('sigmazam-api', () => {
  it('lays out the chat prompt, asks the model and returns its bubbles', async () => {
    let seen = '';
    const provider: LlmProvider = {
      name: 'fake',
      async complete(layout) {
        seen = [...layout.system.map((s) => s.text), ...layout.history.map((t) => t.text), layout.turn].join('\n');
        return { text: '{"emotion":"tender","intensity":0.6,"messages":["Come here.","*hands you tea*"]}', usage: {} };
      },
    };
    const res = await post(createApp(provider, { timeoutMs: 1000 }), body);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.deepEqual(json.messages, ['Come here.', '*hands you tea*']);
    assert.match(seen, /YOUR PERSONA/);
    assert.match(seen, /I had a long day/);
    assert.match(seen, /NEW VERSION/);
  });

  it('says why when it cannot answer: no model, bad input, the free tier is busy', async () => {
    assert.equal((await post(createApp(null, { timeoutMs: 1000 }), body)).status, 503);
    const busy: LlmProvider = { name: 'fake', complete: async () => Promise.reject(new LlmBusyError('quota')) };
    const res = await post(createApp(busy, { timeoutMs: 1000 }), body);
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { error: 'busy' });
    assert.equal((await post(createApp(busy, { timeoutMs: 1000 }), { messages: [] })).status, 400);
  });

  it('gives Gemini a conversation that opens on the user side, with this turn last', () => {
    const contents = toContents({ system: [], history: [{ role: 'assistant', text: 'Hey!' }, { role: 'user', text: 'Hi' }], turn: 'Reply with JSON only.', cut: 0 });
    assert.deepEqual(
      contents.map((c) => [c.role, c.parts?.map((p) => p.text)]),
      [
        ['user', ['(The chat opens.)']],
        ['model', ['Hey!']],
        ['user', ['Hi', 'Reply with JSON only.']],
      ],
    );
  });
});

describe('the cost log of a reply', () => {
  const provider: LlmProvider = {
    name: 'fake',
    complete: async () => ({ text: '{"messages":["Hi!"]}', model: 'gemini-3.1-flash-lite', usage: { input: 1000, cached: 400, output: 100 } }),
  };
  const logged: UsageEvent[] = [];
  const db: Db = {
    name: 'fake',
    userIdFromToken: async (token) => (token === 'good' ? 'user-1' : null),
    bootstrap: async () => Promise.reject(new Error('unused')),
    logUsage: async (event) => {
      logged.push(event);
    },
  };
  const send = (headers: Record<string, string> = {}) =>
    createApp(provider, { timeoutMs: 1000, db }).request('/v1/chat/reply', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
  // The row is written after the reply has gone out.
  const settle = () => new Promise((resolve) => setImmediate(resolve));

  it('writes one row per reply: who, which model and prompt, the tokens and the list-price cost', async () => {
    assert.equal((await send({ authorization: 'Bearer good' })).status, 200);
    await settle();
    assert.equal(logged.length, 1);
    const { promptVersion, ...row } = logged[0];
    assert.deepEqual(row, {
      userId: 'user-1',
      kind: 'llm',
      mode: 'chat',
      model: 'gemini-3.1-flash-lite',
      inputTokens: 1000,
      cachedTokens: 400,
      outputTokens: 100,
      costUsd: 0.00031,
    });
    assert.match(promptVersion ?? '', /^g[0-9a-f]{8}\.c[0-9a-f]{8}$/);
  });

  it('still answers without an account or with a stale token, and logs no user then', async () => {
    logged.length = 0;
    assert.equal((await send()).status, 200);
    assert.equal((await send({ authorization: 'Bearer stale' })).status, 200);
    await settle();
    assert.deepEqual(
      logged.map((row) => row.userId),
      [null, null],
    );
  });
});

describe('POST /v1/session/bootstrap', () => {
  const seen: BootstrapInput[] = [];
  const fakeDb: Db = {
    name: 'fake',
    userIdFromToken: async (token) => (token === 'good' ? 'user-1' : null),
    async bootstrap(userId, input) {
      seen.push(input);
      return { isNew: true, profile: { id: userId }, wallet: { shells: 100 }, subscription: null } as unknown as BootstrapResult;
    },
    logUsage: async () => {},
  };
  const call = (db: Db | null, headers: Record<string, string>, body?: unknown) =>
    createApp(null, { timeoutMs: 1000, db }).request('/v1/session/bootstrap', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  it('needs a database and a signed-in user', async () => {
    assert.equal((await call(null, { authorization: 'Bearer good' })).status, 503);
    assert.equal((await call(fakeDb, {})).status, 401);
    assert.equal((await call(fakeDb, { authorization: 'Bearer bad' })).status, 401);
  });

  it('passes a clean locale and time zone, drops anything else, and works with no body', async () => {
    const ok = await call(fakeDb, { authorization: 'Bearer good' }, { locale: 'en-US', timeZone: 'Asia/Tashkent' });
    assert.equal(ok.status, 200);
    assert.equal(((await ok.json()) as BootstrapResult).profile.id, 'user-1');
    await call(fakeDb, { authorization: 'Bearer good' }, { locale: "en'; drop table", timeZone: 'Mars/Olympus' });
    assert.equal((await call(fakeDb, { authorization: 'Bearer good' })).status, 200);
    assert.deepEqual(seen, [
      { locale: 'en-US', timeZone: 'Asia/Tashkent' },
      { locale: undefined, timeZone: undefined },
      { locale: undefined, timeZone: undefined },
    ]);
  });

  it('hands out the public sign-in config, or 503 without a database', async () => {
    const client = { supabaseUrl: 'https://x.supabase.co', supabaseKey: 'sb_publishable_x' };
    const ok = await createApp(null, { timeoutMs: 1000, client }).request('/v1/client-config');
    assert.deepEqual(await ok.json(), client);
    assert.equal((await createApp(null, { timeoutMs: 1000 }).request('/v1/client-config')).status, 503);
  });

  it('cleans locales and time zones', () => {
    assert.equal(cleanLocale('uz-Latn-UZ'), 'uz-Latn-UZ');
    assert.equal(cleanLocale(42), undefined);
    assert.equal(cleanTimeZone('America/New_York'), 'America/New_York');
    assert.equal(cleanTimeZone('Nowhere/Land'), undefined);
  });
});
