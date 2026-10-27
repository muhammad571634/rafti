import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { DAILY_CHECK_IN, DAILY_CHECK_IN_TOP, WHEEL_SEGMENTS, WHEEL_WEIGHTS } from '../../../src/economy/shells.ts';
import { createApp } from '../app.ts';
import { supabaseDb } from './supabase.ts';
import { WalletError, type BootstrapResult } from './types.ts';

/**
 * Against the cloud project (there is no local Docker stack). It signs up real anonymous users and
 * deletes them after, so it runs only when asked: `SUPABASE_E2E=1` plus SUPABASE_URL,
 * SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY, with anonymous sign-ins on in the project.
 */
function cloudProject(): { url: string; publishable: string; secret: string } | null {
  const { SUPABASE_E2E, SUPABASE_URL: url, SUPABASE_PUBLISHABLE_KEY: publishable, SUPABASE_SECRET_KEY: secret } = process.env;
  return SUPABASE_E2E === '1' && url && publishable && secret ? { url, publishable, secret } : null;
}

const stack = cloudProject();
const noAuth = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

/** A fresh anonymous user, signed in the way the app will be. */
async function anonymousUser(): Promise<{ id: string; token: string; client: SupabaseClient }> {
  const client = createClient(stack!.url, stack!.publishable, { auth: noAuth });
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.session || !data.user) throw new Error(`anonymous sign-in: ${error?.message}`);
  return { id: data.user.id, token: data.session.access_token, client };
}

describe('Supabase (cloud project)', { skip: stack ? false : 'set SUPABASE_E2E=1 and the Supabase keys to run' }, () => {
  const admin = stack ? createClient(stack.url, stack.secret, { auth: noAuth }) : (null as unknown as SupabaseClient);
  const db = stack ? supabaseDb({ url: stack.url, secretKey: stack.secret }) : null;
  let a: Awaited<ReturnType<typeof anonymousUser>>;
  let b: Awaited<ReturnType<typeof anonymousUser>>;

  before(async () => {
    a = await anonymousUser();
    b = await anonymousUser();
  });

  after(async () => {
    for (const user of [a, b]) if (user) await admin.auth.admin.deleteUser(user.id);
  });

  it('bootstraps a new player once: profile, wallet, the welcome gift paid a single time', async () => {
    const first = await db!.bootstrap(a.id, { locale: 'en-US', timeZone: 'Asia/Tashkent' });
    assert.equal(first.isNew, true);
    assert.equal(first.wallet.shells, 100);
    assert.equal(first.profile.timeZone, 'Asia/Tashkent');
    assert.equal(first.subscription, null);

    const again = await db!.bootstrap(a.id, { locale: 'en-GB' });
    assert.equal(again.isNew, false);
    assert.equal(again.wallet.shells, 100);
    assert.equal(again.profile.locale, 'en-GB');

    const { data: ledger } = await admin.from('shell_ledger').select('delta, reason, bucket').eq('user_id', a.id);
    assert.deepEqual(ledger, [{ delta: 100, reason: 'welcome', bucket: 'paid' }]);
  });

  it('keeps the time zone from changing twice in a day', async () => {
    const result = await db!.bootstrap(a.id, { timeZone: 'America/New_York' });
    assert.equal(result.profile.timeZone, 'Asia/Tashkent');
  });

  it('serves POST /v1/session/bootstrap to a signed-in user only', async () => {
    const app = createApp(null, { timeoutMs: 1000, db });
    const call = (headers: Record<string, string>) =>
      app.request('/v1/session/bootstrap', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify({ locale: 'en-US', timeZone: 'Europe/Berlin' }) });

    assert.equal((await call({})).status, 401);
    assert.equal((await call({ authorization: 'Bearer not-a-token' })).status, 401);
    const res = await call({ authorization: `Bearer ${b.token}` });
    assert.equal(res.status, 200);
    const body = (await res.json()) as BootstrapResult;
    assert.equal(body.profile.id, b.id);
    assert.equal(body.wallet.shells, 100);
  });

  it('lets a player read only their own rows and the official cast', async () => {
    const own = await a.client.from('wallets').select('user_id, shells');
    assert.deepEqual(own.data, [{ user_id: a.id, shells: 100 }]);
    const other = await a.client.from('wallets').select('*').eq('user_id', b.id);
    assert.deepEqual(other.data, []);
    const profiles = await a.client.from('profiles').select('id');
    assert.deepEqual(profiles.data, [{ id: a.id }]);

    const cast = await a.client.from('characters').select('id, persona');
    assert.equal(cast.data?.length, 40);
    assert.ok(cast.data?.every((c) => typeof c.persona.backstory === 'string'));

    const usage = await a.client.from('usage_events').select('*');
    assert.ok(usage.error || usage.data?.length === 0);
  });

  it('never lets the app write money: no ledger rows, no wallet edits, no RPC', async () => {
    const insert = await a.client.from('shell_ledger').insert({ user_id: a.id, delta: 1000, reason: 'purchase', idempotency_key: 'free-money' });
    assert.ok(insert.error, 'insert into shell_ledger must fail');
    await a.client.from('wallets').update({ shells: 99999 }).eq('user_id', a.id);
    const rpc = await a.client.rpc('book_shells', { p_user: a.id, p_delta: 1000, p_reason: 'purchase', p_idempotency_key: 'rpc' });
    assert.ok(rpc.error, 'book_shells must not run for a player');
    const boot = await a.client.rpc('bootstrap_user', { p_user: a.id });
    assert.ok(boot.error, 'bootstrap_user must not run for a player');

    const { data } = await admin.from('wallets').select('shells').eq('user_id', a.id).single();
    assert.equal(data?.shells, 100);
  });

  it('books shells once per idempotency key and refuses an overspend', async () => {
    const spend = () => admin.rpc('book_shells', { p_user: a.id, p_delta: -3, p_reason: 'chat', p_idempotency_key: 'msg-1', p_character_id: 'c_kai' });
    assert.equal((await spend()).error, null);
    assert.equal((await spend()).error, null);
    const over = await admin.rpc('book_shells', { p_user: a.id, p_delta: -1000, p_reason: 'chat', p_idempotency_key: 'msg-2' });
    assert.ok(over.error, 'a spend past zero must fail');

    const { data: wallet } = await admin.from('wallets').select('shells').eq('user_id', a.id).single();
    assert.equal(wallet?.shells, 97);
    const { data: ledger } = await admin.from('shell_ledger').select('delta').eq('user_id', a.id);
    assert.equal(ledger?.reduce((sum, row) => sum + row.delta, 0), 97);
  });

  it('keeps the ledger append-only, even for the server', async () => {
    const edit = await admin.from('shell_ledger').update({ delta: 5000 }).eq('user_id', a.id);
    assert.ok(edit.error, 'ledger rows must not change');
    const remove = await admin.from('shell_ledger').delete().eq('user_id', a.id);
    assert.ok(remove.error, 'ledger rows must not be deleted while the user exists');
  });

  it('runs the wallet (B1.2): check-in once a day, free shells first, one spin, no overspend, overnight burn', async () => {
    const user = await anonymousUser();
    try {
      await db!.bootstrap(user.id, { timeZone: 'Asia/Tashkent' });
      const rules = { ladder: DAILY_CHECK_IN, top: DAILY_CHECK_IN_TOP };
      const checkIn = await db!.walletCheckIn(user.id, rules);
      assert.deepEqual([checkIn.amount, checkIn.day, checkIn.wallet.shells], [DAILY_CHECK_IN[0], 1, 100 + DAILY_CHECK_IN[0]]);
      assert.deepEqual(checkIn.wallet.free, { day: checkIn.wallet.today, amount: DAILY_CHECK_IN[0] });
      assert.equal((await db!.walletCheckIn(user.id, rules)).amount, 0);

      // 40 shells: the 30 free ones go first, then 10 kept ones; the same key books once.
      const spent = await db!.walletSpend(user.id, { amount: 40, reason: 'date', key: 'spend:d1' });
      assert.deepEqual([spent.shells, spent.free], [90, null]);
      assert.deepEqual(await db!.walletSpend(user.id, { amount: 40, reason: 'date', key: 'spend:d1' }), spent);
      await assert.rejects(db!.walletSpend(user.id, { amount: 1000, reason: 'date', key: 'spend:d2' }), (e) => e instanceof WalletError && e.code === 'noShells');

      const wheel = { segments: WHEEL_SEGMENTS, weights: WHEEL_WEIGHTS, freeSpins: 1 };
      const spin = await db!.walletSpin(user.id, wheel);
      assert.ok(spin.index !== null && WHEEL_SEGMENTS[spin.index] === spin.reward);
      assert.equal(spin.wallet.shells, 90 + spin.reward);
      assert.equal((await db!.walletSpin(user.id, wheel)).index, null);

      // The app may not call the money functions itself.
      const rpc = await user.client.rpc('wallet_credit', { p_user: user.id, p_amount: 1000, p_reason: 'purchase', p_key: 'x', p_free: false });
      assert.ok(rpc.error, 'wallet_credit must not run for a player');

      // Yesterday's free shells burn when the wallet is next read.
      const yesterday = new Date(`${spin.wallet.today}T00:00:00Z`);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      await admin.from('wallets').update({ free_day: yesterday.toISOString().slice(0, 10) }).eq('user_id', user.id);
      const after = await db!.walletState(user.id);
      assert.deepEqual([after.shells, after.free], [90, null]);
    } finally {
      await admin.auth.admin.deleteUser(user.id);
    }
  });

  it('keeps the chats (B1.3b): chat order, edits in place, a rewrite, own rows only, no app writes', async () => {
    const line = (id: string, chatId = 'conv_kai', text = id) => ({
      chatId,
      message: { id, conversationId: chatId, author: 'me' as const, kind: 'text' as const, text, createdAt: '2026-10-28T08:00:00Z' },
    });
    const ids = async (user = a.id) => (await db!.messagesAfter(user, 0, 500)).messages.map((m) => `${m.chatId}:${m.message.id}:${m.message.text}`);

    await db!.syncMessages(a.id, { droppedChats: [], deletedIds: [], upserts: [line('m1'), line('m2'), line('g1', 'group_1')] });
    // An edit keeps its place; a deletion and a new line arrive together.
    await db!.syncMessages(a.id, { droppedChats: [], deletedIds: ['m2'], upserts: [line('m1', 'conv_kai', 'edited'), line('m3')] });
    assert.deepEqual(await ids(), ['conv_kai:m1:edited', 'group_1:g1:g1', 'conv_kai:m3:m3']);
    // A chat sent whole again in a new order.
    await db!.syncMessages(a.id, { droppedChats: ['conv_kai'], deletedIds: [], upserts: [line('m3'), line('m1')] });
    assert.deepEqual(await ids(), ['group_1:g1:g1', 'conv_kai:m3:m3', 'conv_kai:m1:m1']);

    const page = await db!.messagesAfter(a.id, 0, 2);
    assert.equal(page.messages.length, 2);
    const rest = await db!.messagesAfter(a.id, page.next!, 2);
    assert.deepEqual([rest.messages.length, rest.next], [1, null]);

    const own = await a.client.from('messages').select('client_id');
    assert.equal(own.data?.length, 3);
    assert.deepEqual((await b.client.from('messages').select('client_id')).data, []);
    const insert = await a.client.from('messages').insert({ user_id: a.id, chat_id: 'x', client_id: 'x', author: 'me', body: {} });
    assert.ok(insert.error, 'the app must not write messages');
    assert.ok((await a.client.rpc('sync_messages', { p_user: a.id, p_dropped: [], p_deleted: [], p_upserts: [] })).error);

    // Through the API too.
    const app = createApp(null, { timeoutMs: 1000, db });
    const res = await app.request('/v1/messages/sync', {
      method: 'POST',
      headers: { authorization: `Bearer ${b.token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ droppedChats: [], deletedIds: [], upserts: [line('b1')] }),
    });
    assert.equal(res.status, 200);
    assert.deepEqual(await ids(b.id), ['conv_kai:b1:b1']);
  });

  it('deletes an account with everything it owns (App Store 5.1.1(v))', async () => {
    const gone = await anonymousUser();
    await db!.bootstrap(gone.id, {});
    const message = { id: 'm1', conversationId: 'c', author: 'me', kind: 'text', text: 'hi', createdAt: '2026-10-28T08:00:00Z' } as const;
    await db!.syncMessages(gone.id, { droppedChats: [], deletedIds: [], upserts: [{ chatId: 'c', message }] });
    const app = createApp(null, { timeoutMs: 1000, db });
    const res = await app.request('/v1/account', { method: 'DELETE', headers: { authorization: `Bearer ${gone.token}` } });
    assert.equal(res.status, 200);
    for (const table of ['shell_ledger', 'messages', 'wallets', 'profiles'] as const) {
      const { data } = await admin.from(table).select('*').eq(table === 'profiles' ? 'id' : 'user_id', gone.id);
      assert.deepEqual(data, [], table);
    }
    const { data: user } = await admin.auth.admin.getUserById(gone.id);
    assert.equal(user.user, null);
  });
});
