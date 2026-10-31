# Voice provider check: Fish Audio vs ElevenLabs (2026-10-31)

Question from the owner: is Fish Audio as good as ElevenLabs and cheaper, does it fit our three plans, what do we gain.
Sources are public pages and reviews; the logged-in Fish pages (`/app/`, `/app/team/?tab=plans`) cannot be read by a tool. Quality claims are mostly vendor-made: nothing here replaces a listening test.

## Prices (list, 2026-10-31)

- Fish Audio API: TTS S2.1 Pro **$15 per 1M UTF-8 bytes**, pay as you go; ASR **$0.36/hour**; S2.1 Pro API is **free for developers until 2026-11-30**, no SLA. WebSocket streaming; LiveKit plugin exists (`livekit-agents[fishaudio]`, `latency_mode` balanced about 300 ms). Concurrency by lifetime spend: 5 under $100, 15 at $100, 50 at $1,000 (third-party; check the docs).
- ElevenLabs API: **$0.04 per 1k characters** (Flash/Turbo), **$0.08** (v3, v2 multilingual). Plans: Starter $6, Creator $22, Pro $99, Scale $299.
- Bytes, not characters: English is 1 byte a letter, Cyrillic 2, Thai/Japanese/Chinese/Korean 3. Fish's lead is biggest in English (about 65% under Flash, 80% under v3) and smallest in Russian (about 25% under Flash).

## Cost of a minute of a character speaking (assumed 150 words a minute)

| | per minute |
|---|---|
| Fish, English / Russian | about $0.011 / $0.024 |
| ElevenLabs Flash | about $0.031 |
| ElevenLabs v3 | about $0.062 |

A live call minute also needs speech-to-text ($0.006 at Fish), the language model (about $0.005) and LiveKit ($0.01 an agent minute): about $0.03 a call minute with Fish, about $0.037 with ElevenLabs Flash. `backend-plan.md` 13.2 assumed $0.015, which is too low for any provider.

## What the three plans cost at full use (Pro: 180 min call, 120 min voice, 5,000 replies)

Reply cost is the measured $0.0012 (the plan assumed $0.0006). Net = price minus 15% store fee.

| Provider | Pro $29.99 (net $25.49) margin | Pro yearly $20/mo (net $17.00) margin |
|---|---|---|
| Fish (mid) | about $12.3 | about $3.8 |
| ElevenLabs Flash | about $9.2 | about $0.7 |
| ElevenLabs v3 | about $2.6 | about -$5.9 |

Basic ($9.99, chat only, 2,000 replies): cost about $2.4, net $8.5, no voice at all. Free: only pre-recorded voice letters, a one-time batch, almost free.
Real users use a fraction of the allowance, so these are ceilings.

## Risks to settle before building

1. Languages: Fish says 80+; Italian, Turkish, Thai, Vietnamese confirmed, Indonesian only on a third-party card, Russian and Portuguese not confirmed, and Japanese/English/Chinese are its top tier. We ship 14 languages: test each one.
2. Quality: a review that used both calls ElevenLabs the most realistic in English and the gap "close". Fish's own "60% blind wins" is marketing. Decide by ear: the owner listens, earshot measures (loudness, clicks, latency).
3. Licence: free tier is personal and non-commercial; paid tiers allow commercial use. Read the current Terms before launch. Self-hosting the open weights needs a $10k/month commercial licence, so use the API.
4. Voices: only voices we make or license. No real-person clones, and Fish's public voice library holds celebrity clones: never use those (owner rule).
5. Conversation flow: Fish gives only the voice. Live calls still need LiveKit, a speech-to-text and the language model.

## Plan

1. Owner makes a Fish account and API key, sets `FISH_API_KEY` as a Windows user variable (never in chat or files). The key is free until 2026-11-30, so the test costs nothing.
2. Agent renders the same 6 lines in 5 languages (en, ru, tr, ja, th) with Fish and, if the owner agrees to the small cost, with ElevenLabs; earshot measures, owner picks by ear.
3. If Fish wins: add the voice adapter behind the existing provider interface (`backend-plan.md` section 4), then voice replies, then LiveKit calls.
