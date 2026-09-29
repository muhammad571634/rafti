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
```

## How the app behaves

These rules mirror the reference app (BIMOBIMO / BEEMO AI) and live in
`src/store/use-app-store.ts`.

| Rule | Where it shows |
| --- | --- |
| **Shells meter chat.** Sending a text, photo or voice note costs 1 shell. Listening, voice replies and calls are free. Members chat for free. Out of shells → paywall sheet (top up / free shells / membership). | Chat header badge, paywall sheet, store "What things cost" |
| **Daily login reward.** First open of the day credits 60+ shells on a 7-day check-in ladder (60, 60, 70, 70, 80, 80, 120); missing a day restarts it. | Daily check-in card on launch, Free Gifts |
| **Free Gifts.** One free Lucky Wheel spin a day (weighted odds, 100 is rare), plus 5 rewarded videos a day; extra spins use a video. | `/gifts` |
| **Characters reach out first.** Morning (05–12) and night (20–02) the two closest bonds send a greeting, and the closest bond with a voice rings you once per slot ("Good-morning / Good-night call"). Each is a toggle in Profile, and per character in Chat Settings. | Unread badges, `/call/incoming/[id]` |
| **Calls.** Incoming: accept / decline; unanswered rings become missed calls. Every call lands in Call History and as a line in the chat; minutes add intimacy. | `/call/[id]`, `/call/incoming/[id]` |
| **Streaks & levels.** Chatting on consecutive days grows the streak; interactions add intimacy; crossing a threshold opens the level-up card. | Chat header, level-up modal, Us |
| **Smart schedule.** "I have an exam tomorrow" becomes a plan; the character acknowledges it and reminds you on the day. | Us → Coming up, chat |
| **Moments ([Us]).** Becoming friends, level-ups, calls over a minute, diary replies, secret notes, dates and photos are recorded. | Us → Our moments |
| **Secret Note.** The character writes first ("Thinking..."), their note stays sealed until you write yours and Exchange (3 shells). | `/secret-note/[id]` |
| **Heartbeat Diary.** Pages can be shared with a friend; they write back, and the first line becomes a memory. | `/diary`, Character Memories |
| **Add Friend.** Find → profile → Add Friend opens a chat that starts with their greeting. Creating a character costs 60 shells (voice cloning) and needs a name, 3–5 voice clips ≤10 MB and a picture ≤2 MB. | `/find`, `/create-character` |

Everything above is persisted with zustand `persist` + AsyncStorage, so it survives restarts.
Work that was mid-flight when the app closed (a note being written, a diary reply) finishes
on the next launch.

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
| Economy | Shell Store + membership | `src/app/store/shell.tsx` |
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
| Purchases, membership | `buy()`, `subscribe()` | StoreKit / Play Billing + server receipt check |
| Rewarded videos | `watchAd()` | AdMob rewarded SDK |
| Seed data | `src/mock/*` | API client |

Move the shell, streak and intimacy rules to the server when it lands so the client
cannot mint currency.

## Before release

- **Name.** The app is Rafti (renamed from the reference's "BIMOBIMO", another company's
  trademark). Run a trademark search (WIPO / USPTO / EUIPO) before publishing.
- **Characters.** The seed cast is original: four worlds (Seaside Academy, Moonlit Realm,
  NEON TIDE, Tidepool Café). Never seed real people or franchise characters, and never clone
  a real actor's or idol's voice. User-created characters still need reporting and takedown.
