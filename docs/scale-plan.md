# Scale plan: the server at 10,000 installs, and the model only where someone is talking

Owner, 2026-11-10: "do not load everything onto the model; the rest is yours to decide", and "make
the server and Supabase side hold even if 10,000 people download it now". The owner chose the mixed
road: talking and answers to the user's own things stay personal; what can be the same for everyone
is written once per character and shared. This file is the plan, what is built, and what is next.

## What the review found (2026-11-10)

| # | Weak point | Then | At 10,000 installs |
|---|---|---|---|
| 1 | No money guard | Reply routes do not check the wallet; one anonymous account may make 1,500 model calls a day (~$2.25) | Unbounded cost; a script can use the API as a free model |
| 2 | One machine | Limits, the token memory and the voice signing key live in the process; `--ha=false` | A deploy or a crash cuts every reply; a second machine breaks signed call lines |
| 3 | Sign-in check | Wallet and sync routes asked Supabase Auth over the network on every request; a chat reply asked twice | Latency, and Auth's rate limits |
| 4 | No brake on the model's side | Calls in flight and the day's spend were not capped | A slow provider piles requests up (512 MB); nothing stops a bill |
| 5 | The model where nobody talks | 14 days, 1,014 calls: 54% were not a conversation (moments and pushes 22%, streams 9%, memory 7%, diary 4%), 49% of the cost | Side work costs as much as the talking |
| 6 | Supabase free tier | 15 MB used of 500 MB (about 1 million messages at ~0.5 KB with indexes); no backups; pauses when idle | Full within the first weeks |
| 7 | Observation | Log lines only | We learn of an outage from users |

Sound already: the schema (RLS on every table, writes only through the server's SQL functions,
foreign keys indexed, Supabase advisors clean but for intended server-only tables), and the API is
stateless (the phone sends what a reply needs), so it scales sideways.

Load estimate: 10,000 installs ≈ 2,500 daily actives ≈ 75,000 replies a day, ~5 requests a second
at the evening peak, ~15 model calls in flight. Node carries that; the narrow places are the
provider's quota and money.

## Phase 1: the server does not fall (no change a user sees)

Built in 0z190 (`server/src`):

- **Sign-in check, local and remembered** (`db/supabase.ts`, `accountOf` in `app.ts`): a token is
  verified against the project's public signing key (`auth.getClaims`, ES256; a token signed the
  old way still goes over the network inside it). One answer per token for every route for 5
  minutes (never past the token's own end), one question for many requests at once, a refusal
  remembered 30 s, the oldest tenth dropped when 20,000 are held. When Auth cannot be reached, a
  token it vouched for still stands until its own end. Deleting the account ends its token at once.
- **Model gate** (`llm/gate.ts`): 120 calls in flight, 240 replies queued for at most 6 s, the rest
  answer busy at once. Side work (`priority: 'side'`: first texts, streams, the memory pass, a
  friend's diary page, their weekly quiz, world quiz lines) never queues and may hold 80% of the
  slots. `MODEL_BUDGET_USD_PER_DAY` (0 = off): at 80% of the day's spend side work pauses, at 100%
  every model call answers busy; `[alert]` in the log at both. The spend is read from the database
  each minute (`model_spend_today`, migration b9), so it holds across restarts and machines.
- **Ready for a second machine**: `LINE_SIGN_KEY` (a shared secret for the lines a call may read
  aloud), SIGTERM finishes the replies in flight (25 s; `kill_timeout` 30 s in `fly.toml`),
  request concurrency limits in `fly.toml`. Minute limits stay per machine (at worst twice the
  number); the day's money is capped by the budget and, later, the wallet.
- **Limits off the model routes**: every other `/v1` route counts per account (240 a minute) and
  per address (1,200 a minute); first texts 80 per account a day; 16 replies with photos at once.
- **Health and a pulse**: `/health` adds `dbOk` (asked at most every 30 s; the answer stays 200 so
  the host never takes a machine out for the database's sake). `[stats]` every 5 minutes: calls in
  flight, queue, turned away, the day's spend, answers by kind, memory.
- **The cost log** (migration `b9_usage_daily`): `model_spend_today()`, a block-range index on
  `usage_events.created_at`, and `usage_daily` rolled up each night. Raw rows stay 13 months for
  now; when the table passes ~2 GB, point `scripts/metrics.mjs` at the roll-up and keep raw 90 days.
- **Load test** (`npm run load` in `server/`): the real app and prompt code, a stand-in model and
  database, HTTP on the laptop, client and server in one process (so a floor, not a promise).

| Run (2026-11-10, laptop) | Answers | Reply time | Loop lag p99 | Memory peak |
|---|---|---|---|---|
| 50 requests/s, 30 s (10 times the estimated peak) | 1,500 of 1,500 OK | p50 2.1 s, p95 2.9 s (the model's own 1.2-3 s) | 28 ms | 271 MB |
| 150 requests/s, 20 s | 2,315 OK, 685 busy | p50 4.4 s, p95 7.0 s | 30 ms | 378 MB |
| 50 requests/s, model hangs 15 s | 420 OK, 460 busy, 120 timed out | p95 20 s | 27 ms | 300 MB |

The gate held 120 in flight and 240 queued in the last two and turned the rest away; memory stayed
bounded. A Fly `shared-cpu-1x` is several times slower than the laptop: the estimated peak (5 a
second) fits one machine, two give room and survive a crash. Memory: go to 1 GB at launch.

- **The reply allowance: replies follow the ledger** (`mayReply` in `app.ts`, road-to-launch item 4).
  The first design (the reply route charges with the app's `spend:<key>`) was dropped after reading
  the app: it spends a shell and asks for the reply as two calls with a random key and nothing tying
  them (`spendShells`, ~20 call sites), so charging again on the server risked charging twice or
  blocking the free replies. Instead the server counts an account's replies of the UTC day against
  its spends of that day in `shell_ledger` plus a free share (40; hellos, a version asked for again,
  a wake-up talk). A group message is one spend for up to four replies; replies on a call have their
  own count (300; calls are paid in minutes). The ledger is read only when an account reaches its
  allowance (at most every 20 s), and a failed read lets replies out. Measured on 14 days of real
  use: replies a day stay within a few of the spends (91 to 98, 62 to 61, 58 to 62, 50 to 47).
  No change in the app, nothing can be charged twice. `ENFORCE_WALLET=1` refuses with 402
  `noShells` and the wallet; off (the default) it only counts and logs `[allowance] would refuse`
  once per account a day. Read those lines on real traffic, then turn it on. An account that never
  spends then gets 40 replies a day where it had 1,500.
- **Side work per account**: 300 model calls a day outside talking (streams, writes, the memory
  pass, drafts), on top of the 80 first texts.

Still open in phase 1:

- The app shows a refused reply as Not delivered (any non-200). When `ENFORCE_WALLET` goes on, read
  402 `noShells` in `src/ai/server.ts` and open the app's own "no shells" sheet instead.
- Per-machine counts (the allowance, the minute limits) double with two machines. Move the
  allowance's reply count into `daily_usage` if that slack ever matters.

## Phase 2: the model only where someone is talking (the mixed road)

Stays personal (the model, per user): chat, calls, group, speech to text and back, a date round, a
secret note, the answer to the user's diary page, a diary page (it is about the day together),
texts tied to the user's own plan or alarm, threads that came out of the chat.

1. **Shared content** (`shared_lines` table, `server/src/shared.ts` `getOrWrite`): written once by
   the model, read by everyone after; one call even when a thousand ask at the same moment
   (one promise per key in the process, `on conflict do nothing` across machines). Official
   characters only; a user's own creation stays personal.
   - Streams: the whole script once per pair, topic, language and day (a watcher-free persona);
     new `/v1/streams/script`, the app plays it at its existing pace. `/v1/streams/line` stays for
     installed builds.
   - A character's weekly quiz, a world quiz's host lines, world news: cached inside
     `/v1/ai/write` and `/v1/ai/first-text` by character or world, week or day, language.
   - Generic hellos: a friend with no recent chat greets from a pool of ~20 lines per character,
     slot and language (the phone picks without repeating). A friend with a recent chat keeps
     personal lines, capped per day (free 3, a plan 10; `src/notifications/written.ts`).
2. **Memory pass**: every 8 user lines, or on leaving the chat with 3 or more (now every 4). A new
   line is still in the reply's window meanwhile; checked with the small memory eval.
3. Every change goes into `docs/cost-ledger.md` with the measured number.

## Phase 3: launch switches (owner only)

- A paid model key, and a second provider behind it (`OPENAI_*` is already wired).
- Supabase Pro ($25 a month: 8 GB, daily backups, no pausing).
- Fly: `flyctl scale count 2`, `flyctl secrets set LINE_SIGN_KEY=<long random text>`, memory 1 GB
  (about $8-10 a month in all), deploy without `--ha=false`.
- `MODEL_BUDGET_USD_PER_DAY` set to what a day may cost; `ENFORCE_WALLET=1`; `TEST_SUBSCRIBERS` removed.
- An outside uptime check on `https://sigmazam-api.fly.dev/health`.
- Server push (Firebase, an Apple account, a new APK): personal first texts are then written only
  when a push is really sent, not ahead for every slot.

## Environment (server)

| Name | Default | What |
|---|---|---|
| `MODEL_MAX_IN_FLIGHT` | 120 | Model calls at once, per machine |
| `MODEL_MAX_QUEUED` | 240 | Replies that may wait for a slot |
| `MODEL_BUDGET_USD_PER_DAY` | 0 (off) | The whole service's model spend a UTC day at list price |
| `LINE_SIGN_KEY` | none (a key per process) | Shared by every machine once there are two |
| `ENFORCE_WALLET` | off | `1` refuses replies past the allowance; off only counts them |
