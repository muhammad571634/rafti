# RAFTI Product Strategy — v1

**Status:** Working strategy, not yet validated by user research.  
**Date:** 2026-10-12  
**Product:** RAFTI, an original AI companion app.

## Executive decision

RAFTI should not compete primarily on the number of characters, decorative UI, or a long list of modules. Its proposed wedge is **reliable story continuity**: a character should preserve its identity, remember relevant user-approved details, and continue shared events naturally across conversations.

This is a hypothesis to test, not a proven market advantage.

## Initial audience

Adults 18+ who enjoy anime-inspired characters, romantic or friendship roleplay, and ongoing interactive stories on mobile.

Initial product language can remain English while the team validates the experience; localization decisions should follow evidence from the first cohort.

## Core user problem

Users can lose trust when a companion:
- forgets important details or recalls them at the wrong time;
- contradicts its established personality or prior story events;
- repeats generic replies instead of responding to the current scene;
- makes memory opaque or difficult to correct and delete;
- interrupts a conversation with confusing or unexpected monetization limits.

These are candidate problems based on public reviews and community discussions. Their prevalence and importance must be validated directly with target users.

## Product promise

**“Your character remembers what matters and your story keeps moving.”**

The promise must be earned through observed behavior, not marketing copy alone.

## Proposed differentiator: Story Continuity Engine

1. **Character identity:** stable persona, language, speech style, boundaries, and canon facts.
2. **User-controlled memory:** visible, editable, pinnable, and deletable memories with clear provenance.
3. **Story state:** current scene, important past events, unresolved promises, user choices, and relationship state.
4. **Context selection:** retrieve only relevant facts and recent messages for each turn; avoid sending the entire history by default.
5. **Consistency checks:** detect contradictions where feasible and measure continuity using repeatable evaluation scenarios.

The first release should be narrow: text chat with a small original cast. Voice calls, voice cloning, and more modules are not prerequisites for proving this promise.

## Product principles

- Preserve the existing React Native / Expo UI unless user evidence demands a change.
- Do not claim real AI, memory, notifications, purchases, or voice features are live when they are mocked.
- Clearly label usage limits and prices before the user hits them.
- Make proactive greetings optional, adjustable, and easy to pause.
- Support viewing, correcting, and deleting stored memories.
- Use original characters and only authorized voice assets.
- Treat privacy, adult audience positioning, reporting, and safety as launch requirements.

## Success metrics

### North-star candidate
**Weekly users who complete at least 3 meaningful sessions with the same character and report that the character remembered relevant prior context.**

### Early product metrics
- D1 and D7 retention by acquisition cohort.
- Meaningful sessions per active user per week.
- Memory recall accuracy on a fixed evaluation set.
- Persona consistency and story contradiction rate.
- Percentage of users who can correctly find and delete a memory.
- AI cost per meaningful session and gross margin by plan.
- User-reported frustration from repetition, forgetting, and paywall interruption.

Do not optimize only for message count or time spent. Companion products need user trust and healthy controls, not compulsive engagement.

## Validation plan

1. Interview 12–15 adults who currently use companion/roleplay apps. Ask about the last specific time a character forgot, contradicted, or repeated something; do not lead them toward the proposed answer.
2. Build 20–30 scripted continuity scenarios spanning old facts, recent events, changed preferences, corrections, deletions, and contradictions.
3. Compare the current mock flow with a real-model prototype using the same scenarios.
4. Run a small opt-in beta with 20–30 adults; gather qualitative feedback and D1/D7 behavior.
5. Continue only if continuity improves user-perceived quality without unacceptable latency or cost.

These sample sizes are directional discovery cohorts, not statistically representative market research.

## Monetization hypothesis

Start with a free tier that has explicit, predictable usage limits and a paid plan for higher limits and advanced personalization. Treat cosmetic purchases as optional. Price only after measuring inference cost, willingness to pay, and the effect of limits on retention.

Avoid per-message friction unless model economics make it necessary and the cost is clearly communicated.

## Scope priorities

### P0 — before public beta
- Real AI backend with server-side secrets; never embed provider keys in the app.
- Story continuity context builder and memory retrieval.
- Visible memory controls (view, edit, pin, delete).
- Privacy-safe logging, error handling, rate limits, and cost tracking.
- Repeatable continuity evaluations.
- Clear mock/real feature boundaries.

### P1 — after continuity works
- Diary-to-memory flow with explicit user controls.
- Optional character-initiated messages with quiet hours.
- More language support based on evidence.
- Premium tier experiments.

### Later
- Real-time voice calls, voice cloning, elaborate social/community features, and a larger character marketplace.

## Decision gate

Do not declare product-market fit from downloads or enthusiastic comments alone. Look for repeat use, specific evidence that continuity is valuable, acceptable model costs, and users who would be disappointed if the product disappeared.
