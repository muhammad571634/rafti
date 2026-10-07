# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Rafti — any agent (Claude, Gemini/Antigravity, Codex) starts here

1. Read `HANDOFF.md` in this repo — its top block says exactly what to do next.
   Flow order and status: `docs/flows.md`.
2. Read `AGENT-START.md` in the sibling strategy repo `rafti-research`
   (`../rafti-research/`, branch `claude/bimobimo-teardown`). It gives the reading
   order, the per-flow workflow and where we stopped.
3. BIMOBIMO screenshots: `#1-#99`, `#101` in `rafti-research/`, `#100`, `#102-#133` in
   `rafti-research-2/`. Index: `rafti-research/teardown/screens.md`. Open only the
   `#N` refs listed for the current flow in `rafti-research/spec/design-plan.md`.

Rules:
- Reply to the user in Uzbek; code comments in English.
- Prototype (image or HTML mockup) first; write code only after the user approves.
- Change only what the user asked. Do not remove animations on your own.
- Never redesign or rewrite a screen the user already approved (see `HANDOFF.md`, e.g. the
  Heartbeat diary in `src/app/diary/`) unless the user asks for that exact change.
  On a merge conflict in such a file, keep the approved version and ask.
- Keep the current Rafti design system (`src/theme`, `src/components/ui`).
  Explore uses variant B (Phosphor duotone icons).
- Take only structure and logic from BIMOBIMO, never its images or text.
  No real people or copyrighted characters.
- Generate images sparingly: one test image, show it, then a batch with count stated.
- Never write API keys into chat or files; use environment variables only.
- Before finishing code: `npx tsc --noEmit` must pass. Add a short note to `HANDOFF.md` and
  update `docs/flows.md`. The user has given standing permission to commit and push each
  finished flow to `local-work`; anything else, ask first.
