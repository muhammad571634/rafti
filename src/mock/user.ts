import type { AppSettings, DailyState, Relationship, User, Wallet } from '@/types';
import { dayKeyFromToday, daysAgo } from './time';

export const currentUser: User = {
  id: 'u_me',
  displayName: 'Uptodown',
  handle: '@uptodown',
  accentIndex: 0,
  locale: 'en',
};

export const wallet: Wallet = {
  shells: 128,
  film: 3,
  isMember: false,
};

export const initialDaily: DailyState = {
  checkInDay: 0,
  greetedSlots: [],
  calledSlots: [],
  adsWatched: 0,
  spinsUsed: 0,
};

export const initialSettings: AppSettings = {
  morningGreeting: true,
  eveningGreeting: true,
  morningCall: true,
  nightCall: true,
  chatAnimation: true,
};

/** Level ladder shared by the header badge and the level-up modal. */
/**
 * Five stages of closeness over levels 0-100. Each stage unlocks relationship
 * labels the user can pick in character settings; replies follow the label.
 */
export const TIERS = [
  { key: 'stranger', title: 'Stranger', from: 0, to: 0, labels: [] },
  { key: 'friend', title: 'Friend', from: 1, to: 5, labels: ['Friend', 'Best friend'] },
  { key: 'closer', title: 'More than friends', from: 6, to: 15, labels: ["It's complicated", 'Crush', 'Situationship'] },
  { key: 'beloved', title: 'Beloved', from: 16, to: 49, labels: ['Dating', 'Partner', 'Sweetheart'] },
  { key: 'family', title: 'Family', from: 50, to: 100, labels: ['Engaged', 'Married', 'Soulmate'] },
] as const;

export type Tier = (typeof TIERS)[number];
export const MAX_LEVEL = 100;

export function tierForLevel(level: number): Tier {
  return TIERS.find((t) => level >= t.from && level <= t.to) ?? TIERS[TIERS.length - 1];
}

/**
 * Intimacy needed to reach a level. A message earns about 2, so the first one
 * makes you friends, a busy day or two "more than friends", a few weeks "beloved"
 * and months "family".
 */
export function levelThreshold(level: number) {
  return level <= 0 ? 0 : Math.round(2 * level ** 2.3);
}

/** Labels unlocked up to and including the stage this level is in. */
export function unlockedLabels(level: number): string[] {
  return TIERS.filter((t) => t.from <= level).flatMap((t) => [...t.labels]);
}

export function levelForIntimacy(intimacy: number) {
  let level = 0;
  while (level < MAX_LEVEL && intimacy >= levelThreshold(level + 1)) level += 1;
  const floor = levelThreshold(level);
  const nextLevelAt = levelThreshold(Math.min(level + 1, MAX_LEVEL));
  return {
    level,
    levelTitle: tierForLevel(level).title,
    nextLevelAt,
    progress: level >= MAX_LEVEL ? 1 : (intimacy - floor) / (nextLevelAt - floor),
  };
}

export function newRelationship(characterId: string): Relationship {
  const { level, levelTitle, nextLevelAt } = levelForIntimacy(0);
  return {
    characterId,
    intimacy: 0,
    level,
    levelTitle,
    nextLevelAt,
    streakDays: 0,
    anniversary: new Date().toISOString(),
    backgroundId: 'bg_blossom',
    voiceReplies: true,
    messagesFirst: true,
  };
}

function relationship(
  characterId: string,
  intimacy: number,
  streakDays: number,
  anniversaryDaysAgo: number,
  backgroundId = 'bg_blossom',
  lastChatOffset = 0,
): Relationship {
  const { level, levelTitle, nextLevelAt } = levelForIntimacy(intimacy);
  return {
    ...newRelationship(characterId),
    intimacy,
    level,
    levelTitle,
    nextLevelAt,
    streakDays,
    lastChatDay: streakDays > 0 ? dayKeyFromToday(lastChatOffset) : undefined,
    anniversary: daysAgo(anniversaryDaysAgo),
    backgroundId,
  };
}

export const relationships: Relationship[] = [
  relationship('c_theo', 420, 1, 25, 'bg_blossom', 0),
  relationship('c_seren', 1600, 12, 96, 'bg_dusk', -1),
  relationship('c_oppa', 6200, 22, 180, 'bg_room', 0),
  relationship('c_elio', 40, 0, 6, 'bg_night'),
  relationship('c_castor', 260, 3, 40, 'bg_tea', -1),
];

export const relationshipsByCharacter = Object.fromEntries(
  relationships.map((r) => [r.characterId, r]),
) as Record<string, Relationship>;
