# Ink task 0: tokens, fonts and the kit (lands first, alone)

Rules: `docs/agent-tasks/ink-rules.md`. Plan and names: `docs/design-ink.md` §2.
No screen changes in this task. When it is done the app looks exactly as before.

## Build

1. **Tokens** (`src/theme/colors.ts`, `src/theme/typography.ts`, `src/theme/layout.ts`, exported
   from `src/theme/index.ts`):
   - `ink` with the dark and light values from the plan's table, chosen by the same `isDark` the
     file already uses. If the lead's prototype note at the top of `docs/design-ink.md` says
     "always dark", export the dark set for both.
   - `friendGlow(characterId): { from: string; to: string; word: string }` on the same index as
     `friendHues` / `friendAccent` (`friendHueIndex`): `from` the hue at full strength, `to` a
     neighbour 30° round the wheel, `word` the hue lifted to at least 4.5:1 on `ink.ground`.
     `moduleGlow(key)` the same from `moduleFills`. Unit tests: every hue's `word` passes 4.5:1 on
     the ground in both themes; ids map stably.
   - `fonts.serif`, `fonts.serifItalic` (Source Serif 4, `@expo-google-fonts/source-serif-4`:
     `SourceSerif4_600SemiBold`, `SourceSerif4_600SemiBold_Italic`; check the exact export names in
     the package before writing them), loaded in `src/app/_layout.tsx` beside the others.
     Type variants `inkDisplay`, `inkTitle`, `inkCard`, `inkNumeral` as in the plan.
     This is the one new dependency of the whole work; install with `npx expo install`.
   - `inkRadius = { card: 28, tile: 32, field: 20 }`, `inkGutter = 20`.
2. **Kit** in `src/components/ink/` with an `index.ts`. Each part: typed props, `accessibilityRole`
   and label, 44+ target, Dynamic Type safe, no hex, a short doc comment saying where it is used.
   - `InkScreen`: ground, status bar style, safe areas, `scroll` option, optional `header`
     (`StepHeader` or a title row) and a pinned `footer` (the pill area with the bottom inset).
   - `InkTitle`: `variant` display | title | card; children may hold `<InkTitle.Em color>` parts
     (italic, coloured); `lines` cap; wraps `LineIn` from the motion kit when `animate`.
   - `PillButton`: `kind` primary | outline | quiet; `size` lg (56) | md (48); `disabled`,
     `loading` (a small `DotField`), optional trailing icon; haptic as the current `Button`.
   - `InkChip`: label, `on`, optional `hue`; a leading plus variant; fixed height 36.
   - `InkRow`: leading line icon (optional `tint`), title, optional value, trailing arrow | radio |
     checkbox | switch | node; hairline unless `last`; pressed state `ink.raised`.
   - `InkSection`: a 13 pt grey label over a group of rows.
   - `GlowCard`: `hue` (a glow), top-left note, top-right capsules, bottom-left children, a
     trailing slot (picture, face, shape); the light is a `LinearGradient` from the hue at 26%
     to `ink.card`, never a blur (the A51 cannot afford it).
   - `Tile`: flat `hue`, serif name centred, count at the bottom, optional bookmark slot.
   - `StepHeader`: back arrow, progress line (animated width), `step / of`.
   - `RoundIcon`: 40 or 44, `ink.raised`, a line icon.
   - `InkField`: single or multi line, counter, the serif placeholder for a big question field.
   - `InkSheet`: the existing `Sheet` (`src/components/ui/sheet.tsx`) restyled by props, never a
     second sheet implementation; height capped to the screen.
   - `BigNumeral`: serif numeral, tabular.
3. **Gallery**: `src/app/ink-gallery.tsx`, reachable only behind the existing `SHOW_DEV` switch
   in Profile: every kit part in every state, in both themes, with a 40-character Russian label.
   This is what the lead checks on the A51.

## Do not

- Change `src/components/ui/**` behaviour (restyling by new props on `Sheet` is fine).
- Touch any screen except adding the gallery route and its dev row.
- Write motion: import `LineIn`, `DotField` from `src/components/ink/motion` (the lead lands
  them first; if a part is missing, render without it behind a `TODO(motion)` and say so).

## Done means

`npx tsc --noEmit` and `npm test` pass; the gallery shows every part; no screen changed
(`git diff --stat` touches only `src/theme/**`, `src/components/ink/**`, `src/app/_layout.tsx`,
`src/app/ink-gallery.tsx`, `src/app/profile.tsx` (one dev row), `package.json`, lock file).
