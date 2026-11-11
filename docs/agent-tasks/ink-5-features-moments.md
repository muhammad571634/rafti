# Ink task 5: feature screens and moments

Rules: `docs/agent-tasks/ink-rules.md`. Plan: `docs/design-ink.md` §3. Needs task 0 and the
motion kit (`DotField`, `CountIn`, `PulseRing`).

Files you own: `src/app/radio/**`, `src/components/radio/**`, `src/app/board/**`,
`src/components/board/**` (paper notes keep their paper: only the screen around them),
`src/app/streams/**`, `src/app/photo-booth.tsx`, `src/components/photo-booth/**` (frames and
pictures untouched), `src/app/dating.tsx`, `src/app/date/**`, `src/components/date/**` (the
polaroid and tickets untouched), `src/app/quiz/**`, `src/app/secret-note/**`,
`src/components/secret-note/**`, `src/app/alarms/**`, `src/components/alarms/**`,
`src/app/bedtime.tsx`, `src/components/bedtime/**`, `src/app/call/**`, `src/components/call/**`,
`src/app/group/[id]/call.tsx`, `src/components/level-up/**`, `src/components/feature/**`.

## Feature screens (radio, board, streams, photo booth, dating, quiz, alarms)

One pattern, from the reference's Tools: a shelf screen is `InkTitle` + a grid of `Tile`s or a
column of `GlowCard`s in the module's glow (`moduleGlow`); a detail screen is one hero (the
picture, the player, the note) + `InkRow`s + the pinned white pill. `feature-kit.tsx` parts are
re-expressed with the Ink kit (keep their exports so nothing breaks; they render Ink inside).
Content art that is the same in both themes (paper notes, tickets, booth frames, the alarm's
sunrise) stays exactly as it is.

## Moments (calls, incoming call, alarm ring, bedtime, level-up)

They are already dark and full-bleed. Change only: titles to the serif, buttons to the pill
family (answer / decline keep green and red), fine print sizes, the minutes-left ring to a
`PulseRing`. Level-up: the numeral through `CountIn`; every existing burst, sweep and haptic stays.
Bedtime: the breathing part uses `DotField` only where there is a static picture today; an
existing animation is never replaced.
The voice wave, typing dots, call timers and every call control stay where they are.

## Worst cases

A call with a 40-character name; an alarm ringing on the smallest phone; radio with no clips;
a date with the longest place name; level-up at level 10 (two digits in the numeral).
