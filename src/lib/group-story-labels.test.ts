import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Character, GroupChat } from '@/types';

import { relabelStoryGroups, type StoryLabels } from './group-story-labels';

const en: StoryLabels = { name: 'Room 214', members: [{ id: 'ana', who: 'Your roommate.' }] };
const ru: StoryLabels = { name: 'Комната 214', members: [{ id: 'ana', who: 'Твоя соседка.' }] };
const wordsFor = (id: string) => (id === 'room' ? { local: en, all: [en, ru] } : undefined);

const group = (name?: string) => ({ id: 'g1', memberIds: ['c1'], name, story: { id: 'room', beat: 0, turns: 0 } }) as unknown as GroupChat;
const member = (series?: string, tagline?: string) =>
  ({ id: 'c1', name: 'Ana', fromTemplate: 'room:ana', isOfficial: false, series, tagline }) as unknown as Character;

describe('relabelStoryGroups', () => {
  it('moves the story words saved in another language to the screen language', () => {
    const out = relabelStoryGroups([group('Комната 214')], [member('Комната 214', 'Твоя соседка.')], wordsFor);
    assert.equal(out.groups[0].name, 'Room 214');
    assert.equal(out.characters[0].series, 'Room 214');
    assert.equal(out.characters[0].tagline, 'Your roommate.');
  });

  it('keeps a name the user gave the group', () => {
    const groups = [group('Our flat')];
    assert.equal(relabelStoryGroups(groups, [], wordsFor).groups, groups);
  });

  it('returns the same arrays when nothing changes', () => {
    const groups = [group('Room 214')];
    const characters = [member('Room 214', 'Your roommate.'), { id: 'c2', name: 'Milo', isOfficial: true } as Character];
    const out = relabelStoryGroups(groups, characters, wordsFor);
    assert.equal(out.groups, groups);
    assert.equal(out.characters, characters);
  });

  it('leaves template friends and unknown stories alone', () => {
    const characters = [{ id: 'c3', name: 'Noah', fromTemplate: 't_noah', series: 'X' } as Character, member('Комната 214')];
    const out = relabelStoryGroups([], characters, (id) => (id === 'other' ? wordsFor('room') : undefined));
    assert.equal(out.characters, characters);
  });
});
