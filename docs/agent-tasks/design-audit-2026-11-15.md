# Design audit 2026-11-15 and the work order for it (brief for Opus 5.5)

Written by the lead (Fable 5.2) after a full pass: two code sweeps (design system, chat experience)
and a drive of the installed preview APK on the Galaxy A51 (Today, Chats, Us, Find, a chat, the
message menu, a call, a friend's page, Profile, Store, Dates, a diary page; light mode, Turkish).
The owner's ask: "the design is mostly there but something is missing; make it modern, minimal,
Apple iOS; make it a pleasure and never boring". This file is the diagnosis and the order of work.

## 1. The diagnosis in one paragraph

No single screen is bad. The app feels unfinished because **five design generations are live at
once** and the user crosses them every few taps: grouped iOS grey (26 screens), playful Nunito
(15), feature cards with a hero colour (11), night "moments" (8) and Ink serif (7 of 70). On the
phone that reads as: a rounded heavy title on Chats, a serif title on Dates, a system title on
Store; a black capsule button on Dates, a peach rounded rect on Store and the diary; a light blur
menu over the dark chat; ten colours on Today. The second cause is the core loop: the first word of
a reply takes about 4-9 s plus the model, and the chat lacks the small things iMessage and Telegram
taught everyone (reply, jump to newest, a keyboard that follows the finger). Fix those two and the
app is a class higher. **Do not add features. Unify, then polish the chat.**

## 2. Rules for this job

- Direction is Ink (`docs/design-ink.md`, `docs/agent-tasks/ink-rules.md`, `ink-0` … `ink-5`). This
  brief does not replace them; it says what the audit found and what goes first. Where a doc
  disagrees with `design-ink.md`, Ink wins; fix the doc in the same commit (see 3.1).
- Logic stays. A step that changes what the user can do (hiding a feature, prices, onboarding
  order) is in section 6 and waits for the owner. Everything else: do it, no option lists.
- Owner rules that still hold: popups and sheets appear at once (no entry animation; a
  swipe-to-dismiss gesture is fine); typing dots and voice waves stay; the chat's own look stays
  (bubbles, wallpaper); never redesign the Heartbeat diary; clear glass on photos; posters carry
  only the character; all strings in 14 locales.
- One step = one commit, pushed to `local-work`, with `npx tsc --noEmit`, `npm test`,
  `npm run check:locales` when strings change. Each step is driven on the A51 with the worst case
  (break-ui: long names, many items, empty, keyboard up, light and dark) before it is called done.
- New native module = new APK. `react-native-keyboard-controller` (4.3) is the only one proposed;
  guard it and tell the owner a build is needed before merging that step.
- Atomic saves (the phone hot-reloads), name every path in `git add`, claim your area in
  `.agents/now.md`.

## 3. Work order

### Step 1. One source of truth, then the kit (nothing visible changes yet)

The drift starts in the docs and tokens, so fix them first.

1. Docs: `design-style.md` §1 (aurora ground), §10 (Fredoka / Nunito titles, radius 24 / 30) and §2
   (h2 24, h3 19) contradict `design-ink.md` and the code (`typography.ts:42-43` has 22 / 20). Mark
   the superseded parts as superseded with one line pointing to Ink; replace the stale
   `design-audit.md` body with a pointer to this file.
2. Tokens (`src/theme`): add the Ink type roles (`inkDisplay` 34/38, `inkTitle` 28/33, `inkCard`
   24/28, `inkNumeral`), radius `card` 28 and `tile` 32, gutter 20; one secondary-text colour
   (`systemGround.secondaryLabel` is about 3.4:1 on white; raise it to the 0.66 / 0.62 that
   `design-ink-polish.md:41` already decided); one dark hairline token (the same
   `rgba(255,255,255,0.08)` literal is pasted in `us.tsx:565`, `streams/index.tsx:145`,
   `secret-note/[id].tsx:220`, `dating.tsx:353`).
3. Build `src/components/ink/` as `design-ink.md:79-92` lists it (it does not exist; every Ink
   screen is hand-styled with raw `Text`). Minimum set that the later steps need: `InkScreen`,
   `InkTitle`, `PillButton` (primary / outline / quiet), `RoundIcon` (44 pt touch, one size),
   `InkRow`, `Tile`, `GlowCard`, `InkSheet`, `InkEmpty` (SF-symbol style, no mascot). Move the seven
   existing Ink screens onto it first: that proves the kit and removes about 120 literals.
4. Delete the dead: `ui/clay-icon.tsx`, its export and the 56 `assets/brand/icon3d-*.png` (0
   consumers; the shell's Fluent art stays).

### Step 2. Night leaks and system chrome (seen on the phone, cheap, very visible)

- The long-press message menu and the chat's "…" menu are light blur over the always-dark chat
  (`chat/message-menu.tsx:143, 215-248`, `chat/chat-menu.tsx:59, 149, 185-200`: module-level
  `isDark`). They must read the scope (`useTokens` / `NightScope`). Same for `chat-header.tsx:133,
  145` and `chat-input.tsx:405`, and the nine kit files with module-level colours (`search-bar`,
  `avatar`, `count-badge`, `icon-tile`, `module-icon`, `shell-badge`, `section-label`,
  `alert-host`). There are 91 module-level `isDark` branches; sweep the ones reachable from a night
  screen.
- Android: the system navigation bar stays white under the dark chat and the call screen. Set it
  per screen with the night scope (`expo-navigation-bar` / `SystemUI`, already in the app), dark
  icons on light, light on dark.
- A friend's page (`character/[id]/index`) rendered light on the A51 while HANDOFF 0z196 says every
  screen with a character is dark; its bottom segmented control also sits under the Android
  navigation bar. Find out why the page was light (OTA not landed, or a regression) and fix both.
- The background picker's warm `#1A1613` next to the obsidian `#09090D` of the page that opens it:
  one night ground.

### Step 3. The chat's feel (the product's first job; biggest effect on "pleasant")

In this order; each is its own commit.

1. **Time to first word.** Today: batch wait 1.5-3 s (`lib/reply-batch.ts:14-18`) + 400 ms +
   "reading" 0.5-1.7 s + "typing" up to 3.1 s (`lib/reply-engine/flow.ts:174-180`) before a bubble
   shows, then 55 ms per word. Keep the human rhythm between bubbles, but the first bubble must
   start within about 1.5 s of the model's answer: show typing dots at once when the batch closes,
   drop the "reading" delay for the first bubble when the model already took longer than it, cap
   the first "typing" delay at about 1 s. Also: "Read" is stamped the moment the reply is scheduled
   (`use-app-store.ts:5762-5770`); stamp it when the typing dots appear. Real token streaming from
   the server is a separate, larger job: write it into `docs/later-list.md`, do not start it here.
2. **Jump to newest**: a round glass button above the composer when scrolled up more than a
   screen, with a count when replies arrived (`chat/follow-newest.ts` knows the distance).
3. **Reply / quote**: `replyTo` on the message type, a quote strip in the bubble and over the
   composer, "Reply" first in the long-press menu, swipe right on a bubble to reply (Gesture
   Handler, a light haptic at the threshold). The quoted line goes into the model's turn so the
   character knows what was answered. Universal: group chats too.
4. **Keyboard**: replace `KeyboardAvoidingView` + show/hide listeners (`chat/[id].tsx:508`,
   `chat-input.tsx:100-102`) with `react-native-keyboard-controller` so the composer follows the
   keyboard frame by frame and interactive dismiss works. Native module: needs a new APK (rule
   above).
5. **Small delight already paid for**: play the wired-but-unused `heartBurst` Lottie on the
   double-tap love; a soft send tick and receive tick in an open chat (make them with earshot's
   bank, behind the existing sound switch); the send / mic swap as a 150 ms cross-scale instead of
   a hard cut.
6. **Media**: a sent photo keeps its aspect ratio and opens full screen with pinch
   (`message-bubble.tsx:148, 771-777`); the voice-note wave is drawn from the real audio levels and
   can be scrubbed (`:311, 379-381`); a voice note with no file must not "play" silence
   (`:349-353`).
7. **Sheets**: the kit `Sheet` (`ui/sheet.tsx`, 60 call sites) gets a grabber and swipe-down to
   dismiss. It still appears at once.
8. **Smoothness**: debounce the store's persistence (it serialises the whole partialised store on
   every `set()`, `use-app-store.ts:1019-1026, 4088`); Today must not select all of `s.messages`
   (`(tabs)/index.tsx:125`); the chat must not select all memories (`chat/[id].tsx:159`); give the
   chat list `windowSize` / `maxToRenderPerBatch` and a stable `renderItem`.

### Step 4. The voice call

- The Speaker button does nothing (`call/call-controls.tsx:8-12`): wire it or remove it.
- Remove the fake 1.6 s "connecting" (`call/[id].tsx:265-269`) or tie it to the real first audio.
- The avatar must live: rings driven by the real loudness of their audio and of the user's mic
  (Reanimated shared value from the meter), a distinct "thinking" state between turns.
- Barge-in: speaking over them stops their audio.

### Step 5. Sweep the remaining screens onto the kit, family by family

Follow `ink-2` … `ink-5` for the look; this audit adds the checklist each screen must pass:

- Title: `InkTitle` only (today: system 34 on about 30 screens, Nunito 36 on Chats / Us, serif on
  Ink, three faces for big numerals incl. the only Light weight in the app, `voice-sheet.tsx:82`).
  Nunito and Fredoka leave the bundle when the last screen moves.
- No `fontSize` / `fontWeight` / `borderRadius` literals in screens (688 / 316 / 465 today, 34
  sizes, 46 radii). Use roles and tokens; if a role is missing, add it to the theme, not the screen.
- Ground: white `systemGround` with `#F2F2F7` cards (grey `colors.bg` is still the `Screen` default
  and under 37 screens; change the default once the sweep reaches them).
- One primary action per screen, `PillButton`; peach only where money is spent (24 inline CTAs in
  three colours today).
- One header and one round button (five header kits, 36 / 40 / 44 / 46 pt buttons today; 40 pt ones
  on Chats, Us and onboarding are under the 44 pt minimum).
- Icons: `SFIcon` everywhere (it falls back on Android); Phosphor (5 files) and
  MaterialCommunityIcons (3 files) go; no screen mixes Ionicons with SF Symbols (15 do).
- Duplicates collapse into the kit: 4 row components, 3 segmented controls, two `Card`s and two
  `Chip`s with the same names, a raw `Switch` (`alarms/index.tsx:153`), raw `Modal`s.
- Feedback: every pressable has a pressed state (57 raw `Pressable`s have none, e.g. six cells in
  `alarms/edit.tsx`); a haptic on selection and success moments that lack one (quiz answers, the
  secret-note swap, the photo-booth shutter, a date round, radio); list rows leave and enter with a
  layout transition (Chats delete, alarms, lore, memories filters).
- States: `InkEmpty` instead of the bobbing mascot on working screens (15 places); error copy where
  a model call fails silently (`quiz/[characterId].tsx:121-129`, `photo-booth.tsx:167`).
- Dynamic Type: drop `maxFontSizeMultiplier={1}` outside posters (`alarms/ring.tsx:144`,
  `find.tsx:577`, `create-character.tsx:654, 923`); check each screen at the largest text size.

Order of families: the four tabs (most seen) → friend space → lists and store → features → moments.

### Step 6. Settings

Profile gets a Notifications row (today only under Us → bell), the message-sound switch, and the
Development group hidden outside dev builds (known launch blocker, `SHOW_DEV`).

## 4. What "done" means

A stranger who taps through any ten screens cannot tell they were built at different times: one
title face, one button, one ground, one icon family, one kind of card, menus that match their
screen, and a chat that answers within about 1.5 s of the model and has reply, jump-to-newest and a
keyboard that follows the finger. Counts to report at the end: `fontSize` literals in `src/app`
(from 688), distinct radii (from 46), screens on the Ink kit (from 7 of 70), icon sources (from 6).

## 5. Not in this job

Real token streaming, server push, home-screen widgets / Live Activities, CallKit, sign-in: they
are in `docs/later-list.md` or go there.

## 6. Waiting for the owner (do not start)

1. **Today is a launcher**: a hero, a yellow bubble, a note, four pastel widgets and six saturated
   app icons, about ten colours and fifteen ways out. Proposal: hero + "waiting for you" + at most
   two widgets; the six icons move into one "More" sheet. Needs a prototype first.
2. **Feature sprawl**: about 40 secondary surfaces, nine items under the chat's "+". Proposal: keep
   chat, calls, diary, memories, moments, alarms in front; radio, board, photo booth, streams,
   quizzes, lore, scenes, personas behind one "More" for people who look for them.
3. **A shell per message** makes the friend feel metered. Proposal: messages free up to a generous
   daily amount, shells for extras (calls, photos, dates).
4. **Onboarding** asks for notifications before the first exchange and opens with a stock line.
   Proposal: ask after the first real exchange; the first hello comes from the model.
5. **Reactions are cartoon mascot stickers** on an otherwise adult, cinematic chat ("not toy-like",
   owner 2026-11-08). Proposal: plain emoji reactions as iMessage; the mascot stays for the brand
   moments.

## 7. Second pass on the A51 (same day): add these to the steps named

- **Step 2**: a friend's chat settings (`character/[id]/settings`) open light and grey straight from
  the dark chat. Decide by 0z196: it is a screen "with a character", so it is night; its four red
  rows in a row (clear chat, reset bond, remove friend, block) become one "Danger" group at the
  very bottom with a confirm each, not a wall of red.
- **Step 3**: the chat's "+" panel is nine saturated discs in nine colours on the dark chat (photo,
  secret note, diary, date, truth or dare, quiz, scene, time skip, daily calls). In the Ink sweep
  they become one quiet family (`ink.raised` discs, line icons, one accent for the picked one);
  which of the nine stay is the owner's call (section 6.2).
- **Step 3**: a failed send shows red "Not delivered · tap to retry" under the bubble: keep, but
  check it still reads at the largest text size (it was one tight line on the A51).
- **Step 5, Today**: when the hero friend has no line, the name floats mid-picture over an empty
  gap above the message field; anchor the name to the field when there is no line.
- **Step 5, Find**: the circle folders are flat yellow / pink / purple / blue blocks under photo
  art, the most toy-like part left in the tabs; make them `Tile`s in the soft Ink tints (as the date
  tiles). The section title "Who do you miss?" is clipped under the pinned segmented control while
  scrolling: give the pinned header an opaque ground and the list a matching top inset.
- **Step 5, Create character**: the disabled "Write the character" button is a pale grey slab that
  reads as broken; a disabled `PillButton` keeps its shape at 40 % with the reason one tap away.
- Not reachable in this pass: dark mode (the phone is set to light; the owner switches it), the
  onboarding (needs a fresh install), iOS.
