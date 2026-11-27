# Story Continuity Engine — Architecture v1

**Status:** Initial technical design. This document does not imply that a production AI backend exists.

## Current baseline

The current app is Expo SDK 57 / React Native 0.86 with Expo Router and Zustand. The current store persists messages, relationships, and memory items in AsyncStorage. The chat reply path in `src/store/use-app-store.ts` uses `scheduleReply()` and canned mock replies. This is a client-side prototype, not a secure multi-user AI backend.

Relevant current types are in `src/types/index.ts`: `Character`, `Message`, `Relationship`, and `MemoryItem`.

## Target flow

1. Receive a user message.
2. Load the character's canonical persona and the conversation's recent messages.
3. Retrieve a bounded set of relevant memories and story events.
4. Build a structured context package with source and confidence metadata.
5. Call a server-side model adapter with server-held credentials.
6. Validate output, apply safety checks, and stream/return the response.
7. Persist the response and, separately, propose candidate memories.
8. Only promote durable memories using clear rules; allow the user to inspect, edit, or delete them.

## Context package

Suggested conceptual schema:

- `characterIdentity`: canonical name, persona, style, language, boundaries, and stable facts.
- `relationshipState`: relationship level and user-controlled settings; avoid treating game points as real emotional consent.
- `recentMessages`: a bounded chronological window.
- `relevantMemories`: selected memories with ids, text, source, timestamp, pinned status, and confidence.
- `storyState`: recent events, unresolved promises, current scene, and user decisions.
- `responsePolicy`: language, response format, safety requirements, and output limits.

The model must distinguish user-provided facts from inferred details. Do not silently convert uncertain inferences into permanent memories.

## Retrieval policy for v1

The approved memory plan is `docs/backend-plan.md` §7 and §12.1–12.3; it wins where this section
differs. `src/lib/story-continuity.ts` follows it: the last 30 messages, every pinned fact (up to 20),
the 8–12 most relevant active facts ranked by `similarity × 0.6 + importance × 0.3 + recency × 0.1`,
and no superseded or archived facts. Similarity is keyword overlap for now; pgvector replaces it on
the server.

- Pinned memories are candidates for inclusion, but still obey context limits and deletion rules.
- Prefer relevance to the current user message, recency, and explicit importance.
- Deduplicate near-identical memories.
- Do not retrieve deleted memories.
- Never use another user's memory.
- Keep recent messages separate from durable memories.
- Add token/context limits and log retrieval IDs, not unnecessary raw personal content.
- A simple deterministic scorer is acceptable for the first prototype; embeddings/vector search are not mandatory until evaluation shows a need.

## Memory lifecycle

Candidate → accepted/confirmed (when appropriate) → active → edited or deleted.

For sensitive or uncertain facts, ask for confirmation or do not persist. Deletion must remove the record from future retrieval; if a production backend is introduced, define retention and deletion behavior for logs and backups as well.

## Backend boundary

The mobile app must not contain provider API keys. Use an authenticated server endpoint and enforce user/character ownership server-side. A later backend may use PostgreSQL plus a vector extension if semantic retrieval warrants it, but the existing app should not adopt a database or vendor before the requirements are validated.

## Evaluation

Create a fixed dataset of 20–30 multi-turn cases:
- recall an old, relevant fact;
- ignore an irrelevant memory;
- respect a corrected preference;
- do not recall deleted information;
- preserve a character's voice;
- continue a story after a time gap;
- avoid inventing a prior event;
- resolve conflicting old/new facts in favor of the user's correction;
- maintain the requested language;
- avoid overconfident recall.

Score factual recall, relevance, persona consistency, contradiction rate, deletion compliance, latency, and cost. Compare model/prompt changes against the same dataset.

## Non-goals for first iteration

- Full production voice calling.
- Voice cloning.
- Social feed or public character marketplace.
- Complex emotional-state inference.
- Automatic storage of every chat message as a durable memory.
- Replacing the current frontend or introducing a new state-management framework.

## Release gates

Do not enable real-model calls in a public build until server-side key handling, authentication/authorization, rate limits, cost controls, privacy disclosures, deletion behavior, and basic safety handling are reviewed.
