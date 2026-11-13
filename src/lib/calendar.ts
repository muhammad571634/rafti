import { dayKey } from '@/mock/time';

export const WEEK = 7;

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Whole weeks, Monday first, padded with the neighbouring months' days. */
export function monthCells(month: Date): { key: string; inMonth: boolean }[] {
  const y = month.getFullYear();
  const m = month.getMonth();
  const lead = (month.getDay() + 6) % WEEK;
  const days = new Date(y, m + 1, 0).getDate();
  const total = Math.ceil((lead + days) / WEEK) * WEEK;
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(y, m, i - lead + 1);
    return { key: dayKey(d), inMonth: d.getMonth() === m };
  });
}

/** Weekday names, Monday first (2024-01-01 was a Monday): short ("Mon") or narrow ("M", as Apple's Calendar). */
export function weekdayNames(locale: string, width: 'short' | 'narrow' = 'short') {
  return Array.from({ length: WEEK }, (_, i) => {
    const day = new Date(2024, 0, 1 + i);
    const name = day.toLocaleDateString(locale, { weekday: width });
    // An engine without narrow names gives back the short one or a whole date: keep its first letter.
    if (width === 'narrow' && (!name || name.length > 3)) return Array.from(day.toLocaleDateString(locale, { weekday: 'short' }))[0] ?? '';
    return name;
  });
}

/** The Monday-first week that holds `date`. */
export function weekCells(date: Date): { key: string; inMonth: boolean }[] {
  const lead = (date.getDay() + 6) % WEEK;
  return Array.from({ length: WEEK }, (_, i) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() - lead + i);
    return { key: dayKey(d), inMonth: true };
  });
}
