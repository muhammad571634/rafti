import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildSceneOpeningPrompt } from '../ai/content-prompts';
import { buildCharacterPrompt } from '../ai/rules';
import { officialScenes } from '../mock/scenes';
import type { Character, Message, User } from '@/types';

import { activeScene, checkScene, mockSceneOpening, sceneLines, shownLines } from './scenes';

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

describe('shownLines', () => {
  const line = (id: string, card?: Message['card']): Message => ({
    id,
    conversationId: 'c',
    author: 'them',
    kind: card ? 'system' : 'text',
    ...(card ? { card } : {}),
    text: id,
    createdAt: '2026-11-17T19:00:00.000Z',
  });

  it('leaves out an end line that a new scene card follows', () => {
    const chat = [line('a'), line('end1', 'sceneEnd'), line('scene2', 'scene'), line('b')];
    assert.deepEqual(shownLines(chat).map((m) => m.id), ['a', 'scene2', 'b']);
  });

  it('keeps a lone end line and one followed by words', () => {
    const chat = [line('scene1', 'scene'), line('a'), line('end1', 'sceneEnd'), line('b'), line('end2', 'sceneEnd')];
    assert.deepEqual(shownLines(chat).map((m) => m.id), ['scene1', 'a', 'end1', 'b', 'end2']);
  });

  it('gives the same array back when nothing is left out', () => {
    const chat = [line('a'), line('end1', 'sceneEnd')];
    assert.equal(shownLines(chat), chat);
  });
});
