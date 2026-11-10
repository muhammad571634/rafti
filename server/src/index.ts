import type { Server } from 'node:http';

import { serve } from '@hono/node-server';

import { createApp, type Served } from './app.ts';
import { config } from './config.ts';
import { supabaseDb } from './db/supabase.ts';
import { createGate } from './llm/gate.ts';
import { geminiProvider } from './llm/gemini.ts';
import { chainProviders, openAiCompatProvider } from './llm/openai-compat.ts';
import type { LlmProvider } from './llm/types.ts';
import { elevenLabsSpeech } from './speech/elevenlabs.ts';
import { lineSigner, signKey } from './speech/sign.ts';

const db = config.supabase.url && config.supabase.secretKey ? supabaseDb(config.supabase) : null;
// One gate for every model call of this process: slots, a short queue, the day's budget.
const gate = createGate(config.gate, { spentToday: db?.modelSpendToday ? () => db.modelSpendToday!() : undefined });

// The OpenAI-compatible provider first when it is configured, Gemini behind it (or alone).
const providers: LlmProvider[] = [];
if (config.openai.apiKey && config.openai.baseUrl && config.openai.model) providers.push(openAiCompatProvider(config.openai));
if (config.geminiKey) providers.push(geminiProvider(config.geminiKey, config.chatModels));
const chain = chainProviders(providers);
const provider = chain ? gate.wrap(chain) : null;
const client = db && config.supabase.publishableKey ? { supabaseUrl: config.supabase.url, supabaseKey: config.supabase.publishableKey } : null;
// Voice messages go to Gemini alone, as the app's consent says.
const voiceProvider = config.geminiKey ? gate.wrap(geminiProvider(config.geminiKey, config.chatModels)) : null;
// The character's voice on calls; without the key, calls show captions only.
const speech = config.elevenlabs.apiKey
  ? {
      provider: elevenLabsSpeech(config.elevenlabs),
      pricePer1k: config.elevenlabs.pricePer1k,
      userCharsPerDay: config.elevenlabs.userCharsPerDay,
      charsPerDay: config.elevenlabs.charsPerDay,
    }
  : null;
const key = signKey(config.lineSignKey);
const served: Served = { ok: 0, busy: 0, failed: 0 };
const app = createApp(provider, {
  timeoutMs: config.timeoutMs,
  voiceProvider,
  speech,
  signer: key ? lineSigner(key) : undefined,
  db,
  client,
  devGrants: config.devGrants,
  testSubscribers: config.testSubscribers,
  served,
  enforceWallet: config.enforceWallet,
});

const server = serve({ fetch: app.fetch, port: config.port, hostname: config.host }, (info) => {
  console.log(`Sigmazam API on http://${config.host}:${info.port}`);
  console.log(provider ? `Model: ${provider.name}` : 'No model key in server/.env.local: the app keeps its stand-in replies.');
  console.log(db ? `Database: ${config.supabase.url}` : 'No SUPABASE_URL / SUPABASE_SECRET_KEY: accounts are off.');
  console.log(speech ? `Voice: ${speech.provider.name}` : 'No ELEVENLABS_API_KEY: calls show captions only.');
  console.log(`Gate: ${config.gate.maxInFlight} at once, ${config.gate.budgetUsdPerDay ? `$${config.gate.budgetUsdPerDay} a day` : 'no daily budget'}; line key ${key ? 'shared' : 'per process'}; reply allowance ${config.enforceWallet ? 'enforced' : 'counted only'}.`);
});

// The day's spend as the database has it (every machine's calls), read each minute.
void gate.refresh();
setInterval(() => void gate.refresh(), 60_000).unref();

// One line every five minutes: what a person reads first when something is slow.
setInterval(() => {
  const s = gate.stats();
  const rss = Math.round(process.memoryUsage().rss / 1_048_576);
  console.log(`[stats] inflight=${s.inFlight} queued=${s.queued} calls=${s.calls} away=${s.turnedAway} spent=$${s.spentUsd.toFixed(2)} ok=${served.ok} busy=${served.busy} failed=${served.failed} rss=${rss}MB`);
}, 5 * 60_000).unref();

// A deploy or a restart sends SIGTERM: no new requests, the replies being written go out, then the
// process ends (the host waits `kill_timeout`, server/fly.toml). Before this a deploy cut them off.
let stopping = false;
function stop(signal: string) {
  if (stopping) return;
  stopping = true;
  console.log(`[stop] ${signal}: ${gate.stats().inFlight} model calls in flight, finishing them`);
  server.close(() => process.exit(0));
  (server as Server).closeIdleConnections?.();
  setTimeout(() => process.exit(0), 25_000).unref();
}
process.on('SIGTERM', () => stop('SIGTERM'));
process.on('SIGINT', () => stop('SIGINT'));
