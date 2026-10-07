# 3D clay icons: where they go

The user picked soft 3D clay icons (Nano Banana) as the app-wide icon style for
feature entry points, on 2026-10-07. They replace the Phosphor duotone tiles step
by step. Small UI glyphs (back, close, chevrons, toggles, tab bar) stay as line
icons: the clay style is for "a place you go" or "a thing you do", not for chrome.

## How it works

- Raw sheet: `assets/raw/icons-3d-sheet.jpg` (4 columns x 3 rows, flat light grey).
- `python scripts/build-brand-art.py icons` cuts it into `assets/brand/icon3d-*.png`
  (grey backdrop and shadow removed, neighbours' scraps dropped).
- `CLAY_ICONS` in `assets/brand/registry.ts`; draw with `<ClayIcon name="..." size={64} />`
  from `@/components/ui` (warm grey squircle, art at ~72%), or `tile={false}` for art alone.
- A new sheet: same prompt style, 4x3 on light grey, then add its names to `ICONS_3D`
  and `ICON_ROWS` in the build script (or a second list for a second sheet file).

## Done

| Place | File | Icons |
| --- | --- | --- |
| Chat "+" sheet | `src/app/chat/[id].tsx` (`ATTACHMENTS`) | voice, photo, secretNote, quiz, truthOrDare, date, calls, diary |

## Next (in this order)

| # | Place | File | Uses existing art | Needs new art |
| --- | --- | --- | --- | --- |
| 1 | Home "Explore" grid | `src/app/(tabs)/index.tsx` (`MODULE_ICONS`, `ModuleCell`) | date (Dating), diary (Diary), calls (Call history), photo (Photo booth: or a camera) | store (bag with a shell), gifts (gift box), contacts (two friends), radio, board (push pin), bedtime (moon and stars) |
| 2 | Home "Today" rows | `src/app/(tabs)/index.tsx` (`todos`) | diary (new page), secretNote (note) | gift (spin), calendar (plan) |
| 3 | Us "+" sheet | `src/components/us/publish-sheet.tsx` (`OPTIONS`) | diary, planner (Plan for now) | push pin (Board), calendar with heart (Plan) |
| 4 | Free gifts | `src/app/gifts.tsx` (invite, daily share, ad row) | play (watch an ad) | person with a plus (invite), paper plane (share) |
| 5 | Date map pins | `src/mock/dates.ts` (`emoji`) and `src/app/dating.tsx` (`tile`) | date (coffee) | umbrella in rain, fish, fireworks, headphones, night sky |
| 6 | Couple quiz packs | `src/mock/games.ts` (`emoji`) and `src/app/quiz/[characterId].tsx` | date (Lazy Sunday) | cake slice, little house |
| 7 | Us moments | `src/app/(tabs)/us.tsx` (`MOMENT_ICON`) | quiz, calls, diary, date, photo, secretNote | sparkles (met), heart up-arrow (level up) |
| 8 | Profile "They reach out" | `src/app/profile.tsx` (`REACH_OUT`) | calls | sun, moon |

Keep as line icons: ledger rows (`src/app/store/ledger.tsx`, dense list), header and
tab bar glyphs, close/back/chevron/check, the shell currency (`Icon3D name="shell"`).

## Prompt for sheet 2 (covers Home and most of the list above)

Attach the first sheet (`assets/raw/icons-3d-sheet.jpg`) as the style reference:

> A set of 12 app icons in one 4x3 grid on a plain light-grey background, same style
> as the attached sheet: each icon a separate soft 3D clay object, glossy, warm pastel
> colours (apricot, mint, lilac, sky blue, cream), gentle top-left light, soft shadow,
> no text, no faces, no outlines, consistent size and angle, generous space between
> icons. Row 1: a gift box with a ribbon, a shopping bag with a small seashell on it,
> two rounded friend figures side by side (no faces), a retro radio. Row 2: a push pin,
> a crescent moon with two stars, a camera, a calendar page with a small heart.
> Row 3: a paper plane, an umbrella with raindrops, a round fish, a firework burst.
