import { monitorEventLoopDelay } from 'node:perf_hooks';

import { serve } from '@hono/node-server';

import { createApp, type Served } from './app.ts';
import { makeDb } from './db/fake.ts';
import type { WalletState } from './db/types.ts';
import { createGate } from './llm/gate.ts';
import type { LlmProvider } from './llm/types.ts';

/**
 * How the API holds up under load, with no paid call and no database: the real app and the real
 * prompt code, a stand-in model that answers as slowly as the real one (1.2-3 s), a stand-in
 * database, and requests fired at a steady rate over HTTP on this machine.
 *
 *   npm run load -- --rps 50 --seconds 30
 *
 * The client shares the process (and its one thread) with the server, so the numbers are a little
 * worse than the server alone would give: a floor, not a promise. `--slow 15000` makes the model
 * hang, to see the gate turn requests away instead of piling them up.
 */
const arg = (name: string, fallback: number) => {
  const i = process.argv.indexOf(`--${name}`);
  const value = i >= 0 ? Number(process.argv[i + 1]) : NaN;
  return Number.isFinite(value) ? value : fallback;
};
const RPS = arg('rps', 50);
const SECONDS = arg('seconds', 30);
const SLOW_MS = arg('slow', 0);
const USERS = arg('users', 2500);

const state: WalletState = { shells: 100, free: null, trialUsed: false, boughtShells: false, today: '2026-11-10', checkIn: { lastDay: null, streak: 0 }, spinsToday: 0 };
const model: LlmProvider = {
  name: 'stand-in',
  complete: (_layout, { timeoutMs }) =>
    new Promise((resolve, reject) => {
      const takes = SLOW_MS || 1200 + Math.random() * 1800;
      if (takes > timeoutMs) setTimeout(() => reject(new Error('timed out')), timeoutMs);
      else setTimeout(() => resolve({ text: '{"emotion":"warm","intensity":0.5,"messages":["Mm, tell me more.","*leans in*"]}', model: 'gemini-3.1-flash-lite', usage: { input: 5000, output: 170 } }), takes);
    }),
};
const db = makeDb({
  // Each user has a token of their own, so the sign-in memory and the per-account limits work as they will.
  userIdFromToken: async (token) => (token.startsWith('user-') ? token : null),
  walletState: async () => state,
  walletSpend: async () => state,
  syncMessages: async () => 1,
});

const gate = createGate();
const served: Served = { ok: 0, busy: 0, failed: 0 };
const app = createApp(gate.wrap(model), { timeoutMs: 20_000, db, served, limits: { addressPerMinute: 1e9, addressPerDay: 1e9, addressDataPerMinute: 1e9 } });

const character = { id: 'c_kai', name: 'Kai', handle: '@k', bio: 'Swimmer who trains before school and talks too much about lane times.', category: 'school', accentIndex: 0, voiceReady: false, isOfficial: true, greeting: 'Hey!', tags: ['cheerful', 'sporty'] };
const messages = Array.from({ length: 80 }, (_, i) => ({
  id: `m${i}`,
  conversationId: 'c',
  author: i % 2 ? 'me' : 'them',
  kind: 'text',
  text: i % 2 ? `Line ${i}: today was long, the bus was late again and I still have to study for chemistry.` : `Line ${i}: oh no, again? Sit down, tell me everything from the start.`,
  createdAt: new Date(Date.UTC(2026, 10, 10, 8, i)).toISOString(),
}));
const chatBody = JSON.stringify({ character, user: { id: 'u1', displayName: 'Sam', locale: 'en-US' }, messages });

const server = serve({ fetch: app.fetch, port: 0, hostname: '127.0.0.1' });
await new Promise((resolve) => server.once('listening', resolve));
const { port } = server.address() as { port: number };
const base = `http://127.0.0.1:${port}`;

const statuses = new Map<number, number>();
const times: number[] = [];
let peakRss = 0;
let peakInFlight = 0;
const lag = monitorEventLoopDelay({ resolution: 10 });
lag.enable();

async function one(i: number) {
  const token = `user-${i % USERS}`;
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${token}` };
  const started = performance.now();
  // Seven in ten are replies; the rest is what surrounds a message: a spend, a sync, a wallet read.
  const kind = i % 10;
  const res =
    kind < 7
      ? await fetch(`${base}/v1/chat/reply`, { method: 'POST', headers, body: chatBody })
      : kind === 7
        ? await fetch(`${base}/v1/wallet/spend`, { method: 'POST', headers, body: JSON.stringify({ amount: 1, reason: 'chat', key: `k${i}` }) })
        : kind === 8
          ? await fetch(`${base}/v1/messages/sync`, { method: 'POST', headers, body: JSON.stringify({ droppedChats: [], deletedIds: [], upserts: [] }) })
          : await fetch(`${base}/v1/wallet`, { headers });
  await res.arrayBuffer();
  if (kind < 7) times.push(performance.now() - started);
  statuses.set(res.status, (statuses.get(res.status) ?? 0) + 1);
}

console.log(`Load: ${RPS} requests a second for ${SECONDS} s, ${USERS} accounts${SLOW_MS ? `, model hangs ${SLOW_MS} ms` : ''}`);
const all: Promise<void>[] = [];
const total = RPS * SECONDS;
const begun = performance.now();
for (let i = 0; i < total; i++) {
  all.push(one(i).catch(() => void statuses.set(0, (statuses.get(0) ?? 0) + 1)));
  if (i % RPS === 0) {
    peakRss = Math.max(peakRss, process.memoryUsage().rss);
    peakInFlight = Math.max(peakInFlight, gate.stats().inFlight + gate.stats().queued);
  }
  const due = begun + ((i + 1) * 1000) / RPS;
  const wait = due - performance.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
}
await Promise.all(all);
peakRss = Math.max(peakRss, process.memoryUsage().rss);
lag.disable();

times.sort((a, b) => a - b);
const at = (p: number) => Math.round(times[Math.min(times.length - 1, Math.floor(times.length * p))] ?? 0);
const s = gate.stats();
console.log(`Answers by status: ${[...statuses].sort((a, b) => a[0] - b[0]).map(([code, n]) => `${code || 'no answer'}=${n}`).join(' ')}`);
console.log(`Reply time (the model's 1.2-3 s included): p50 ${at(0.5)} ms, p95 ${at(0.95)} ms, max ${at(1)} ms`);
console.log(`Event loop held up: mean ${(lag.mean / 1e6).toFixed(1)} ms, p99 ${(lag.percentile(99) / 1e6).toFixed(1)} ms, max ${(lag.max / 1e6).toFixed(1)} ms`);
console.log(`Memory peak ${Math.round(peakRss / 1_048_576)} MB; model calls at once (with the queue) peak ${peakInFlight}; turned away by the gate ${s.turnedAway}; served ok=${served.ok} busy=${served.busy} failed=${served.failed}`);
console.log(`Model cost of the run at list price: $${s.spentUsd.toFixed(2)} for ${s.calls} calls`);
server.close();
process.exit(0);
