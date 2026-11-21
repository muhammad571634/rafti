import type { PayLine, PayReason } from '@/ai/session-types';

/**
 * Which paid line a chat's next replies answer (0z260). `payLine` makes one key per line the user
 * sends (a text, a voice line, a photo, a redo, a steer) and notes it here; the chat's reply request
 * carries it as `pay`, so the server decides that line once (`take_message`): today's free count or
 * a shell, under the same `spend:<key>` the app's own spend mirror books. A retry and a group's
 * members reuse the key; the server caps how many replies one key may serve.
 *
 * A key is kept only a while: a reply asked long after its line (a retry the next morning) goes
 * without one and the server counts it in its allowance instead.
 */
export const PAY_KEY_MS = 10 * 60_000;

const pending = new Map<string, PayLine & { at: number }>();

/** Notes the line a chat (a conversation or a group) just paid for. */
export function notePay(chat: string, key: string, reason: PayReason, now = Date.now()): void {
  pending.set(chat, { key, reason, at: now });
}

/** The chat's latest paid line, while it is fresh; undefined when there is none. */
export function payFor(chat: string, now = Date.now()): PayLine | undefined {
  const line = pending.get(chat);
  if (!line) return undefined;
  if (now - line.at > PAY_KEY_MS) {
    pending.delete(chat);
    return undefined;
  }
  return { key: line.key, reason: line.reason };
}

/** A chat deleted, or every chat (the account deleted, sign-out). */
export function forgetPay(chat?: string): void {
  if (chat === undefined) pending.clear();
  else pending.delete(chat);
}

/** The reasons a line the user sends is paid under; anything else spends as before. */
export function isPayReason(reason: string): reason is PayReason {
  return reason === 'chat' || reason === 'voice' || reason === 'photo';
}
