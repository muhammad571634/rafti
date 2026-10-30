import type { ArcBeat, CharacterArc, TieKind, WorldChapter, WorldEvent, WorldStory, WorldTie } from '@/types';

/**
 * How a world and a character's story move (docs/worlds-plan.md §3.3). Arcs open with the bond
 * level, a world's season with the days since the user made their first friend there, events with
 * the calendar. Code decides when; the model on the server decides the words. Pure and
 * server-portable: the app sends the result with each reply (`worldPromptOf`).
 */

/** Three beats, the last of which lets the secret out as the bond reaches "More than friends". */
export const ARC_LEVELS = [2, 4, 6] as const;

export interface ArcStage {
  opened: ArcBeat[];
  /** The newest open beat. */
  now?: ArcBeat;
  next?: ArcBeat;
  /** The last beat is open, so the secret may be told. */
  secretOut: boolean;
}

export function arcStage(arc: CharacterArc, level: number): ArcStage {
  const opened = arc.beats.filter((b) => b.atLevel <= level);
  const next = arc.beats.find((b) => b.atLevel > level);
  return { opened, now: opened[opened.length - 1], next, secretOut: opened.length > 0 && !next };
}

/** The beats a level-up from `from` to `to` opened. */
export const beatsCrossed = (arc: CharacterArc | undefined, from: number, to: number): ArcBeat[] =>
  arc ? arc.beats.filter((b) => b.atLevel > from && b.atLevel <= to) : [];

const DAY_MS = 86_400_000;
const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
/** Whole calendar days from `from` to `to`, safe across a clock change. */
const daysFrom = (from: Date, to: Date) => Math.round((midnight(to).getTime() - midnight(from).getTime()) / DAY_MS);

/** Days since the user joined a world; 0 on the day, and before they have. */
export const worldDay = (joinedAt: string | undefined, now: Date) => (joinedAt ? Math.max(0, daysFrom(new Date(joinedAt), now)) : 0);

/** The newest chapter open for this user; the last one stays once the season has run. */
export function chapterAt(season: WorldStory['season'], joinedAt: string | undefined, now: Date): WorldChapter | undefined {
  const day = worldDay(joinedAt, now);
  return season.chapters.filter((c) => c.opensOnDay <= day).pop();
}

/** When the user joined a world: the day they made their first friend among its cast. */
export function worldJoinedAt(castIds: readonly string[], relationships: Record<string, { anniversary: string } | undefined>) {
  let first: string | undefined;
  for (const id of castIds) {
    const at = relationships[id]?.anniversary;
    if (at && (!first || Date.parse(at) < Date.parse(first))) first = at;
  }
  return first;
}

/** The day the running occurrence of an event started, or null when it is not on. */
export function eventStart(event: WorldEvent, now: Date): Date | null {
  const today = midnight(now);
  const inside = (start: Date) => {
    const since = daysFrom(start, today);
    return since >= 0 && since < event.days;
  };
  const starts: Date[] = [];
  const y = today.getFullYear();
  const m = today.getMonth();
  if (event.every === 'week') {
    const back = (today.getDay() - (event.weekday ?? 0) + 7) % 7;
    starts.push(new Date(y, m, today.getDate() - back));
  } else if (event.every === 'month') {
    starts.push(new Date(y, m, event.day ?? 1), new Date(y, m - 1, event.day ?? 1));
  } else {
    starts.push(new Date(y, (event.month ?? 1) - 1, event.day ?? 1), new Date(y - 1, (event.month ?? 1) - 1, event.day ?? 1));
  }
  return starts.find(inside) ?? null;
}

export const isEventOn = (event: WorldEvent, now: Date) => eventStart(event, now) !== null;

/** The event on today, if any (the first listed, when two meet). */
export const eventOn = (story: Pick<WorldStory, 'events'>, now: Date) => story.events.find((e) => isEventOn(e, now));

/** Everyone a character is tied to, the other one named. */
export function tiesOf(ties: readonly WorldTie[], characterId: string, nameOf: (id: string) => string) {
  return ties
    .filter((t) => t.a === characterId || t.b === characterId)
    .map((t) => ({ name: nameOf(t.a === characterId ? t.b : t.a), kind: t.kind, note: t.note }));
}

/** What a chat's prompt carries of the world (`src/ai/world-prompt.ts`). */
export interface WorldPrompt {
  premise: string;
  conflict: string;
  role: { title: string; hook: string };
  ties: { name: string; kind: TieKind; note: string }[];
  chapter?: { title: string; beat: string };
  event?: { title: string; note: string };
}

export function worldPromptOf(
  story: WorldStory,
  characterId: string,
  nameOf: (id: string) => string,
  joinedAt: string | undefined,
  now: Date,
): WorldPrompt {
  const chapter = chapterAt(story.season, joinedAt, now);
  const event = eventOn(story, now);
  return {
    premise: story.premise,
    conflict: story.conflict,
    role: story.userRole,
    ties: tiesOf(story.ties, characterId, nameOf),
    ...(chapter ? { chapter: { title: chapter.title, beat: chapter.beat } } : {}),
    ...(event ? { event: { title: event.title, note: event.note } } : {}),
  };
}

/** World news goes out from this hour of the day (the push moves it to an hour the user is active in). */
export const WORLD_NEWS_HOUR = 17;

/** A local date as a key ("2026-10-31"). */
const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export interface WorldNews {
  /** Stable, so a chapter or one event's date is told once. */
  key: string;
  kind: 'chapter' | 'event';
  title: string;
  note: string;
  /** An event's own line for when the model is off; a chapter's comes from its beat (`worldNewsLine`). */
  line?: string;
}

/**
 * What a friend in the world brings up today: a chapter on the day it opens (never the first, which
 * the user just walked into), else an event on the day it starts. Nothing before the user joined.
 */
export function dueWorldNews(input: { worldKey: string; story: WorldStory; joinedAt: string | undefined; now: Date }): WorldNews | null {
  const { worldKey, story, joinedAt, now } = input;
  if (!joinedAt) return null;
  const day = worldDay(joinedAt, now);
  const chapter = story.season.chapters.find((c) => c.opensOnDay === day && c.opensOnDay > 0);
  if (chapter) return { key: `${worldKey}:chapter:${chapter.id}`, kind: 'chapter', title: chapter.title, note: chapter.beat };
  const event = story.events.find((e) => {
    const start = eventStart(e, now);
    return !!start && daysFrom(start, now) === 0;
  });
  if (event) return { key: `${worldKey}:event:${event.id}:${dateKey(now)}`, kind: 'event', title: event.title, note: event.note, line: event.line };
  return null;
}

/** A chapter's place in the season, for the world page: opened, the current one, or still to come. */
export function chapterState(chapter: WorldChapter, current: WorldChapter | undefined): 'open' | 'now' | 'locked' {
  if (!current || chapter.opensOnDay > current.opensOnDay) return 'locked';
  return chapter.id === current.id ? 'now' : 'open';
}
