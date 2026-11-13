# Agent task: Native Cook blocks, brought in 1:1 (next: the daily check-in)

Read `AGENTS.md`, the top of `HANDOFF.md` (0z117-0z119) and Claude's memories `sell-emotion` and `nativecook-blocks`
first. Reply to the owner in short, plain Uzbek.

## What the owner wants (2026-11-07)

- Sigmazam sells **emotion** through its screens. Native Cook (https://nativecook.dev/blocks/, 766 animated
  React Native blocks, free, commercial use allowed) is the source of that motion.
- **Bring each block's animation over 1:1**: its own code, timings, springs, physics and haptics. Change only what
  is ours: mascot, icons, names, colours and words (in the user's language, all 14 locales). Polish the rest to fit.
  A reinterpretation read "too plain" (the first coin drop); the 1:1 letter (0z119) is the model.
- It must **always work and never crash**: every celebration sits in `SafeMoment` (`src/components/safe-moment.tsx`)
  and behind `skiaReady` (`src/lib/skia-ready.ts`) with a plain fallback.
- A new APK is fine whenever a block needs a native module ("o'ylab o'tirma"). Skia is in APK 1.1.0.

## How to bring a block in

1. The owner pastes the block's React Native prompt. It links the block's files in Native Cook's public repo.
2. `node scripts/native-cook-fetch.mjs <category>/<slug> <tmp-dir> <files...>`: read every file. Do not commit
   their raw prompt text.
3. Copy the state and motion files **unchanged** (as `src/components/envelope/use-envelope.ts` and `motion.ts` were).
   Keep the scene and screen line for line; replace only content (props like `EnvelopeContent`).
4. Lessons from the A51 (Android 13):
   - Skia `Text` with a font from `useFont` works; Skia could **not** load Caveat (`useFonts`/`useTypeface` null)
     and `Paragraph` drew nothing. Handwriting and anything in the user's language: React Native text over the
     canvas, posed each frame from the scene's own worklets (see `envelope-writing.tsx`).
   - Inter in React Native `Text` under-measures on Android and cuts the last letters: use the system face for UI
     text; serif display faces were fine.
   - `eas update` for all platforms fails in Metro (an iOS/web export problem, not yet found): publish with
     `--platform android` until it is fixed.
5. Wire it where it carries emotion, add a Profile → Development row to replay it, `npx tsc --noEmit`, `npm test`,
   `npm run check:locales`, commit, push `local-work`, `eas update --platform android`.
6. **See it on the A51 yourself before reporting**: `node scripts/a51.mjs reload`, `open <path>`, `find "<text>"`,
   `swipe`, `shot <png>`, then look at the shots. A blank or cut element is a bug, not a pass.

## Next: the daily check-in, 1:1 on Coin Drop Reward's own page

The check-in sheet (`src/components/daily-reward-sheet.tsx`, back on Today since 0z117) still looks like the old
sheet with a small drop. Rebuild it on Coin Drop Reward's full page (block `modals/coin-drop-reward`: files
`index.tsx`, `CoinDropReward.tsx`, `cdr-motion.ts`, `cdr-shader.ts`, `cdr-theme.ts`):

- Their page, our content: the wallet pill top right (shells, `wallet.shells`, wobbles as their wallet does), the
  title (`dailyReward.title`), the day's ways to earn shells as their mission rows with the coin (today's check-in
  first; the free spin and the invite from Gifts as the others, each opening its own place), the week's stamps along
  the bottom with today ringed (`DAILY_CHECK_IN`, `daily.checkInDay`), and the toast in the open space.
- Their motion untouched: the coin pops from the row into the toast, turns once, is pulled toward the wallet and
  melts into the drop, pours along the arc, the wallet's jelly, "+N", the success haptic. Our shader is already
  recoloured apricot with a scallop shell (`src/components/coin-drop/cdr-shader.ts`); compare the rest with their
  `CoinDropReward.tsx` and bring back whatever 0z117 left out (their page layout, the mission rows, the cooldown).
- It opens once a day on Today (the store sets `dailyReward`), and from Profile → Development → "Show the daily
  check-in". The shells are already credited: the wallet shows the balance before them until the drop lands.

## After it

The same 1:1 pass over the earlier ports where they drifted: the coin drop on Gifts' wheel (0z117) and "Closer"
(0z118, Level Up Takeover). Then the owner's next block from the shortlist in memory `nativecook-blocks`.
