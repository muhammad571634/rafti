import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { characters, groupBySeries } from '../mock/characters';
import type { Character, Message } from '../types';

import {
  coldStartGenderPrior,
  computeDiscoveryWeights,
  hourLeadForGender,
  rankCharactersForUser,
  rankFeaturedForUser,
  rankGroupStoriesForUser,
  rankTemplatesForUser,
} from './discovery-rank';
import { GROUP_STORIES } from './group-stories';
import { shelf } from './templates';

const officialCast = characters.filter((c) => c.isOfficial);

const makeMessages = (count: number, rating?: 'up' | 'down'): Pick<Message, 'author' | 'rating' | 'reaction'>[] =>
  Array.from({ length: count }, () => ({ author: 'me' as const, rating }));

describe('discovery-rank: cold-start gender priors', () => {
  it('applies soft opposite-gender priors for he/she and neutral 50/50 for they/unset', () => {
    assert.deepEqual(coldStartGenderPrior('he'), { female: 0.74, male: 0.26 });
    assert.deepEqual(coldStartGenderPrior('she'), { male: 0.74, female: 0.26 });
    assert.deepEqual(coldStartGenderPrior('they'), { female: 0.5, male: 0.5 });
    assert.deepEqual(coldStartGenderPrior(undefined), { female: 0.5, male: 0.5 });
  });

  it('tilts cold-start prior toward onboarding first companion when pronouns are they/unset', () => {
    assert.deepEqual(coldStartGenderPrior('they', 'female'), { female: 0.68, male: 0.32 });
    assert.deepEqual(coldStartGenderPrior(undefined, 'male'), { male: 0.68, female: 0.32 });
    // Even if a 'he' user picks Milo (safe best friend) first, opposite-gender prior stays intact
    const heWithMilo = coldStartGenderPrior('he', 'male');
    assert.ok(heWithMilo.female >= 0.6, `expected female >= 0.6, got ${heWithMilo.female}`);
  });

  it('ranks female characters & story templates higher for a Day-1 he user without locking out males', () => {
    const weights = computeDiscoveryWeights({
      user: { pronouns: 'he' },
      characters: officialCast,
      conversations: [],
      messagesByConversation: {},
      relationships: {},
      recentlyViewed: [],
    });

    assert.equal(weights.preferredGender, 'female');
    const rankedChars = rankCharactersForUser(officialCast, weights, 'evening');
    assert.equal(rankedChars[0].gender, 'female');
    assert.ok(rankedChars.some((c) => c.gender === 'male'), 'never hides male characters');

    const top8Stories = rankTemplatesForUser(shelf('forYou', {}), {}, weights).slice(0, 8);
    const femaleCount = top8Stories.filter((t) => t.card.gender === 'female').length;
    const maleCount = top8Stories.filter((t) => t.card.gender === 'male').length;
    assert.equal(femaleCount, 6);
    assert.equal(maleCount, 2);
  });

  it('ranks male characters & story templates higher for a Day-1 she user without locking out females', () => {
    const weights = computeDiscoveryWeights({
      user: { pronouns: 'she' },
      characters: officialCast,
      conversations: [],
      messagesByConversation: {},
      relationships: {},
      recentlyViewed: [],
    });

    assert.equal(weights.preferredGender, 'male');
    const rankedChars = rankCharactersForUser(officialCast, weights, 'morning');
    assert.equal(rankedChars[0].gender, 'male');

    const top8Stories = rankTemplatesForUser(shelf('forYou', {}), {}, weights).slice(0, 8);
    const maleCount = top8Stories.filter((t) => t.card.gender === 'male').length;
    const femaleCount = top8Stories.filter((t) => t.card.gender === 'female').length;
    assert.equal(maleCount, 6);
    assert.equal(femaleCount, 2);
  });

  it('interleaves 50/50 on Find & Stories when pronouns are they/unset (no 8/8 male bias)', () => {
    const weights = computeDiscoveryWeights({
      user: { pronouns: 'they' },
      characters: officialCast,
      conversations: [],
      messagesByConversation: {},
      relationships: {},
      recentlyViewed: [],
    });

    assert.equal(weights.preferredGender, undefined);
    const top8Stories = rankTemplatesForUser(shelf('forYou', {}), {}, weights).slice(0, 8);
    const maleCount = top8Stories.filter((t) => t.card.gender === 'male').length;
    const femaleCount = top8Stories.filter((t) => t.card.gender === 'female').length;
    assert.equal(maleCount, 4);
    assert.equal(femaleCount, 4);
  });
});

describe('discovery-rank: implicit behavioral adaptation', () => {
  it('overrides cold-start prior when user builds deep engagement with another gender', () => {
    const now = Date.UTC(2026, 10, 21, 12, 0, 0);
    const recentIso = new Date(now - 3600_000).toISOString();

    const weights = computeDiscoveryWeights({
      user: { pronouns: 'he' },
      characters: officialCast,
      conversations: [
        { id: 'conv_milo', characterId: 'c_milo', lastMessageAt: recentIso },
        { id: 'conv_caleb', characterId: 'c_caleb', lastMessageAt: recentIso },
        { id: 'conv_roman', characterId: 'c_roman', lastMessageAt: recentIso },
      ],
      messagesByConversation: {
        conv_milo: makeMessages(12, 'up'),
        conv_caleb: makeMessages(10),
        conv_roman: makeMessages(8),
      },
      relationships: {
        c_milo: { level: 3, intimacy: 60, anniversary: recentIso },
        c_caleb: { level: 2, intimacy: 25, anniversary: recentIso },
        c_roman: { level: 2, intimacy: 20, anniversary: recentIso },
      },
      recentlyViewed: ['c_asher', 'c_victor'],
      nowMs: now,
    });

    assert.ok(weights.behavioralConfidence > 0.75, `expected confidence > 0.75, got ${weights.behavioralConfidence}`);
    assert.ok(weights.genderAffinity.male > 0.65, `expected male affinity > 0.65, got ${weights.genderAffinity.male}`);
    assert.equal(weights.preferredGender, 'male');

    const top8Stories = rankTemplatesForUser(shelf('forYou', {}), {}, weights).slice(0, 8);
    assert.ok(top8Stories.filter((t) => t.card.gender === 'male').length >= 6);
  });

  it('keeps family relationships from skewing romantic gender priors while learning trait tags', () => {
    const now = Date.UTC(2026, 10, 21, 12, 0, 0);
    const recentIso = new Date(now - 3600_000).toISOString();

    const weights = computeDiscoveryWeights({
      user: { pronouns: 'he' },
      characters: officialCast,
      conversations: [{ id: 'conv_caleb', characterId: 'c_caleb', lastMessageAt: recentIso }],
      messagesByConversation: { conv_caleb: makeMessages(20, 'up') },
      relationships: {
        c_caleb: { level: 5, intimacy: 150, label: 'Big brother', anniversary: recentIso },
      },
      recentlyViewed: [],
      nowMs: now,
    });

    // Family chat with Big brother (Caleb) must not flip the 'he' user's female affinity
    assert.equal(weights.preferredGender, 'female');
    assert.ok((weights.tagWeights.guarded ?? 0) > 0, 'still learns trait affinity from family interactions');
  });
});

describe('discovery-rank: featured hero, hour leads & group stories', () => {
  it('selects gender-matched hour leads and places them first in Featured', () => {
    assert.equal(hourLeadForGender('morning', 'female'), 'c_sam');
    assert.equal(hourLeadForGender('afternoon', 'female'), 'c_clara');
    assert.equal(hourLeadForGender('evening', 'female'), 'c_lena');
    assert.equal(hourLeadForGender('night', 'female'), 'c_mia');

    assert.equal(hourLeadForGender('morning', 'male'), 'c_milo');
    assert.equal(hourLeadForGender('afternoon', 'male'), 'c_caleb');
    assert.equal(hourLeadForGender('evening', 'male'), 'c_roman');
    assert.equal(hourLeadForGender('night', 'male'), 'c_asher');

    const femalePrefWeights = computeDiscoveryWeights({
      user: { pronouns: 'he' },
      characters: officialCast,
      conversations: [],
      messagesByConversation: {},
      relationships: {},
      recentlyViewed: [],
    });

    const ranked = rankCharactersForUser(officialCast, femalePrefWeights, 'evening');
    const groups = groupBySeries(ranked);
    const featured = rankFeaturedForUser(ranked, groups, femalePrefWeights, 'evening', Date.now(), () => true);

    assert.equal(featured[0].id, 'c_lena');
    assert.ok(featured.length >= 4);
  });

  it('respects fresh early-access releases before circle representatives in Featured', () => {
    const now = Date.UTC(2026, 10, 21, 12, 0, 0);
    const releasedRecently = new Date(now - 2 * DAY_MS_VALUE).toISOString();
    const freshChar: Character = {
      ...officialCast[0],
      id: 'c_fresh',
      name: 'Fresh Star',
      releasedAt: releasedRecently,
    };
    const pool = [...officialCast, freshChar];
    const weights = computeDiscoveryWeights({
      user: { pronouns: 'they' },
      characters: pool,
      conversations: [],
      messagesByConversation: {},
      relationships: {},
      recentlyViewed: [],
      nowMs: now,
    });
    const groups = groupBySeries(pool);
    const featured = rankFeaturedForUser(pool, groups, weights, 'morning', now, () => true);
    assert.ok(featured.some((c) => c.id === 'c_fresh'));
    assert.equal(featured[0].id, 'c_sam');
    assert.equal(featured[1].id, 'c_fresh');
  });

  it('orders group stories according to user gender affinity', () => {
    const forHer = computeDiscoveryWeights({
      user: { pronouns: 'she' },
      characters: officialCast,
      conversations: [],
      messagesByConversation: {},
      relationships: {},
      recentlyViewed: [],
    });
    const forHim = computeDiscoveryWeights({
      user: { pronouns: 'he' },
      characters: officialCast,
      conversations: [],
      messagesByConversation: {},
      relationships: {},
      recentlyViewed: [],
    });

    const malePreferredOrder = rankGroupStoriesForUser(GROUP_STORIES, forHer).map((g) => g.id);
    const femalePreferredOrder = rankGroupStoriesForUser(GROUP_STORIES, forHim).map((g) => g.id);

    assert.ok(malePreferredOrder.indexOf('g_cafe') < malePreferredOrder.indexOf('g_dorm214'));
    assert.ok(femalePreferredOrder.indexOf('g_dorm214') < femalePreferredOrder.indexOf('g_cafe'));
  });
});

const DAY_MS_VALUE = 86_400_000;
