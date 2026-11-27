import type { Conversation } from '@/types';

/** How long the app must have been away before the last character greets the user on Today (owner, 2026-10-29). */
export const AWAY_MS = 60 * 60 * 1000;

/** The welcome lines in the locale files: `welcomeBack.line1` to `welcomeBack.line4`. */
export const WELCOME_LINES = 4;

export type Welcome = { conversationId: string; characterId: string; unreadLine: string | null };

/**
 * Whether this return earns a welcome: an hour or more away, onboarding done, not opened by a
 * notification (that tap already leads somewhere), and someone to do the welcoming. No saved away
 * time yet (the first launch with this feature) counts as away; a clock that went backwards does not.
 */
export function shouldWelcome(input: { now: number; awayAt: number | null; onboarded: boolean; fromNotification: boolean; hasConversation: boolean }): boolean {
  const { now, awayAt, onboarded, fromNotification, hasConversation } = input;
  if (!onboarded || fromNotification || !hasConversation) return false;
  if (awayAt === null) return true;
  return now - awayAt >= AWAY_MS;
}

/** The conversation talked in last whose character still exists, with its unread line if it has one. */
export function pickWelcome(conversations: Conversation[], hasCharacter: (id: string) => boolean): Welcome | null {
  let best: Conversation | null = null;
  for (const c of conversations) {
    if (!hasCharacter(c.characterId)) continue;
    if (!best || Date.parse(c.lastMessageAt) > Date.parse(best.lastMessageAt)) best = c;
  }
  if (!best) return null;
  const preview = best.lastMessagePreview.trim();
  return { conversationId: best.id, characterId: best.characterId, unreadLine: best.unreadCount > 0 && preview ? preview : null };
}

/** One of the welcome lines, a different one from one visit to the next. */
export function welcomeLineKey(now: number): string {
  return `welcomeBack.line${(Math.floor(now / AWAY_MS) % WELCOME_LINES) + 1}`;
}
