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
export const LEVEL_TITLES = [
  'Stranger',
  'Acquaintance',
  'Friend',
  'Close Friend',
  'Confidant',
  'Crush',
  'Sweetheart',
  'Lover',
  'Soulmate',
  'Forever',
] as const;

/** Cumulative intimacy needed to *enter* each level (index = level - 1). */
export const LEVEL_THRESHOLDS = [0, 30, 80, 160, 280, 450, 700, 1050, 1500, 2100];

export function levelForIntimacy(intimacy: number) {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i += 1) {
    if (intimacy >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  const nextLevelAt = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  return {
    level,
    levelTitle: LEVEL_TITLES[level - 1],
    nextLevelAt,
    progress:
      level >= LEVEL_THRESHOLDS.length
        ? 1
        : (intimacy - LEVEL_THRESHOLDS[level - 1]) /
          (LEVEL_THRESHOLDS[level] - LEVEL_THRESHOLDS[level - 1]),
  };
}

/** A fresh bond, used when you add a friend or create a character. */
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
  relationship('c_theo', 63, 1, 25, 'bg_blossom', 0),
  relationship('c_seren', 214, 12, 96, 'bg_dusk', -1),
  relationship('c_oppa', 512, 22, 180, 'bg_room', 0),
  relationship('c_elio', 18, 0, 6, 'bg_night'),
  relationship('c_castor', 96, 3, 40, 'bg_tea', -1),
];

export const relationshipsByCharacter = Object.fromEntries(
  relationships.map((r) => [r.characterId, r]),
) as Record<string, Relationship>;
