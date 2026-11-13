import type { Ionicons } from '@expo/vector-icons';
import type { TFunction } from 'i18next';

import { clockTime } from '@/lib/format';
import { dayKey, dayKeyFromToday } from '@/mock';
import { systemColors } from '@/theme';
import type { Thread, ThreadKind } from '@/types';

type IoniconName = keyof typeof Ionicons.glyphMap;

/** Each kind's glyph and tile colour (iOS Settings tiles). */
export const KIND_LOOK: Record<ThreadKind, { icon: IoniconName; fill: string }> = {
  plan: { icon: 'calendar', fill: systemColors.orange },
  follow: { icon: 'bookmark', fill: systemColors.blue },
  goal: { icon: 'flag', fill: systemColors.green },
  quest: { icon: 'compass', fill: systemColors.purple },
};

export const kindOf = (thread: Thread): ThreadKind => thread.kind ?? 'follow';

/** "Today 21:30", "Tomorrow 09:00", "Fri 10:00", "Nov 12 10:00"; `day` alone without the clock. */
export function whenText(t: TFunction, lang: string, iso: string, day = false) {
  const key = dayKey(iso);
  const date = new Date(iso);
  const clock = day ? '' : ` ${clockTime(iso)}`;
  if (key === dayKeyFromToday(0)) return `${t('common.today')}${clock}`;
  if (key === dayKeyFromToday(1)) return `${t('common.tomorrow')}${clock}`;
  if (key === dayKeyFromToday(-1)) return `${t('common.yesterday')}${clock}`;
  const inWeek = Math.abs(date.getTime() - Date.now()) < 6 * 86_400_000;
  const label = date.toLocaleDateString(lang, inWeek ? { weekday: 'short' } : { month: 'short', day: 'numeric' });
  return `${label}${clock}`;
}

/** The short line under a thread: when it happens, or how it ended. */
export function threadMeta(t: TFunction, lang: string, thread: Thread) {
  if (thread.status === 'closed') return t(`mind.outcome.${thread.outcome ?? 'done'}`);
  if (thread.happensAt) return whenText(t, lang, thread.happensAt);
  return t(`mind.kind.${kindOf(thread)}`);
}
