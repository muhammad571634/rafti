import type { Scene } from '@/types';

import { checkScene, SCENE_OPENING_MAX, SCENE_ROLE_MAX, SCENE_SETTING_MAX, SCENE_TITLE_MAX } from './scenes';

/**
 * Moments to step into, on a friend's page (after Character.AI's character feed, "Continue this
 * moment in chat"): small scenes between this friend and the user. Ours are not posts by strangers:
 * once a week the friend writes their own (`kind: 'moments'`, src/ai/writes.ts) from who they are to
 * the user and what they remember, with the first thing they say in each. A tap starts it as a scene
 * in the one chat with them (`continueMoment`), so the bond and memories carry on. One path for every
 * friend, official or user-made, in any language. Before a friend is added, with the model off or
 * busy, the page offers the app's scenes instead.
 */

/** How many moments a friend writes for a week. */
export const MOMENTS_COUNT = 4;
/** Fewer than this in an answer and it is not kept. */
export const MOMENTS_MIN = 2;

/** One moment as the model writes it. */
export interface WrittenMoment {
  title: string;
  /** Where the two of them are and what is happening. */
  setting: string;
  /** Who the user is in it, when not simply themselves. */
  role?: string;
  /** The first thing the friend says in it: shown on the card, and their first line in the chat. */
  line: string;
}

/** A friend's moments of one week, as the phone keeps them. */
export interface FriendMoments {
  /** `weekKey` of when they were written. */
  week: string;
  /** The app language they were written in; another language asks again. */
  lang: string;
  scenes: Scene[];
}

const MOMENT_ID = 'fm_';

/** A written moment's scene id: one per friend, week and place in the list. */
export const momentSceneId = (characterId: string, week: string, index: number) => `${MOMENT_ID}${characterId}_${week}_${index}`;

/** Whether a scene is one a friend wrote (its first line is theirs, so the chat plays it as written). */
export const isWrittenMoment = (scene: Pick<Scene, 'id'>) => scene.id.startsWith(MOMENT_ID);

const cut = (text: string | undefined, max: number) => (text ?? '').trim().slice(0, max).trim();

/**
 * The model's moments as scenes for this friend. Each passes the checks a user's own scene does
 * (`checkScene`: a crisis, minors, explicit set-ups); one that fails is left out, never repaired.
 */
export function momentScenes(characterId: string, week: string, written: readonly WrittenMoment[], now = new Date()): Scene[] {
  const createdAt = now.toISOString();
  const scenes: Scene[] = [];
  for (const moment of written) {
    const input = {
      title: cut(moment.title, SCENE_TITLE_MAX),
      setting: cut(moment.setting, SCENE_SETTING_MAX),
      userRole: cut(moment.role, SCENE_ROLE_MAX),
      opening: cut(moment.line, SCENE_OPENING_MAX),
    };
    if (!input.opening || checkScene(input, 0, 1).length) continue;
    if (scenes.some((s) => s.title.toLowerCase() === input.title.toLowerCase())) continue;
    scenes.push({
      id: momentSceneId(characterId, week, scenes.length),
      title: input.title,
      setting: input.setting,
      ...(input.userRole ? { userRole: input.userRole } : {}),
      opening: input.opening,
      characterId,
      createdAt,
    });
    if (scenes.length === MOMENTS_COUNT) break;
  }
  return scenes.length >= MOMENTS_MIN ? scenes : [];
}

/** The kept moments when they are still this week's, in this language; else nothing (ask again). */
export function currentMoments(kept: FriendMoments | undefined, week: string, lang: string): Scene[] {
  return kept && kept.week === week && kept.lang === lang ? kept.scenes : [];
}

/**
 * What a friend's page offers, in order: the moments they wrote this week, the user's own scenes,
 * then the app's scenes for any friend (a world's entry scene belongs to its world page).
 */
export function momentFeed(written: readonly Scene[], own: readonly Scene[], official: readonly Scene[]): Scene[] {
  const seen = new Set<string>();
  return [...written, ...own, ...official.filter((scene) => !scene.series)].filter((scene) => (seen.has(scene.id) ? false : (seen.add(scene.id), true)));
}

/**
 * Whether a card may quote the scene's first line as the friend's own words. A moment they wrote:
 * always. The app's stock line: only with the model off, since with it on they write their own
 * first line when the scene starts and the card must not put other words in their mouth.
 */
export function quotesOpening(scene: Pick<Scene, 'id' | 'opening' | 'official'>, modelOn: boolean): boolean {
  if (!scene.opening?.trim()) return false;
  return isWrittenMoment(scene) || !scene.official || !modelOn;
}
