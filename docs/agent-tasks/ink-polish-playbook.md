# Ink Night+ Prototype & Polish Playbook (Handoff Guide)

Read this file before prototyping or polishing any remaining Sigmazam screens. It captures the exact Ink Night+ design system, interactive HTML prototype recipe, implementation boundaries, and verification checklist established across Waves 1–3 (`0z297` → `0z302`).

---

## 1. Where We Stopped (Status as of 2026-11-19)

### Live in Preview OTA `bd97bb03` (runtime `1.3.0`, verified on Galaxy A51)
8 of the 10 core screens are unified in **Ink Night+** and live on the owner's phone:
1. **Us** (`0z297`): `src/app/(tabs)/us.tsx`, `src/components/us/living-bond-hero.tsx`, `plan-calendar.tsx`, `moments.tsx`, `talked-with.tsx`, plus reusable `src/components/ink/glass-pill.tsx` (`PhotoGlassPill`).
2. **Find** (`0z298`): `src/app/(tabs)/find.tsx`, `src/components/find/cinema-feature-card.tsx`, `src/components/find/circle-tile.tsx`.
3. **Chats** (`0z300`): `src/app/(tabs)/chat.tsx`.
4. **Character Profile** (`0z300`): `src/app/character/[id]/index.tsx`, `src/components/character/profile-hero.tsx`.
5. **Chat Room** (`0z300`): `src/components/chat/chat-header.tsx`, `src/app/chat/[id].tsx`.
6. **Voice Call** (`0z300`): `src/app/call/[id].tsx`, `src/components/call/call-rings.tsx`, `src/components/call/live-caption.tsx`.
7. **Onboarding** (`0z302`): `src/app/onboarding.tsx`, `src/components/onboarding/night-deck.tsx`, `src/components/onboarding/friend-gift.tsx`.
8. **Today** (`0z302`): `src/app/(tabs)/index.tsx`, `src/components/today-hero.tsx`, `src/components/today/widgets.tsx`.

### Intentionally Paused / Untouched (Do NOT Edit Unless Owner Explicitly Asks)
- **Me / Profile** (`src/app/profile.tsx`) — paused per owner (2026-11-19).
- **Store (Plans & Shells)** (`src/app/store/shell.tsx`, `src/components/plans/plan-picker.tsx`, `src/components/plans/store-look.tsx`) — paused per owner (2026-11-19).
- **Heartbeat Diary** (`src/app/diary/`) — owner-approved earlier; never redesign unless explicitly asked.

### Remaining Candidate Screens the Owner May Prototype Next
Secondary & feature screens still ready for Ink Night+ prototypes when requested:
- Create Character (`src/app/create-character.tsx`), World/Circle detail (`src/app/world/[series].tsx`), Memories (`src/app/character/[id]/memories.tsx`), Moments (`src/app/moments/[characterId].tsx`), Secret Notes (`src/app/secret-note/[id].tsx`), Photo Booth (`src/app/photo-booth.tsx`), Dating (`src/app/dating.tsx`, `src/app/date/*`), Radio (`src/app/radio/*`), Bedtime (`src/app/bedtime.tsx`), Alarms (`src/app/alarms/*`), Board (`src/app/board/*`), Group Chat / Group Call (`src/app/group/*`), Personas (`src/app/personas/*`), Lorebooks (`src/app/lore/*`), Mind (`src/app/mind.tsx`), Gifts (`src/app/gifts.tsx`), Notifications (`src/app/notifications/*`), My Plan (`src/app/my-plan.tsx`), Edit Profile (`src/app/edit-profile.tsx`).

---

## 2. The "Ink Night+" Visual Language (`src/theme/ink.ts`)

Every new prototype and production screen must stay strictly inside the frozen Ink Night+ palette (never introduce bright light themes, cold blue badges, cartoon/clay icons, or noisy subtitles):

- **Core surfaces & borders (`src/theme/ink.ts`):**
  - Ground: `ink.ground` (`#09090D`)
  - Card surface: `ink.card` (`#16161E`) + `borderWidth: StyleSheet.hairlineWidth, borderColor: ink.edge` (`rgba(255,255,255,0.08)`)
  - Hairline dividers: `ink.line`
  - Quiet circular/icon fill: `ink.hairlineFill`
- **Brand accent & unread language:**
  - Warm brand peach `ink.accent` (`#EBAD84`) with dark ink `ink.onAccent` (`#3A1A06`) for unread badges, unread dots, timestamps, progress bars, and warm highlights.
  - **Zero cold iOS blue (`#0A84FF` / `ink.unread`)** on unread badges or primary UI pills.
  - Streak pills: `ink.streakFill` + `ink.streakText`.
  - Primary white CTA pill: `ink.pill` (`#FFFFFF`) with `ink.onPill` (`#09090D`).
- **Clear dark glass over photography (NO live `BlurView` inside ScrollViews — drops frames on Android Galaxy A51):**
  - Surface: `ink.photoGlass` (`rgba(18,18,24,0.72)`) + hairline border `ink.photoGlassRim` (`rgba(255,255,255,0.16)`).
  - Compact photo badges: `ink.photoBadge` + `ink.photoBadgeRim`.
  - Reusable primitive: `PhotoGlassPill` from `@/components/ink` (`src/components/ink/glass-pill.tsx`).
  - Multi-stop editorial scrim on photo cards: `['rgba(9,9,13,0.22)', 'rgba(9,9,13,0)', 'rgba(9,9,13,0.42)', 'rgba(9,9,13,0.94)']` at `[0, 0.28, 0.58, 1]`.
- **Typography:**
  - Editorial serif display/titles/figures: `Source Serif 4` via `InkText` (`display`, `title`, `figure`, `figureLarge`) or `fonts.serif`.
  - Whispered character quotes / openings / captions: italic serif `inkType.quote`.
  - UI body / labels: SF Pro / system sans; always `fontVariant: ['tabular-nums']` on counts, timers, levels, and prices.
  - Minimal text rule: headings, numbers, and icons only — **never add explanatory helper subtitles** under titles.
- **Friend-hue personalization:**
  - Always derive each character's accent dynamically via `night.friendAccent(character.id).strong` (used for avatar rings, horizon glows, relation chips `inkEm(hue)`, call rings, and live-caption accent bars).
- **Stained-glass tinted tiles:**
  - Use `inkTints` / `moduleGlass` gradients with hairline `ink.edge` / `glass.rim` borders (never skeuomorphic folders or harsh flat neon blocks).
- **Icons & settings rows:**
  - Apple SF Symbols style only (`SFIcon` from `@/components/ui` + Ionicons fallback). Never use retired 3D clay icons (`icon3d-*.png`).
  - Settings-like rows keep colorful iOS rounded-square icon tiles (`LinkRow` / `SwitchRow` `icon` + `fill`).

---

## 3. Interactive HTML Prototype Recipe (Exact Craft Used in Waves 1–3)

Reference prototypes from the previous session (saved in conversation `4776e3b2-3806-476a-b737-abc72aa7e055` artifacts):
- `ink-polish-us-find.html`
- `ink-polish-core-chain.html`
- `ink-polish-final-loop.html`

Follow this exact recipe whenever the owner asks to prototype new screens:

### A. Audit Real Code & Data FIRST
Before drafting HTML, read the real React Native screen file(s), store selectors (`src/store/use-app-store.ts`), and locale strings (`src/i18n/locales/en.json`).
- Every button, tab, metric, toggle, and flow in the prototype MUST map 1:1 to real data and actions already in the app (or clearly mark any new proposed control). Never invent fake features or fake prices.

### B. Self-Contained Single HTML File
- Save the prototype as a standalone `.html` artifact in the conversation's artifact directory (use `<html lang="uz">` for the outer presentation header, switcher tabs, toasts, and summary cards; keep the inside-phone app UI strings in real English matching `en.json`).
- Load Tailwind utility classes via `<script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>`.
- Include an inline `<style>` block with exact Ink Night+ classes:
  - `.phone`: `376px × 760px`, `background: #09090D`, `border-radius: 46px`, `border: 1px solid rgba(255,255,255,0.14)`, deep soft bezel shadow.
  - `.phone-compact`: `332px × 690px`, `border-radius: 42px` (for side-by-side strip mode).
  - `.serif`: `Georgia, "New York", "Source Serif 4", "Times New Roman", serif; letter-spacing: -0.4px;`
  - `.tabular`: `font-variant-numeric: tabular-nums;`
  - `.glass-btn` (`40px` circle, `rgba(118,118,128,0.24)` + `0.5px` rim) and `.photo-glass-btn` (`rgba(18,18,24,0.48)` + `0.5px` rim + `backdrop-filter: blur(14px)`).
  - `.clear-glass-pill`, `.ink-card` (`#16161E`, `border-radius: 26px`, `0.5px solid rgba(255,255,255,0.08)`), `.ink-seg-2`, floating `.tab-bar-wrap` (liquid-glass 3-tab capsule + floating Search circle), and `.tap` spring active feedback (`scale(0.965)`).

### C. Embed REAL Sigmazam Portraits Offline (Base64 JPEG)
Never use broken local paths or generic stock photos! Run a quick one-off Node/Python script in scratch to resize the real character art from `assets/heroes/` or `assets/portraits/` (e.g., ~360–420px wide, JPEG quality ~75–80) and inject them as `const PORTRAITS = { c_milo: "data:image/jpeg;base64,...", c_mia: "...", c_sam: "...", c_caleb: "..." };` right into the `<script>` tag. That keeps the HTML file fast (~200–450 KB), 100% offline, and visually indistinguishable from the real app.

### D. Always Ship 3 Interactive Views + Uzbek Cohesion Summary
1. **Jonli Zanjir / Interaktiv (Interactive Flow):** Full `376×760` clickable phone where every control responds (switching tabs/friends/modes, opening sheets/drawers, toggling switches, showing a subtle top pill toast in Uzbek describing what the real app does on tap).
2. **Yonma-yon (Side-by-Side Strip):** All screens in the batch rendered together in `.phone-compact` (`332×690`) frames so visual cohesion is verifiable at a glance.
3. **Oldin → Keyin (Honest Before → After):** Left phone renders an honest snapshot of the current codebase screen (highlighting exact visual seams); right phone renders the Ink Night+ upgrade.
- **Scroll preservation on re-render:** Tag scrollable containers with `data-scroll-key="..."`, save `el.scrollTop` before re-rendering `#stage`, and restore `el.scrollTop` immediately after so taps inside a scrolled phone never jump to top.
- **Bottom Summary Card (in Uzbek):** 3–4 short cards listing the concrete visual seams fixed, grounded in real app features.

---

## 4. Strict Implementation Workflow (After Prototype Approval)

When the owner attaches or approves a prototype and asks to implement a screen:

1. **Step 2 First — Audit & Plan (BEFORE Editing Any Repo File):**
   - Inspect the exact target RN files and run a recursive grep (`Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx | Select-String ...`) on any shared helpers you plan to touch.
   - Present a short **Uzbek implementation plan** listing: exact files to modify, any new isolated sub-components, untouched shared primitives, and a Prototype → Live Data mapping table. **Stop and wait for `"boshla"` before editing!**
2. **Step 3 — Strict Isolation & Clean RN Implementation:**
   - Sync branch (`git fetch origin; git pull --ff-only origin local-work`), check `.agents/now.md`, write your lock line before editing.
   - **Guard high-fanout shared files:**
     - `src/components/character/kit.tsx` (used by 8+ screens — never break defaults)
     - `src/components/plans/store-look.tsx` (used by 16+ screens — additive optional props only)
     - `src/components/find/circle-card.tsx` (used by `/world/[series]`)
   - **RN 0.88 / Expo 57 gotchas learned the hard way:**
     - Use `StyleSheet.absoluteFill` (NOT `StyleSheet.absoluteFillObject` — missing in RN 0.88 TS types).
     - Import `SFIcon` from `@/components/ui` (file is `symbol.tsx`, not `sf-icon.tsx`).
     - Never nest `<Pressable>` / `<PressableScale>` inside another pressable (breaks web & Android hit-testing) — use un-nested sibling overlays.
     - Keep `0` locale changes whenever existing keys cover the UI. If adding new keys across all 14 `src/i18n/locales/*.json`, use surgical text insertion (never `JSON.parse`/`JSON.stringify` the whole file, which rewrites unrelated keys like `ru.json`'s duplicate `showMore`), and run `npm run check:locales` + `npm run check:content`.
     - Zero endless animations (`withRepeat(..., -1)`) on main tabs — `src/lib/idle-screens.test.ts` strictly enforces this!
     - Keep Russian / German long-string wrapping safe (wrap to 2 lines, never shrink mid-label or break mid-word).
3. **Step 4 — Verify, Handoff, Commit, Push (and Optional OTA):**
   - Run `node node_modules/typescript/bin/tsc --noEmit` → **0 errors**.
   - Run `npm test` → **all tests passing** (including `src/lib/idle-screens.test.ts`).
   - Update `HANDOFF.md` with the next `0zNNN` block (after pulling latest so you don't overwrite Claude 1 / Claude 2).
   - Commit **ONLY explicitly named owned file paths** (never `git add -A`, `git add .`, or `git add -u`), push to `origin local-work`, and delete `.agents/now.md`.
   - When the owner says `"ota chiqar"`, publish via:
     `$env:EXPO_TOKEN = [Environment]::GetEnvironmentVariable('EXPO_TOKEN', 'User'); $env:CI = '1'; npx eas-cli update --channel preview --environment preview --message "<summary>"`
     and verify on Galaxy A51 (`R58N628VFGY`) using `C:\Users\joray\AppData\Local\Android\Sdk\platform-tools\adb.exe` (never scrcpy's `adb`).
   - Reply to the owner in **short, plain Uzbek** (no code jargon unless asked).
