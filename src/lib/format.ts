import i18n from '@/i18n';

/** "21:44" — used on message rows and call logs. */
export function clockTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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

const TITLES = new Set(['prince', 'princess', 'lord', 'lady', 'sir', 'dr', 'dr.', 'commander', 'captain', 'king', 'queen']);

/** What a friend is called in a sentence: "Prince Aurelian" -> "Aurelian", "Kai Arden" -> "Kai". */
export function shortName(name: string) {
  const words = name.trim().split(/\s+/);
  while (words.length > 1 && TITLES.has(words[0].toLowerCase())) words.shift();
  return words[0] ?? name;
}
