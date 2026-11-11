# Ink tasks: rules every task follows

Read first: `AGENTS.md`, `.agents/rules/project-memory.md`, `docs/design-ink.md` (the plan and the
token / kit names), then your own task file. The lead on this work is Fable; questions about look
or structure go into your report, not into a guess.

## The one rule

**The look changes, the logic does not.** You restyle and re-lay-out screens with the Ink kit.
You do not change what a tap does, what is stored, what the model is asked, what a string says.

- Off limits: `src/store/**`, `src/ai/**`, `src/lib/**`, `src/notifications/**`, `src/db/**`,
  `server/**`, `supabase/**`, `src/mock/**`, `src/app/chat/[id].tsx`, `src/app/diary/**`,
  `src/components/diary/**`, `src/components/share/**`, `src/components/ink/motion/**` (the lead's).
- Every handler, selector, hook call, route and `accessibilityLabel` a screen has today is still
  there when you finish. Move JSX and styles; keep the wiring. If a control has no place in the new
  layout, keep it (an `InkRow`, a `RoundIcon`) and name it in your report; never drop it.
- Strings: reuse the existing keys. A new string only when the layout truly needs one, then in all
  14 locales (`npm run check:locales`). No helper subtitles (minimal text rule).

## How to build

- Only the kit in `src/components/ink/` and tokens from `ink` / `friendGlow` / `moduleFills`.
  No hex in a screen, no copy of a button or card in a screen, no new dependency.
- Missing a kit part? Add it to the kit (task 0 owns the kit; later tasks may add a part, never
  change an existing part's props; say so in the report).
- Motion parts come from `src/components/ink/motion/` as they are. Do not write your own
  animations, do not remove an animation that exists (typing dots, voice wave, launch, orbit).
  Popups and sheets appear instantly as today.
- Both platforms; safe areas; Dynamic Type up to 1.3x without clipping; touch targets 44+.
- Sheets never taller than the screen; lists with 0, 1 and 60 items; names of 40 characters;
  Russian and German strings (the longest) fit; keyboard up; two quick taps on a pick list move
  nothing under the finger.
- A file you touch keeps the repo's formatting (single quotes, wide lines). No reformat-only diffs.
- Edits are atomic per file: the phone hot-reloads on each save, a definition and its use land in
  one edit.

## Git and checks

- Work in the worktree you were started in. First: `git fetch origin && git reset --hard
  origin/local-work` (a desktop worktree is cut from `main`, which is old). Push with
  `git push origin HEAD:local-work` after `git pull --rebase origin local-work`.
- Add your line to `.agents/now.md` in `C:\Users\joray\BIMOBIMO` (who, task, files) and remove it
  at the end. Commit only paths you changed, by name; never `git add -A`.
- One commit per screen or small group, message in English, `style(<area>): … (Ink)`.
- Before each push: `npx tsc --noEmit`, `npm test`, `npm run check:locales` if strings changed.
- Do not run `eas update`, `flyctl`, migrations, or the A51: the lead does the phone pass.
- Do not edit `HANDOFF.md` or `docs/flows.md` (hot files): put your notes in the report.

## Report (your last message)

Per screen: what moved where, every control kept and where it sits now, anything you could not
place, kit parts added, strings added, and what you did not verify.
