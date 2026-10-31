import type { TFunction } from 'i18next';

import type { Alarm } from '@/types';

import { repeatKind } from './alarms';

/** Whether the phone shows a 12-hour clock (AM / PM); the wheel and the list follow it. */
export function uses12Hour(): boolean {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12 ?? true;
  } catch {
    return true;
  }
}

/** "6:45" + "AM" on a 12-hour phone, "06:45" + null on a 24-hour one. */
export function alarmTime(hour: number, minute: number, h12 = uses12Hour()) {
  const mm = String(minute).padStart(2, '0');
  if (!h12) return { time: `${String(hour).padStart(2, '0')}:${mm}`, period: null as 'am' | 'pm' | null };
  return { time: `${hour % 12 === 0 ? 12 : hour % 12}:${mm}`, period: (hour < 12 ? 'am' : 'pm') as 'am' | 'pm' };
}

/** Day names starting on Sunday (0), in the phone's language. */
export function dayNames(locale?: string, width: 'long' | 'short' = 'long') {
  // Oct 4 2026 is a Sunday.
  return Array.from({ length: 7 }, (_, i) =>
    new Date(2026, 9, 4 + i).toLocaleDateString(locale, { weekday: width }),
  );
}

/** The Repeat row and the list line: "Never", "Weekdays", "Every Monday", "Mon Wed". */
export function repeatText(t: TFunction, repeat: number[], locale?: string) {
  const kind = repeatKind(repeat);
  if (kind !== 'days') return t(`alarms.${kind}`);
  const days = [...new Set(repeat)].sort();
  if (days.length === 1) return t('alarms.everyDayName', { day: dayNames(locale)[days[0]] });
  const short = dayNames(locale, 'short');
  return days.map((d) => short[d]).join(' ');
}

/** The list line under the time: label (or friend) · repeat. */
export function alarmLine(t: TFunction, alarm: Alarm, friendName: string | undefined, locale?: string) {
  const who = alarm.label || friendName || t('alarms.defaultLabel');
  const repeat = alarm.repeat.length > 0 ? repeatText(t, alarm.repeat, locale) : null;
  const parts = [who, alarm.label && friendName ? friendName : null, repeat].filter(Boolean);
  return parts.join(' · ');
}
