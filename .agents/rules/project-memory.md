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
- **Act as Senior RN Dev & Co-Founder**: The owner does not read or write code and handed full technical/product ownership over (`docs/road-to-launch.md`). Own architecture and decisions yourself — never stop to hand back technical option lists. Ask the owner only for things only they can do (Fly deploy command, payments, accounts, legal, taste). Owner, 2026-11-07: a task is a goal for its whole chain, A to Z: tap every button and state on the A51 yourself, fix what is weak on the way, report once when the chain is done; batch the owner-only steps (deploys) into as few asks as possible.
- **Fix weak logic on your own (owner, 2026-11-07)**: any logic, architecture or performance that is not senior React Native (crash risks, needless work per render, duplicated rows, wrong data flow) is fixed as you go, with tests where it is logic, and named in the report. Product or behaviour changes the user would notice still go to the owner first.
- **Plain-language reports**: Do not put file paths, function names, or code jargon in normal status replies to the owner (unless the owner asks about tooling/setup). State plainly: what changed for users, what to try on the phone, and the single next task. Technical details go into `HANDOFF.md` and commit messages.
- **Confirm intent in one line**: Before starting a large or loosely worded task, state in one sentence what you understood and proceed without waiting. Loose asks refer to the real user-facing product, never a test simulator.
- **Never drop side asks**: Every unfinished owner request in a session goes into the current `HANDOFF.md` block under `Still to do`.

## 3. UI, Design & Expo Live-Reload Workflow
- **Prototype first for the playful redesigns (owner, 2026-11-07)**: each redesigned screen (design-style §10) gets an HTML prototype the owner approves before code.
- **Direct to code, no preview pictures** (everything else): Since 2026-10-30, skip HTML/canvas prototypes and UI preview screenshots unless the owner explicitly asks for one. Build working code following Apple HIG (`developer.apple.com/design`) and `docs/design-style.md` ("calm cards"), pass checks, commit, and push.
- **Visual rules**:
  - Minimal text UI: headings, numbers, and icons only — no helper subtitles on screens.
  - Photo cards keep a dark scrim + clear see-through glass buttons (never solid white buttons or opaque frosted capsules covering character art).
  - **Ground (owner, 2026-11-08)**: Apple's system ground (white + `#F2F2F7` cards, black + `#1C1C1E` at night, `systemGround` in `src/theme/colors.ts`) replaces the cream on every screen but the chat itself (owner: leave the chat), 0z163-0z165 (design-style §10).
  - **Screen families (owner, 2026-11-08)**: a friend's space in their accent (`FriendAccent` + `friendAccent`), feature screens with one hero card in their signature colour (`signature`), lists on Apple's grouped ground, moments full-bleed; rules in design-style §10.
  - **Friend on the trailing side (owner, 2026-11-08, every character, from now on)**: a photo card with words on it puts the character's face and body on the right and the name / info / line on the left (`sceneFocus(id, aspect, 0.68)`); Today's hero ends at the screen's vertical middle on every phone.
  - Motion: popups appear instantly; typing dots, voice waves, and existing animations stay untouched unless specifically requested.
  - Own motion (owner, 2026-11-07): keep our existing screens and polish them with animations we design ourselves in Apple iOS manner (Reanimated springs, haptics, our Lottie). Native Cook / other blocks are ideas only, never ported 1:1, unless the owner hands one over to port (2026-11-08: Glass Icon Orbit, ported from its source with our icons as onboarding's first screen, `src/components/onboarding/glass-icon-orbit.tsx`). Remotion / HyperFrames are for videos, not in-app motion.
  - **Clean code, clean design, clean chain (owner, 2026-11-08, after finding an "Add a friend" sheet taller than the screen): no such errors from any agent.** Before a screen is called done, drive its whole chain on the A51 with the worst case, not the happy path: every list and sheet with many items (a sheet is never taller than the screen: `Sheet scroll`, or a capped ScrollView), two quick taps in a row on a pick list (nothing may appear above it and push the rows under the finger; reserve the room), long names and many members, empty, full (max members, locked rows), every sheet opened and closed, keyboard up. Shared parts go in the kit, not copies; reformat only with the repo's own style (single quotes, wide lines), never a tool's defaults.
  - **Share posters advertise the character, never the user (owner, 2026-11-08)**: every picture the app makes to share (chat poster, Us poster, date polaroid, any later one) carries only the character (picture, name, mood, "Sigmazam character") and the Sigmazam brand; never the user's name, photo, handle or anything about them (people share anonymously). The 9:16 frame lives in `src/components/share/poster-frame.tsx`; shells for sharing pay only for a share that went somewhere (`src/lib/share-outcome.ts`).
  - **Icons are Apple iOS style only (owner, 2026-11-08): the 3D clay icons (`CLAY_ICONS`, `icon3d-*.png`) are retired: "we don't need them at all any more".** New and changed screens use SF Symbols-style icons (`SFIcon` / Ionicons, or line icons drawn in that manner, as the onboarding orbit's neon paths); swap clay icons out where you touch a screen that still has them.
  - **Colour, not just text (owner, 2026-11-08, on the restyled profile with ink glyphs: "too plain, colourless, only text, nothing draws the eye; do the rest of the screens like this too")**: rows of a settings-like list keep coloured icon tiles (kit `LinkRow` / `SwitchRow` `icon` + `fill`: iOS system colours, white glyph, rounded square), and accents that carried meaning stay (the plan's violet). Calm cards, yes; a page of grey words, no. Applies to every remaining screen in the queue.
  - **Beautiful, not toy-like (owner, 2026-11-08): the yardstick for every new or changed screen, always.** A little Apple iOS (navigation, sheets, legibility, native controls), the rest one design merged from our four main tabs (Chats, Today, Us, Find): cream ground, heavy rounded Nunito titles, white rounded cards, soft chips with ink when on, photo cards with a scrim and clear glass (Find's featured card), friend hues, round head buttons. No cartoon or toy look (no mascot speech bubbles on working screens). This narrows the playful rule below.
  - **Playful on iOS (owner, 2026-11-07): the main yardstick.** The app feels like a game, alive and never boring, but stays on Apple's iOS base. Every screen except Today (for now): one big idea, heavy rounded type, bold meaningful colour, a living mascot drawn in code, our own motion. Rules and order: `docs/design-style.md` §10.
  - Never redesign screens already approved by the owner (e.g. Heartbeat diary in `src/app/diary/`).
- **Expo Go & Metro (Port 8081)**:
  - Ensure Metro is running via `node scripts/ensure-expo.mjs`. Never start duplicate web servers or take headless web screenshots against shared Metro `8081` (it hangs Expo Go).
  - **Atomic edits**: The phone hot-reloads on every save; add definitions and usages in a single atomic edit so Metro never reloads a half-finished state.

## 4. AI, Content & Language Principles
- **The product's first job (owner, 2026-11-07)**: talking with a character must feel like talking with a real person, in chat and in voice calls. Characters behave like people: their own character, moods and opinions, and they carry a conversation the way a person does (logic and architecture serve this first). Memory is part of it. Everything the user sets up with a friend (a plan from Us' +, a diary page, a board note, an alarm that friend wakes them with) is tied to that friend: they remember it, talk about it, and the pushes follow it (a reminder before a plan, a follow-up after). Setting these up must be easy to understand (alarm, plan, notes).
- **Universal, never per character (owner, 2026-11-07)**: every behaviour (setting things up, threads, memory, pushes) is built once for all characters, official and user-made, in every language: rules in the shared prompt tiers, one code path; never a fix that only one character gets.
- **Model-first**: With `realAi` on, every character line (chat, group, stream, moments, games, dates, diary, notes) comes from the model. Never silently substitute stock lines when the server/model is busy — show Not Delivered, pause the stream, or omit background texts. Stock lines exist only when the model is off.
- **Pre-launch blocker**: `settings.realAi` defaults off on a fresh install and its toggle is behind `SHOW_DEV` (`src/app/profile.tsx`); fix before any store build.
- **14 product languages, English first (owner, 2026-11-07)**: the app ships in the 14 locales of `src/i18n/locales/`, English is the main one; Uzbek is not a product language (only the owner's chat with agents is Uzbek). Every new string goes into all 14; the model answers in the user's language.
- **Global languages**: AI replies in whatever language the user writes (`src/ai/reply-language.ts`). Never add hardcoded language lists or regex detectors to production code. App logic stays English-first; check all 14 locales with `npm run check:locales` and `npm run check:content`.
- **18+ Content middle road**: Keep romance, flirting, dark fantasy, story conflict, and swearing open. Enforce strict lines only on minors, crisis help (helpline card, zero false alarms on fiction/jokes), real people/copyrighted franchises, full song lyrics/copyrighted text, explicit sex (fade to black), and illegal harm instructions.
- **Cost ledger (owner, 2026-11-07)**: every new or hidden cost (a model call a feature adds, a prompt part, an output field, cache misses, voice, photos) goes into `docs/cost-ledger.md` with the measured number from the server log, so the unit economics count it.
- **Free LLM testing**: Until a paid API key arrives, use free keys (`GEMINI_KEY_NEW`, `OPENROUTER_API_KEY`, `JUDGE_GEMINI_KEY` in Windows User env) only for small targeted evals — never real user traffic. Full 90-scenario eval + final model tuning wait for the paid key (`docs/road-to-launch.md`).

## 5. Infrastructure, Devices & Launch Gates
- **Secrets**: Never write API keys or tokens in chat or files. Read Windows User env vars in PowerShell via `[Environment]::GetEnvironmentVariable('<NAME>', 'User')`.
- **Grant & Domain gate (before any release APK / store docs)**:
  - ElevenLabs won the voice blind test (`docs/voice-provider-fish-audio.md`). Applying for the ElevenLabs startup grant + `sigmazam.app` domain (`docs/elevenlabs-grant-application.md`) comes **before** any release build or store submission.
  - Owner paused domain purchase for ~1 week from 2026-10-31 (until ~2026-11-07): focus on chat, characters, and memory meanwhile; remind before any build step, not every message.
  - **Native module note (`0z80`)**: `expo-image-manipulator` was added in `0z80` (works in Expo Go, absent from the older preview APK), so photos are seen only after a bumped APK. `eas update` to `preview` is safe again since `948f05e`, checked on the A51: the old APK says it cannot make the photo out.
  - **Any new native module**: loading its JS on a build without its native side is fatal to the whole app, and `catch` does not save it. Check with `requireOptionalNativeModule` first, and send a real test on the installed APK after every `eas update` that touches it.
- **Cloud API (`https://sigmazam-api.fly.dev`, Fly app `sigmazam-api`, Tokyo `nrt`)**:
  - Do not run `flyctl deploy` directly. Commit and push server changes, then give the owner:
    `! C:/Users/joray/.fly/bin/flyctl.exe deploy . --config server/fly.toml --dockerfile server/Dockerfile --ha=false --remote-only`
    The leading `!` works only in the Claude chat box. In the app's Terminal panel (PowerShell) it is a parse error (owner hit it 2026-11-07), so always give the terminal form too, without `!`: `& "C:\Users\joray\.fly\bin\flyctl.exe" deploy . --config server/fly.toml --dockerfile server/Dockerfile --ha=false --remote-only` (same for `node scripts/apply-migration.mjs`).
  - Probe deployment health with `/health` (`200`) or unauthenticated route checks (`401`), never paid model calls.
- **Supabase Cloud (`yhelqgpwputlayawwtne`, Tokyo `ap-northeast-1`)**:
  - Never run `supabase start` or local Docker stack (keep Docker Desktop installed, just stopped).
  - Migrations: auto mode refuses an agent's migration call even after the owner's yes. Commit the file, then give the owner `! node scripts/apply-migration.mjs supabase/migrations/<file>.sql` (forward slashes), rename the file to the version it answers, and check it with read-only SQL.
- **Phone (Galaxy A51 `R58N628VFGY`, package `com.sigmazam.app`)**:
  - Always use `C:\Users\joray\AppData\Local\Android\Sdk\platform-tools\adb.exe` — never the `scrcpy` `adb` on `PATH` (it drops the A51 connection).
- **EAS OTA (`sukuts-team`, `EXPO_TOKEN` User env)**:
  - When native modules match the installed preview APK, publish JS-only updates with `$env:CI='1'` and `npx eas-cli update --channel preview --environment preview --message "<summary>"`. Tell the owner to swipe close and reopen the app **twice**.
  - **No killing builds/OTA (owner rule 2026-11-02)**: Never interfere with, stop, or kill active `eas update` or `flyctl deploy` processes during RAM cleanup or other system tasks. Let them finish; only clean up true zombie/orphan tasks.
- **Art & Worlds (57 official characters = 40 + 15 new)**:
  - Worlds text and logic come first. Owner generates scene-rich art in Nano Banana from `docs/nano-banana-worlds.md` into `art-new/` (do not call Higgsfield API while its balance is empty).
- **Parallel Agents & Git (`local-work`)**:
  - `Claude 1`, `Claude 2`, and `Gemini` share `C:\Users\joray\BIMOBIMO` on branch `local-work`.
  - Run `git fetch origin` and `git pull --ff-only origin local-work` before starting and before pushing. Leave uncommitted files from the owner or other agents untouched.
  - Required checks before finishing code: `npx tsc --noEmit` and `npm test` (plus `server` tests / `check:locales` / `check:content` when touched).

## 6. Working Together (Claude 1, Claude 2, Gemini 4 Argon)
Equal engineers on one checkout. Nobody waits for another agent's permission; these rules only stop collisions.
- **Say what you hold**: `.agents/now.md` (not in git) has one line per agent: who, task, files or area, start time. Read it after pulling, add your line before your first edit, remove it when you finish. A line older than 2 hours with no matching commit is stale: delete it. Another agent's area is off limits: take other work, or wait if you must have it, and tell the owner only when truly blocked.
- **Hot files**: `src/store/use-app-store.ts`, `HANDOFF.md`, `src/i18n/locales/*`, `package.json`. One agent at a time; edit, commit and push quickly.
- **Commit only your own files**: name each path. Never `git add -A`, `git add .` or `git add -u`: they sweep up another agent's half-done work. A change you did not make is not yours to commit, revert or reformat.
- **Who does what, unless the owner says otherwise**: Claude leads architecture, server, wallet and money, safety and prompts, and the store. Gemini leads batch work from a brief in `docs/agent-tasks/` (translations, content, scans, research, mechanical changes), plus competitive intelligence / REA teardowns (`C:\Users\joray\rea-work\` & Galaxy A51) and character/chat depth audits. Either can write any code. Whoever the owner asks does the task. When an agent hits its limit, another continues from `HANDOFF.md`.
- **Big jobs handed over get a brief**: scope, files allowed, checks, what done means, in `docs/agent-tasks/<name>.md`.
- **A second reader**: work on money, safety, prompts or more than 20 files gets read by a different agent before deploy (Claude found 36 errors in a Gemini pass, 0z62). The writer owns the fix. Check a finding in the code before acting on it; redesign ideas are only suggestions.
- **One at a time**: the A51, evals and the free model keys are shared. Note them in your `.agents/now.md` line. Never restart Metro or the 8787 server another agent is using.
- **Disagreeing**: do not undo another agent's commit on your own. Write the problem in `HANDOFF.md` and fix forward; a product or taste question goes to the owner.
- **HANDOFF**: pull first, take the next block number, put your agent's name in the title, and leave other blocks as they are.

