import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DAILY_CHECK_IN, PAID_SHARES_PER_DAY, SHARE_REWARD, WHEEL_WEIGHTS } from '../../src/economy/shells.ts';
import type { PromptLayout } from '../../src/ai/prompt-layout.ts';
import { MEMORY_SYNC_LIMITS } from '../../src/ai/session-types.ts';
import { cleanLocale, cleanMemorySync, cleanSync, cleanTimeZone, createApp, SYNC_LIMITS } from './app.ts';
import {
  WalletError,
  type BootstrapInput,
  type BootstrapResult,
  type Db,
  type MemoriesState,
  type MemorySyncRequest,
  type MessageSyncRequest,
  type UsageEvent,
  type WalletState,
} from './db/types.ts';
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
    walletShare: unused,
    syncMessages: unused,
    messagesAfter: unused,
    syncMemories: unused,
    memoriesOf: unused,
    deleteUser: unused,
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
  app.request('/v1/chat/reply', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer good' }, body: JSON.stringify(json) });

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

  it('writes in the phone’s language until the user writes, then follows their words', async () => {
    let system = '';
    let turn = '';
    const provider: LlmProvider = {
      name: 'fake',
      async complete(layout) {
        system = layout.system.map((s) => s.text).join('\n');
        turn = layout.turn;
        return { text: '{"messages":["こんにちは"]}', usage: {} };
      },
    };
    const app = createApp(provider, { timeoutMs: 1000 });
    const greeting = { ...body, user: { id: 'u1', displayName: 'Sam', locale: 'ja-JP' }, messages: [body.messages[0]], redo: undefined };
    assert.equal((await post(app, greeting)).status, 200);
    assert.match(system, /REPLY LANGUAGE: .*Japanese \(Japan\) \(their phone's language\)/);
    assert.match(turn, /LANGUAGE: they have not written to you yet: write every message in Japanese \(Japan\)/);
    await post(app, { ...greeting, messages: body.messages });
    assert.match(turn, /LANGUAGE: write every message in the language their latest messages are in \("I had a long day"\)/);
  });

  it('runs the memory pass at a low temperature and answers only ops on facts it was shown', async () => {
    let temperature: number | undefined;
    const provider: LlmProvider = {
      name: 'fake',
      async complete(_layout, opts) {
        temperature = opts.temperature;
        return {
          text: JSON.stringify({ summary: 'Biscuit steals socks.', ops: [{ op: 'update', id: 'm1', text: 'Has a beagle called Biscuit' }, { op: 'forget', id: 'other' }] }),
          usage: {},
        };
      },
    };
    const res = await createApp(provider, { timeoutMs: 1000 }).request('/v1/memory/pass', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        character: { name: 'Kai' },
        user: { displayName: 'Sam' },
        facts: [{ id: 'm1', text: 'Has a dog' }],
        lines: [{ author: 'me', text: 'my beagle Biscuit ate my socks', at: '2026-10-28T10:00:00Z' }],
        now: '2026-10-28T10:05:00Z',
      }),
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.deepEqual([json.summary, json.ops], ['Biscuit steals socks.', [{ op: 'update', id: 'm1', text: 'Has a beagle called Biscuit' }]]);
    assert.equal(temperature, 0.2);
  });

  it('says why when it cannot answer: no model, bad input, the free tier is busy', async () => {
    assert.equal((await post(createApp(null, { timeoutMs: 1000 }), body)).status, 503);
    const busy: LlmProvider = { name: 'fake', complete: async () => Promise.reject(new LlmBusyError('quota')) };
    const res = await post(createApp(busy, { timeoutMs: 1000 }), body);
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { error: 'busy' });
    assert.equal((await post(createApp(busy, { timeoutMs: 1000 }), { messages: [] })).status, 400);
  });

  it('asks once more when the reply echoes an earlier one, and logs both calls', async () => {
    const echo = 'Long days are the worst, come sit with me for a bit.';
    const chat = { ...body, redo: undefined, messages: [...body.messages, { id: 'm3', conversationId: 'c', author: 'them', kind: 'text', text: echo, createdAt: '2026-10-26T10:02:00Z' }, { id: 'm4', conversationId: 'c', author: 'me', kind: 'text', text: 'still tired', createdAt: '2026-10-26T10:03:00Z' }] };
    const turns: string[] = [];
    const answers = [`{"messages":["${echo}"]}`, '{"messages":["Then nap. I will guard the snacks."]}'];
    const provider: LlmProvider = {
      name: 'fake',
      async complete(layout) {
        turns.push(layout.turn);
        return { text: answers[turns.length - 1], model: 'gemini-3.1-flash-lite', usage: { input: 100, output: 10 } };
      },
    };
    const logged: UsageEvent[] = [];
    const db = makeDb({ logUsage: async (event) => void logged.push(event) });
    const res = await post(createApp(provider, { timeoutMs: 5000, db }), chat);
    assert.deepEqual((await res.json()).messages, ['Then nap. I will guard the snacks.']);
    assert.equal(turns.length, 2);
    assert.match(turns[0], /YOUR RECENT REPLIES OPENED WITH/);
    assert.doesNotMatch(turns[0], /DO NOT REPEAT/);
    assert.ok(turns[1].includes(`DO NOT REPEAT YOURSELF: your first draft echoed something you already said in this chat:\n- "${echo}"`));
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(logged.map((row) => row.mode), ['chat', 'chatRepeat']);

    // A fresh reply is asked for once; a second try that echoes as much leaves the first draft.
    turns.length = 0;
    answers[1] = answers[0];
    assert.deepEqual((await (await post(createApp(provider, { timeoutMs: 5000 }), chat)).json()).messages, [echo]);
    turns.length = 0;
    answers[0] = '{"messages":["Want me to order soup?"]}';
    await post(createApp(provider, { timeoutMs: 5000 }), chat);
    assert.equal(turns.length, 1);
  });

  it('runs the crisis check: a marked draft is written again with the cue, and the app is told', async () => {
    const line = (text: string) => ({ ...body, redo: undefined, messages: [...body.messages, { id: 'm9', conversationId: 'c', author: 'me', kind: 'text', text, createdAt: '2026-10-26T10:05:00Z' }] });
    const turns: string[] = [];
    let answers: string[] = [];
    const provider: LlmProvider = {
      name: 'fake',
      async complete(layout) {
        turns.push(layout.turn);
        return { text: answers[turns.length - 1], model: 'gemini-3.1-flash-lite', usage: {} };
      },
    };
    const logged: UsageEvent[] = [];
    const db = makeDb({ logUsage: async (event) => void logged.push(event) });
    const app = createApp(provider, { timeoutMs: 5000, db });

    // Any language: the model marks it, the second try follows the cue, the plan's hints give way.
    answers = ['{"crisis":true,"messages":["Haha, grumpy today?"]}', '{"crisis":true,"messages":["Estoy aquí. ¿Estás a salvo ahora mismo?"]}'];
    const marked = await (await post(app, { ...line('ya no quiero seguir aquí'), plan: { style: 'mix', moves: ['tease'], mood: { emotion: 'playful', intensity: 0.5 }, words: 20, bubbles: 1, ask: true } })).json();
    assert.deepEqual([marked.messages, marked.crisis], [['Estoy aquí. ¿Estás a salvo ahora mismo?'], true]);
    assert.doesNotMatch(turns[0], /SAFETY NOW/);
    assert.match(turns[1], /SAFETY NOW: their latest message may mean/);
    assert.doesNotMatch(turns[1], /THIS TURN/);
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(logged.map((row) => row.mode), ['chat', 'chatCrisis']);

    // The phrase list catches it first: one call, already cued.
    turns.length = 0;
    answers = ['{"messages":["I am right here. Are you safe right now?"]}'];
    const caught = await (await post(app, line('I want to die'))).json();
    assert.equal(caught.crisis, true);
    assert.equal(turns.length, 1);
    assert.match(turns[0], /SAFETY NOW/);

    // Nothing marked: no cue, no card.
    turns.length = 0;
    answers = ['{"crisis":false,"messages":["This exam is killing you? Snacks. Now."]}'];
    const calm = await (await post(app, line('this exam is killing me lol'))).json();
    assert.deepEqual([calm.crisis, turns.length], [false, 1]);
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
    assert.match(promptVersion ?? '', /^g[0-9a-f]{8}\.c[0-9a-f]{8}\.m[0-9a-f]{8}$/);
  });

  it('spends nothing on a request without an account or with a stale token', async () => {
    logged.length = 0;
    let calls = 0;
    const counting: LlmProvider = {
      name: 'counting',
      async complete() {
        calls += 1;
        return { text: '{"messages":["Hi."]}', usage: {} };
      },
    };
    const post = (headers: Record<string, string>) =>
      createApp(counting, { timeoutMs: 1000, db }).request('/v1/chat/reply', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
    assert.equal((await post({})).status, 401);
    assert.equal((await post({ authorization: 'Bearer stale' })).status, 401);
    await settle();
    assert.equal(calls, 0);
    assert.deepEqual(logged, []);
  });

  it('guards every route that calls the model', async () => {
    const app = createApp(provider, { timeoutMs: 1000, db });
    for (const route of ['/v1/chat/reply', '/v1/chat/group', '/v1/ai/first-text', '/v1/memory/pass', '/v1/characters/draft', '/v1/characters/draft/field', '/v1/streams/line', '/v1/ai/write']) {
      const res = await app.request(route, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      assert.equal(res.status, 401, route);
    }
  });

  it('says busy above an account’s limit, and above an address’s', async () => {
    const byUser = createApp(provider, { timeoutMs: 1000, db, limits: { userPerMinute: 1 } });
    const post = (app: ReturnType<typeof createApp>, headers: Record<string, string>) =>
      app.request('/v1/chat/reply', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer good', ...headers }, body: JSON.stringify(body) });
    assert.equal((await post(byUser, {})).status, 200);
    assert.equal((await post(byUser, {})).status, 429);
    const byAddress = createApp(provider, { timeoutMs: 1000, db, limits: { addressPerMinute: 1 } });
    assert.equal((await post(byAddress, { 'fly-client-ip': '1.1.1.1' })).status, 200);
    assert.equal((await post(byAddress, { 'fly-client-ip': '1.1.1.1' })).status, 429);
    assert.equal((await post(byAddress, { 'fly-client-ip': '2.2.2.2' })).status, 200);
  });

  it('asks the sign-in service once in a while, not on every reply', async () => {
    let asked = 0;
    const app = createApp(provider, { timeoutMs: 1000, db: makeDb({ userIdFromToken: async () => { asked += 1; return 'user-1'; } }) });
    const post = () => app.request('/v1/chat/reply', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer good' }, body: JSON.stringify(body) });
    await post();
    await post();
    await settle();
    // Once by the guard; the cost log's own lookup is not on the reply's path.
    assert.ok(asked <= 3);
    assert.equal((await post()).status, 200);
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

  it('pays a shared card by the app’s own numbers, on every server', async () => {
    const rules: unknown[] = [];
    const app = createApp(null, {
      timeoutMs: 1000,
      db: makeDb({ walletShare: async (_user, r) => (rules.push(r), { amount: 5, left: 2, wallet: state }) }),
    });
    const res = await call(app, '/v1/wallet/share', {});
    assert.equal(res.status, 200);
    assert.equal(((await res.json()) as { left: number }).left, 2);
    assert.deepEqual(rules, [{ amount: SHARE_REWARD, perDay: PAID_SHARES_PER_DAY }]);
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

describe('the chats on the server (B1.3b)', () => {
  const line = (id: string, extra: Record<string, unknown> = {}) => ({
    chatId: 'conv_kai',
    message: { id, conversationId: 'conv_kai', author: 'me', kind: 'text', text: 'hi', createdAt: '2026-10-28T08:00:00Z', ...extra },
  });
  const auth = { authorization: 'Bearer good', 'content-type': 'application/json' };

  it('takes a sync body, leaves out lines the database would refuse and keeps the last copy of a repeat', () => {
    const clean = cleanSync({
      droppedChats: ['conv_old'],
      deletedIds: ['m0'],
      upserts: [line('m1'), line('m2', { author: 'narrator' }), line('m3', { createdAt: 'soon' }), line('m1', { text: 'edited' }), { chatId: '', message: {} }],
    });
    assert.equal(clean?.skipped, 3);
    assert.deepEqual(clean?.request.upserts.map((u) => [u.message.id, u.message.text]), [['m1', 'edited']]);
    assert.deepEqual(clean?.request.droppedChats, ['conv_old']);
  });

  it('refuses a body of the wrong shape or over the limits', () => {
    assert.equal(cleanSync(null), null);
    assert.equal(cleanSync({ droppedChats: [], deletedIds: [] }), null);
    assert.equal(cleanSync({ droppedChats: [1], deletedIds: [], upserts: [] }), null);
    const many = Array.from({ length: SYNC_LIMITS.upserts + 1 }, (_, i) => line(`m${i}`));
    assert.equal(cleanSync({ droppedChats: [], deletedIds: [], upserts: many }), null);
    assert.equal(cleanSync({ droppedChats: [], deletedIds: [], upserts: [line('big', { text: 'x'.repeat(SYNC_LIMITS.messageBytes) })] })?.skipped, 1);
  });

  it('syncs for the signed-in user only', async () => {
    let seen: [string, MessageSyncRequest] | null = null;
    const app = createApp(null, { timeoutMs: 1000, db: makeDb({ syncMessages: async (userId, request) => ((seen = [userId, request]), 42) }) });
    const body = JSON.stringify({ droppedChats: [], deletedIds: ['m0'], upserts: [line('m1')] });
    assert.equal((await app.request('/v1/messages/sync', { method: 'POST', body })).status, 401);
    const res = await app.request('/v1/messages/sync', { method: 'POST', headers: auth, body });
    assert.deepEqual(await res.json(), { seq: 42, skipped: 0 });
    assert.equal(seen![0], 'user-1');
    assert.deepEqual(seen![1].deletedIds, ['m0']);
    assert.equal((await app.request('/v1/messages/sync', { method: 'POST', headers: auth, body: '{"upserts":3}' })).status, 400);
  });

  it('reads the messages back a page at a time', async () => {
    let asked: number[] = [];
    const app = createApp(null, {
      timeoutMs: 1000,
      db: makeDb({ messagesAfter: async (_userId, after, limit) => ((asked = [after, limit]), { messages: [], next: null }) }),
    });
    const res = await app.request('/v1/messages?after=17', { headers: auth });
    assert.deepEqual(await res.json(), { messages: [], next: null });
    assert.equal(asked[0], 17);
    assert.equal((await app.request('/v1/messages?after=-1', { headers: auth })).status, 400);
  });

  it('deletes the account on the server', async () => {
    const deleted: string[] = [];
    const app = createApp(null, { timeoutMs: 1000, db: makeDb({ deleteUser: async (userId) => void deleted.push(userId) }) });
    assert.equal((await app.request('/v1/account', { method: 'DELETE' })).status, 401);
    const res = await app.request('/v1/account', { method: 'DELETE', headers: auth });
    assert.deepEqual(await res.json(), { ok: true });
    assert.deepEqual(deleted, ['user-1']);
    assert.equal((await createApp(null, { timeoutMs: 1000 }).request('/v1/account', { method: 'DELETE', headers: auth })).status, 503);
  });
});

describe('the memory on the server (B2.3)', () => {
  const fact = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    characterId: 'c_kai',
    text: 'Has a beagle called Biscuit.',
    source: 'chat',
    createdAt: '2026-10-28T08:00:00Z',
    pinned: false,
    ...extra,
  });
  const auth = { authorization: 'Bearer good', 'content-type': 'application/json' };

  it('takes each character whole, leaves out items the database would refuse and keeps the last copy of a repeat', () => {
    const clean = cleanMemorySync({
      characters: [
        { characterId: 'c_kai', items: [fact('f0')] },
        {
          characterId: 'c_kai',
          items: [fact('f1'), fact('f2', { until: 'next week' }), fact('f3', { characterId: 'c_ivy' }), fact('f4', { status: 'deleted' }), fact('f1'), fact('f5', { text: ' ' })],
        },
        { characterId: 'c_ivy', items: [] },
      ],
      chats: [
        { chatId: 'conv_kai', summary: 'Old.' },
        { chatId: 'conv_kai', summary: ' They met at the pool. ', mark: 'm9' },
        { chatId: 'conv_gone' },
      ],
    });
    assert.equal(clean?.skipped, 5);
    assert.deepEqual(clean?.request.characters.map((c) => [c.characterId, c.items.map((m) => m.id)]), [['c_kai', ['f1']], ['c_ivy', []]]);
    assert.deepEqual(clean?.request.chats, [{ chatId: 'conv_kai', summary: 'They met at the pool.', mark: 'm9' }, { chatId: 'conv_gone' }]);
  });

  it('refuses a body of the wrong shape or over the limits', () => {
    assert.equal(cleanMemorySync(null), null);
    assert.equal(cleanMemorySync({ characters: [] }), null);
    assert.equal(cleanMemorySync({ characters: [{ characterId: '', items: [] }], chats: [] }), null);
    assert.equal(cleanMemorySync({ characters: [], chats: [{ chatId: 'c', summary: 'x'.repeat(MEMORY_SYNC_LIMITS.summaryChars + 1) }] }), null);
    const many = Array.from({ length: MEMORY_SYNC_LIMITS.items + 1 }, (_, i) => fact(`f${i}`));
    assert.equal(cleanMemorySync({ characters: [{ characterId: 'c_kai', items: many }], chats: [] }), null);
    assert.equal(cleanMemorySync({ characters: [{ characterId: 'c_kai', items: [fact('big', { text: 'x'.repeat(MEMORY_SYNC_LIMITS.itemBytes) })] }], chats: [] })?.skipped, 1);
  });

  it('syncs and reads back for the signed-in user only', async () => {
    let seen: [string, MemorySyncRequest] | null = null;
    const state = { characters: [{ characterId: 'c_kai', items: [fact('f1')] }], chats: [] };
    const app = createApp(null, {
      timeoutMs: 1000,
      db: makeDb({ syncMemories: async (userId, request) => void (seen = [userId, request]), memoriesOf: async () => state as MemoriesState }),
    });
    const body = JSON.stringify({ characters: [{ characterId: 'c_kai', items: [fact('f1')] }], chats: [] });
    assert.equal((await app.request('/v1/memories/sync', { method: 'POST', body })).status, 401);
    const res = await app.request('/v1/memories/sync', { method: 'POST', headers: auth, body });
    assert.deepEqual(await res.json(), { skipped: 0 });
    assert.equal(seen![0], 'user-1');
    assert.equal(seen![1].characters[0].items[0].id, 'f1');
    assert.equal((await app.request('/v1/memories/sync', { method: 'POST', headers: auth, body: '{"characters":3}' })).status, 400);
    assert.deepEqual(await (await app.request('/v1/memories', { headers: auth })).json(), state);
    assert.equal((await app.request('/v1/memories')).status, 401);
  });
});

describe('POST /v1/ai/first-text (B1.4a)', () => {
  const brief = {
    kind: 'brief',
    input: {
      character: kai,
      user: { id: 'u1', displayName: 'Sam' },
      brief: { characterId: 'c_kai', items: [{ title: 'Chemistry exam', time: '10:00' }], covers: [] },
      recent: [],
      now: '2026-10-28T07:30:00.000Z',
    },
  };
  const send = (app: ReturnType<typeof createApp>, json: unknown) =>
    app.request('/v1/ai/first-text', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer good' }, body: JSON.stringify(json) });

  it('writes the text in their words, logs its cost under its kind', async () => {
    let seen = '';
    const provider: LlmProvider = {
      name: 'fake',
      async complete(layout) {
        seen = [...layout.system.map((s) => s.text), layout.turn].join('\n');
        return { text: '{"skip":false,"messages":["Morning! Chem at 10 💪"],"ideas":[{"label":"Thanks","text":"Thanks!"}]}', usage: { input: 900, output: 30 }, model: 'gemini-x' };
      },
    };
    const logged: UsageEvent[] = [];
    const app = createApp(provider, { timeoutMs: 1000, db: makeDb({ logUsage: async (event) => void logged.push(event) }) });
    const res = await send(app, brief);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.deepEqual([json.skip, json.lines], [false, ['Morning! Chem at 10 💪']]);
    assert.match(seen, /Chemistry exam at 10:00/);
    assert.match(seen, /the language of the user's latest messages/);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.deepEqual([logged[0]?.mode, logged[0]?.userId, logged[0]?.model], ['brief', 'user-1', 'gemini-x']);
  });

  it('passes a skip on, refuses a bad request and says when there is no model', async () => {
    const skip: LlmProvider = { name: 'fake', complete: async () => ({ text: 'not json', usage: {} }) };
    const json = await (await send(createApp(skip, { timeoutMs: 1000 }), brief)).json();
    assert.equal(json.skip, true);
    assert.equal((await send(createApp(skip, { timeoutMs: 1000 }), { kind: 'brief', input: {} })).status, 400);
    assert.equal((await send(createApp(null, { timeoutMs: 1000 }), brief)).status, 503);
  });
});

describe('quick create and streams on the server (B1.4b)', () => {
  const answering = (text: string, seen?: { prompt: string }): LlmProvider => ({
    name: 'fake',
    async complete(layout) {
      if (seen) seen.prompt = [...layout.system.map((s) => s.text), layout.turn].join('\n');
      return { text, usage: {} };
    },
  });
  const postJson = (app: ReturnType<typeof createApp>, path: string, json: unknown) =>
    app.request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(json) });
  const draftJson = JSON.stringify({
    name: 'Mira Vale', tagline: 'Night-shift baker', bio: 'I bake bread at 4am and talk to the dough.', look: 'Flour on her cheek, auburn braid.',
    age: 27, heightCm: 168, gender: 'female', speakingStyle: 'casual', role: 'friend', voicePreset: 'warm', tags: ['cheerful', 'caring'],
    greeting: 'Oh! You caught me mid-knead.', opening: '*wipes her hands on her apron*', quirk: 'Names every loaf.', greetings: ['Morning, {{user}}!'],
    dialog: [{ from: 'char', text: 'Smell that?' }, { from: 'other', text: 'Cinnamon?' }], starters: ['What are you baking?'],
    backstory: 'She left the city to run her grandmother’s bakery.', likes: ['rainy mornings'], dislikes: ['soggy crusts'],
  });

  it('writes a whole character from the idea, and refuses an idea the rules do not allow', async () => {
    const seen = { prompt: '' };
    const app = createApp(answering(draftJson, seen), { timeoutMs: 1000 });
    const res = await postJson(app, '/v1/characters/draft', { idea: 'a night-shift baker who talks to the dough', sparks: [], language: 'English' });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.ok, true, JSON.stringify(json));
    assert.equal(json.draft.name, 'Mira Vale');
    assert.match(seen.prompt, /night-shift baker/);
    assert.match(seen.prompt, /REPLY LANGUAGE: English/);

    const empty = await postJson(app, '/v1/characters/draft', { idea: '  ', sparks: [], language: 'English' });
    assert.deepEqual([empty.status, (await empty.json()).problems], [400, ['empty']]);
    const refused = await postJson(createApp(answering('{"refused":"realPerson"}'), { timeoutMs: 1000 }), '/v1/characters/draft', {
      idea: 'a famous singer',
      sparks: [],
      language: 'English',
    });
    assert.deepEqual(await refused.json(), { ok: false, problem: 'realPerson', model: 'fake' });
  });

  it('writes one field again, only a field the form has', async () => {
    const app = createApp(answering('{"value":"Bread first, questions later."}'), { timeoutMs: 1000 });
    const res = await postJson(app, '/v1/characters/draft/field', { field: 'tagline', character: { name: 'Mira' }, language: 'English' });
    assert.equal((await res.json()).value, 'Bread first, questions later.');
    assert.equal((await postJson(app, '/v1/characters/draft/field', { field: 'password', character: {}, language: 'English' })).status, 400);
  });

  it('writes the next stream line in the speaker’s voice and cleans it', async () => {
    const seen = { prompt: '' };
    const app = createApp(answering('{"line":"Kai: \\"Race you to the pier?\\""}', seen), { timeoutMs: 1000 });
    const body = {
      input: { character: kai, user: { id: 'u1', displayName: 'Sam' } },
      other: { ...kai, id: 'c_mira', name: 'Mira Vale' },
      topic: 'the best swim spot in town',
      said: [{ name: 'Mira', text: 'The lake, obviously.' }],
      turn: { index: 1, total: 4 },
    };
    const res = await postJson(app, '/v1/streams/line', body);
    assert.equal((await res.json()).line, 'Race you to the pier?');
    assert.match(seen.prompt, /You are talking with Mira Vale/);
    assert.match(seen.prompt, /Mira: The lake, obviously\./);
    assert.equal((await postJson(app, '/v1/streams/line', { ...body, topic: '' })).status, 400);
    assert.equal((await postJson(app, '/v1/streams/line', { ...body, turn: { index: -1, total: 4 } })).status, 400);
    const broken = await postJson(createApp(answering('nope'), { timeoutMs: 1000 }), '/v1/streams/line', body);
    assert.equal((await broken.json()).line, null);
  });

  it('writes what a friend writes on a screen of its own, and checks it', async () => {
    const body = { kind: 'note', input: { character: kai, user: { id: 'u1', displayName: 'Sam' } }, question: 'What scares you?' };
    const res = await postJson(createApp(answering('{"note":"The quiet."}'), { timeoutMs: 1000 }), '/v1/ai/write', body);
    assert.deepEqual((await res.json()).result, { note: 'The quiet.' });
    const broken = await postJson(createApp(answering('nope'), { timeoutMs: 1000 }), '/v1/ai/write', body);
    assert.equal((await broken.json()).result, null);
    assert.equal((await postJson(createApp(answering('{}'), { timeoutMs: 1000 }), '/v1/ai/write', { ...body, kind: 'poem' })).status, 400);
  });

  describe('a group member’s next message', () => {
    const mira = { ...kai, id: 'c_mira', name: 'Mira Vale' };
    const body = {
      character: kai,
      others: [mira],
      user: { id: 'u1', displayName: 'Sam' },
      messages: [
        { id: 'm1', conversationId: 'g', author: 'me', kind: 'text', text: 'who is swimming tomorrow?', createdAt: '2026-10-31T10:00:00.000Z' },
        { id: 'm2', conversationId: 'g', author: 'them', kind: 'text', text: 'Not me.', characterId: 'c_mira', createdAt: '2026-10-31T10:00:30.000Z' },
      ],
      cue: ['NEXT: join in.'],
    };

    it('writes it in the member’s voice, with the group as they read it, and cleans it', async () => {
      const seen: { layout?: PromptLayout } = {};
      const provider: LlmProvider = {
        name: 'fake',
        async complete(layout) {
          seen.layout = layout;
          return { text: JSON.stringify({ messages: ['Kai: Me, at dawn.', 'Mira Vale: No way.', 'You should come.'] }), usage: {} };
        },
      };
      const res = await postJson(createApp(provider, { timeoutMs: 1000 }), '/v1/chat/group', body);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.deepEqual(json.messages, ['Me, at dawn.', 'You should come.']);
      assert.equal(json.crisis, false);
      assert.match(seen.layout!.history[0].text, /Sam: who is swimming tomorrow\?\nMira Vale: Not me\./);
      assert.match(seen.layout!.turn, /NEXT: join in\./);
      assert.match(seen.layout!.system.map((s) => s.text).join('\n'), /MODE: GROUP CHAT/);
    });

    it('says when the user may be in danger, whatever the language', async () => {
      const res = await postJson(createApp(answering(JSON.stringify({ messages: ['I am here.'], crisis: true })), { timeoutMs: 1000 }), '/v1/chat/group', body);
      assert.equal((await res.json()).crisis, true);
    });

    it('refuses a request without the others, and an empty answer', async () => {
      const app = createApp(answering('{"messages":["Hi."]}'), { timeoutMs: 1000 });
      assert.equal((await postJson(app, '/v1/chat/group', { ...body, others: [] })).status, 400);
      assert.equal((await postJson(app, '/v1/chat/group', { ...body, messages: 'x' })).status, 400);
      const empty = await postJson(createApp(answering('{"messages":["Mira: only hers."]}'), { timeoutMs: 1000 }), '/v1/chat/group', body);
      assert.equal(empty.status, 502);
    });
  });
});
