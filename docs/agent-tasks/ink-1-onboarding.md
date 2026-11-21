# Ink task 1: onboarding, language, launch type

Rules: `docs/agent-tasks/ink-rules.md`. Plan: `docs/design-ink.md` §3 (first row). Needs task 0.

Files you own: `src/app/onboarding.tsx`, `src/app/language.tsx`,
`src/components/profile/language-list.tsx`, `src/components/notifications/lock-preview.tsx`.
Leave `src/components/onboarding/glass-icon-orbit.tsx` and `src/components/launch/**` as they are.

## Target

Read `onboarding.tsx` top to bottom first and list its steps and what each one stores; that list
does not change (same steps, same order, same store calls, same skips).

- The first screen (the orbit) stays. Its button becomes the white `PillButton`.
- Every later step: `InkScreen` with `StepHeader` (back, progress, `n / N` from the real step
  count), one `InkTitle variant="display"` question, the pill pinned at the bottom, disabled until
  the step has what it needs, a `quiet` pill under it where the step can be skipped today.
- A step that picks one or many from a list: `InkRow`s with radio or checkbox (hairlines, no cards).
- The name and birthday steps: `InkField` / the native picker on `ink.ground`.
- The step that picks the first friends (the deck of `DeckCard`s): keep the photo cards (they
  are the product) on black, name in serif, relation in italic in the friend's `friendGlow.word`;
  the chosen card gets a white 2 px ring. `portraitPosition` framing stays.
- The notification step keeps `LockPreview`, restyled on black.
- The gender / pronouns step and the language step: rows.
- `language.tsx`: serif title, rows with a check.

## Worst cases to check in code

Smallest phone height (640 pt): the question, three options and the pill all fit or scroll; the
pill never covers the last option; keyboard up on the name step; 14 locales (German and Russian
titles wrap to three lines at most; no clipping).

## Done means

Every step reachable in the same order with the same data stored; `npx tsc --noEmit`, `npm test`.
