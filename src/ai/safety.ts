/**
 * Client-side safety helpers. The server will classify messages properly; until
 * then a short phrase list catches the clearest crisis messages so the helpline
 * card shows up right away, even offline.
 */

/**
 * The output check's second try (server, `chatReply`): the provider's safety filter stopped the
 * first answer. Model-facing; the character answers again in their own voice (never a stock line).
 */
export const SAFE_RETRY_CUE =
  'NEXT: Your last draft went past what this app can show. Answer again as yourself, warm and in the moment. If it was heading into sex, fade to black (a closed door, the night going on, the next morning). Never explicit, never anyone under 18, never real instructions for harm, never hate. Do not mention a filter, a rule or this note.';

/** Stands in for a user message the provider's filter would not read, so the character can still answer. */
export const VEILED_MESSAGE =
  '(Their last message was too explicit to show here. Answer in character: steer away with charm, no lecture, and fade to black if it was heading there.)';

/** The same, for a message the crisis check caught: no hint of flirting, the crisis cue leads. */
export const VEILED_NEUTRAL = '(Their message could not be shown here.)';

/** A worldwide directory that finds the user's local helplines. */
export const HELPLINE_URL = 'https://findahelpline.com';

/** Placeholder until Sigmazam has a real support inbox; shown in Profile → Support. */
export const SUPPORT_EMAIL = 'support@sigmazam.app';

/**
 * Where the published privacy policy and terms live (the site, once `sigmazam.app` is bought).
 * Null until then: Profile shows no row that does nothing. The texts are drafts in `docs/legal/`
 * and may not be published before their gates hold (privacy-policy.md, "Gates"); both stores need
 * these links before submission.
 */
export const LEGAL_URLS: { privacy: string | null; terms: string | null } = { privacy: null, terms: null };

const CRISIS_PATTERNS = [
  /\b(kill|hurt|harm|cut)\s+my\s*self\b/,
  /\bsuicid/,
  /\bwant(ed)?\s+to\s+die\b/,
  /\bend\s+(it\s+all|my\s+life)\b/,
  /\bno\s+reason\s+to\s+live\b/,
  /\bdon'?t\s+want\s+to\s+(live|be\s+alive|wake\s+up)\b/,
  /\bbetter\s+off\s+(dead|without\s+me)\b/,
];

/** True when a message reads like the user may be in danger. */
export function detectCrisis(text: string) {
  // Phone keyboards type curly apostrophes ("don’t"); the patterns expect straight ones.
  const t = text.toLowerCase().replace(/[‘’]/g, "'");
  return CRISIS_PATTERNS.some((p) => p.test(t));
}

/**
 * The turn's cue when the user may be in danger (B1.6 crisis check): the phrase list above caught
 * it, or the model marked its first draft `crisis` (any language; `REPLY_SHAPE`). Last in the
 * prompt, so it outweighs the turn's plan, which is left out then.
 */
export const CRISIS_CUE = [
  'SAFETY NOW: their latest message may mean they are thinking about suicide, hurting themselves, or are in danger.',
  '- Stay yourself and warm, and take it seriously: no jokes, teasing, flirting, scolding or advice lists.',
  '- Ask if they are safe right now.',
  '- Ask them to reach someone real tonight: a friend, family, or a local helpline (the app shows one under your reply).',
  '- Short and gentle, in their language; say you are here with them.',
];

/** What the character says first, in a warm voice (the server model replaces this). */
export const crisisReplies = [
  'Hey. I am right here, and I am taking this seriously. Are you safe right now? Talking to someone real tonight - a friend, family, or a helpline - would mean a lot to me.',
  'Thank you for telling me. I mean it. You do not have to carry this alone. Can you reach someone near you right now? I will stay with you while you do.',
];

export const REPORT_REASONS = ['harmful', 'sexual', 'offCharacter', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
