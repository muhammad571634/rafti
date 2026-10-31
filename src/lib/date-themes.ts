import { detectCrisis } from '../ai/safety';
import type { DateChoice, DateRound } from '../mock/dates';
import type { DateMood } from '../types';
import { hashSeed } from './seeded';

/**
 * Your own dates (F28): the user writes the scene, picks a place name, rounds and a mood;
 * the friend plays it. Pure on purpose: the server copies the limits, price and checks.
 */

export const SCENE_MAX = 300;
export const TITLE_MAX = 40;
export const ROUND_OPTIONS = [3, 5, 8] as const;
export type ThemeRounds = (typeof ROUND_OPTIONS)[number];
/** Owner decision 2026-10-15: free to make, 2 shells a round each time it is played. */
export const SHELLS_PER_ROUND = 2;

export type { DateMood };
export const DATE_MOODS: DateMood[] = ['friendly', 'flirty', 'sweet'];
/** The level a mood opens at: the "More than friends" and "Beloved" stages (src/mock/user.ts TIERS). */
export const MOOD_LEVEL: Record<DateMood, number> = { friendly: 0, flirty: 6, sweet: 16 };

export function themeCost(rounds: number) {
  return rounds * SHELLS_PER_ROUND;
}

export function moodOpen(mood: DateMood, level: number | undefined) {
  return (level ?? 0) >= MOOD_LEVEL[mood];
}

/** Single spaces, no braces (they mark names in the round text), cut to size. */
function clean(text: string, max: number) {
  return text.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim().slice(0, max).trim();
}

export const cleanScene = (text: string) => clean(text, SCENE_MAX);
export const cleanTitle = (text: string) => clean(text, TITLE_MAX);

export type ThemeProblem = 'noScene' | 'noTitle' | 'crisis';

/** Why a date cannot be saved, or null. A scene that reads like a crisis is not played. */
export function checkTheme(input: { scene: string; title: string }): ThemeProblem | null {
  const scene = cleanScene(input.scene);
  const title = cleanTitle(input.title);
  if (!scene) return 'noScene';
  if (!title) return 'noTitle';
  if (detectCrisis(scene) || detectCrisis(title)) return 'crisis';
  return null;
}

/** Canned rounds the mock builds a date from (src/mock/date-themes.ts); the server's model replaces them. */
export interface ThemePools {
  /** Answers to the user's own scene, per mood. */
  openers: Record<DateMood, [DateChoice, DateChoice, DateChoice][]>;
  /** Rounds for any mood. */
  shared: DateRound[];
  /** Rounds that carry the mood; they come before the shared ones. */
  moodRounds: Record<DateMood, DateRound[]>;
  /** The goodbye, the last round. */
  closers: Record<DateMood, DateRound[]>;
}

/** A shuffle that comes out the same for the same seed. */
function shuffled<T>(list: readonly T[], seed: string): T[] {
  const out = [...list];
  let h = hashSeed(seed) || 1;
  for (let i = out.length - 1; i > 0; i--) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const withPlace = (text: string, place: string) => text.replaceAll('{place}', place);

function placed(round: DateRound, place: string): DateRound {
  const choices = round.choices.map((c) => ({
    ...c,
    text: withPlace(c.text, place),
    reply: withPlace(c.reply, place),
  }));
  return { line: withPlace(round.line, place), choices: choices as DateRound['choices'] };
}

/**
 * The rounds of one play: the user's scene first, then rounds in the mood, then a goodbye.
 * `{name}` stays for the date screen; `{place}` becomes the date's title.
 */
export function buildThemeRounds(
  theme: { scene: string; title: string; rounds: number; mood: DateMood },
  pools: ThemePools,
  seed: string,
  /** Rounds from the friend's world (src/mock/worlds.ts); one comes first, so the date feels like theirs. */
  worldRounds: DateRound[] = [],
  /** A world event's round while it is on (`WorldEvent.round`): played before the world's own. */
  eventRound?: DateRound,
): DateRound[] {
  const place = cleanTitle(theme.title);
  const openers = pools.openers[theme.mood];
  const first: DateRound = {
    line: cleanScene(theme.scene),
    choices: openers[hashSeed(`${seed}:open`) % openers.length],
  };
  const world = [...(eventRound ? [eventRound] : []), ...shuffled(worldRounds, `${seed}:world`)];
  const middle = [
    ...world.slice(0, 1),
    ...shuffled(pools.moodRounds[theme.mood], `${seed}:mood`),
    ...world.slice(1),
    ...shuffled(pools.shared, `${seed}:shared`),
  ];
  const closers = pools.closers[theme.mood];
  const last = closers[hashSeed(`${seed}:close`) % closers.length];
  const count = Math.max(2, theme.rounds);
  return [first, ...middle.slice(0, count - 2), last].map((round) => placed(round, place));
}
