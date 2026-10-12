# Claude Code Task — RAFTI Story Continuity Foundation

You are implementing a narrow, reviewable first slice in the existing RAFTI repository. Read `AGENTS.md`, `HANDOFF.md`, `README.md`, and the exact Expo SDK 57 documentation at https://docs.expo.dev/versions/v57.0.0/ before editing. Preserve the current UI and architecture.

## Objective

Create a pure, deterministic Story Continuity context builder that can be tested locally and later used by a real server-side AI adapter. Do NOT pretend the mock reply path is real AI. Do NOT add an LLM provider, API key, database, or new dependency in this task.

## Read first

- `src/types/index.ts`: Character, Message, Relationship, MemoryItem types.
- `src/store/use-app-store.ts`: current mock reply flow and persistence.
- `package.json`: available scripts and test tooling.
- `docs/product/RAFTI_PRODUCT_STRATEGY.md`
- `docs/architecture/STORY_CONTINUITY_ENGINE.md`

## Implementation requirements

1. Implement a small pure TypeScript module under `src/lib/` that accepts the current character, relationship (if any), recent messages, and that character's memories plus the current user message.
2. Return a structured, bounded context object with:
   - stable character identity and relevant persona fields;
   - concise relationship state without implying that game levels equal consent;
   - recent messages in chronological order;
   - ranked relevant memories, preserving pinned items where feasible;
   - explicit limits for maximum recent messages and memories;
   - source metadata so memories can be inspected and debugged.
3. Use deterministic relevance scoring (keyword overlap + recency + pin boost is sufficient). Deduplicate memories. Never include memories belonging to another character. Never include deleted memories if the type is extended later; do not invent a deleted flag if it is not part of the current schema.
4. Do not persist automatically inferred sensitive facts. This task is context assembly only; do not implement autonomous memory extraction.
5. Keep it provider-agnostic and free of network calls.
6. Add tests using an existing test runner if one is already configured. If no runner exists, do not install one automatically; add a small documented manual test harness or explain the recommended next step.
7. Do not wire the context into `scheduleReply()` in a way that makes canned replies appear context-aware. Leave mock behavior clearly mock until a real model adapter exists.
8. Add concise documentation showing inputs, output, limits, and known limitations.
9. Run `npx tsc --noEmit`; run existing relevant tests; inspect the diff. Fix any errors introduced by your changes.
10. Keep the existing UI unchanged. No package additions without a clear necessity.

## Workflow

- Work on branch `strategy/story-continuity-v1`, not `main`.
- Check git status and the current branch before editing.
- Make small, reviewable changes.
- Report files changed, behavior implemented, commands/tests run, failures or unverified items, and exact next step.
- Do not push or merge unless explicitly requested.

## Acceptance criteria

- The builder is pure and deterministic for the same inputs.
- Output is bounded and chronological where ordering matters.
- Only the requested character's memories can be selected.
- Pinned and relevant memories are ranked predictably.
- No external API calls, secrets, or new dependencies are added.
- Existing UI and mock behavior remain unchanged.
- TypeScript typecheck passes.
