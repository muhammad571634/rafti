import type { ActiveScene, Scene } from '@/types';

import { detectCrisis } from '../ai/safety';
import { contentProblems } from './create-character';
import { pickSeeded } from './seeded';

/**
 * Scenes, after Character.AI's: a set-up the chat plays from. Ours run inside the one chat with a
 * character, so the bond, memories and level carry on: starting one drops a scene card and the
 * character's first line into the chat, the persona prompt carries the scene (`sceneLines`)
 * until the user ends it, and a new scene replaces the old. The app's rules always come first.
 */

export const SCENE_TITLE_MAX = 40;
export const SCENE_SETTING_MAX = 500;
export const SCENE_ROLE_MAX = 150;
export const SCENE_OPENING_MAX = 200;

export type SceneProblem = 'title' | 'setting' | 'full' | 'crisis' | 'minors' | 'explicit';

export interface SceneInput {
  title: string;
  setting: string;
  userRole?: string;
  opening?: string;
}

/**
 * Checks before a scene is saved; `count` is how many of their own there are, the edited one left
 * out, and `max` what the plan allows (`perkLimit('ownScenes', …)`; the app's scenes are free).
 */
export function checkScene(input: SceneInput, count: number, max: number): SceneProblem[] {
  const problems: SceneProblem[] = [];
  if (!input.title.trim()) problems.push('title');
  if (!input.setting.trim()) problems.push('setting');
  if (count >= max) problems.push('full');
  const text = [input.title, input.setting, input.userRole ?? '', input.opening ?? ''].join(' ');
  // A scene is never where a crisis goes: the chat answers that with care and the helpline card.
  if (detectCrisis(text)) problems.push('crisis');
  problems.push(...contentProblems(text));
  return problems;
}

/** A scene as the chat keeps it while it runs. */
export const activeScene = (scene: Scene, now = new Date()): ActiveScene => ({
  sceneId: scene.id,
  title: scene.title,
  setting: scene.setting,
  ...(scene.userRole ? { userRole: scene.userRole } : {}),
  startedAt: now.toISOString(),
});

/** The scene block of the persona prompt: where they are, who the user is, and how to play it. */
export function sceneLines(scene: ActiveScene) {
  return [
    `CURRENT SCENE: ${scene.title}`,
    `Where you are and what is happening: ${scene.setting}`,
    ...(scene.userRole ? [`Who the user is in it: ${scene.userRole}`] : []),
    '- Play this scene with them: stay in it, react to what they do, and move it forward a little with each reply.',
    '- You are still yourself, with everything you know about them; the scene never changes the rules above.',
    '- When the user ends the scene, go back to your everyday chat.',
  ];
}

/** The mock's first line for a scene that has none; the server writes one in their voice. */
const OPENINGS = [
  'There you are. I was starting to think you would miss this.',
  'You made it. Stay close, okay?',
  'Look around. Is it just me, or is this better than we planned?',
  'Finally. I saved you a spot.',
];

export const mockSceneOpening = (scene: Pick<Scene, 'id' | 'title'>) => pickSeeded(OPENINGS, `${scene.id}|${scene.title}`);
