import type { ClayIconName } from '@/assets/brand/registry';
import type { DateRound } from '@/mock/dates';
import type { PhotoFrame, WorldStory } from '@/types';

/**
 * A world of the official cast (`Character.series`): its quiz, frames, date rounds and story. Since
 * Cast 2.0 (docs/cast-2.md, 2026-11-10) there are none: the cast is people close to the user,
 * grouped in circles with no story behind them. The engine (world page, quiz, news, frames) stays
 * for a season that brings a world back.
 */
export type WorldKey = string;

/** How a Photo Booth frame dresses a picture's card (src/components/photo-booth/frame-card.tsx). */
export type FrameLook = PhotoFrame & { stickers: ClayIconName[] };

export interface WorldQuestion {
  text: string;
  options: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
}

export interface World {
  key: WorldKey;
  /** `Character.series` of its people. */
  series: string;
  /** Soft wash behind the world's art on cards. */
  tint: string;
  /** Its strong colour: behind a tile until the picture loads, and on the dot by its name. */
  accent: string;
  frame: FrameLook;
  /** What the host says before the world quiz. */
  intro: string;
  /** The host after a right answer, and after a wrong one (`{answer}` = the right one). */
  right: string[];
  wrong: string[];
  /** In a couple quiz: the friend's line when you matched, and when you did not (`{answer}` = theirs). */
  match: string[];
  differ: string[];
  /** Questions a friend from here asks about themselves; their answer comes from `partnerPick`. */
  selfQuiz: { text: string; options: [string, string, string, string] }[];
  /** The world quiz: about the place and its people. */
  quiz: WorldQuestion[];
  /** Date rounds that feel like this world, played before the shared ones. */
  dateRounds: DateRound[];
  /** What is going on here: conflict, the user's role, ties, season, events. */
  story: WorldStory;
}

/**
 * No world has content since Cast 2.0 (docs/cast-2.md, 2026-11-10): the cast is people close to the user,
 * grouped in circles (`Character.series`) with no story behind them. The engine (world page, quiz, news,
 * frames) stays for a season that brings one back.
 */
const BASE: Omit<World, 'story'>[] = [];
const WORLD_STORIES: Record<string, WorldStory> = {};

export const WORLDS: World[] = BASE.map((world) => ({ ...world, story: WORLD_STORIES[world.key] }));

export const worldByKey = (key: string) => WORLDS.find((w) => w.key === key);

/** The world a character lives in; user creations and unknown series have none. */
export const worldOf = (character: { series?: string }) => WORLDS.find((w) => w.series === character.series);
