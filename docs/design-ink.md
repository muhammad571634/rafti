# "Ink": the modern-minimal look for the whole app (plan, waits for the owner's yes)

Owner, 2026-11-11: "our frontend must move to this simple modern look; the logic we have stays."
Reference: How We Feel (iOS), 66 screenshots, 23 motion clips and a 16-minute walkthrough in
`assets/heroes/app screen/` (untracked; third-party pictures, never commit or bundle them). We take
the structure and the manner, never their shapes, characters, words or pictures.

**Canvas, every screen (52 artboards in 9 rows, full height, our own art): https://claude.ai/artifact/A3giYifq4CjLwTEqDPKMdp**
This is the layout reference for tasks 1-5: each artboard's title names the screen, each row has a
note saying what came from the reference and what we drew ourselves. Its shared stylesheet
(`project/ink.css` on the canvas) holds the exact sizes, radii and hues to copy into the tokens.
Motion prototype (nine screens, motion live): https://claude.ai/artifact/K3fciVZVynp5VQbZK7XPyT
(source: the lead's scratchpad; rebuild from this file's tables if it is lost).

**Apple HIG pass (2026-11-11, owner approved the direction): `docs/design-ink-polish.md` amends this plan (type scale, label colours, segmented controls, the floating glass tab bar, settings tiles, motion and haptics rules, follow the phone for dark / light). Where the two differ, the polish file wins.**

Status: PLAN. Nothing below is built. The owner approves the prototype first (project rule), then
task 0 lands, then the screen tasks. Until then `docs/design-style.md` is still the law.

## 1. What the reference does (read off every screen and clip)

1. **Black ground, no chrome.** Content sits straight on black. No card unless the card is the content.
2. **Two type voices.** An editorial serif for what the screen says (titles, a question, "I'm feeling
   *sad*" with the key word in italic and in colour), a plain sans for what the user reads or taps
   (rows, chips, fine print). Big serif numerals for a count ("1", "3", "2 / 10").
3. **One white pill.** Every screen ends in one full-width white pill with black words. A second
   action is an outlined pill; a way out is small grey text under it ("Not right now").
4. **Colour is meaning, never decoration.** Four hues stand for four kinds of feeling; a thing takes
   its hue everywhere (its shape, its word, its card's glow, its bar in the stats). Everything that
   is not a feeling is white, grey or black.
5. **Glow cards.** A record is a wide rounded card, near-black, lit from one side by its hue; time
   top-left, small capsules top-right, the serif line bottom-left, its shape bottom-right.
6. **Quiet rows.** Lists are plain rows on black with a hairline between, a thin line icon, an arrow.
   Options in a question are the same rows with a radio or a checkbox.
7. **Chips.** Grey pills; a chosen one takes the hue as a thin border, a faint fill and its label.
8. **Home is one question and one ring.** "How are you feeling this afternoon?" over a breathing
   ring with a plus. Everything else is one scroll below.
9. **Tiles for a shelf.** A catalogue is two columns of big rounded squares, each one flat colour,
   serif name in the middle, a count at the bottom.
10. **Stats as shapes.** Overlapping discs with a percent, a month grid with small shapes on days,
    thick rounded bars.
11. **Steps.** A setup flow has a back arrow, a hair-thin progress line and "3 / 10"; one question
    per step.
12. **Motion** (the clips): a field of circles that drifts under the finger and lets the chosen one
    grow into its shape; the ring breathing and filling; a dot grid that swells and changes colour
    with the breath; a card growing into its own detail screen; a big numeral counting in over a
    drawn ring; words fading in one line at a time.

## 2. What Sigmazam takes: the "Ink" system

Logic, navigation, stores, prompts, server and strings stay as they are. Only what a screen looks
like and how it moves changes.

### Tokens (`src/theme`, new export `ink`; old exports stay until the last screen moved)

| Token | Dark (the reference look) | Light (if the owner keeps two themes) |
|---|---|---|
| `ink.ground` | `#000000` | `#FFFFFF` |
| `ink.card` | `#111113` | `#F2F2F7` |
| `ink.raised` (chips, fields, round buttons) | `rgba(255,255,255,0.09)` | `rgba(120,120,128,0.12)` |
| `ink.line` (hairline) | `rgba(255,255,255,0.12)` | `rgba(60,60,67,0.18)` |
| `ink.text` / `text2` / `text3` | `#FFFFFF` / 60% / 32% | `#000000` / 60% / 32% |
| `ink.pill` / `ink.onPill` (the main button) | `#FFFFFF` / `#000000` | `#000000` / `#FFFFFF` |

- **A friend is a colour.** `friendGlow(id)` returns `{ from, to, word }` built on the existing
  `friendHues` index (no new hex per screen): the gradient of their card's light, the colour of
  their name's key word, their ring, their bar in Us. Modules keep `moduleFills` hues the same way.
- Peach stays for the brand, the user's own chat bubble and the Store. It is no longer the button.
- **Type.** New `fonts.serif` / `fonts.serifItalic`: Source Serif 4 SemiBold and SemiBold Italic
  (OFL; Latin, Latin Extended for Turkish, Cyrillic, Vietnamese; Japanese, Korean, Thai and Chinese
  fall back to the system face, as Nunito does today). Variants: `inkDisplay` 34/38, `inkTitle`
  28/33, `inkCard` 24/28, `inkNumeral` 72/72, all letter-spacing -0.4. Body stays the system face:
  17 rows, 15 secondary, 13 fine print. Fredoka and Nunito leave a screen when it moves; Caveat stays
  in the diary.
- Radius: cards 28, tiles 32, pills full, fields 20. Side gutter 20. No shadows.

### Kit (`src/components/ink/`, built once, every screen uses it)

`InkScreen` (ground, safe areas, optional step header) · `InkTitle` (serif, takes `<em>` parts
that turn italic and a colour) · `PillButton` (`primary` white, `outline`, `quiet` text) ·
`InkChip` · `InkRow` (line icon, title, value, arrow or radio / checkbox / switch, hairline) ·
`GlowCard` (hue, time, capsules, line, trailing picture or face) · `Tile` (flat colour square, serif
name, count) · `StepHeader` (back, progress line, "3 / 10") · `InkSheet` (the kit's `Sheet` on
`ink.card` with a grabber) · `InkField` · `RoundIcon` (40, `ink.raised`) · `BigNumeral`.

### Motion kit (`src/components/ink/motion/`, written by the lead, not handed out)

| Part | What it is | Where it goes |
|---|---|---|
| `PulseRing` | A thick gradient ring (Skia sweep) that breathes at 0.12 Hz, fills to a value, and can carry a plus | Today's check-in / streak, level ring on a friend's page, call minutes left |
| `DotField` | A 15x15 dot grid whose dots swell and change hue in a slow wave | Every "the model is writing" wait (quick create, diary page, first text), Bedtime |
| `CountIn` | A serif numeral that rolls in beside a title while a thin ring draws | Level-up, streak day, shells won |
| `GrowInto` | A card expands into its own detail screen (shared bounds, 320 ms spring) | Chats row to friend page, GlowCard to its record, Find tile to its shelf |
| `BubbleField` | Packed circles that pan under the finger; the picked one grows, the rest part | Onboarding "what brings you here", traits in quick create, interests in profile |
| `DiscStat` | Two to four overlapping discs that swell to their share | Us: time shared between friends |
| `LineIn` | Lines of a title fade and rise one after another (60 ms apart) | Every `InkTitle` on first appearance |

All of them stop under Reduce Motion, run on the UI thread (Reanimated 4 + Skia, both already in
the app), hold 60 fps on the Galaxy A51, and never run while their screen is not focused.

## 3. Screen by screen

Same routes, same data, same taps. "Keeps" means the logic and every control stay.

| Screens | Today | Becomes |
|---|---|---|
| **Onboarding, language, sign-in** | Orbit, deck of cards, sheets | `StepHeader` + one serif question per step + `InkRow` options + white pill; the picks step is a `BubbleField`; the orbit stays as the first screen |
| **Today** | Photo hero + coloured widgets | The photo hero stays (the friend, trailing side). Under it one column: a `PulseRing` row for the day (streak / check-in), then `GlowCard`s for what waits (a note, a missed call, a plan), each in its friend's hue; widgets that are shortcuts become one row of `RoundIcon`s |
| **Chats** | Messages rows on white | Same rows on `ink.ground`: face with a thin ring in the friend's hue, serif large title, hairlines; unread as a white dot |
| **Us** | Cards, calendar, moments | Serif "Us" with a month picker like the reference's "Monthly"; `DiscStat` for who you talked with; the month grid with each friend's dot; thick bars for the week; moments as `GlowCard`s |
| **Find** | Featured photo cards + circles | Featured card stays (photo, scrim, clear glass). The four circles become four `Tile`s (name, count); a circle opens as a list of photo cards; search as an `InkField` |
| **Tab bar (Android)** | Frosted pill + round Find | A flat bar on the ground: four thin line glyphs with small labels, the current one white; iOS keeps the system bar |
| **A friend's page, settings, memories, search, background** | Photo card + coloured tiles | Tall picture on top, serif name, relation line in italic in their hue, level as a `PulseRing`, then `InkRow`s; memories as `GlowCard`s by day |
| **Create a character** | Grey cards and fields | Quick create: serif question, an `InkField`, traits as a `BubbleField` (chips fallback), `DotField` while it writes; the form: sections of `InkRow`s and fields on black |
| **Contacts, groups (new, info), personas, lore, scenes** | Cards | Plain `InkRow` lists; pickers as chips |
| **Profile, edit profile, notifications, language, my plan, ledger** | Grouped cards with coloured tiles | Reference "Settings": section label, `InkRow`s, hairlines. Each row's line icon keeps its module colour (the owner's "colour, not just text", 2026-11-08, survives as coloured glyphs instead of tiles) |
| **Store, plans, gifts, paywalls** | Hero card + packs | One serif line, packs as rows with a big numeral, the white pill buys; the plan's violet stays as the plan's glow |
| **Radio, board, streams, photo booth, dating / date, quiz, alarms, mind** | Feature kit | A shelf is `Tile`s or `GlowCard`s in the module's hue; a detail is one hero + rows + the pill |
| **Calls, incoming call, alarm ring, bedtime, level-up, launch** | Already dark moments | Type and buttons move to Ink; level-up uses `CountIn`; Bedtime's breathing uses `DotField` |
| **Chat screen `chat/[id]`** | On their picture | **Untouched** (owner, 2026-11-08: "leave the chat") |
| **Diary `diary/*`** | Approved | **Untouched** (approved screen) |
| **Share posters** | Poster frame | Untouched |

## 4. What this replaces, and what the owner decides

These standing rules change if the owner says yes to the prototype:

1. Ground: white with grey cards (2026-11-08) → black. **Owner picks: always dark, or follow the phone.**
2. Titles: heavy rounded Nunito → serif. Fredoka / Nunito retire screen by screen.
3. Settings rows: coloured icon tiles → coloured line glyphs on plain rows.
4. Main button: peach → white pill. Peach stays for brand, your bubble, the Store.
5. Android tab bar: floating pill → flat bar with four tabs.

Kept on purpose: the Today photo hero, friend-on-the-trailing-side, clear glass on photos, minimal
text (no helper subtitles), SF-style line icons, popups appear instantly, existing animations
(typing dots, voice wave) untouched, 14 locales, share posters never show the user.

## 5. Order of work

0. **Lead (Fable):** HTML prototype of six screens with the motion live → owner's yes or edits.
1. **Lead:** motion kit. **Opus task 0:** tokens, fonts, kit (`docs/agent-tasks/ink-0-foundation.md`).
   Nothing else starts before both are on `local-work`.
2. **Opus tasks 1-5**, each in its own worktree, files that do not overlap:
   `ink-1-onboarding.md`, `ink-2-tabs.md`, `ink-3-friend-space.md`, `ink-4-lists-store.md`,
   `ink-5-features-moments.md`.
3. **Lead:** reads every diff (second reader), drives each chain on the A51 with the worst case,
   then `docs/design-style.md` is rewritten around Ink and the old tokens, Fredoka, Nunito, the
   aurora and the clay icons are deleted.

Shared rules for every task: `docs/agent-tasks/ink-rules.md`.
