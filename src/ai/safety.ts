/**
 * Client-side safety helpers. The server will classify messages properly; until
 * then a short phrase list catches the clearest crisis messages so the helpline
 * card shows up right away, even offline.
 */

/** A worldwide directory that finds the user's local helplines. */
export const HELPLINE_URL = 'https://findahelpline.com';

/** Placeholder until Rafti has a real support inbox; shown in Profile → Support. */
export const SUPPORT_EMAIL = 'support@rafti.app';

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
  const t = text.toLowerCase();
  return CRISIS_PATTERNS.some((p) => p.test(t));
}

/** What the character says first, in a warm voice (the server model replaces this). */
export const crisisReplies = [
  'Hey. I am right here, and I am taking this seriously. Are you safe right now? Talking to someone real tonight - a friend, family, or a helpline - would mean a lot to me.',
  'Thank you for telling me. I mean it. You do not have to carry this alone. Can you reach someone near you right now? I will stay with you while you do.',
];

export const REPORT_REASONS = ['harmful', 'sexual', 'offCharacter', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
