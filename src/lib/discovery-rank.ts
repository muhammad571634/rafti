import type { CharacterGroup } from '@/mock/characters';
import type { Character, CharacterGender, CharacterRole, Conversation, Message, Pronouns, Relationship, Trope as CharacterTrope, User } from '@/types';

import { isNewCharacter } from '../economy/early-access';

import type { GroupStory } from './group-stories';
import { isFamilyLabel } from './kin';
import { hourLead, type PartOfDay } from './night-hour';
import { type StoryTemplate, templateById, type TemplateStats, trendScore, type Trope } from './templates';

const DAY_MS = 86_400_000;
const DECAY_HALF_LIFE_DAYS = 14;
const DECAY_LAMBDA = Math.LN2 / DECAY_HALF_LIFE_DAYS;
/** Number of engagement points where behavioral adaptation reaches ~63% weight (`1 - 1/e`). */
const BEHAVIOR_TAU = 12;
const PREFERRED_GENDER_THRESHOLD = 0.56;

export interface DiscoveryWeights {
  readonly totalSignal: number;
  readonly behavioralConfidence: number;
  readonly genderAffinity: Readonly<Record<CharacterGender, number>>;
  readonly preferredGender: CharacterGender | undefined;
  readonly tagWeights: Readonly<Record<string, number>>;
  readonly tropeWeights: Readonly<Partial<Record<Trope, number>>>;
  readonly roleWeights: Readonly<Partial<Record<CharacterRole, number>>>;
}

export interface DiscoverySignalInput {
  readonly user: Pick<User, 'pronouns'>;
  readonly characters: readonly Character[];
  readonly conversations: readonly Pick<Conversation, 'id' | 'characterId' | 'lastMessageAt'>[];
  readonly messagesByConversation: Readonly<Record<string, readonly Pick<Message, 'author' | 'rating' | 'reaction'>[]>>;
  readonly relationships: Readonly<Record<string, Pick<Relationship, 'level' | 'intimacy' | 'label'> & { anniversary?: string }>>;
  readonly recentlyViewed: readonly string[];
  readonly nowMs?: number;
}

const OTHER_GENDER: Record<CharacterGender, CharacterGender> = {
  male: 'female',
  female: 'male',
};

const HOUR_LEAD_FEMALE: Record<PartOfDay, string> = {
  morning: 'c_sam',
  afternoon: 'c_clara',
  evening: 'c_lena',
  night: 'c_mia',
};

const HOUR_LEAD_MALE: Record<PartOfDay, string> = {
  morning: 'c_milo',
  afternoon: 'c_caleb',
  evening: 'c_roman',
  night: 'c_asher',
};

/**
 * Cold-start gender distribution derived from `user.pronouns` and onboarding's first friend pick.
 * Uses a soft prior (~74/26) so discovery never locks out any character gender.
 */
export function coldStartGenderPrior(pronouns?: Pronouns, firstCompanionGender?: CharacterGender): Record<CharacterGender, number> {
  if (pronouns !== 'he' && pronouns !== 'she') {
    if (firstCompanionGender) {
      return {
        [firstCompanionGender]: 0.68,
        [OTHER_GENDER[firstCompanionGender]]: 0.32,
      } as Record<CharacterGender, number>;
    }
    return { female: 0.5, male: 0.5 };
  }

  const base: Record<CharacterGender, number> = pronouns === 'he' ? { female: 0.74, male: 0.26 } : { male: 0.74, female: 0.26 };
  if (!firstCompanionGender) return base;

  const opposite = pronouns === 'he' ? 'female' : 'male';
  if (firstCompanionGender === opposite) {
    return { [opposite]: 0.78, [OTHER_GENDER[opposite]]: 0.22 } as Record<CharacterGender, number>;
  }
  const sameScore = 0.86 * base[firstCompanionGender] + 0.14;
  return {
    [firstCompanionGender]: Number(sameScore.toFixed(4)),
    [OTHER_GENDER[firstCompanionGender]]: Number((1 - sameScore).toFixed(4)),
  } as Record<CharacterGender, number>;
}

function normalizeMap<K extends string>(raw: Partial<Record<K, number>>): Partial<Record<K, number>> {
  const entries = Object.entries(raw) as [K, number][];
  if (!entries.length) return {};
  const maxAbs = Math.max(1, ...entries.map(([, v]) => Math.abs(v)));
  return Object.fromEntries(entries.map(([k, v]) => [k, Number((v / maxAbs).toFixed(4))])) as Partial<Record<K, number>>;
}

const CHAR_TROPE_TO_STORY_TROPE: Readonly<Partial<Record<CharacterTrope, Trope>>> = {
  'friends-to-lovers': 'bestFriend',
  'secret-admirer': 'likesYou',
  'arranged-marriage': 'married',
  bodyguard: 'dangerous',
  'enemies-to-lovers': 'enemies',
  rivals: 'enemies',
  'second-chance': 'ex',
  forbidden: 'closeToHome',
  'forced-proximity': 'closeToHome',
  'fake-dating': 'likesYou',
  'slow-burn': 'likesYou',
  'grumpy-sunshine': 'dangerous',
};

function addCharacterAffinity(
  char: Character,
  delta: number,
  tagTotals: Record<string, number>,
  roleTotals: Partial<Record<CharacterRole, number>>,
  tropeTotals: Partial<Record<Trope, number>>,
) {
  for (const tag of char.tags) {
    tagTotals[tag] = (tagTotals[tag] ?? 0) + delta;
  }
  if (char.role) {
    roleTotals[char.role] = (roleTotals[char.role] ?? 0) + delta;
  }
  if (char.fromTemplate) {
    const template = templateById(char.fromTemplate);
    if (template) {
      tropeTotals[template.trope] = (tropeTotals[template.trope] ?? 0) + delta;
    }
  }
  if (char.trope) {
    const mapped = CHAR_TROPE_TO_STORY_TROPE[char.trope];
    if (mapped) {
      tropeTotals[mapped] = (tropeTotals[mapped] ?? 0) + delta;
    }
  }
}

function earliestCompanionGender(
  charById: ReadonlyMap<string, Character>,
  conversations: DiscoverySignalInput['conversations'],
  relationships: DiscoverySignalInput['relationships'],
): CharacterGender | undefined {
  let earliestTime = Number.POSITIVE_INFINITY;
  let earliestId: string | undefined;

  for (const [charId, rel] of Object.entries(relationships)) {
    const ts = rel.anniversary ? Date.parse(rel.anniversary) : Number.NaN;
    if (Number.isFinite(ts) && ts < earliestTime && charById.has(charId)) {
      earliestTime = ts;
      earliestId = charId;
    }
  }

  if (!earliestId) {
    for (const conv of conversations) {
      const ts = Date.parse(conv.lastMessageAt);
      if (Number.isFinite(ts) && ts < earliestTime && charById.has(conv.characterId)) {
        earliestTime = ts;
        earliestId = conv.characterId;
      }
    }
  }

  if (!earliestId && conversations.length > 0) {
    earliestId = conversations[0].characterId;
  }

  return earliestId ? charById.get(earliestId)?.gender : undefined;
}

/**
 * Computes Cold-Start + Implicit Behavioral affinity weights across gender, tags, roles, and tropes.
 * Family relationships (`isFamilyLabel`) inform trait affinity without skewing romantic gender priors.
 */
export function computeDiscoveryWeights(input: DiscoverySignalInput): DiscoveryWeights {
  const charById = new Map(input.characters.map((c) => [c.id, c]));
  const firstGender = earliestCompanionGender(charById, input.conversations, input.relationships);
  const coldPrior = coldStartGenderPrior(input.user.pronouns, firstGender);

  let totalSignal = 0;
  let empMale = 0;
  let empFemale = 0;
  const tagTotals: Record<string, number> = {};
  const roleTotals: Partial<Record<CharacterRole, number>> = {};
  const tropeTotals: Partial<Record<Trope, number>> = {};
  const seenRelChars = new Set<string>();

  for (const conv of input.conversations) {
    const char = charById.get(conv.characterId);
    if (!char) continue;
    seenRelChars.add(char.id);

    const msgs = input.messagesByConversation[conv.id] ?? [];
    let myCount = 0;
    let likes = 0;
    let dislikes = 0;
    for (const m of msgs) {
      if (m.author === 'me') myCount += 1;
      if (m.rating === 'up' || Boolean(m.reaction)) likes += 1;
      else if (m.rating === 'down') dislikes += 1;
    }

    const msgTs = Date.parse(conv.lastMessageAt);
    const decay =
      input.nowMs !== undefined && Number.isFinite(msgTs)
        ? Math.exp(-DECAY_LAMBDA * Math.max(0, (input.nowMs - msgTs) / DAY_MS))
        : 1;

    const chatScore = ((myCount > 0 ? 2.0 : 0.6) + Math.min(20, myCount) * 0.75 + Math.min(4, likes) * 1.2 - Math.min(4, dislikes) * 1.2) * decay;
    const rel = input.relationships[char.id];
    const relBonus = rel ? Math.max(0, (rel.level - 1) * 2.0) : 0;
    const isFamily = Boolean(rel && isFamilyLabel(rel.label));
    const engagement = Math.max(-2, chatScore + relBonus);

    addCharacterAffinity(char, engagement, tagTotals, roleTotals, tropeTotals);

    if (engagement > 0 && !isFamily) {
      totalSignal += engagement;
      if (char.gender === 'male') empMale += engagement;
      else if (char.gender === 'female') empFemale += engagement;
    }
  }

  for (const [charId, rel] of Object.entries(input.relationships)) {
    if (seenRelChars.has(charId)) continue;
    const char = charById.get(charId);
    if (!char) continue;
    const relBonus = Math.max(0, (rel.level - 1) * 2.0);
    if (relBonus <= 0) continue;

    addCharacterAffinity(char, relBonus, tagTotals, roleTotals, tropeTotals);
    if (!isFamilyLabel(rel.label)) {
      totalSignal += relBonus;
      if (char.gender === 'male') empMale += relBonus;
      else if (char.gender === 'female') empFemale += relBonus;
    }
  }

  input.recentlyViewed.forEach((charId, idx) => {
    const char = charById.get(charId);
    if (!char) return;
    const viewScore = 0.6 * Math.pow(0.85, idx);
    addCharacterAffinity(char, viewScore, tagTotals, roleTotals, tropeTotals);
    const rel = input.relationships[char.id];
    if (!rel || !isFamilyLabel(rel.label)) {
      totalSignal += viewScore;
      if (char.gender === 'male') empMale += viewScore;
      else if (char.gender === 'female') empFemale += viewScore;
    }
  });

  const behavioralConfidence = 1 - Math.exp(-totalSignal / BEHAVIOR_TAU);
  const empSum = empMale + empFemale;
  const smooth = 2.5;
  const empMaleProb = empSum > 0 ? (empMale + coldPrior.male * smooth) / (empSum + smooth) : coldPrior.male;
  const empFemaleProb = empSum > 0 ? (empFemale + coldPrior.female * smooth) / (empSum + smooth) : coldPrior.female;

  const maleAffinity = (1 - behavioralConfidence) * coldPrior.male + behavioralConfidence * empMaleProb;
  const femaleAffinity = (1 - behavioralConfidence) * coldPrior.female + behavioralConfidence * empFemaleProb;
  const sum = maleAffinity + femaleAffinity || 1;
  const normalizedMale = maleAffinity / sum;
  const normalizedFemale = femaleAffinity / sum;

  const preferredGender: CharacterGender | undefined =
    normalizedFemale >= PREFERRED_GENDER_THRESHOLD
      ? 'female'
      : normalizedMale >= PREFERRED_GENDER_THRESHOLD
        ? 'male'
        : undefined;

  return {
    totalSignal,
    behavioralConfidence,
    genderAffinity: {
      male: normalizedMale,
      female: normalizedFemale,
    },
    preferredGender,
    tagWeights: normalizeMap(tagTotals) as Record<string, number>,
    tropeWeights: normalizeMap(tropeTotals),
    roleWeights: normalizeMap(roleTotals),
  };
}

/** Personalized hour-of-day hero lead adapted to the user's preferred companion gender. */
export function hourLeadForGender(part: PartOfDay, preferredGender?: CharacterGender): string {
  if (preferredGender === 'female') return HOUR_LEAD_FEMALE[part];
  if (preferredGender === 'male') return HOUR_LEAD_MALE[part];
  return hourLead(part);
}

function tagAffinityScore(tags: readonly string[], tagWeights: Readonly<Record<string, number>>): number {
  if (!tags.length) return 0.5;
  let total = 0;
  for (const tag of tags) total += tagWeights[tag] ?? 0;
  return (total / tags.length + 1) / 2;
}

/**
 * MMR-style diversity interleaving: caps consecutive items of the same gender at `maxRun`
 * when the pool contains both male and female items, preventing single-gender echo chambers.
 */
function interleaveByGender<T>(items: readonly T[], genderOf: (item: T) => CharacterGender | undefined, maxRun: number): T[] {
  const hasMale = items.some((x) => genderOf(x) === 'male');
  const hasFemale = items.some((x) => genderOf(x) === 'female');
  if (!hasMale || !hasFemale) return [...items];

  const pool = [...items];
  const result: T[] = [];

  while (pool.length > 0) {
    let runGender: CharacterGender | undefined;
    if (result.length >= maxRun) {
      const tail = result.slice(-maxRun);
      const firstG = genderOf(tail[0]);
      if (firstG && tail.every((x) => genderOf(x) === firstG)) {
        runGender = firstG;
      }
    }

    let pickIdx = 0;
    if (runGender) {
      const opposite = OTHER_GENDER[runGender];
      const oppositeIdx = pool.findIndex((item) => genderOf(item) === opposite);
      const diverseIdx = oppositeIdx !== -1 ? oppositeIdx : pool.findIndex((item) => genderOf(item) !== runGender);
      if (diverseIdx !== -1) pickIdx = diverseIdx;
    }
    result.push(pool.splice(pickIdx, 1)[0]);
  }

  return result;
}

function scoreCharacter(char: Character, idx: number, weights: DiscoveryWeights, part?: PartOfDay): number {
  const genderScore = char.gender ? weights.genderAffinity[char.gender] : 0.5;
  const tagScore = tagAffinityScore(char.tags, weights.tagWeights);
  const roleScore = char.role ? ((weights.roleWeights[char.role] ?? 0) + 1) / 2 : 0.5;
  const safeFriendBonus = char.id === 'c_milo' || char.id === 'c_sam' ? 0.06 : 0;
  const hourBonus = part && char.id === hourLeadForGender(part, weights.preferredGender) ? 0.12 : 0;
  return 0.58 * genderScore + 0.24 * tagScore + 0.12 * roleScore + safeFriendBonus + hourBonus - idx * 0.001;
}

/**
 * Ranks characters by blended gender affinity, trait/role match, time-of-day anchor, and
 * MMR diversity interleaving (max 2 consecutive same-gender when tilted, 1:1 when balanced).
 */
export function rankCharactersForUser(characters: readonly Character[], weights: DiscoveryWeights, part?: PartOfDay): Character[] {
  const sorted = characters
    .map((c, idx) => ({ c, score: scoreCharacter(c, idx, weights, part) }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.c);

  const maxRun = weights.preferredGender ? 2 : 1;
  return interleaveByGender(sorted, (c) => c.gender, maxRun);
}

/**
 * Builds the Find Featured row: new releases first, else the top-ranked hero per circle,
 * led by the hour's personalized friend.
 */
export function rankFeaturedForUser(
  shown: readonly Character[],
  groups: readonly CharacterGroup[],
  weights: DiscoveryWeights,
  part: PartOfDay,
  nowMs: number,
  hasHero: (c: Character) => boolean,
): Character[] {
  const fresh = shown
    .filter((c) => isNewCharacter(c, nowMs))
    .sort((a, b) => Date.parse(b.releasedAt!) - Date.parse(a.releasedAt!));

  const row = (
    fresh.length > 0
      ? fresh
      : rankCharactersForUser(
          groups
            .map((g) => g.characters.find(hasHero) ?? g.characters[0])
            .filter((c): c is Character => Boolean(c)),
          weights,
          part,
        )
  ).filter((c): c is Character => Boolean(c) && hasHero(c));

  const singleGender: CharacterGender | undefined =
    shown.length > 0 && shown.every((c) => c.gender === 'male')
      ? 'male'
      : shown.length > 0 && shown.every((c) => c.gender === 'female')
        ? 'female'
        : undefined;

  const leadId = hourLeadForGender(part, singleGender ?? weights.preferredGender);
  const lead = row.find((c) => c.id === leadId) ?? shown.find((c) => c.id === leadId && hasHero(c));
  return lead ? [lead, ...row.filter((c) => c.id !== lead.id)] : row;
}

/**
 * Ranks story templates combining real trending stats with user gender, trope, and tag affinities,
 * interleaved to preserve discovery variety (~75/25 when tilted, 50/50 when balanced).
 */
export function rankTemplatesForUser(
  list: readonly StoryTemplate[],
  stats: Readonly<Record<string, TemplateStats>>,
  weights: DiscoveryWeights,
): StoryTemplate[] {
  const sorted = list
    .map((t, idx) => {
      const genderScore = t.card.gender ? weights.genderAffinity[t.card.gender] : 0.5;
      const tropeScore = ((weights.tropeWeights[t.trope] ?? 0) + 1) / 2;
      const tagScore = tagAffinityScore(t.card.tags ?? [], weights.tagWeights);
      const popScore = Math.log1p(trendScore(stats[t.id])) * 0.35;
      const score = 0.52 * genderScore + 0.24 * tropeScore + 0.18 * tagScore + popScore - idx * 0.003;
      return { t, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.t);

  const maxRun = weights.preferredGender ? 2 : 1;
  return interleaveByGender(sorted, (t) => t.card.gender, maxRun);
}

/** Ranks multi-role group stories by member gender affinity and story tags. */
export function rankGroupStoriesForUser(stories: readonly GroupStory[], weights: DiscoveryWeights): GroupStory[] {
  return stories
    .map((story, idx) => {
      const avgGender =
        story.members.reduce((sum, m) => sum + weights.genderAffinity[m.gender], 0) / Math.max(1, story.members.length);
      const tagScore = tagAffinityScore(story.tags, weights.tagWeights);
      const score = 0.72 * avgGender + 0.28 * tagScore - idx * 0.001;
      return { story, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.story);
}
