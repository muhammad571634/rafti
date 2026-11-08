import type { User } from '@/types';

export const MAX_INTERESTS = 10;
export const NAME_MAX = 20;
export const JOB_MAX = 30;
export const ABOUT_MAX = 150;

/** Picked from a fixed list, so characters (and later the server prompt) can use them. */
export const INTEREST_OPTIONS = [
  'Music',
  'Movies',
  'Anime',
  'Games',
  'Books',
  'Art',
  'Photography',
  'Cooking',
  'Coffee',
  'Travel',
  'Hiking',
  'Fitness',
  'Dance',
  'Fashion',
  'Pets',
  'Nature',
  'Tech',
  'Science',
  'History',
  'Languages',
  'Writing',
  'Stars',
  'Sleep',
  'Night walks',
] as const;

/** What counts toward the profile meter, in the order the edit screen shows it. */
const PARTS: ((u: User) => boolean)[] = [
  (u) => !!u.avatarUri,
  (u) => !!u.displayName.trim(),
  (u) => !!u.pronouns,
  (u) => !!u.birthday,
  (u) => !!u.job?.trim(),
  (u) => (u.interests?.length ?? 0) > 0,
  (u) => !!u.about?.trim(),
];

/** 0-100, rounded. */
export function profileCompletion(user: User) {
  const done = PARTS.filter((part) => part(user)).length;
  return Math.round((done / PARTS.length) * 100);
}

/** "03-14" -> "Mar 14". */
/** "MM-DD" as the app's language writes a short date ("Nov 8", "8 Kas", "8. Nov."). */
export function birthdayLabel(birthday: string | undefined, locale = 'en') {
  if (!birthday) return undefined;
  const [month, day] = birthday.split('-').map(Number);
  if (!month || !day) return undefined;
  return new Date(2000, month - 1, day).toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

/** The twelve short month names in the app's language, January first (the birthday sheet). */
export function monthNames(locale = 'en') {
  return Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString(locale, { month: 'short' }));
}

export function birthdayKey(month: number, day: number) {
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function isBirthday(user: Pick<User, 'birthday'>, now = new Date()) {
  return user.birthday === birthdayKey(now.getMonth() + 1, now.getDate());
}

export function daysInMonth(month: number) {
  // A leap year, so Feb 29 can be picked.
  return new Date(2000, month, 0).getDate();
}
