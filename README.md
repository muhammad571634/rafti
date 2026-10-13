# Rafti

AI companion app hosted by Rafti the sea otter — chat, voice calls, a shared diary and a relationship that levels up.
Cross-platform (iOS + Android + web preview) with **Expo SDK 57 / React Native 0.86 / expo-router**.

The UI, the product logic and the economy are real and persisted on the device; the
"AI" is a mock. The seams where the backend plugs in are listed at the bottom.

## Run

```bash
npm install
npm start
```

Then press `a` (Android), `i` (iOS, macOS only), `w` (web) or scan the QR with Expo Go.

```bash
npm run typecheck   # tsc --noEmit
npm test            # node:test unit tests (plans, memory limit, early access, ...)
```

## How the app behaves

The structure starts from the reference app (BIMOBIMO); the rules are Rafti's own and live in
`src/store/use-app-store.ts` and `src/economy/` (plans, memory limit, early access). The full
economy is in `docs/backend-plan.md` §13–§15 and `docs/business-plan.md` §4–§5.

| Rule | Where it shows |
| --- | --- |
| **Every message costs a shell, for everyone.** A text, photo or voice note costs 1 shell, plan members included (no unlimited chat). Out of shells → a sheet with three equal ways on: an ad or the spin, a shell pack, a plan. The typed message is kept. | Chat header badge, paywall sheet, Store → "What things cost" |
| **Free shells burn at midnight.** The 7-day check-in credits 30, 30, 35, 35, 40, 40 and a day-7 surprise of 50–100, quietly on the first open; missing a day restarts it. Free shells are spent first and expire at 00:00. The one-time welcome gift (100), bought shells and plan shells never expire. | Store → History, Free Gifts |
| **Plans.** Basic $9.99/month: 2,000 shells a month, chat only. Pro $29.99/month or Pro yearly $239.99: 5,000 shells a month, 3 h of calls, 2 h of voice replies, 30 Photo Booth pictures, Bedtime and new characters 7 days early. Plan shells arrive every 30 days and never burn. Pro yearly has a 3-day free trial (10 min calls, 10 min voice, 3 pictures, no plan shells), once per account. | Store → Plans, Profile → My plan |
| **Pro-only features.** Calls, voice replies, Photo Booth pictures, Bedtime whispers and adding a new character in its first 7 days. Free and Basic users see a lock and the Pro sheet (calls and Bedtime play a short voice sample first). Pictures are never sold for shells. Pro can buy extra minutes with shells: 10 min of calls 120, 10 min of voice 100, valid 90 days. | Chat call button, `/call/[id]`, `/photo-booth`, `/bedtime`, Find "New" row |
| **Memory.** Free users keep 20 open memories per character (pinned first, then the newest); the rest are saved but locked until any plan or the trial. Memory quality is the same on every plan. Memories can be added, pinned, edited and deleted; plans are remembered with the real date. | Character → Memories |
| **Free Gifts.** One free Lucky Wheel spin a day, up to 5 rewarded videos a day, +50 for an invite code (6 a week), +6 once a day for sharing a call, board note or invite. | `/gifts` |
| **Characters reach out first.** Morning and night the closest bonds send a greeting. Pro and the trial get a daily call from the chosen friend; free users get a voice note from the free voice lines instead. Toggles in Profile and per character. | Unread badges, `/call/incoming/[id]` |
| **Safety.** Birth year (18+) is asked first and no screen opens before onboarding, deep links included. Every chat shows "AI character, not a real person" at the start and every 3 hours. A crisis message gets a helpline card; crisis text never becomes a memory, a plan or a push. | Onboarding, chat system lines |
| **Streaks & levels.** Chatting on consecutive days grows the streak; interactions add closeness (levels 0–100 in 5 stages); crossing a level opens the level-up card. | Chat header, level-up card, Us |
| **Smart schedule.** "I have an exam tomorrow at 17:00" becomes a plan; the character acknowledges it, reminds you before it (10 minutes before a timed plan, 08:00 otherwise) and asks how it went. | Us → calendar, chat |
| **Moments ([Us]).** Becoming friends, level-ups, calls over a minute, diary replies, secret notes, dates and photos are recorded. | Us → moments |
| **Secret Note.** The character writes first; their note stays sealed until you write yours and exchange (3 shells). | `/secret-note/[id]` |
| **Heartbeat Diary.** The character writes a page the morning after a chat or a date; your pages can be shared with a friend, who writes back. | `/diary` |
| **Add Friend.** Find → profile → Add Friend opens a chat that starts with their greeting. Creating a character is free with a stock voice; a cloned voice costs 60 shells. Creations are private until moderation exists. | `/find`, `/create-character` |

Everything above is persisted with zustand `persist` + AsyncStorage, so it survives restarts.
The save keeps the newest 300 messages per chat (4,000 overall) and the newest 3,000 history
lines, to stay under Android's ~2 MB limit for one key. Work that was mid-flight when the app
closed (a note being written, a diary reply) finishes on the next launch.

## Screens

| Area | Screen | File |
| --- | --- | --- |
| Tabs | Home launcher | `src/app/(tabs)/index.tsx` |
| | Conversation list | `src/app/(tabs)/chat.tsx` |
| | Us: bond, plans, moments | `src/app/(tabs)/us.tsx` |
| | Find / Add Friend | `src/app/(tabs)/find.tsx` |
| Chat | Chat room, voice notes, photos, read receipts, typing | `src/app/chat/[id].tsx` |
| Voice | In-call screen | `src/app/call/[id].tsx` |
| | Incoming call | `src/app/call/incoming/[id].tsx` |
| Character | Profile + Add Friend | `src/app/character/[id]/index.tsx` |
| | Settings grid (nickname, chat settings, clear, reset) | `src/app/character/[id]/settings.tsx` |
| | Search History | `src/app/character/[id]/search.tsx` |
| | Memories / Background | `src/app/character/[id]/memories.tsx`, `background.tsx` |
| | Create character | `src/app/create-character.tsx` |
| Diary | Card deck (swipe to flip) | `src/app/diary/index.tsx` |
| | Writer | `src/app/diary/write.tsx` |
| Notes | Secret Note exchange | `src/app/secret-note/[id].tsx` |
| Economy | Store: Plans / Shells | `src/app/store/shell.tsx` |
| | My plan (minutes left, top-ups) | `src/app/my-plan.tsx` |
| | History (shells, call time) | `src/app/store/ledger.tsx` |
| | Free Gifts (check-in, Lucky Wheel, videos) | `src/app/gifts.tsx` |
| Modules | Dating, Photo Booth, Radio, Bedtime, Bulletin Board, Call History, Contacts, Profile | `src/app/*.tsx` |

## Structure

```
src/
  app/            expo-router routes (file = screen)
  components/
    ui/           primitives (Txt, Card, Button, Avatar, Sheet, Anim, Mascot, Icon3D…)
    chat/         bubbles, input bar, voice recorder, typing row, level-up card
    *.tsx         cross-screen pieces: paywall, daily reward, lucky wheel
  hooks/          use-character-initiative (greetings, reminders, calls on app open)
  store/          zustand app state, persistence and the mock AI
  lib/            formatting, plan detection
  mock/           seed data, prices, rewards
  theme/          colors, typography (Fredoka), spacing tokens
  i18n/           i18next + locales/en.json
assets/
  avatars/        seed portraits + registry
  brand/          Rafti art (tiles, scenes, sticker) + registry
  icons/          3D icons + registry
  lottie/         animations + registry (see its README)
```

## Assets and licences

| What | Source | Licence |
| --- | --- | --- |
| 3D icons (`assets/icons`) | Microsoft Fluent Emoji (except `shell.png`, cut from Rafti art) | MIT |
| Rafti art: Home tiles, banner, scenes, sticker, app icon (`assets/brand`) | Generated in Gemini from the Rafti reference, processed by `scripts/build-brand-art.py` | Project |
| Seed cast and portraits (`src/mock/characters.ts`, `assets/avatars`) | Original characters; 2D portraits generated in Gemini (monograms until then) | Project |
| Lottie animations (`assets/lottie`) | LottieFiles free animations, `xvrh/lottie-flutter`, `react-useanimations` | Lottie Simple License / MIT — see `assets/lottie/README.md` |
| Display font | Fredoka via `@expo-google-fonts/fredoka` | SIL OFL 1.1 |
| Chat wallpaper shells and paws, wheel | Original SVG in `src/components` | Project |

## Where the backend plugs in

| What | Where | Replace with |
| --- | --- | --- |
| Model replies (read → typing → voice + text) | `scheduleReply()` in `src/store/use-app-store.ts` | Streaming LLM over WebSocket, TTS for the voice note |
| Plan extraction | `detectPlan()` in `src/lib/schedule.ts` | Structured output from the same model |
| Diary / Secret Note replies | `diaryReplyFor()`, `noteReplyFor()` in the store | Same model, different prompt |
| Greetings and wake-up calls | `runDailyInitiative()` in the store | Server-scheduled push notifications + VoIP push |
| Call audio and subtitles | `src/app/call/[id].tsx` | Realtime STT → LLM → TTS |
| Voice notes | `VoiceSheet`, `VoiceBubble` | `expo-audio` recording / playback + upload |
| Voice cloning | `create()` in `src/app/create-character.tsx` | Clone job (ElevenLabs / MiniMax / Fish Audio) |
| Purchases, plans, trial | `buy()`, `subscribe()`, `src/economy/plans.ts` | RevenueCat (StoreKit / Play Billing) + server receipt check |
| Rewarded videos | `watchAd()` | AdMob rewarded SDK |
| Chat context for the model | `buildStoryContinuityContext()` in `src/lib/story-continuity.ts` (not wired yet) | Server prompt builder; pass only open memories for free users |
| Seed data | `src/mock/*` | API client |

Move the shell, plan, quota, streak and intimacy rules to the server when it lands so the client
cannot mint currency or open Pro features.

## Before release

- **Name.** The app is Rafti (renamed from the reference's "BIMOBIMO", another company's
  trademark). Run a trademark search (WIPO / USPTO / EUIPO) before publishing.
- **Characters.** The seed cast is original: four worlds (Seaside Academy, Moonlit Realm,
  NEON TIDE, Tidepool Café). Never seed real people or franchise characters, and never clone
  a real actor's or idol's voice. User-created characters still need reporting and takedown.
