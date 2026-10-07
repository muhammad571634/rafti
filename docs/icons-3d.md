# 3D clay icons: where they go

The user picked soft 3D clay icons (Nano Banana) as the app-wide icon style for
feature entry points, on 2026-10-07. They replace the Phosphor duotone tiles step
by step. Small UI glyphs (back, close, chevrons, toggles, tab bar) stay as line
icons: the clay style is for "a place you go" or "a thing you do", not for chrome.

## How it works

- Raw sheets: `assets/raw/icons-3d-sheet.jpg` and `assets/raw/icons-3d-sheet-2.jpg`
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

## Done

| Place | File | Icons |
| --- | --- | --- |
| Chat "+" sheet | `src/app/chat/[id].tsx` (`ATTACHMENTS`) | voice, photo, secretNote, quiz, truthOrDare, date, calls, diary |
| Home "Explore" grid | `src/app/(tabs)/index.tsx` (`MODULE_ICONS`) | store, date, diary, camera, contacts, gift (with dot), calls, bedtime, radio, board |
| Home "Today" rows | `src/app/(tabs)/index.tsx` (`todos`) | secretNote (note), gift (spin), compass (meet someone); diary pages and plans keep the friend's face |
| Us "+" sheet | `src/components/us/publish-sheet.tsx` | calendar, diary, board |
| Us plans and moments | `src/app/(tabs)/us.tsx` (`MOMENT_ICON`) | contacts (met), gift (level up), calls, diary, secretNote, date, camera, calendar, board, quiz |
| Free gifts | `src/app/gifts.tsx` | gift (daily share), play (ad), calls / board / contacts (share rules) |
| Profile "They reach out" | `src/app/profile.tsx` (`REACH_OUT`) | date (coffee: morning), bedtime (night), calls |

## Next (needs sheet 3)

| Place | File | Needs |
| --- | --- | --- |
| Date map pins | `src/mock/dates.ts` (`emoji`), `src/app/dating.tsx` | umbrella in rain, fish, fireworks, headphones, starry night |
| Couple quiz packs | `src/mock/games.ts` (`emoji`), `src/app/quiz/[characterId].tsx` | cake slice, little house (Lazy Sunday already has date) |
| Better fits | Us moments, Profile, Free gifts | sun (morning messages), sparkles (met), heart with an up arrow (level up), paper plane (share), person with a plus (invite) |

Keep as line icons: settings rows other than "They reach out", ledger rows
(`src/app/store/ledger.tsx`, dense list), header and tab bar glyphs, close/back/chevron/check,
the shell currency (`Icon3D name="shell"`).

## Prompt for sheet 3 (finishes the list above)

Attach `assets/raw/icons-3d-sheet-2.jpg` as the style reference:

> A set of 12 app icons in one 4x3 grid on a plain light-grey background, same style
> as the attached sheet: each icon a separate soft 3D clay object, glossy, warm pastel
> colours (apricot, mint, lilac, sky blue, cream), gentle top-left light, soft shadow,
> no text, no faces, no outlines, consistent size and angle, generous space between
> icons. Row 1: an umbrella with three raindrops, a round fish, a firework burst,
> headphones. Row 2: a night sky window with stars, a slice of cake, a little house,
> a round sun with short rays. Row 3: a paper plane, a rounded person
> figure with a small plus sign, three sparkles, a heart with a small up arrow.

Save it as `assets/raw/icons-3d-sheet-3.jpg`; names in that order: umbrella, fish,
fireworks, headphones, nightSky, cake, house, sun, plane, invite, sparkles, levelUp.
