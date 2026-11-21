import { dateFromKey, dayKey } from '../mock/time';
import type { BoardPost, BoothPhoto, CallRecord, DateRecord, DiaryEntry, Moment, MomentKind, ScheduleItem, SecretNote } from '../types';

/**
 * Us' "Our moments" (owner, 2026-11-09, option A of `docs/prototypes/us-moments.html`): your story
 * with one friend, a header per day, each row tied to its own note, date, diary page, call, photo or
 * plan, so it shows their words or the result and opens that place. Pure, so it is tested here.
 */

/** The four filters: everything, what you did together, what you wrote, the big moments. */
export type MomentFilter = 'all' | 'together' | 'words' | 'milestones';
const GROUPS: Record<Exclude<MomentFilter, 'all'>, readonly MomentKind[]> = {
  together: ['dating', 'photo', 'call', 'plan', 'quiz'],
  words: ['secretNote', 'board', 'diary'],
  milestones: ['met', 'levelUp', 'arc'],
};
export const MOMENT_FILTERS = ['together', 'words', 'milestones'] as const;

export const isMilestone = (kind: MomentKind) => GROUPS.milestones.includes(kind);

/** Whether a kind shows under a filter. */
export const inFilter = (kind: MomentKind, filter: MomentFilter) => filter === 'all' || GROUPS[filter].includes(kind);

/** The records a row can read, one friend's or everyone's (rows match on the friend too). */
export interface MomentRecords {
  notes: readonly SecretNote[];
  boardPosts: readonly BoardPost[];
  dates: readonly DateRecord[];
  diary: readonly DiaryEntry[];
  calls: readonly CallRecord[];
  photos: readonly BoothPhoto[];
}

/**
 * Kinds whose row goes when its record is deleted (a board note, a diary page, a photo), as a
 * removed plan does; their records are always found again, so a missing one was deleted. A call
 * deleted from the call log still happened, and older secret notes and dates may not be found.
 */
const GONE_WITH_RECORD: ReadonlySet<MomentKind> = new Set<MomentKind>(['board', 'diary', 'photo']);

/** One row: a moment with the record it is about, or a plan whose time has come. */
export interface TimelineItem {
  key: string;
  kind: MomentKind;
  /** When it happened (a plan: its own day and time). */
  at: string;
  moment?: Moment;
  plan?: ScheduleItem;
  note?: SecretNote;
  post?: BoardPost;
  date?: DateRecord;
  entry?: DiaryEntry;
  call?: CallRecord;
  photo?: BoothPhoto;
}

/** A day of the timeline: its big moments on top, the rest in one card, both newest first. */
export interface TimelineDay {
  day: string;
  milestones: TimelineItem[];
  items: TimelineItem[];
}

/** Moments saved before `refId` (0z188) are matched to the record made in the same action. */
const SAME_ACTION_MS = 2 * 60_000;

function closest<T>(records: readonly T[], used: Set<T>, at: number, time: (record: T) => string | undefined): T | undefined {
  let best: T | undefined;
  let gap = SAME_ACTION_MS;
  for (const record of records) {
    const stamp = time(record);
    if (!stamp || used.has(record)) continue;
    const d = Math.abs(new Date(stamp).getTime() - at);
    if (d <= gap) {
      best = record;
      gap = d;
    }
  }
  return best;
}

/** Every moment with its record: by `refId`, else (older moments) the one made in the same action. */
function linked(moments: readonly Moment[], records: MomentRecords): TimelineItem[] {
  const used = new Set<unknown>();
  const take = <T>(record: T | undefined) => {
    if (record) used.add(record);
    return record;
  };
  return moments.map((moment) => {
    const item: TimelineItem = { key: moment.id, kind: moment.kind, at: moment.createdAt, moment };
    const { refId, characterId } = moment;
    const at = new Date(moment.createdAt).getTime();
    const mine = <T extends { characterId: string }>(list: readonly T[]) => list.filter((r) => r.characterId === characterId);
    switch (moment.kind) {
      case 'secretNote': {
        const notes = mine(records.notes).filter((n) => n.status === 'exchanged');
        item.note = take(refId ? notes.find((n) => n.id === refId) : latestNoteBy(notes, used as Set<SecretNote>, dayKey(moment.createdAt)));
        break;
      }
      case 'photo':
        item.photo = moment.photoId ? mine(records.photos).find((p) => p.id === moment.photoId) : undefined;
        break;
      case 'board': {
        const posts = mine(records.boardPosts);
        item.post = take(refId ? posts.find((p) => p.id === refId) : closest(posts, used as Set<BoardPost>, at, (p) => p.createdAt));
        break;
      }
      case 'dating': {
        const dates = mine(records.dates);
        item.date = take(refId ? dates.find((d) => d.id === refId) : closest(dates, used as Set<DateRecord>, at, (d) => d.createdAt));
        break;
      }
      case 'diary': {
        const pages = records.diary.filter((d) => d.reply?.characterId === characterId);
        item.entry = take(refId ? pages.find((d) => d.id === refId) : closest(pages, used as Set<DiaryEntry>, at, (d) => d.reply?.createdAt));
        break;
      }
      case 'call':
        item.call = refId ? mine(records.calls).find((c) => c.id === refId) : undefined;
        break;
      default:
        break;
    }
    return item;
  });
}

/**
 * An older secret-note moment's note. A note keeps only the day it was begun, and it may be swapped
 * days later, so: the newest one begun by that day and not yet shown (moments are read oldest first).
 */
function latestNoteBy(notes: readonly SecretNote[], used: Set<SecretNote>, day: string): SecretNote | undefined {
  let best: SecretNote | undefined;
  for (const note of notes) {
    if (used.has(note) || note.date > day) continue;
    if (!best || note.date > best.date) best = note;
  }
  return best;
}

/** Whether a row's record is still there, for the kinds whose row goes with it. */
const kept = (item: TimelineItem) => !GONE_WITH_RECORD.has(item.kind) || !!(item.post ?? item.entry ?? item.photo);

/** "HH:MM" of a date on the phone's clock. */
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/**
 * Whether a plan's time has come: a day gone by, or today's at or after its hour. A plan still
 * ahead stays in the calendar above the moments, so it is never listed twice.
 */
export function planHappened(plan: Pick<ScheduleItem, 'date' | 'time'>, now: Date): boolean {
  const today = dayKey(now);
  if (plan.date < today) return true;
  return plan.date === today && !!plan.time && plan.time <= hhmm(now);
}

/** A plan's own moment: its day at its hour; one with no hour sits at the start of its day. */
function planAt(plan: ScheduleItem): string {
  const day = dateFromKey(plan.date);
  const [h, m] = (plan.time ?? '00:00').split(':').map(Number);
  day.setHours(h || 0, m || 0, 0, 0);
  return day.toISOString();
}

/**
 * One friend's timeline, newest first. A plan is shown from its schedule on its own day (the
 * "Planned" moment was logged the day it was made, and a removed plan must not stay), so plan
 * moments are left out here.
 */
export function buildTimeline(input: {
  moments: readonly Moment[];
  plans: readonly ScheduleItem[];
  records: MomentRecords;
  filter: MomentFilter;
  now: Date;
}): TimelineItem[] {
  const { moments, plans, records, filter, now } = input;
  const ordered = [...moments].filter((m) => m.kind !== 'plan').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const items = [
    ...linked(ordered, records).filter(kept),
    ...plans.filter((p) => planHappened(p, now)).map((plan): TimelineItem => ({ key: plan.id, kind: 'plan', at: planAt(plan), plan })),
  ];
  return items.filter((item) => inFilter(item.kind, filter)).sort((a, b) => b.at.localeCompare(a.at));
}

/** Which filters have anything to show, so an empty one is never offered. */
export function filtersWith(items: readonly TimelineItem[]): (typeof MOMENT_FILTERS)[number][] {
  return MOMENT_FILTERS.filter((filter) => items.some((item) => GROUPS[filter].includes(item.kind)));
}

/** Rows (newest first) into days on the phone's calendar, order kept. */
export function groupByDay(items: readonly TimelineItem[]): TimelineDay[] {
  const days: TimelineDay[] = [];
  for (const item of items) {
    const day = dayKey(item.at);
    let last = days[days.length - 1];
    if (last?.day !== day) {
      last = { day, milestones: [], items: [] };
      days.push(last);
    }
    (isMilestone(item.kind) ? last.milestones : last.items).push(item);
  }
  return days;
}

/** What Us shows of the story: the last week, at most a screenful; the rest is on "See all". */
export const RECENT = { days: 7, max: 10, min: 3 } as const;

/**
 * The rows Us shows (owner, 2026-11-09: the list must stop somewhere): the last `days` days, at most
 * `max` rows; a quiet week still shows the newest `min`, so a long bond never looks empty. The whole
 * story is on its own screen (`/moments/[characterId]`), drawn a screenful at a time.
 */
export function recentRows(items: readonly TimelineItem[], now: Date, window: { days: number; max: number; min: number } = RECENT): TimelineItem[] {
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - (window.days - 1));
  const recent = items.filter((item) => new Date(item.at).getTime() >= from.getTime()).slice(0, window.max);
  return recent.length >= window.min ? recent : items.slice(0, window.min);
}

/** The days as one flat list for a virtualized screen: a header, the big moments, then the rows with their place in the card. */
export type MomentLine =
  | { type: 'day'; key: string; day: string }
  | { type: 'milestone'; key: string; item: TimelineItem }
  | { type: 'row'; key: string; item: TimelineItem; first: boolean; last: boolean };

export function momentLines(days: readonly TimelineDay[]): MomentLine[] {
  const lines: MomentLine[] = [];
  for (const day of days) {
    lines.push({ type: 'day', key: `day:${day.day}`, day: day.day });
    for (const item of day.milestones) lines.push({ type: 'milestone', key: item.key, item });
    day.items.forEach((item, i) => lines.push({ type: 'row', key: item.key, item, first: i === 0, last: i === day.items.length - 1 }));
  }
  return lines;
}

/**
 * Where a row leads: the place it happened, so the timeline is a way back into the bond and not
 * just a list to read. A plan opens its day in the calendar on Us itself (the screen does that).
 */
export function momentTarget(item: Pick<TimelineItem, 'kind' | 'moment'>): string | undefined {
  const moment = item.moment;
  if (!moment) return undefined;
  const id = encodeURIComponent(moment.characterId);
  switch (item.kind) {
    case 'photo':
      return moment.photoId ? `/photo/${encodeURIComponent(moment.photoId)}` : undefined;
    case 'secretNote':
      return `/secret-note/${id}`;
    case 'board':
      return '/board';
    // They wrote back on your own page: your diary, not theirs.
    case 'diary':
      return '/diary/mine';
    case 'call':
      return '/call-history';
    // The date's polaroid with its hearts.
    case 'dating':
      return '/date/album';
    case 'quiz':
      return `/quiz/${id}`;
    // How you met, each level and each opened chapter are the bond's story, told on their profile.
    case 'met':
    case 'levelUp':
    case 'arc':
      return `/character/${id}`;
    case 'plan':
      return undefined;
  }
}
