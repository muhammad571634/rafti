import type { User } from '@/types';

/** No 0/O or 1/I, so a code read aloud or retyped survives. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LENGTH = 6;

/**
 * The user's own invite code: stable for the account (derived from when it was
 * created). The server will issue and check real codes.
 */
export function inviteCodeFor(user: Pick<User, 'id' | 'onboardedAt'>) {
  const seed = `${user.id}:${user.onboardedAt ?? ''}`;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  let code = '';
  for (let i = 0; i < LENGTH; i += 1) {
    code += ALPHABET[h % ALPHABET.length];
    h = Math.imul(h ^ (h >>> 13), 2654435761) >>> 0;
  }
  return code;
}

/** "rafti-ab3 kq7" -> "AB3KQ7"; null when it cannot be a code. */
export function normalizeInviteCode(input: string) {
  const code = input.toUpperCase().replace(/^RAFTI[-\s]*/, '').replace(/[\s-]/g, '');
  if (code.length !== LENGTH) return null;
  return [...code].every((c) => ALPHABET.includes(c)) ? code : null;
}

/** Monday 00:00 of the current week. */
function weekStart(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function invitesThisWeek(credits: string[] = [], now = new Date()) {
  const start = weekStart(now).getTime();
  return credits.filter((at) => Date.parse(at) >= start).length;
}
