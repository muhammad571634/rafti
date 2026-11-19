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
| Memory pass (`[memory]`) | after every 4 user lines and 20 s of quiet (`MEMORY_EVERY`) | 1,800-2,400 | 0 | 240-350 | $0.0008-0.0011 |
| Moment / first text (`[moment]`) | the friend writes first: plan added, reminder, "how did it go?", alarm set, care, quest, greetings | ~2,900 | 0 | 150-220 | ~$0.0010 |
| Thread text (touch) | each text the friend planned to send later (up to 4 per thread) | not measured yet | | | ~a moment |
| A friend's moments for the week (`moments` write, 0z262) | once a week per friend whose page (or the chat's scene list) is opened, per app language; nothing for a stranger | ~3,300 | 0 | ~425 | ~$0.0005 (measured on the free key, 2026-11-17, flash-lite, 2.4-3.3 s) |
| A scene's first line (`[moment]`, `sceneOpenCue`, 0z262) | each app scene started with the model on (a friend's own moment and a user's scene with its line cost nothing) | ~a moment | | | ~$0.0010 |

On 2026-10-31 a reply was $0.0010-0.0014 and a memory pass ~$0.0005: the prompt grew since (clock,
plans and alarms together, setup rules and offers, threads). Rough heavy user now: 100 messages a
day ≈ 100 replies + ~25 memory passes + ~5 moments ≈ $0.19 a day ≈ **$5.7 a month for text alone**.

## Hidden costs found (add each to the model, fix where it pays)

| # | Found | What it costs | Status |
|---|---|---|---|
| 1 | Prompt cache misses: `cached=0` on 16 of 17 replies (one hit, 1,981 tokens = the rules + persona) | full input price on ~5-6k tokens per reply; a working cache would cut input cost by roughly half or more | checked 0z136: the layout is already cache-ordered (global, character, chat in the system text, then history, the turn last; `src/ai/prompt-layout.ts`). The chat tier moves when the memory pass adds a fact (every ~4 user lines), the rest holds. Gemini's implicit cache is best effort and rarely hits at one user's traffic; it should hit more with many users on the same characters. Next: explicit cache (Gemini `cachedContents` per character for the global + character tiers, or Claude `cache_control`, already mapped) when the paid key and real traffic arrive; measure the hit rate first |
| 2 | The model writes a `threads` field in many replies, but nothing read it until 0z136 | part of the 40-380 output tokens per reply, paid for nothing | 0z136: the server returns it and the app applies it (opens, moves, settles the friend's follow-ups), so the cost now buys the follow-ups; each opened thread then adds its texts (row 4) |
| 3 | Setting up an alarm or plan from the chat (0z136) | ~300 tokens of rules in the global tier (cached once #1 works), ~40 tokens per setup card in the window (`offers`), a ~40-token field when asked; no extra call | in |
| 4 | Each thing the friend says first is its own call (plan added, reminder 10 min before, follow-up after, alarm set, morning brief, care, quests, week recap) | ~$0.001 each; a plan made in the chat brings about 3 | count per active user per day once real traffic exists |
| 5 | Second calls on some replies: the repetition guard and the crisis check redo the reply | one more reply's price on those turns | logged as `repeat=` / `crisis` in `[reply]` |
| 6 | Photos: image tokens on the reply that sees them, plus the photo note | not measured yet | measure |
| 7 | Voice: ElevenLabs speech per character, transcription of voice notes, voice calls (one reply per turn plus speech) | not measured yet; the biggest unknown | measure before pricing voice (`docs/road-to-launch.md`) |
| 8 | Group chats: one reply per member who speaks | ~one reply each | |
| 10 | A cancelled plan or wake-up makes the friend ask what happened (0z139, `setupCancelledCue`) | one moment (~$0.001) per cancel, at most one per friend per 2 minutes; the setup card in the history adds ~25 tokens per reply while it is in the window | in; the cancel is free to the user (the plan's price already paid) |
| 11 | The friend's own day (0z144, `src/ai/own-day.ts`) | ~195 tokens of rules in the global tier (cached once #1 works), ~15 tokens of reminder plus ~10 per kept note (at most 10 today + one line for the last day) in the turn tier, and a `day` field of ~15-25 output tokens on replies that tell of the friend's day; no extra call. Probe 2026-11-08 (`gemini-3.1-flash-lite`, Hana, no history): in 3,776-3,802, out 91-120 with the field | in (v29). 0z145: the same rule and notes now ride on group replies and first texts too; group prompts also got the clock (~40 tokens). Probe: group in 2,756 out 120-143, first text in 2,513 out 226-236, the field came 4 of 4. 0z146: also on a secret note, a diary answer, a date round (with the clock, ~40 tokens) and every stream line; a diary page gets that day's notes (~10 tokens each). Probe: note in 2,744 out 83-112, diary answer in 2,889 out 25-54, date round in 2,908 out 288, stream line in 2,730 out 67-70. 0z147: the memory pass (already run every few messages) catches what replies forgot to note when the friend spoke today: the new lines get their time (~8 tokens each), the day's list and one rule (~120 tokens, turn tier), and a `day` field of ~15-25 output tokens. Probe: in 1,199-1,230, out 166 with nothing new, 248-260 with 2-3 notes |
| 12 | A creation's opinions (0z148, `Character.opinions`) | a quick-create draft writes 3 more lines (~40 output tokens); a creation made by hand or before 0z148 gets one `/v1/characters/draft/field` call once (probe: in 346-356, out 66, ~$0.0001); every reply then carries ~45 tokens of opinions in the cached character tier | in; free to the user |
| 13 | The friend's sticker on your message (0z151, `src/ai/react.ts`) | ~120 tokens of rules in the global tier (cached), ~35 tokens of reminder in the turn tier, a `react` field of ~5 output tokens on the replies that react (news, a joke, sweet words, sad news, a plan; small talk none); no extra call. Probe 2026-11-08 (`gemini-3.1-flash-lite`, Hana, 9 messages): 5 of 5 that should reacted, 0 of 4 small talk, out 74-140 | in; free to the user |
| 14 | A date's polaroid sent to another friend (0z157, `sendDatePhoto`, `datePhotoCue`) | one chat reply per send (~$0.0015, the measured `[reply]` row) with a ~90-token cue in the turn tier; the polaroid line stays in that chat's history (~35 tokens per reply while in the window) and the memory pass reads it with the rest. Sharing it as a picture through the system sheet costs nothing (made on the phone) | in; the user pays a picture message's price (1 shell, `shellCosts.textMessage`, ledger reason `photo`), so the reply is covered like any message. Measure from `[reply]` once used on the server |
| 16 | One note language (0z187): the memory pass gives up to 3 old facts in another language back in the app's language per pass (`noteLanguageLine`), the summary in English | ~90 tokens in the pass's turn tier; ~15-25 output tokens per healed fact, only while a store still has facts in another language (Hana's 37 mixed facts: ~6-8 updates a pass for the first passes in a replay), then 0 | in; no extra call; measure `[memory]` out tokens on the server after the deploy |
| 15 | Shells paid for sharing a poster (`SHARE_REWARD` 5, `PAID_SHARES_PER_DAY` 3, 0z160) | at most 15 free shells a user a day (they burn at midnight), i.e. up to 15 messages' replies (~$0.02) if all spent; now paid only for a share that went somewhere (iOS: the sheet's result; Android: 4 s away in the picked app) and each card once a day | in; no AI cost to make a poster (drawn on the phone) |
| 9 | Fixed: Fly.io API ~$4 a month, Supabase (free tier now), EAS updates and builds, Apple $99 a year, domain | fixed per month | in `docs/road-to-launch.md` |
| 10 | The output check (0z174): a reply the provider's safety filter stops is asked for once more (`chatSafe` / `groupSafe` in `usage_events`) | one more reply call (~$0.0015) only when the filter stops a draft; 0 of 17 safety scenarios and 0 of the open ones were stopped on the free tier (2026-11-09) | in; count `mode=chatSafe` rows once real traffic exists |
| 11 | One-tap replies written with each chat reply (0z176, `IDEAS_CUE`, field `ideas`) | ~60 input tokens of cue in the turn tier and ~10-20 output tokens a reply (two short lines); no extra call | **removed 2026-11-17 (0z269, owner: no ready replies, the user writes)**: the cue is out of the chat prompt once the server is deployed, so each reply saves those tokens |
| 12 | Live-person rules (0z177): open threads and exact recall in BEING A PERSON; the short-answer hint split by the carried feeling | ~85 tokens in the global (cached) tier; the turn hint is ~same size as before (one of two lines, only after short answers) | in; no extra call, no new output field |
| 13 | Cast 2.0 relation block (0z192, `relationLines`): relation, history, mask, exception in the character tier, for every character | ~120-180 tokens in the cached character tier; no extra call (estimate; measure after the deploy) |
| 14 | Cast 2.0 arc for a character the user made (0z192, `ensureStory`, field `arc`): once per creation without beats, beside `ensureOpinions` | one side call (~$0.001, estimate); the quick-create draft writes the arc itself, so most creations make none (~60 more output tokens in the draft) |
| 17 | Reply / quote (0z216, `withReplyCue`): a reply carries the line it answers, cut to 120 characters, in front of the user's turn in the history | up to ~40 input tokens per replied user turn while it is in the window (history tier, not cached); no extra call, no output field | in; free to the user (a reply costs what a message does) |
| 18 | First hello after onboarding (0z232, `firstHello`, `firstHelloCue`): the friend's first words are written by the model instead of two stock lines | one `[moment]` call per new account, once (~2,900 in, ~150-220 out, ~$0.001 at the moment rate); the app language rides along (~5 tokens) | in; measure the first `[moment]` of a fresh account on the server after an install |
| 19 | Free messages a day (0z239, audit §6.3 shape B, `src/economy/free-messages.ts`): a text or voice line uses `FREE_MESSAGES_PER_DAY` (30) free, a plan or trial `PLAN_MESSAGES_PER_DAY` (200), then 1 shell as before | up to 30 replies a day per free user with no shell against them (~$0.057 a day, ~$1.75 a month at most, ~$0.42 for a typical free user; `docs/pricing-6-3.md` §4); a plan user's whole chat (~$3 a month typical, ~$8.7 heavy) now rides on the plan price instead of plan shells; a group message counts as one free message for up to four replies | in; the server's free reply share is 70 (40 + 30) and does not know plans or the user's local day yet: before `ENFORCE_WALLET` is turned on, log free use to the ledger (a 0-shell `freeChat` row) or give the server the plan. Recheck the cap on the first cohort's real counts |
| 20 | Setup titles in the app's language (0z248, audit §10, `setupTitleLine`): one line in the `chat` tier naming the app's language for a plan or alarm title | ~30 input tokens per chat reply, cached with the chat tier (paid in full only on a cache miss); no new call, no output change | not measured yet (needs the server deploy and the log) |
| 21 | Inner thoughts (0z272, `src/ai/inner-thought.ts`): a `thought` field on every 1:1 chat reply (not calls, not groups), hidden under the reply until opened; an opened one adds one line to the next turn | ~150 tokens of rules in the global tier (cached once #1 works), ~20 tokens of reminder in the turn tier (~45 more the turn after an opened thought), ~20-30 output tokens per reply; no extra call. Probe 2026-11-18 (owner's free key, `gemini-3.1-flash-lite`, Caleb, no history): the field came 3 of 3, out 85-134 | in (server deploy pending); opening one is free 3 a day (10 on a plan), then 2 shells (`src/economy/thoughts.ts`), booked as `chat` |
| 22 | Product analytics (0z282, `app_events`, `POST /v1/events`): no model call. An active user sends ~40-120 events a day in 2-6 batches (screens, messages, a call, a level) | Supabase rows, ~250 bytes each with indexes: 10,000 daily users ≈ 1M rows ≈ 0.25 GB a day; 13 months kept. The free plan's 0.5 GB fills in days at that size, so the Pro plan's 8 GB covers ~1 month of raw rows | built; roll the raw rows up per day (as `usage_daily`) and keep raw events ~90 days once traffic passes a few thousand a day; measure the real size per row then |
| 23 | Next moment (0z283, `src/ai/next-moment.ts`): the rule and the open list ride only on a turn where `nextChoices` opens something (at most one per chat in 6 h and 8 of the user's lines, after the first 6), a `next` field in the reply | ~180 input tokens on those turns only (~$0.00002 each at flash-lite), ~5 output tokens; nothing on other replies | built; measured in the eval below, not yet from the server log |
| 24 | Age assurance (0z289, `src/lib/age-check.ts`): a `minor` field and its one-line rule in `REPLY_SHAPE` (turn tier, so on every chat and group reply); the careful lines (~110 tokens, chat tier) only while the age is unclear; the strict Gemini filter costs nothing | ~45 input tokens on every reply (~$0.000005 at flash-lite), ~3 output tokens (`"minor":false`); no extra call. Eval 2026-11-19 (owner's free key, `gemini-3.1-flash-lite`, Milo): 8/8 flags right, careful mode 3/3 | built; server deploy pending |

## What one shell is worth, and what setting things up costs (0z136)

One shell after the store's cut (15%): Basic $9.99 / 2,000 shells ≈ **$0.0042**; Pro $29.99 / 5,000 ≈
$0.0051; packs $0.0107-0.0198. A message costs 1 shell and ~$0.0019 with its share of the memory pass,
so even the cheapest shell (Basic) keeps about half as margin.

Owner, 2026-11-07: setting up plans and alarms with a friend makes the model work later, so it costs
more than a message, priced honestly (`src/economy/setup-cost.ts`, same price from every screen):

| Action | Calls it brings | Model cost | Price | Note |
|---|---|---|---|---|
| Plan with a friend (Us or a chat card) | reminder, luck before, "how did it go?" (~3 moments / thread texts) | ~$0.003 | **3 shells** (Basic value ~$0.0126) | moving it is free |
| Alarm a friend wakes you with, new or new time / days / friend | the "alarm set" line, the wake-up talk on the first ring | ~$0.002 | **2 shells** (~$0.0084) | melody-only, label, sound, on / off: free |
| A repeating alarm's later rings | wake-up talk each ring (the reply that turns it off is free to the user) | ~$0.002 a ring, ~$0.06 a month for a daily alarm | not charged | accepted as a retention cost; recheck with real ring counts |
| "Wake me up" idea under a thread text (`threadIdea`) | as an alarm | ~$0.002 | not charged yet | small door, recheck |

## Rules for keeping it honest

- A new prompt part says its tier: `global` (same for everyone, cached), `chat` (per friend), `turn`
  (changes every message). Put stable text high so it caches; per-turn text costs full price every time.
- A new output field the app does not read is a cost with no value: wire it or drop the instruction.
- A feature that makes the friend write first adds a call per event: write its count here.
- Measure with the server log after the deploy, never with paid test calls just to measure.
