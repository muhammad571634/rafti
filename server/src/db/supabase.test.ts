import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { createApp } from '../app.ts';
import { supabaseDb } from './supabase.ts';
import type { BootstrapResult } from './types.ts';

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

  it('deletes an account with everything it owns (App Store 5.1.1(v))', async () => {
    const gone = await anonymousUser();
    await db!.bootstrap(gone.id, {});
    const { error } = await admin.auth.admin.deleteUser(gone.id);
    assert.equal(error, null);
    const { data } = await admin.from('shell_ledger').select('id').eq('user_id', gone.id);
    assert.deepEqual(data, []);
  });
});
