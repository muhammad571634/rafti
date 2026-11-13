import { getCalendars } from 'expo-localization';

import i18n from '@/i18n';

import { clockText } from './clock';

/** "21:44" or "9:44 PM", as the phone reads time — used on message rows and call logs. */
export function clockTime(iso: string) {
  return clockText(new Date(iso), getCalendars()[0]?.uses24hourClock ?? true, i18n.language);
}

/** "6,729" / "6.729" / "6 729": a count (shells, prices in shells) grouped the way the screen language writes it. */
export function count(n: number) {
  return n.toLocaleString(i18n.language);
}

/** "0:06" — voice bubble and call timer. */
export function duration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** "00:04" — the running call timer. */
export function callClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Conversation-list stamp: time today, "Yesterday", then a short date. */
export function relativeStamp(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return clockTime(iso);

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return i18n.t('common.yesterday');

  return d.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });
}

/** "8/26/2026" — the anniversary line on character settings. */
export function shortDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

/** "2026.08.26 Wednesday" — the diary date picker. */
export function diaryDate(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const weekday = d.toLocaleDateString(i18n.language, { weekday: 'long' });
  return `${y}.${m}.${day} ${weekday}`;
}

export function daysBetween(iso: string, to = new Date()) {
  const ms = to.getTime() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

// Lives apart from i18n so server-portable code (world books, tests) can use it too.
export { shortName } from './names';

/** A name cut for a tight spot like the Today profile capsule: "Sevinchoy" -> "Sevinc…" (by letters, so emoji stay whole). */
export function clipName(name: string, max = 6) {
  const letters = Array.from(name.trim());
  return letters.length > max ? `${letters.slice(0, max).join('')}…` : letters.join('');
}
