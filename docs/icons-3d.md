# 3D clay icons: where they go

The user picked soft 3D clay icons (Nano Banana) as the app-wide icon style for
feature entry points, on 2026-10-07. They replace the Phosphor duotone tiles step
by step. Small UI glyphs (back, close, chevrons, toggles, tab bar) stay as line
icons: the clay style is for "a place you go" or "a thing you do", not for chrome.

## How it works

- Raw sheets: `assets/raw/icons-3d-sheet.jpg`, `-sheet-2.jpg`, `-sheet-3.jpg`, `-sheet-4.jpg`
  (4 columns x 3 rows each, flat light grey; sheet 4 is wide, 1024 x 559).
- Clear glass (jar, hourglass) is cut with a tighter backdrop test (`GLASS_ICONS`).
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
| 4 | fireplace, wave, film, wand, polaroids, jar (hearts), alarm, palette, trophy, hourglass, pencil, bubbles |

## Done

| Place | File | Icons |
| --- | --- | --- |
| Chat "+" sheet | `src/app/chat/[id].tsx` (`ATTACHMENTS`) | voice, photo, secretNote, quiz, truthOrDare, date, calls, diary |
| Home "Explore" grid (4 columns, 68px art, no tile, right under the Today card since 2026-10-07) | `src/app/(tabs)/index.tsx` (`MODULE_ICONS`) | store, date, diary, camera, contacts, gift (with dot), calls, bedtime, radio, board |
| Home "Today" rows | `src/app/(tabs)/index.tsx` (`todos`) | secretNote (note), gift (spin), compass (meet someone); diary pages and plans keep the friend's face |
| Us "+" sheet | `src/components/us/publish-sheet.tsx` | calendar, diary, board |
| Us plans and moments | `src/app/(tabs)/us.tsx` (`MOMENT_ICON`) | sparkles (met), levelUp, calls, diary, secretNote, date, camera, calendar, board, quiz |
| Free gifts | `src/app/gifts.tsx` | plane (daily share), play (ad), calls / board / invite (share rules) |
| Profile "They reach out" | `src/app/profile.tsx` (`REACH_OUT`) | sun (morning), bedtime (night), calls |
| Date map pins and place sheet | `src/mock/dates.ts` (`icon`), `src/app/dating.tsx` | umbrella, fish, fireworks, headphones, nightSky |
| Couple quiz packs | `src/mock/games.ts` (`icon`), `src/app/quiz/[characterId].tsx` | cake, date, house |

| Radio tracks | `src/mock/misc.ts` (`radioTracks`), `src/app/radio.tsx` | umbrella, fireplace, wave, date (cafe), bedtime (lullaby) |
| Photo booth film count | `src/app/photo-booth.tsx` | film |
| Contacts "Add one" tile | `src/app/contacts.tsx` | wand |
| Create character photo drop zone | `src/app/create-character.tsx` | photo |
| "Our dates" album button | `src/app/dating.tsx` | polaroids |
| Character profile memories row, Memories empty state | `src/app/character/[id]/index.tsx`, `memories.tsx` | jar |
| Character settings: chat and character groups | `src/app/character/[id]/settings.tsx` | calls, bubbles, search, palette, jar, wand (clear chat and reset stay line icons) |
| Daily calls sheet morning / night | `src/components/chat/daily-calls-sheet.tsx` | sun, bedtime |
| Quiz score | `src/app/quiz/[characterId].tsx` | trophy |
| History "Call time" | `src/app/store/ledger.tsx` | hourglass |
| Empty chats | `src/app/(tabs)/chat.tsx` (`EmptyState icon`) | bubbles |

`EmptyState` takes `icon` to show a clay icon in place of the mascot.

Spare: compass (Home "meet someone"), music, lock, ball, planner, playStack, alarm, pencil.
Not changed on purpose: the approved Diary screens (pencil would fit "write today"), the
date ending polaroid, the chat "+" sheet (alarm could replace calls on Daily calls).

Keep as line icons: settings rows other than "They reach out", ledger rows
(`src/app/store/ledger.tsx`, dense list), header and tab bar glyphs, close/back/chevron/check,
the shell currency (`Icon3D name="shell"`).

## A new sheet

Prompt style for any further sheet (attach the latest sheet as the reference):

> A set of 12 app icons in one 4x3 grid on a plain light-grey background, same style
> as the attached sheet: each icon a separate soft 3D clay object, glossy, warm pastel
> colours (apricot, mint, lilac, sky blue, cream), gentle top-left light, soft shadow,
> no text, no faces, no outlines, consistent size and angle, generous space between
> icons, nothing touching the edge of its cell. Row 1: ... Row 2: ... Row 3: ...

## Single-icon renders (2026-10-07)

The ten Home module icons (store, date, diary, camera, contacts, gift, calls, bedtime, radio,
board) were redrawn one by one with Grok Image 2.0 on Higgsfield (~$0.08 each), one object on
light grey, references: the approved store render + `icons-3d-sheet.jpg`. Raws live in
`assets/raw/icons-3d/<name>.png`; `python scripts/build-brand-art.py icons` cuts them and they
replace the sheet cut of the same name everywhere the icon is used.

Tab bar (2026-10-07): `tab-home`, `tab-chat`, `tab-us`, `tab-find` drawn the same way. The build
script also writes `icon3d-tab-*-off.png` (the art in soft grey) for tabs that are not current;
`TAB_ICONS` in `assets/brand/registry.ts`, 44px in `src/app/(tabs)/_layout.tsx`.
