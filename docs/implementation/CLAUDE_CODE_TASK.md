# Claude Code Task — Verify Sigmazam Story Continuity Foundation

You are reviewing and hardening a narrow, reviewable first slice in the existing Sigmazam repository. Read `AGENTS.md`, `HANDOFF.md`, `README.md`, and the exact Expo SDK 57 documentation at https://docs.expo.dev/versions/v57.0.0/ before editing. Preserve the current UI and architecture.

## Objective

Review and validate the existing pure TypeScript context builder in `src/lib/story-continuity.ts`. Fix correctness issues, add practical tests if the repository already has a test runner, and make sure it is ready to be integrated later with a real server-side AI adapter.

Do NOT pretend the mock reply path is real AI. Do NOT add an LLM provider, API key, database, or new dependency in this task.

## Read first

- `AGENTS.md`, `HANDOFF.md`, `README.md`
- `src/types/index.ts`: Character, Message, Relationship, MemoryItem types.
- `src/lib/story-continuity.ts`: current context builder.
- `src/store/use-app-store.ts`: current mock reply flow and persistence.
- `package.json`: available scripts and test tooling.
- `docs/product/RAFTI_PRODUCT_STRATEGY.md`
- `docs/architecture/STORY_CONTINUITY_ENGINE.md`

## Required review cases

1. Same inputs produce the same output (use the explicit reference-time argument when evaluating recency).
2. Recent messages are chronological and never exceed the configured limit, including a limit of zero.
3. Memory results never include another character's memories.
4. Duplicate memory text is deduplicated predictably.
5. Pinned memories receive a deterministic ranking boost.
6. Empty or low-information user messages do not cause arbitrary old memories to flood the context.
7. Invalid timestamps do not crash the builder or outrank valid relevant memories unexpectedly.
8. Limits are clamped to safe non-negative bounds.
9. Message image/voice records do not leak local image URIs; use safe placeholders/transcripts only.
10. Relationship output does not imply that level or intimacy represents real-world consent.

## Implementation rules

- Keep the builder pure, provider-agnostic, and free of network calls.
- Do not persist automatically inferred sensitive facts. This task is context assembly only.
- Add tests using an existing test runner if one is already configured. If no runner exists, do not install one automatically; document the lack of automated tests and provide a small manual verification approach or a recommendation for the next task.
- Do not wire the context into `scheduleReply()` in a way that makes canned replies appear context-aware. Leave mock behavior clearly mock until a real model adapter exists.
- Keep the existing UI unchanged. No package additions without a clear necessity.

## Workflow

- Work on branch `strategy/story-continuity-v1`, not `main`.
- Check git status and current branch before editing.
- Make small, reviewable changes.
- Run `npx tsc --noEmit`; run existing relevant tests; inspect the diff.
- Report files changed, behavior implemented, commands/tests run, failures or unverified items, and the exact next step.
- Do not push or merge unless explicitly requested.

## Acceptance criteria

- Context construction is pure, deterministic, bounded, and tested to the extent supported by the repository.
- Recent messages are ordered and bounded.
- Only the requested character's memories can be selected.
- Pinned and relevant memories are ranked predictably.
- No external API calls, secrets, or new dependencies are added.
- Existing UI and mock behavior remain unchanged.
- TypeScript typecheck passes, or any baseline/environment failure is clearly reported.
