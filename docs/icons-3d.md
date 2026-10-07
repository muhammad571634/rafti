# 3D clay icons: where they go

The user picked soft 3D clay icons (Nano Banana) as the app-wide icon style for
feature entry points, on 2026-10-07. They replace the Phosphor duotone tiles step
by step. Small UI glyphs (back, close, chevrons, toggles, tab bar) stay as line
icons: the clay style is for "a place you go" or "a thing you do", not for chrome.

## How it works

- Raw sheets: `assets/raw/icons-3d-sheet.jpg`, `-sheet-2.jpg`, `-sheet-3.jpg`
  (4 columns x 3 rows each, flat light grey).
- `python scripts/build-brand-art.py icons` cuts them into `assets/brand/icon3d-*.png`
  (grey backdrop and shadow removed, neighbours' scraps dropped).
- `CLAY_ICONS` in `assets/brand/registry.ts`; draw with `<ClayIcon name="..." size={64} />`
  from `@/components/ui` (warm grey squircle, art at ~72%), `tile={false}` for art alone,
  `dot` for the apricot "something is waiting" dot, `radius` to match a grid.
- A new sheet: same prompt style, 4x3 on light grey, then add a row to `ICON_SHEETS` in the
  build script (file, the 12 names row by row, the 3 row bands) and the names to `CLAY_ICONS`.

## Art we have

| Sheet | Icons |
| --- | --- |
| 1 | voice, photo, secretNote, quiz (two hearts), truthOrDare (die), date (coffee), calls, diary, ball, planner, play, playStack |
| 2 | gift, store (bag with a shell), contacts (two friends), radio, board (push pin), bedtime (moon and stars), camera, calendar (with a heart), search, compass, music, lock |
| 3 | umbrella, fish, fireworks, headphones, nightSky (window with stars), cake, house, sun, plane, invite (person with a plus), sparkles, levelUp (heart with an up arrow) |

## Done

| Place | File | Icons |
| --- | --- | --- |
| Chat "+" sheet | `src/app/chat/[id].tsx` (`ATTACHMENTS`) | voice, photo, secretNote, quiz, truthOrDare, date, calls, diary |
| Home "Explore" grid | `src/app/(tabs)/index.tsx` (`MODULE_ICONS`) | store, date, diary, camera, contacts, gift (with dot), calls, bedtime, radio, board |
| Home "Today" rows | `src/app/(tabs)/index.tsx` (`todos`) | secretNote (note), gift (spin), compass (meet someone); diary pages and plans keep the friend's face |
| Us "+" sheet | `src/components/us/publish-sheet.tsx` | calendar, diary, board |
| Us plans and moments | `src/app/(tabs)/us.tsx` (`MOMENT_ICON`) | sparkles (met), levelUp, calls, diary, secretNote, date, camera, calendar, board, quiz |
| Free gifts | `src/app/gifts.tsx` | plane (daily share), play (ad), calls / board / invite (share rules) |
| Profile "They reach out" | `src/app/profile.tsx` (`REACH_OUT`) | sun (morning), bedtime (night), calls |
| Date map pins and place sheet | `src/mock/dates.ts` (`icon`), `src/app/dating.tsx` | umbrella, fish, fireworks, headphones, nightSky |
| Couple quiz packs | `src/mock/games.ts` (`icon`), `src/app/quiz/[characterId].tsx` | cake, date, house |

Spare for later: search, compass (used on Home "meet someone"), music, lock, ball, planner, playStack.

## Next (needs sheet 4)

| # | Place | File | Needs (sheet 4 name) | Uses existing art |
| --- | --- | --- | --- | --- |
| 1 | Radio tracks (emoji now) | `src/mock/misc.ts` (`radioTracks`), `src/app/radio.tsx` | fireplace, wave | umbrella (rain), date (cafe), bedtime (lullaby) |
| 2 | Photo booth film count | `src/app/photo-booth.tsx` | film | |
| 3 | Create character: entry and photo drop zone | `src/app/create-character.tsx`, Find "create" entry | wand | voice (voice samples) |
| 4 | "Our dates" album button | `src/app/dating.tsx` | polaroids | |
| 5 | Character profile: memories row and empty state | `src/app/character/[id]/index.tsx`, `memories.tsx` | jar | |
| 6 | Daily calls sheet (who and when) and plan reminder time | `src/components/chat/daily-calls-sheet.tsx`, `src/components/us/plan-sheet.tsx` | alarm | |
| 7 | Chat backgrounds | `src/app/character/[id]/settings.tsx` (change background) | palette | |
| 8 | Quiz score card and date ending | `src/app/quiz/[characterId].tsx`, `src/app/date/[placeId].tsx` | trophy | |
| 9 | Call time balance (Store, History "Call time") | `src/app/store/shell.tsx`, `src/app/store/ledger.tsx` header | hourglass | |
| 10 | Diary "write today" and My diary empty state | `src/app/diary/mine.tsx`, `/diary/write` | pencil | |
| 11 | Empty chats / "start a chat" | `src/app/(tabs)/chat.tsx` empty state | bubbles | |
| 12 | Secret note sealed state | `src/app/secret-note/[id].tsx` | waxLetter | lock |

Keep as line icons: settings rows other than "They reach out", ledger rows
(`src/app/store/ledger.tsx`, dense list), header and tab bar glyphs, close/back/chevron/check,
the shell currency (`Icon3D name="shell"`).

## Prompt for sheet 4

Attach `assets/raw/icons-3d-sheet-3.jpg` as the style reference:

> A set of 12 app icons in one 4x3 grid on a plain light-grey background, same style
> as the attached sheet: each icon a separate soft 3D clay object, glossy, warm pastel
> colours (apricot, mint, lilac, sky blue, cream), gentle top-left light, soft shadow,
> no text, no faces, no outlines, consistent size and angle, generous space between
> icons, nothing touching the edge of its cell. Row 1: a small cosy fireplace with a
> flame, a curling ocean wave, a roll of camera film, a magic wand with a small star.
> Row 2: two overlapping polaroid photos (blank, no picture), a glass jar with tiny
> hearts inside, a round alarm clock, a painter's palette with four paint dots.
> Row 3: a trophy cup, an hourglass, a pencil, two overlapping speech bubbles.

Save it as `assets/raw/icons-3d-sheet-4.jpg`. Names in that order: fireplace, wave, film,
wand, polaroids, jar, alarm, palette, trophy, hourglass, pencil, bubbles. (The table above
also lists a wax-sealed letter; the existing secretNote envelope covers it for now.)
