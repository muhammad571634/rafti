/** Mock timestamps are relative so the seeded data never looks stale. */
const DAY = 86_400_000;

export const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
export const hoursAgo = (n: number) => new Date(Date.now() - n * 3_600_000).toISOString();
export const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

/**
 * Local-calendar day key, e.g. "2026-08-26". Daily rewards, streaks and diary pages
 * roll over at the user's midnight, not UTC's.
 */
export const dayKey = (d: Date | string = new Date()) => {
  const date = typeof d === 'string' ? new Date(d) : d;
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${day}`;
};

export const todayKey = () => dayKey();

/** Day key `offset` days from today (negative = past). */
export const dayKeyFromToday = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return dayKey(d);
};

/** Parses a day key as a local date (a bare "YYYY-MM-DD" would parse as UTC). */
export const dateFromKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};
