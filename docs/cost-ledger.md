# Cost ledger: every AI and running cost, for the unit economics

Owner, 2026-11-07: "unexpected costs like these will keep coming up; write them down somewhere so that
when we do the unit economics we count them too". Every agent adds a row here when a feature adds or
changes a model call, a prompt part, an output field or a paid service, with the measured number
(server log line `[reply]`, `[memory]`, `[moment]`, … gives model, tokens and $ per call; no chat words
are logged). Prices are list prices of the model in use on that day; the free keys we test on do not
bill, the launch key will. Plans and prices live in `src/economy/plans.ts`, the money summary in
`docs/road-to-launch.md` (Money), the older plan maths in `docs/backend-plan.md` §9, §12.18, §13.

## Measured per call (2026-11-07, `gemini-3.1-flash-lite`, server v21-v22, Tokyo)

| Call | When it runs | Input tokens | Cached | Output | $ per call |
|---|---|---|---|---|---|
| Chat reply (`[reply]`) | every message the friend answers | 4,900-6,200 | 0 in 16 of 17 calls | 43-382 | $0.0012-0.0020 (most ~$0.0015) |
| Memory pass (`[memory]`) | after a few replies (`queueMemoryPass`) | 1,800-2,400 | 0 | 240-350 | $0.0008-0.0011 |
| Moment / first text (`[moment]`) | the friend writes first: plan added, reminder, "how did it go?", alarm set, care, quest, greetings | ~2,900 | 0 | 150-220 | ~$0.0010 |
| Thread text (touch) | each text the friend planned to send later (up to 4 per thread) | not measured yet | | | ~a moment |

On 2026-10-31 a reply was $0.0010-0.0014 and a memory pass ~$0.0005: the prompt grew since (clock,
plans and alarms together, setup rules and offers, threads). Rough heavy user now: 100 messages a
day ≈ 100 replies + ~30 memory passes + ~5 moments ≈ $0.19 a day ≈ **$5.7 a month for text alone**.

## Hidden costs found (add each to the model, fix where it pays)

| # | Found | What it costs | Status |
|---|---|---|---|
| 1 | Prompt cache misses: `cached=0` on almost every reply although the persona and rules are meant to be a cached prefix | full input price on ~5-6k tokens per reply; a working cache would cut input cost by roughly half or more | open: find what changes the prefix between turns |
| 2 | The model writes a `threads` field in every reply, but nothing read it until 0z136 | part of the 40-380 output tokens per reply, paid for nothing | 0z136: the app applies it now (the friend's follow-ups come from the model) |
| 3 | Setting up an alarm or plan from the chat (0z136) | ~300 tokens of rules in the global tier (cached once #1 works), ~40 tokens per setup card in the window (`offers`), a ~40-token field when asked; no extra call | in |
| 4 | Each thing the friend says first is its own call (plan added, reminder 10 min before, follow-up after, alarm set, morning brief, care, quests, week recap) | ~$0.001 each; a plan made in the chat brings about 3 | count per active user per day once real traffic exists |
| 5 | Second calls on some replies: the repetition guard and the crisis check redo the reply | one more reply's price on those turns | logged as `repeat=` / `crisis` in `[reply]` |
| 6 | Photos: image tokens on the reply that sees them, plus the photo note | not measured yet | measure |
| 7 | Voice: ElevenLabs speech per character, transcription of voice notes, voice calls (one reply per turn plus speech) | not measured yet; the biggest unknown | measure before pricing voice (`docs/road-to-launch.md`) |
| 8 | Group chats: one reply per member who speaks | ~one reply each | |
| 9 | Fixed: Fly.io API ~$4 a month, Supabase (free tier now), EAS updates and builds, Apple $99 a year, domain | fixed per month | in `docs/road-to-launch.md` |

## Rules for keeping it honest

- A new prompt part says its tier: `global` (same for everyone, cached), `chat` (per friend), `turn`
  (changes every message). Put stable text high so it caches; per-turn text costs full price every time.
- A new output field the app does not read is a cost with no value: wire it or drop the instruction.
- A feature that makes the friend write first adds a call per event: write its count here.
- Measure with the server log after the deploy, never with paid test calls just to measure.
