import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createApp, tokenEnds } from './app.ts';
import { makeDb } from './db/fake.ts';
import type { MessageCharge, TakeMessage, WalletState } from './db/types.ts';
import type { LlmProvider } from './llm/types.ts';

const kai = { id: 'c_kai', name: 'Kai', handle: '@k', bio: 'Swimmer.', category: 'school', accentIndex: 0, voiceReady: false, isOfficial: true, greeting: 'Hey!', tags: ['cheerful'] };
const body = {
  character: kai,
  user: { id: 'u1', displayName: 'Sam' },
  messages: [
    { id: 'm1', conversationId: 'c', author: 'them', kind: 'text', text: 'Hey!', createdAt: '2026-10-26T10:00:00Z' },
    { id: 'm2', conversationId: 'c', author: 'me', kind: 'text', text: 'I had a long day', createdAt: '2026-10-26T10:01:00Z' },
  ],
};
const state: WalletState = { shells: 100, free: null, trialUsed: false, boughtShells: false, today: '2026-11-10', checkIn: { lastDay: null, streak: 0 }, spinsToday: 0 };
const answering: LlmProvider = { name: 'fake', complete: async () => ({ text: '{"messages":["Hi."]}', usage: {} }) };
const tick = () => new Promise((resolve) => setImmediate(resolve));

type App = ReturnType<typeof createApp>;
/** A token shaped like a real one, ending `inMs` from now; the fake database decides whether it is good. */
const jwt = (inMs: number, sub = 'user-1') => `h.${Buffer.from(JSON.stringify({ sub, exp: Math.floor((Date.now() + inMs) / 1000) })).toString('base64url')}.s`;
const get = (app: App, path: string, token?: string, headers: Record<string, string> = {}) => app.request(path, { headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers } });
const reply = (app: App, json: unknown = body, token = 'good') =>
  app.request('/v1/chat/reply', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(json) });

describe('the sign-in check (docs/scale-plan.md)', () => {
  it('reads when a token ends, and nothing from what is not a token', () => {
    const ends = tokenEnds(jwt(60_000));
    assert.ok(ends !== null && Math.abs(ends - (Date.now() + 60_000)) < 2000);
    assert.equal(tokenEnds('good'), null);
    assert.equal(tokenEnds('a.b.c'), null);
  });

  it('asks about a token once for every route, and once for many requests at the same time', async () => {
    let asked = 0;
    const db = makeDb({
      walletState: async () => state,
      userIdFromToken: async () => {
        asked += 1;
        await new Promise((resolve) => setTimeout(resolve, 5));
        return 'user-1';
      },
    });
    const app = createApp(answering, { timeoutMs: 1000, db });
    const all = await Promise.all([get(app, '/v1/wallet', 'good'), get(app, '/v1/wallet', 'good'), get(app, '/v1/wallet', 'good'), reply(app)]);
    assert.deepEqual(all.map((r) => r.status), [200, 200, 200, 200]);
    assert.equal((await reply(app)).status, 200);
    assert.equal(asked, 1);
  });

  it('remembers a refusal for a moment, so bad tokens do not reach the sign-in service one by one', async () => {
    let asked = 0;
    const app = createApp(null, { timeoutMs: 1000, db: makeDb({ walletState: async () => state, userIdFromToken: async () => ((asked += 1), null) }) });
    assert.equal((await get(app, '/v1/wallet', 'bad')).status, 401);
    assert.equal((await get(app, '/v1/wallet', 'bad')).status, 401);
    assert.equal(asked, 1);
  });

  it('keeps a token it vouched for while the sign-in service is away, until the token ends', async (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: Date.now() });
    let up = true;
    const db = makeDb({
      walletState: async () => state,
      userIdFromToken: async () => {
        if (!up) throw new Error('auth: fetch failed');
        return 'user-1';
      },
    });
    const app = createApp(null, { timeoutMs: 1000, db });
    const long = jwt(30 * 60_000);
    const short = jwt(7 * 60_000);
    assert.equal((await get(app, '/v1/wallet', long)).status, 200);
    assert.equal((await get(app, '/v1/wallet', short)).status, 200);
    up = false;
    // Past the five minutes an answer is remembered for: both are asked about again, and nobody answers.
    t.mock.timers.tick(6 * 60_000);
    assert.equal((await get(app, '/v1/wallet', long)).status, 200);
    assert.equal((await get(app, '/v1/wallet', short)).status, 200);
    t.mock.timers.tick(2 * 60_000);
    assert.equal((await get(app, '/v1/wallet', long)).status, 200);
    assert.equal((await get(app, '/v1/wallet', short)).status, 401);
    // A token never seen before cannot be vouched for.
    assert.equal((await get(app, '/v1/wallet', jwt(30 * 60_000, 'user-2'))).status, 401);
  });

  it('forgets the token when its account is deleted', async () => {
    const app = createApp(null, { timeoutMs: 1000, db: makeDb({ walletState: async () => state, deleteUser: async () => {} }) });
    assert.equal((await get(app, '/v1/wallet', 'good')).status, 200);
    assert.equal((await app.request('/v1/account', { method: 'DELETE', headers: { authorization: 'Bearer good' } })).status, 200);
    assert.equal((await get(app, '/v1/wallet', 'good')).status, 401);
  });
});

describe('the limits off the model routes', () => {
  it('says busy to an account or an address that loops on the wallet and the syncs', async () => {
    const db = makeDb({ walletState: async () => state });
    const byUser = createApp(null, { timeoutMs: 1000, db, limits: { dataPerMinute: 2 } });
    assert.deepEqual([(await get(byUser, '/v1/wallet', 'good')).status, (await get(byUser, '/v1/wallet', 'good')).status, (await get(byUser, '/v1/wallet', 'good')).status], [200, 200, 429]);
    const byAddress = createApp(null, { timeoutMs: 1000, db, limits: { addressDataPerMinute: 1 } });
    assert.equal((await get(byAddress, '/v1/wallet', 'good', { 'fly-client-ip': '1.1.1.1' })).status, 200);
    assert.equal((await get(byAddress, '/v1/wallet', 'good', { 'fly-client-ip': '1.1.1.1' })).status, 429);
    assert.equal((await get(byAddress, '/v1/wallet', 'good', { 'fly-client-ip': '2.2.2.2' })).status, 200);
    // The model's routes keep their own, larger count.
    const model = createApp(answering, { timeoutMs: 1000, db, limits: { dataPerMinute: 1 } });
    assert.deepEqual([(await reply(model)).status, (await reply(model)).status], [200, 200]);
  });

  it('caps the lines a friend writes first per account a day, and asks for them as side work', async () => {
    const priorities: (string | undefined)[] = [];
    const provider: LlmProvider = {
      name: 'fake',
      async complete(_layout, opts) {
        priorities.push(opts.priority);
        return { text: '{"skip":false,"messages":["Morning!"]}', usage: {} };
      },
    };
    const app = createApp(provider, { timeoutMs: 1000, db: makeDb({}), limits: { firstTextPerDay: 1 } });
    const brief = { kind: 'brief', input: { character: kai, user: { id: 'u1', displayName: 'Sam' }, brief: { characterId: 'c_kai', items: [{ title: 'Exam', time: '10:00' }], covers: [] }, recent: [], now: '2026-10-28T07:30:00.000Z' } };
    const send = () => app.request('/v1/ai/first-text', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer good' }, body: JSON.stringify(brief) });
    assert.equal((await send()).status, 200);
    assert.equal((await send()).status, 429);
    assert.equal((await reply(app)).status, 200);
    assert.deepEqual(priorities, ['side', undefined]);
  });

  it('holds only so many replies with photos at once', async () => {
    const open: (() => void)[] = [];
    const held: LlmProvider = { name: 'held', complete: () => new Promise((resolve) => open.push(() => resolve({ text: '{"messages":["Nice."]}', usage: {} }))) };
    const app = createApp(held, { timeoutMs: 1000, db: makeDb({}), limits: { photosInFlight: 1 } });
    const withPhoto = { ...body, images: [{ mimeType: 'image/jpeg', data: '/9j/AAAA' }] };
    const first = reply(app, withPhoto);
    await tick();
    assert.equal((await reply(app, withPhoto)).status, 503);
    const plain = reply(app);
    await tick();
    open.forEach((go) => go());
    assert.deepEqual([(await first).status, (await plain).status], [200, 200]);
    const next = reply(app, withPhoto);
    await tick();
    open[open.length - 1]();
    assert.equal((await next).status, 200);
  });

  it('caps side work per account a day, apart from talking', async () => {
    const provider: LlmProvider = { name: 'fake', complete: async () => ({ text: '{"messages":["Hi."],"summary":"","ops":[]}', usage: {} }) };
    const app = createApp(provider, { timeoutMs: 1000, db: makeDb({}), limits: { sidePerDay: 1 } });
    const pass = () =>
      app.request('/v1/memory/pass', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer good' }, body: JSON.stringify({ character: kai, user: { id: 'u1', displayName: 'Sam' }, facts: [], lines: body.messages }) });
    const first = await pass();
    assert.notEqual(first.status, 429);
    assert.equal((await pass()).status, 429);
    assert.equal((await reply(app)).status, 200);
  });

  it('counts what it answers, and tells the health of the database apart from its own', async () => {
    const served = { ok: 0, busy: 0, failed: 0 };
    let dbUp = true;
    let pings = 0;
    const db = makeDb({
      walletState: async () => state,
      ping: async () => {
        pings += 1;
        if (!dbUp) throw new Error('down');
      },
    });
    const app = createApp(null, { timeoutMs: 1000, db, served, limits: { dataPerMinute: 1 } });
    assert.deepEqual(await (await app.request('/health')).json(), { ok: true, model: null, db: 'fake', dbOk: true });
    dbUp = false;
    // One answer stands for half a minute: the check by the host does not become load on the database.
    assert.equal(((await (await app.request('/health')).json()) as { dbOk: boolean }).dbOk, true);
    assert.equal(pings, 1);
    await get(app, '/v1/wallet', 'good');
    await get(app, '/v1/wallet', 'good');
    await reply(app);
    assert.deepEqual(served, { ok: 3, busy: 2, failed: 0 });
    const away = createApp(null, { timeoutMs: 1000, db: makeDb({ ping: async () => Promise.reject(new Error('down')) }) });
    const health = await away.request('/health');
    assert.deepEqual([health.status, ((await health.json()) as { dbOk: boolean }).dbOk], [200, false]);
  });
});

describe('the reply allowance (replies follow the ledger)', () => {
  const group = { ...body, others: [{ id: 'c_hana', name: 'Hana', handle: '@h', bio: 'Reader.', category: 'school', accentIndex: 1, voiceReady: false, isOfficial: true, greeting: 'Hi', tags: [] }] };
  const groupReply = (app: App) => app.request('/v1/chat/group', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer good' }, body: JSON.stringify(group) });
  const statuses = async (n: number, ask: () => Promise<Response> | Response) => {
    const out: number[] = [];
    for (let i = 0; i < n; i++) out.push((await ask()).status);
    return out;
  };

  it('answers as often as the account spent today plus the free share, then says no shells with the wallet', async (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: Date.UTC(2026, 10, 10, 12) });
    let spends = 0;
    let reads = 0;
    const db = makeDb({ walletState: async () => state, spendsToday: async () => ((reads += 1), spends) });
    const app = createApp(answering, { timeoutMs: 1000, db, enforceWallet: true, limits: { freeRepliesPerDay: 2 } });
    assert.deepEqual(await statuses(2, () => reply(app)), [200, 200]);
    // Within the free share the ledger is not read at all.
    assert.equal(reads, 0);
    const refused = await reply(app);
    assert.equal(refused.status, 402);
    assert.deepEqual(await refused.json(), { error: 'noShells', wallet: state });
    // They spend: the next look at the ledger (not sooner than 20 s after the last) lets replies out again.
    spends = 2;
    assert.equal((await reply(app)).status, 402);
    t.mock.timers.tick(21_000);
    assert.deepEqual(await statuses(3, () => reply(app)), [200, 200, 402]);
    // A new day starts the count again.
    t.mock.timers.tick(86_400_000);
    spends = 0;
    assert.deepEqual(await statuses(3, () => reply(app)), [200, 200, 402]);
  });

  it('only counts while it is not enforced, and lets the reply out when the ledger cannot be read', async () => {
    const counted = createApp(answering, { timeoutMs: 1000, db: makeDb({ spendsToday: async () => 0 }), limits: { freeRepliesPerDay: 1 } });
    assert.deepEqual(await statuses(3, () => reply(counted)), [200, 200, 200]);
    const blind = createApp(answering, { timeoutMs: 1000, db: makeDb({ spendsToday: async () => Promise.reject(new Error('down')) }), enforceWallet: true, limits: { freeRepliesPerDay: 1 } });
    assert.deepEqual(await statuses(3, () => reply(blind)), [200, 200, 200]);
    // A database with no ledger to read (a test server) has no allowance.
    const none = createApp(answering, { timeoutMs: 1000, db: makeDb({}), enforceWallet: true, limits: { freeRepliesPerDay: 1 } });
    assert.deepEqual(await statuses(3, () => reply(none)), [200, 200, 200]);
  });

  it('counts a group message as one spend for up to four replies, and a call on its own count', async () => {
    const db = makeDb({ walletState: async () => state, spendsToday: async () => 0 });
    const app = createApp(answering, { timeoutMs: 1000, db, enforceWallet: true, limits: { freeRepliesPerDay: 1, callRepliesPerDay: 2 } });
    assert.deepEqual(await statuses(5, () => groupReply(app)), [200, 200, 200, 200, 402]);
    assert.deepEqual(await statuses(3, () => reply(app, { ...body, mode: 'call' })), [200, 200, 402]);
  });
});

describe('the server counts messages itself (0z260, take_message)', () => {
  const group = { ...body, others: [{ id: 'c_hana', name: 'Hana', handle: '@h', bio: 'Reader.', category: 'school', accentIndex: 1, voiceReady: false, isOfficial: true, greeting: 'Hi', tags: [] }] };
  /** take_message in memory: free first, then a shell, once per key; `charge` false moves nothing. */
  function counting(opts: { shells: number; freeLimit?: number; failing?: boolean }) {
    let shells = opts.shells;
    const keys = new Map<string, { uses: number; shells: number }>();
    const asked: TakeMessage[] = [];
    const db = makeDb({
      walletState: async () => ({ ...state, shells }),
      spendsToday: async () => 0,
      takeMessage: async (_user, r) => {
        asked.push(r);
        if (opts.failing) throw new Error('down');
        const limit = opts.freeLimit ?? r.freeLimit;
        const freeUsed = () => [...keys.values()].filter((k) => k.shells === 0).length;
        const out = (outcome: MessageCharge['outcome']): MessageCharge => ({ outcome, freeUsed: freeUsed(), freeLimit: limit, wallet: { ...state, shells } });
        const known = keys.get(r.key);
        if (known) {
          if (r.use && known.uses >= r.maxUses) return out('overused');
          if (r.use) known.uses++;
          return out('again');
        }
        if (r.mayBeFree && freeUsed() < limit) {
          keys.set(r.key, { uses: r.use ? 1 : 0, shells: 0 });
          return out('free');
        }
        if (shells < r.cost) return out('noShells');
        if (r.charge) shells -= r.cost;
        keys.set(r.key, { uses: r.use ? 1 : 0, shells: r.cost });
        return out('paid');
      },
    });
    return { db, asked, shells: () => shells };
  }
  const send = (app: App, key: string, reason = 'chat', json: Record<string, unknown> = body, path = '/v1/chat/reply') =>
    app.request(path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer good' }, body: JSON.stringify({ ...json, pay: { key, reason } }) });

  it('takes today\'s free messages first, then a shell, once per key, and refuses with the wallet when none is left', async () => {
    const w = counting({ shells: 1, freeLimit: 2 });
    const app = createApp(answering, { timeoutMs: 1000, db: w.db, enforceWallet: true });
    const first = await send(app, 'p1');
    assert.equal(first.status, 200);
    assert.deepEqual(((await first.json()) as { charge: MessageCharge }).charge, { outcome: 'free', freeUsed: 1, freeLimit: 2, wallet: { ...state, shells: 1 } });
    assert.equal((await send(app, 'p2')).status, 200);
    const paid = await send(app, 'p3');
    assert.equal(((await paid.json()) as { charge: MessageCharge }).charge.outcome, 'paid');
    assert.equal(w.shells(), 0);
    // A retry of a paid line is not charged again; a new line with no shells is refused.
    assert.equal(((await (await send(app, 'p3')).json()) as { charge: MessageCharge }).charge.outcome, 'again');
    const refused = await send(app, 'p4');
    assert.equal(refused.status, 402);
    assert.deepEqual(await refused.json(), { error: 'noShells', wallet: { ...state, shells: 0 }, freeUsed: 2, freeLimit: 2 });
    // The server's own numbers, never the app's: the price, both day counts, photos never free.
    assert.deepEqual([w.asked[0].cost, w.asked[0].freeLimit, w.asked[0].planLimit, w.asked[0].mayBeFree, w.asked[0].charge], [1, 30, 200, true, true]);
    await send(app, 'p5', 'photo');
    assert.equal(w.asked.at(-1)!.mayBeFree, false);
    // A reply that reads a photo pays a photo's price, whatever the app named it.
    await send(app, 'p6', 'chat', { ...body, images: [{ data: '/9j/4AAQ', mimeType: 'image/jpeg' }] });
    assert.deepEqual([w.asked.at(-1)!.key, w.asked.at(-1)!.reason, w.asked.at(-1)!.mayBeFree], ['p6', 'photo', false]);
  });

  it('only records while it is not enforced: nothing is refused and the reply carries no charge', async () => {
    const w = counting({ shells: 0, freeLimit: 1 });
    const app = createApp(answering, { timeoutMs: 1000, db: w.db });
    for (const key of ['a', 'b', 'c']) {
      const res = await send(app, key);
      assert.equal(res.status, 200);
      assert.equal(((await res.json()) as { charge?: unknown }).charge, undefined);
    }
    assert.ok(w.asked.every((r) => r.charge === false));
  });

  it('hands a line the database cannot decide to the allowance, and counts an overused key as unkeyed', async () => {
    const down = counting({ shells: 0, failing: true });
    const app = createApp(answering, { timeoutMs: 1000, db: down.db, enforceWallet: true, limits: { freeRepliesPerDay: 1 } });
    assert.deepEqual([(await send(app, 'k')).status, (await send(app, 'k2')).status], [200, 402]);
    const w = counting({ shells: 5 });
    const tight = createApp(answering, { timeoutMs: 1000, db: w.db, enforceWallet: true, limits: { freeRepliesPerDay: 0 } });
    // One key serves a line and two retries; the fourth reply under it falls to the allowance (none left).
    assert.deepEqual([(await send(tight, 'k')).status, (await send(tight, 'k')).status, (await send(tight, 'k')).status, (await send(tight, 'k')).status], [200, 200, 200, 402]);
    // A malformed key is no key at all.
    assert.equal((await send(tight, 'bad key with spaces')).status, 402);
  });

  it('lets one key cover a group\'s members, and leaves calls to their own count', async () => {
    const w = counting({ shells: 0, freeLimit: 1 });
    const app = createApp(answering, { timeoutMs: 1000, db: w.db, enforceWallet: true });
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await send(app, 'g1', 'chat', group, '/v1/chat/group')).status);
    assert.deepEqual(statuses, [200, 200, 200, 200]);
    assert.equal(w.asked[0].maxUses, 8);
    await send(app, 'call-1', 'chat', { ...body, mode: 'call' });
    assert.equal(w.asked.length, 4);
  });

  it('decides the app\'s spend mirror of a message the same way while it charges, so nothing is paid twice', async () => {
    const w = counting({ shells: 3, freeLimit: 0 });
    const app = createApp(answering, { timeoutMs: 1000, db: w.db, enforceWallet: true });
    const mirror = (key: string, reason = 'chat') =>
      app.request('/v1/wallet/spend', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer good' }, body: JSON.stringify({ amount: 1, reason, key }) });
    assert.equal(((await (await mirror('m1')).json()) as WalletState).shells, 2);
    // The reply under the same key comes after: decided already, not charged again.
    assert.equal(((await (await send(app, 'm1')).json()) as { charge: MessageCharge }).charge.outcome, 'again');
    assert.equal(w.shells(), 2);
    assert.equal(w.asked[0].use, false);
  });
});

describe('persistent daily rate limits across server restarts (B16)', () => {
  it('enforces userPerDay across two separate server instances sharing one database store', async () => {
    const counts = new Map<string, number>();
    const db = makeDb({
      async consumeDailyQuota(scope, bucket, amount, limit) {
        const key = `${scope}:${bucket}`;
        const used = counts.get(key) ?? 0;
        if (used + amount > limit) return false;
        counts.set(key, used + amount);
        return true;
      },
    });
    const appA = createApp(answering, { timeoutMs: 1000, db, limits: { userPerDay: 2 } });
    const appB = createApp(answering, { timeoutMs: 1000, db, limits: { userPerDay: 2 } });
    assert.equal((await reply(appA)).status, 200);
    assert.equal((await reply(appB)).status, 200);
    // Third request hits the shared persistent cap even on a brand-new server instance.
    assert.equal((await reply(appB)).status, 429);
  });
});
