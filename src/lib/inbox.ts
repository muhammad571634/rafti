import { FREE_SPINS_PER_DAY } from '@/mock';
import { dateFromKey, dayKey } from '@/mock/time';
import type { BoardPost, CallRecord, CharacterDiaryPage, DailyState, Moment, ScheduleItem } from '@/types';

import { reminderAt } from './schedule';

/** How far back the inbox looks. */
const WINDOW_MS = 14 * 24 * 3_600_000;
const MAX_ITEMS = 60;

export type InboxKind = 'diary' | 'missedCall' | 'plan' | 'levelUp' | 'boardReply' | 'spin';

/**
 * One line in Profile → Notifications. Nothing new is stored for it: every item is read
 * from what already happened in the app (pages, calls, plans, moments, board replies,
 * today's free spin), so the inbox and the pushes always agree.
 */
export interface InboxItem {
  id: string;
  kind: InboxKind;
  /** ISO time the thing happened, newest first in the list */
  at: string;
  /** Whole-day items (today's spin) show the day, not a clock time. */
  allDay?: boolean;
  characterId?: string;
  /** Values for the item's text: plan title, level, the diary page's day */
  params?: Record<string, string | number>;
}

export interface InboxSources {
  characterDiary: CharacterDiaryPage[];
  calls: CallRecord[];
  schedules: ScheduleItem[];
  moments: Moment[];
  boardPosts: BoardPost[];
  daily: DailyState;
}

export function buildInbox(src: InboxSources, now = new Date()): InboxItem[] {
  const t = now.getTime();
  const recent = (iso: string) => {
    const at = new Date(iso).getTime();
    return at <= t && t - at <= WINDOW_MS;
  };

  const items: InboxItem[] = [
    ...src.characterDiary.map((p) => ({
      id: `diary:${p.id}`,
      kind: 'diary' as const,
      at: p.writtenAt,
      characterId: p.characterId,
      params: { date: p.date },
    })),
    ...src.calls
      .filter((c) => c.missed && c.direction === 'incoming')
      .map((c) => ({ id: `call:${c.id}`, kind: 'missedCall' as const, at: c.startedAt, characterId: c.characterId })),
    ...src.schedules
      .filter((s) => s.reminded)
      .map((s) => ({
        id: `plan:${s.id}`,
        kind: 'plan' as const,
        at: reminderAt(s).toISOString(),
        characterId: s.characterId,
        params: { title: s.title, time: s.time ?? '' },
      })),
    ...src.moments
      .filter((m) => m.kind === 'levelUp')
      .map((m) => ({ id: `level:${m.id}`, kind: 'levelUp' as const, at: m.createdAt, characterId: m.characterId, params: m.params })),
    ...src.boardPosts
      .filter((b) => b.replied)
      .map((b) => ({ id: `board:${b.id}`, kind: 'boardReply' as const, at: b.replyAt, characterId: b.characterId })),
  ].filter((item) => recent(item.at));

  // Today's free spin waits until it is used.
  const today = dayKey(now);
  const spinsUsed = src.daily.spinDay === today ? src.daily.spinsUsed : 0;
  if (spinsUsed < FREE_SPINS_PER_DAY) {
    items.push({ id: `spin:${today}`, kind: 'spin', at: dateFromKey(today).toISOString(), allDay: true });
  }

  return items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, MAX_ITEMS);
}

/** Unread: newer than the last "Mark all read". */
export const isUnread = (item: InboxItem, seenAt: string | null) =>
  !seenAt || Date.parse(item.at) > Date.parse(seenAt);
