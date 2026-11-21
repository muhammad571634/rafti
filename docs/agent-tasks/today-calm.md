# Brief: build the calm Today (audit 2026-11-15 §6.1), owner-approved prototype

Owner, 2026-11-16: approved `docs/prototypes/today-calm.html` ("Ha, kodla") and asked that the next session build it
without drifting, and make it better where it is weak: find and fix the gaps the prototype does not show.
Reply to the owner in short plain Uzbek; everything in the repo stays English.

## Read first (in this order)

1. `docs/prototypes/today-calm.html`: open it in the browser pane; its "Hozirgi" switch shows today's screen
   (two A51 screenshots), "Yangi" the target. Its last card lists what came from Fable and what is ours.
2. `docs/agent-tasks/design-audit-2026-11-15.md` §6.1 (the proposal), §8.2 (alive: one living thing per screen,
   presence, response, continuity, time), §10 Today lines (ghost of the hero's name under the pinned field; icons
   in deep tints; a lone orange dot when the hero has no line; anchor the name to the field when there is no line).
3. `.agents/rules/project-memory.md` §3 (night only, Ink kit, friend on the trailing side, Today's hero ends at the
   screen's vertical middle on every phone, popups appear at once, clean chain on the A51 with the worst case).
4. The code: `src/app/(tabs)/index.tsx` (742 lines: top bar, hero, the yellow "waiting" bubble with its tail, the
   sealed note, four widgets with Home Screen-style edit / gallery / drag, the app-icon tiles, welcome back),
   `src/components/today-hero.tsx`, `src/components/today/widgets.tsx`, `widget-models.tsx`, `welcome-back.tsx`,
   store `todayWidgets` / `setTodayWidgets` (four slots, `DEFAULT_WIDGETS`) in `src/store/use-app-store.ts`.
   Reuse the shared More sheet pattern from `src/components/more-sheet.tsx` (0z237) and the Ink kit
   (`src/components/ink/`, `src/theme/ink.ts`); no sizes, hexes or radii in the screen.

## Target (what the prototype shows)

- **Hero** as today (full bleed, ends at the vertical middle, scrim, the friend on the right), plus:
  a greeting by time of day in the top row (morning / evening / late night; the user's first name) and a hero light
  that shifts with it; the friend's status line under the name (presence: their day, from what the app already
  knows; a green dot only in their waking hours); the picture breathing 1-2 % (Reanimated, UI thread, stops under
  Reduce Motion and when the tab is not focused). No line from the friend: the name sits right on the field
  (no empty gap, no lone dot).
- **Waiting for you**: one Ink card replacing the yellow bubble and the separate note: one row per unread chat
  (face with a peach ring, name, last line, blue count; a tap opens that chat), then today's sealed note as a row.
  Section title with the total. Hidden when nothing waits.
- **Widgets: at most two**, side by side, in deep Ink tints (not pastel). Keep the existing widget models and the
  gallery; the store keeps its slots but Today shows two (migrate four to two without losing the user's first two;
  write a store migration and a test).
- **One More row** (icon tile, "More", the gifts badge when a gift waits, chevron) opening a sheet (appears at once)
  with every module that is not one of the two widgets, as deep-tinted round-square icons in a 4-column grid, and a
  "Choose widgets" button that opens the existing gallery / edit. Today's six app-icon tiles and the Edit button go.
- Everything else (welcome back, check-in reward, the top bar's mascot logo and profile capsule) stays.

## Make it better (find and fix; name each in the report)

- Fable §10: the hero name's ghost under the pinned message field when scrolling; check it is gone.
- Largest text (font_scale 1.3), German, a long friend name, no friends yet (empty state), one unread, nine unread
  (cap the rows: 3 then "and N more" opening Chats on Unread), a note but no unread, a gift waiting, both widgets
  empty, a small phone height (hero still ends at the middle, content scrolls).
- Performance: Today must not select all of `s.messages` (audit §3 Step 3 note); one selector per row.
- Accessibility labels for every row and the More sheet; 44 pt targets.
- New strings in all 14 locales (`npm run check:locales`), reuse existing keys where they exist (`home.waiting`,
  `home.todo.note`, `common.more` if any).

## Done means

`npx tsc --noEmit`, `npm test` (new tests for the widget migration and any pure helpers), `check:locales`,
`check:content`; OTA (`$env:CI='1'; npx eas-cli update --channel preview --environment preview --message ...`);
on the A51 (`C:\Users\joray\AppData\Local\Android\Sdk\platform-tools\adb.exe`, package `com.sigmazam.app`) the whole
chain with the worst cases above, then restore font_scale 1.1; a HANDOFF block with what was checked and not; commit
and push to `local-work` (name each path, never `git add -A`); a plain-Uzbek report; then stop for the owner.
Section 6 of the audit is then finished.
