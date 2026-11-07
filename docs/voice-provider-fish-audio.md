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

## Fish Terms read (2026-10-31, `https://fish.audio/terms/`; not legal advice, the page we could read may be older than today's)

- Free plans: personal, non-commercial use only (the iOS section says the same). Paid plans are licensed for commercial use. So a launch needs a paid plan or the pay-as-you-go API; the owner's "8000 credits" are the free plan's monthly credits (about 7 minutes of speech), not a paid balance.
- Output ownership is not stated. AI companions are not mentioned. Fish "encourages" saying content is AI-made and forbids passing it off as human (we already say "AI character").
- No voice-cloning section. General rules only: no infringing anyone's rights, no impersonation, the user alone is responsible for what they submit and indemnifies Fish.
- Community voices: sharing one grants other users a licence "as permitted by the functionality of the Services"; whether that covers commercial use in an app is not clear, and using content you do not own needs the owner's consent. The public library holds game characters and announcers uploaded by strangers, so Fish's permission is not the rights holder's. Not used.
- Uploaded content "may be used to develop, train, or enhance" Fish's models and may not be fully deletable. For user voice cloning this must be said to the user in the consent step and in our privacy policy.
- Do before launch: write to Fish for written answers on (1) commercial use of outputs in a consumer app, (2) AI companion use, (3) opting uploads out of training, (4) retention and deletion of cloned voices.

## Update 2026-10-31 (evening): the owner's blind test says ElevenLabs

- Owner, after the 40-clip blind test (Fish vs ElevenLabs v3 / flash v2.5 / multilingual v2, 5 languages): ElevenLabs is clearly better. Cleaner, no background noise, "speaks like a person up close"; Fish had stumbles in delivery and style. Which ElevenLabs model they liked best is not known yet (the letters key is `scratchpad/fish/cmp/key.json`). An English reference clip also lost its native accent in ru/tr/ja, and Fish's tag voices were uneven.
- Decision direction: ElevenLabs is the voice for the paid product; Fish stays out unless a price squeeze needs it. The adapter stays so a provider can be swapped.
- Market (blogs, undated pages, treat as leads): independent arena snapshots in 2026 rank Cartesia Sonic 3.6 first (about $49 per 1M characters), Gemini 3.8 Flash TTS close behind at about $16, Eleven v3 12th at about $100. Gemini TTS is on our existing key (`gemini-3.8-flash-tts`); the free key ran out of TTS quota after 4 of 10 clips and the first try read our style instruction aloud (about 15 s for 95 characters; a short "Say warmly and softly:" fixed it to about 8 to 10 s), so it is untested. Worth a proper blind round with billing on, together with Cartesia.
- Who pays for voice: Kindroid, Nomi, Replika keep voice or calls behind paid plans or credits; Character.AI and Talkie give it free because they run their own voices. No source says which apps rent ElevenLabs.
- ElevenLabs policy (read 2026-10-31): bans visual depictions of explicit sexual acts, incest/bestiality/necrophilia erotica, non-consensual intimate content, impersonation of a living person without consent, cloning without consent, voice recordings of under-18s; apps for under-18s need written approval. Companion apps are not mentioned. Our app is 18+. Get written confirmation of the companion use case before launch.
- Startup grant (`elevenlabs.io/startup-grants`): 33,000,000 characters free for 12 months, full platform (TTS, Agents, STT, cloning), needs a business plan and a valid business email, fewer than 25 employees, not for under-18 products, one application, no reselling of characters; answer within a week; converts to Free at the end or at 10,000 credits left. Apply at `elevenlabs.io/grants-application` before paying anything.

### Margins with ElevenLabs list prices (Pro: 120 min voice, 180 min calls with the character talking half the time; 5,000 replies at $0.0012; speech 900 characters a minute, measured 870 to 966)

| | cost of a speech minute | Pro $29.99 (net $25.49) full use / 40% use | Pro yearly $20 (net $17.00) full use / 40% use |
|---|---|---|---|
| Flash $0.04 per 1k | $0.036 | +$8.2 / +$18.6 | -$0.3 / +$10.1 |
| v3 $0.08 per 1k | $0.072 | +$0.6 / +$15.5 | -$7.9 / +$7.0 |

- Extra minutes sold for shells (10 min call = 120 shells, 10 min voice = 100 shells, about $1.25 to $1.50): cost $0.39 and $0.36 on Flash, $0.57 and $0.72 on v3: still a margin.
- The 33M-character grant covers about 175 Pro user-months at full use, 437 at 40%: it carries the launch, then costs come back.
- Levers: Flash for calls and live voice, v3 only where the extra quality is audible (voice messages); pre-record the free tier's voice letters once (about 250k characters, about $20 on v3); cache repeated lines; lower the Pro yearly allowance or raise its price; cap minutes per day.
