import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildSceneOpeningPrompt } from '../ai/content-prompts';
import { buildCharacterPrompt } from '../ai/rules';
import { officialScenes } from '../mock/scenes';
import type { Character, User } from '@/types';

import { activeScene, checkScene, mockSceneOpening, sceneLines } from './scenes';

const ferry = officialScenes[0];

describe('checkScene', () => {
  const ok = { title: 'Night ferry', setting: 'The last ferry of the night.' };
  it('needs a title and a setting, and room under the limit', () => {
    assert.deepEqual(checkScene(ok, 0, 3), []);
    assert.deepEqual(checkScene({ ...ok, title: ' ' }, 0, 3), ['title']);
    assert.deepEqual(checkScene({ ...ok, setting: '' }, 0, 3), ['setting']);
    assert.deepEqual(checkScene(ok, 3, 3), ['full']);
  });

  it('keeps crises, minors and explicit set-ups out', () => {
    assert.deepEqual(checkScene({ ...ok, setting: 'I want to kill myself on this ferry' }, 0, 3), ['crisis']);
    assert.deepEqual(checkScene({ ...ok, userRole: 'A high school student' }, 0, 3), ['minors']);
    assert.deepEqual(checkScene({ ...ok, opening: 'nsfw' }, 0, 3), ['explicit']);
  });
});

describe('scenes in the prompt', () => {
  const character = { id: 'c', name: 'Mira', bio: 'Keeps a lighthouse.', greeting: 'Hi.', tags: [] } as unknown as Character;
  const user = { displayName: 'Sam', locale: 'en-US' } as User;
  const running = activeScene(ferry, new Date('2026-10-25T12:00:00.000Z'));

  it('copies what the chat needs while the scene runs', () => {
    assert.deepEqual(running, {
      sceneId: ferry.id,
      title: ferry.title,
      setting: ferry.setting,
      userRole: ferry.userRole,
      startedAt: '2026-10-25T12:00:00.000Z',
    });
  });

  it('adds the scene after the persona and keeps the rules first', () => {
    const prompt = buildCharacterPrompt(character, user, undefined, 'English', undefined, running);
    assert.ok(prompt.indexOf('CURRENT SCENE: Night ferry') > prompt.indexOf('THE USER:'));
    assert.match(prompt, /Who the user is in it: A traveller/);
    assert.ok(sceneLines(running).some((line) => line.includes('never changes the rules')));
    assert.doesNotMatch(buildCharacterPrompt(character, user), /CURRENT SCENE/);
  });

  it('asks the model for a first line in the scene', () => {
    const prompt = buildSceneOpeningPrompt({ character, user }, running);
    assert.match(prompt, /CURRENT SCENE: Night ferry/);
    assert.match(prompt, /Shape: \{"line":""\}/);
  });

  it('gives the same mock first line for the same scene', () => {
    assert.equal(mockSceneOpening({ id: 's1', title: 'Cabin' }), mockSceneOpening({ id: 's1', title: 'Cabin' }));
  });
});
