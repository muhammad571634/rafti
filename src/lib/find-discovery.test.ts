import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { characters } from '../mock/characters';
import type { Character } from '../types';

import {
  CAST_CIRCLES,
  groupStoryFitsGender,
  isGroupStoryMember,
  isOfficialCast,
  isUserCreation,
  searchFindUniverse,
  splitCastForFind,
} from './find-discovery';
import { GROUP_STORIES } from './group-stories';
import { TEMPLATES } from './templates';

const officialCast = characters.filter((c) => c.isOfficial);

describe('find-discovery: character classification', () => {
  it('defines all four Cast 2.0 circles', () => {
    assert.deepEqual([...CAST_CIRCLES], ['Friends', 'Partners', "It's complicated", 'Around you']);
  });

  it('distinguishes official cast, group story members, and user creations', () => {
    const roman = characters.find((c) => c.id === 'c_roman')!;
    const groupMember: Character = {
      ...roman,
      id: 'c_spawned_mia',
      isOfficial: false,
      fromTemplate: 'g_dorm214:mia',
    };
    const officialSpawnedBug: Character = {
      ...roman,
      id: 'c_bad_official',
      isOfficial: true,
      fromTemplate: 'g_dorm214:mia',
    };
    const ownCreation: Character = {
      ...roman,
      id: 'c_own',
      isOfficial: false,
      fromTemplate: undefined,
      fromCommunity: undefined,
    };

    assert.equal(isGroupStoryMember(roman), false);
    assert.equal(isGroupStoryMember(groupMember), true);

    assert.equal(isOfficialCast(roman), true);
    assert.equal(isOfficialCast(officialSpawnedBug), false);
    assert.equal(isOfficialCast(groupMember), false);
    assert.equal(isOfficialCast(ownCreation), false);

    assert.equal(isUserCreation(roman), false);
    assert.equal(isUserCreation(groupMember), false);
    assert.equal(isUserCreation(ownCreation), true);
  });
});

describe('find-discovery: splitCastForFind', () => {
  it('places un-met friends ahead of already-chatted friends while preserving rank order within each bucket', () => {
    const sample = officialCast.slice(0, 6);
    const chattedIds = new Set([sample[0].id, sample[2].id]);
    const { ordered, spotlight, gridPreview } = splitCastForFind(sample, chattedIds, () => true);

    const expectedUnmet = [sample[1], sample[3], sample[4], sample[5]].map((c) => c.id);
    const expectedChatted = [sample[0], sample[2]].map((c) => c.id);
    assert.deepEqual(
      ordered.map((c) => c.id),
      [...expectedUnmet, ...expectedChatted],
    );
    assert.deepEqual(
      spotlight.map((c) => c.id),
      expectedUnmet.slice(0, 3),
    );
    assert.ok(!gridPreview.some((c) => c.id === spotlight[0].id), 'gridPreview excludes Spotlight #1 lead');
    assert.equal(gridPreview.length, 4);
  });

  it('prefers pictured characters for spotlight even if unpictured lead is first', () => {
    const sample = officialCast.slice(0, 5);
    const noPicId = sample[0].id;
    const { spotlight } = splitCastForFind(sample, new Set(), (c) => c.id !== noPicId);

    assert.equal(spotlight.length, 3);
    assert.ok(!spotlight.some((c) => c.id === noPicId));
  });
});

describe('find-discovery: groupStoryFitsGender', () => {
  it('includes mixed-gender stories for both male and female while filtering single-gender stories', () => {
    const dorm = GROUP_STORIES.find((s) => s.id === 'g_dorm214')!;
    const cafe = GROUP_STORIES.find((s) => s.id === 'g_cafe')!;
    const ring = GROUP_STORIES.find((s) => s.id === 'g_ring')!;

    assert.equal(groupStoryFitsGender(dorm, undefined), true);
    assert.equal(groupStoryFitsGender(dorm, 'female'), true);
    assert.equal(groupStoryFitsGender(dorm, 'male'), false);

    assert.equal(groupStoryFitsGender(cafe, 'male'), true);
    assert.equal(groupStoryFitsGender(cafe, 'female'), false);

    assert.equal(groupStoryFitsGender(ring, 'male'), true);
    assert.equal(groupStoryFitsGender(ring, 'female'), true);
  });
});

describe('find-discovery: searchFindUniverse', () => {
  it('searches across people, group stories, and all 100 templates while excluding group members', () => {
    const roman = characters.find((c) => c.id === 'c_roman')!;
    const spawnedMember: Character = {
      ...roman,
      id: 'c_mia_dorm',
      name: 'Dorm Husband Test',
      isOfficial: false,
      fromTemplate: 'g_dorm214:mia',
    };
    const pool = [...characters, spawnedMember];

    const dormHits = searchFindUniverse({
      query: 'Dorm 214',
      people: pool,
      groups: GROUP_STORIES,
      templates: TEMPLATES,
      localizeCharacter: (c) => c,
      localizeGroup: (g) => g,
      localizeTemplate: (t) => t,
    });
    assert.ok(dormHits.groups.some((g) => g.id === 'g_dorm214'));
    assert.equal(dormHits.people.some((c) => c.id === 'c_mia_dorm'), false);

    const husbandHits = searchFindUniverse({
      query: 'husband',
      people: pool,
      groups: GROUP_STORIES,
      templates: TEMPLATES,
      localizeCharacter: (c) => c,
      localizeGroup: (g) => g,
      localizeTemplate: (t) => t,
    });
    assert.ok(husbandHits.people.some((c) => c.id === 'c_roman'));
    assert.ok(husbandHits.templates.some((t) => t.id === 't_alexander'));
    assert.ok(husbandHits.templates.some((t) => t.id === 't_damian'));

    const femaleOnlyHusband = searchFindUniverse({
      query: 'husband',
      gender: 'female',
      people: pool,
      groups: GROUP_STORIES,
      templates: TEMPLATES,
      localizeCharacter: (c) => c,
      localizeGroup: (g) => g,
      localizeTemplate: (t) => t,
    });
    assert.equal(femaleOnlyHusband.people.some((c) => c.id === 'c_roman'), false);
    assert.equal(femaleOnlyHusband.templates.some((t) => t.id === 't_alexander'), false);
  });
});
