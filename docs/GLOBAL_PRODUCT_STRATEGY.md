# Rafti Global Product Strategy

**Status:** Working strategy based on founder decisions made 2026-10-08. Unvalidated claims are hypotheses, not market facts.

## Founder decisions

- Rafti is positioned for a global audience.
- English is the only product language for the initial product. Do not plan Uzbek, Russian, or other launch localization unless the founder changes this decision.
- Users choose the relationship they want with a character. Friendship, close friendship, romance, and other supported paths are choices. Romance is neither the default nor the only product promise.
- BIMOBIMO is a reference for product mechanics and engagement loops. Rafti uses original characters, writing, visuals, and world-building.
- **Oppa (`c_oppa`) is the selected first vertical-slice character.** In the current mock data, Oppa is a custom boyfriend character; the implementation brief must preserve user choice and avoid assuming romance as the only supported relationship.

## Product thesis

Rafti helps adults build an ongoing connection with original AI characters. A character remembers useful details, maintains continuity across conversations and activities, and follows the relationship style selected by the user.

**Positioning hypothesis:** “AI companions who remember what matters and grow with your story.” Validate this before using it as final marketing copy.

Rafti is an entertainment and companionship product, not therapy, professional advice, or a substitute for human relationships.

## Product principles

1. **User-directed relationships:** Users can choose and change a relationship path. A character must not turn a platonic relationship romantic without the user's direction.
2. **Useful, inspectable memory:** Users can view, correct, and remove memories; corrected or removed memories must affect future conversations.
3. **Continuity:** Chat, plans, diary, and other activities reinforce the same character relationship and shared history.
4. **Original IP:** Learn interaction patterns from competitors, but do not copy their text, art, or protected characters.
5. **Honest economics:** Disclose prices before spending. Do not promise unlimited use until measured AI and voice costs support it.
6. **Safety and control:** Keep the 18+ boundary, clear AI disclosure, reporting and blocking, privacy controls, and a non-manipulative tone.

## How to learn from BIMOBIMO

Borrow and adapt the mechanics already reflected in Rafti's flow map:

- Fast path from onboarding to a first character and conversation.
- Reasons to return, such as character activity, plans, and diary entries.
- Relationship progression and activities that unlock over time.
- Transparent rewards, purchases, and referrals.
- Shareable moments users actually want to show others.

Do not treat screen count or feature parity as differentiation. Do not copy BIMOBIMO's art, writing, celebrity or copyrighted character catalog, or economy values without Rafti-specific cost and user evidence.

## Product sequence

### Stage 1 — Prove the core promise

Use the existing UI as a prototype. Recruit English-speaking adults from more than one region. Test whether users understand and value the relationship choice, Oppa, and the promise of continuity, and whether they want to return.

### Stage 2 — Build one real vertical slice

After implementation scope is approved, make Oppa work end to end:

- Real server-backed conversation; keep secrets on the server.
- Persistent messages and real character responses.
- Memory extraction, review, edit, and delete. Edited or deleted memories must affect future prompts.
- Relationship preference included in character behavior and preserved across sessions.
- Per-call model cost, latency, and failure telemetry.
- Safe failure handling, including refund or equivalent recovery when a paid action fails.

Keep other flows as prototypes or mocks while this slice is evaluated. Do not begin live calls, voice cloning, broad user-generated content, or a full monetization system in this stage.

### Stage 3 — Validate retention and economics

Measure the real experience before expanding characters, voice, or paid features. Use conversation quality, memory corrections, and cost by usage level to decide the free allowance, paid tiers, and whether the shell economy helps or adds confusion.

### Stage 4 — Expand what users value

Prioritize voice, richer worlds, and additional monetization only when demand and contribution economics support them. Keep the product English-only unless the founder changes that decision.

## Success measures

Instrument these before setting numeric targets; establish a baseline with the first cohort:

- **Activation:** selects a character and relationship path, sends a message, and receives a real reply.
- **Retention:** D1 and D7 return rates, including return to the same character.
- **Relationship quality:** user-reported fit and rate of unwanted romantic behavior.
- **Memory quality:** useful memory rate, correction/deletion rate, and whether later replies honor corrections.
- **Reliability:** reply success rate and latency.
- **Economics:** model cost per active and retained user; paid conversion and contribution margin once payments are live.

Set go/no-go thresholds only after instrumentation and the first cohort establish a credible baseline.

## Work ownership

- **Founder:** sets product direction, resolves business tradeoffs, and speaks with target users.
- **Codex:** owns analysis, positioning, prioritization, unit-economics review, acceptance criteria, and Claude-ready briefs.
- **Claude:** implements approved, scoped engineering briefs. Do not add unrequested features or change approved UX.

## Next Claude brief

**Task:** Prepare a bounded B0/B1 implementation plan for the Oppa vertical slice. Planning only; do not write application code yet.

The plan must:

1. Map Oppa's current mock chat path to a real server-backed path.
2. Specify the smallest data model and API for messages, user-selected relationship preference, editable memories, and usage events.
3. Explain how Oppa's current boyfriend persona can respect the user's selected relationship path without silently assuming romance.
4. Identify security, privacy, age-safety, retry/refund, and failure states.
5. Record per-request model cost and latency.
6. List vendor, pricing, and launch-limit choices as explicit founder questions; do not silently decide them.
7. Break implementation into reviewable milestones with acceptance criteria and dependencies.

**Out of scope:** coding, visual redesign, additional screens, live calls, voice cloning, public user-generated characters, and changing the global English-only strategy.

## Open decisions

- Which model and hosting choices pass cost, quality, latency, and privacy review?
- Which relationship choices should be available for Oppa, and how should users change them?
- What free and paid limits are sustainable after real usage is measured?
- Which low-cost recruitment channels can reach English-speaking adults globally?
