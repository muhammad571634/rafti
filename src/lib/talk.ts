import type { Message } from '@/types';

/**
 * When you last talked with someone in this chat: your newest message, or the newest
 * call that connected (either way round). Their own first texts (good morning, a
 * birthday wish) do not count, so the hero follows you, not the notifications.
 */
export function lastTalkedAt(messages: readonly Message[] | undefined): number {
  if (!messages) return 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.pending) continue;
    if (m.author === 'me' || (m.kind === 'call' && !m.missed)) return Date.parse(m.createdAt) || 0;
  }
  return 0;
}
