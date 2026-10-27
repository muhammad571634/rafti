import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DAILY_CHECK_IN, WHEEL_WEIGHTS } from '../../src/economy/shells.ts';
import { cleanLocale, cleanTimeZone, createApp } from './app.ts';
import { WalletError, type BootstrapInput, type BootstrapResult, type Db, type UsageEvent, type WalletState } from './db/types.ts';
import { toContents } from './llm/gemini.ts';
import { LlmBusyError, type LlmProvider } from './llm/types.ts';

/** A Db for one test: "good" is user-1's token, and every call the test does not fill in fails. */
function makeDb(overrides: Partial<Db>): Db {
  const unused = () => Promise.reject(new Error('unused in this test'));
  return {
    name: 'fake',
    userIdFromToken: async (token) => (token === 'good' ? 'user-1' : null),
    bootstrap: unused,
    logUsage: async () => {},
    walletState: unused,
    walletSpend: unused,
    walletCredit: unused,
    walletCheckIn: unused,
    walletSpin: unused,
    ...overrides,
  };
}

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
  const db = makeDb({
    logUsage: async (event) => {
      logged.push(event);
    },
  });
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

describe('the wallet API', () => {
  const state: WalletState = { shells: 100, free: null, trialUsed: false, boughtShells: false, today: '2026-10-27', checkIn: { lastDay: null, streak: 0 }, spinsToday: 0 };
  const call = (app: ReturnType<typeof createApp>, path: string, json?: unknown, token = 'good') =>
    app.request(path, {
      method: json === undefined && path === '/v1/wallet' ? 'GET' : 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: json === undefined ? undefined : JSON.stringify(json),
    });

  it('needs a database and a signed-in user', async () => {
    assert.equal((await call(createApp(null, { timeoutMs: 1000 }), '/v1/wallet')).status, 503);
    const app = createApp(null, { timeoutMs: 1000, db: makeDb({ walletState: async () => state }) });
    assert.equal((await call(app, '/v1/wallet', undefined, 'bad')).status, 401);
    assert.deepEqual(await (await call(app, '/v1/wallet')).json(), state);
  });

  it('spends with a checked amount and reason, and keeps the app’s key apart from the server’s', async () => {
    const spends: unknown[] = [];
    const app = createApp(null, { timeoutMs: 1000, db: makeDb({ walletSpend: async (_user, request) => (spends.push(request), state) }) });
    for (const bad of [{ amount: 0, reason: 'chat', key: 'k' }, { amount: 1, reason: 'welcome', key: 'k' }, { amount: 1, reason: 'chat' }, { amount: 2000, reason: 'chat', key: 'k' }]) {
      assert.equal((await call(app, '/v1/wallet/spend', bad)).status, 400, JSON.stringify(bad));
    }
    assert.equal((await call(app, '/v1/wallet/spend', { amount: 3, reason: 'note', key: 'daily:2026-10-28', characterId: 'c_kai' })).status, 200);
    assert.deepEqual(spends, [{ amount: 3, reason: 'note', key: 'spend:daily:2026-10-28', characterId: 'c_kai' }]);
  });

  it('answers 402 with the real wallet when shells run out', async () => {
    const app = createApp(null, {
      timeoutMs: 1000,
      db: makeDb({ walletSpend: async () => Promise.reject(new WalletError('noShells')), walletState: async () => ({ ...state, shells: 0 }) }),
    });
    const res = await call(app, '/v1/wallet/spend', { amount: 1, reason: 'chat', key: 'm1' });
    assert.equal(res.status, 402);
    assert.deepEqual(await res.json(), { error: 'noShells', wallet: { ...state, shells: 0 } });
  });

  it('makes the wallet first when bootstrap never ran', async () => {
    let made = false;
    const app = createApp(null, {
      timeoutMs: 1000,
      db: makeDb({
        bootstrap: async () => ((made = true), {} as BootstrapResult),
        walletState: async () => (made ? state : Promise.reject(new WalletError('noWallet'))),
      }),
    });
    assert.equal((await call(app, '/v1/wallet')).status, 200);
    assert.equal(made, true);
  });

  it('runs the check-in and the wheel with the app’s own numbers', async () => {
    const rules: unknown[] = [];
    const app = createApp(null, {
      timeoutMs: 1000,
      db: makeDb({
        walletCheckIn: async (_user, r) => (rules.push(r), { amount: 30, day: 1, wallet: state }),
        walletSpin: async (_user, r) => (rules.push(r), { index: 2, reward: 10, wallet: state }),
      }),
    });
    assert.equal(((await (await call(app, '/v1/wallet/check-in', {})).json()) as { amount: number }).amount, 30);
    assert.equal(((await (await call(app, '/v1/wallet/spin', {})).json()) as { index: number }).index, 2);
    assert.deepEqual((rules[0] as { ladder: unknown }).ladder, DAILY_CHECK_IN);
    assert.deepEqual((rules[1] as { weights: unknown }).weights, WHEEL_WEIGHTS);
  });

  it('takes grants only on a test server that allows them; ads and shares burn, purchases stay', async () => {
    const grants: unknown[] = [];
    const db = makeDb({ walletCredit: async (_user, request) => (grants.push(request), state) });
    assert.equal((await call(createApp(null, { timeoutMs: 1000, db }), '/v1/wallet/grant', { amount: 560, reason: 'purchase', key: 'p1' })).status, 403);
    const app = createApp(null, { timeoutMs: 1000, db, devGrants: true });
    assert.equal((await call(app, '/v1/wallet/grant', { amount: 30, reason: 'daily', key: 'd1' })).status, 400);
    assert.equal((await call(app, '/v1/wallet/grant', { amount: 560, reason: 'purchase', key: 'p1' })).status, 200);
    assert.equal((await call(app, '/v1/wallet/grant', { amount: 10, reason: 'ad', key: 'a1' })).status, 200);
    assert.deepEqual(grants, [
      { amount: 560, reason: 'purchase', key: 'grant:p1', free: false },
      { amount: 10, reason: 'ad', key: 'grant:a1', free: true },
    ]);
  });
});

describe('POST /v1/session/bootstrap', () => {
  const seen: BootstrapInput[] = [];
  const fakeDb = makeDb({
    async bootstrap(userId, input) {
      seen.push(input);
      return { isNew: true, profile: { id: userId }, wallet: { shells: 100 }, subscription: null } as unknown as BootstrapResult;
    },
  });
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
