---
trigger: always_on
---

# Sigmazam — Shared Project Memory (Claude 1, Claude 2, Gemini / Antigravity)

This file is loaded automatically in Antigravity (`always_on`) and imported via `CLAUDE.md` for Claude sessions.
- When the owner says "remember this" / "write to memory", update **this file** for standing rules/decisions, and update `HANDOFF.md` for session progress and `Still to do` items.
- Read `HANDOFF.md` top block before doing anything else.

## 1. Project & Stack (Overrides Unrelated Machine Globals)
- **Product**: Sigmazam (repo `BIMOBIMO`), AI companion app (mascot: sea otter, currency: shells). Target launch: **iOS App Store first**, Google Play second.
- **Stack**: React Native + Expo SDK 57 (`expo-router`), TypeScript, Zustand (`src/store/use-app-store.ts`), `expo-sqlite`, i18next (14 locales), Supabase cloud (`yhelqgpwputlayawwtne`), Node server (`server/`) on Fly.io (`sigmazam-api`).
- **Scope guard**: Ignore any machine-global rules written for unrelated projects (e.g. MuudAI / WatermelonDB). Follow `src/theme`, `docs/design-style.md`, and `docs/road-to-launch.md`.

## 2. Owner Role & Communication
- **Language & brevity**: Reply to the owner in **short, plain Uzbek** (a few lines, minimal token overhead). Everything in the repo (code, comments, commits, `HANDOFF.md`, `docs/*.md`) stays in English.
- **Act as Senior RN Dev & Co-Founder**: The owner does not read or write code and handed full technical/product ownership over (`docs/road-to-launch.md`). Own architecture and decisions yourself — never stop to hand back technical option lists. Ask the owner only for things only they can do (Fly deploy command, payments, accounts, legal, taste).
- **Plain-language reports**: Do not put file paths, function names, or code jargon in normal status replies to the owner (unless the owner asks about tooling/setup). State plainly: what changed for users, what to try on the phone, and the single next task. Technical details go into `HANDOFF.md` and commit messages.
- **Confirm intent in one line**: Before starting a large or loosely worded task, state in one sentence what you understood and proceed without waiting. Loose asks refer to the real user-facing product, never a test simulator.
- **Never drop side asks**: Every unfinished owner request in a session goes into the current `HANDOFF.md` block under `Still to do`.

## 3. UI, Design & Expo Live-Reload Workflow
- **Direct to code, no preview pictures**: Since 2026-10-30, skip HTML/canvas prototypes and UI preview screenshots unless the owner explicitly asks for one. Build working code following Apple HIG (`developer.apple.com/design`) and `docs/design-style.md` ("calm cards"), pass checks, commit, and push.
- **Visual rules**:
  - Minimal text UI: headings, numbers, and icons only — no helper subtitles on screens.
  - Photo cards keep a dark scrim + clear see-through glass buttons (never solid white buttons or opaque frosted capsules covering character art).
  - Motion: popups appear instantly; typing dots, voice waves, and existing animations stay untouched unless specifically requested.
  - Never redesign screens already approved by the owner (e.g. Heartbeat diary in `src/app/diary/`).
- **Expo Go & Metro (Port 8081)**:
  - Ensure Metro is running via `node scripts/ensure-expo.mjs`. Never start duplicate web servers or take headless web screenshots against shared Metro `8081` (it hangs Expo Go).
  - **Atomic edits**: The phone hot-reloads on every save; add definitions and usages in a single atomic edit so Metro never reloads a half-finished state.

## 4. AI, Content & Language Principles
- **Model-first**: With `realAi` on, every character line (chat, group, stream, moments, games, dates, diary, notes) comes from the model. Never silently substitute stock lines when the server/model is busy — show Not Delivered, pause the stream, or omit background texts. Stock lines exist only when the model is off.
- **Pre-launch blocker**: `settings.realAi` defaults off on a fresh install and its toggle is behind `SHOW_DEV` (`src/app/profile.tsx`); fix before any store build.
- **Global languages**: AI replies in whatever language the user writes (`src/ai/reply-language.ts`). Never add hardcoded language lists or regex detectors to production code. App logic stays English-first; check all 14 locales with `npm run check:locales` and `npm run check:content`.
- **18+ Content middle road**: Keep romance, flirting, dark fantasy, story conflict, and swearing open. Enforce strict lines only on minors, crisis help (helpline card, zero false alarms on fiction/jokes), real people/copyrighted franchises, full song lyrics/copyrighted text, explicit sex (fade to black), and illegal harm instructions.
- **Free LLM testing**: Until a paid API key arrives, use free keys (`GEMINI_KEY_NEW`, `OPENROUTER_API_KEY`, `JUDGE_GEMINI_KEY` in Windows User env) only for small targeted evals — never real user traffic. Full 90-scenario eval + final model tuning wait for the paid key (`docs/road-to-launch.md`).

## 5. Infrastructure, Devices & Launch Gates
- **Secrets**: Never write API keys or tokens in chat or files. Read Windows User env vars in PowerShell via `[Environment]::GetEnvironmentVariable('<NAME>', 'User')`.
- **Grant & Domain gate (before any release APK / store docs)**:
  - ElevenLabs won the voice blind test (`docs/voice-provider-fish-audio.md`). Applying for the ElevenLabs startup grant + `sigmazam.app` domain (`docs/elevenlabs-grant-application.md`) comes **before** any release build or store submission.
  - Owner paused domain purchase for ~1 week from 2026-10-31 (until ~2026-11-07): focus on chat, characters, and memory meanwhile; remind before any build step, not every message.
  - **Native module note (`0z80`)**: `expo-image-manipulator` was added in `0z80` (works in Expo Go, absent from the older preview APK). Do **not** push JS-only `eas update` to `preview` until a bumped APK is built.
- **Cloud API (`https://sigmazam-api.fly.dev`, Fly app `sigmazam-api`, Tokyo `nrt`)**:
  - Do not run `flyctl deploy` directly. Commit and push server changes, then give the owner:
    `! C:/Users/joray/.fly/bin/flyctl.exe deploy . --config server/fly.toml --dockerfile server/Dockerfile --ha=false --remote-only`
  - Probe deployment health with `/health` (`200`) or unauthenticated route checks (`401`), never paid model calls.
- **Supabase Cloud (`yhelqgpwputlayawwtne`, Tokyo `ap-northeast-1`)**:
  - Never run `supabase start` or local Docker stack (keep Docker Desktop installed, just stopped).
- **Phone (Galaxy A51 `R58N628VFGY`, package `com.sigmazam.app`)**:
  - Always use `C:\Users\joray\AppData\Local\Android\Sdk\platform-tools\adb.exe` — never the `scrcpy` `adb` on `PATH` (it drops the A51 connection).
- **EAS OTA (`sukuts-team`, `EXPO_TOKEN` User env)**:
  - When native modules match the installed preview APK, publish JS-only updates with `$env:CI='1'` and `npx eas-cli update --channel preview --environment preview --message "<summary>"`. Tell the owner to swipe close and reopen the app **twice**.
- **Art & Worlds (57 official characters = 40 + 15 new)**:
  - Worlds text and logic come first. Owner generates scene-rich art in Nano Banana from `docs/nano-banana-worlds.md` into `art-new/` (do not call Higgsfield API while its balance is empty).
- **Parallel Agents & Git (`local-work`)**:
  - `Claude 1`, `Claude 2`, and `Gemini` share `C:\Users\joray\BIMOBIMO` on branch `local-work`.
  - Run `git fetch origin` and `git pull --ff-only origin local-work` before starting and before pushing. Leave uncommitted files from the owner or other agents untouched.
  - Required checks before finishing code: `npx tsc --noEmit` and `npm test` (plus `server` tests / `check:locales` / `check:content` when touched).
