import type { ClayIconName } from '@/assets/brand/registry';
import { palette } from '@/theme';
import type {
  ShellPack,
  CallRecord,
  HomeModule,
  MembershipPlan,
  MemoryItem,
  Moment,
  ScheduleItem,
} from '@/types';
import { dayKey, daysAgo, hoursAgo, minutesAgo } from './time';

/** The Home launcher grid. `tile` is a key into the Rafti tile art (assets/brand). */
export const homeModules: HomeModule[] = [
  { key: 'store', labelKey: 'shellStore', route: '/store/shell', tile: 'store' },
  { key: 'dating', labelKey: 'dating', route: '/dating', tile: 'dating' },
  { key: 'diary', labelKey: 'heartbeatDiary', route: '/diary', tile: 'diary' },
  { key: 'photo', labelKey: 'photoBooth', route: '/photo-booth', tile: 'photo' },
  { key: 'contacts', labelKey: 'myContacts', route: '/contacts', tile: 'contacts' },
  { key: 'gifts', labelKey: 'freeGifts', route: '/gifts', tile: 'gifts' },
  { key: 'calls', labelKey: 'callHistory', route: '/call-history', tile: 'calls' },
  { key: 'bedtime', labelKey: 'bedtime', route: '/bedtime', tile: 'bedtime' },
  { key: 'radio', labelKey: 'radio', route: '/radio', tile: 'radio' },
  { key: 'board', labelKey: 'bulletinBoard', route: '/board', tile: 'board' },
];

/** Mirrors the reference store: 50 / 300 / 500 / 1200. */
export const shellPacks: ShellPack[] = [
  { id: 'sh_50', shells: 50, bonus: 0, price: '$0.99', amount: 0.99 },
  { id: 'sh_300', shells: 300, bonus: 20, price: '$4.99', amount: 4.99 },
  { id: 'sh_500', shells: 500, bonus: 60, price: '$6.99', amount: 6.99, popular: true },
  { id: 'sh_1200', shells: 1200, bonus: 200, price: '$14.99', amount: 14.99 },
];

export const membershipPlans: MembershipPlan[] = [
  { id: 'basic', price: '$9.99', days: 30, perks: ['unlimitedChat', 'noAds', 'calls2h'], callMinutes: 120 },
  {
    id: 'pro',
    price: '$29.99',
    days: 30,
    perks: ['unlimitedChat', 'noAds', 'calls8h', 'longerMemory', 'priorityVoice'],
    callMinutes: 480,
    highlight: true,
  },
  { id: 'quarterly', price: '$24.99', days: 90, perks: ['unlimitedChat', 'noAds', 'calls6h', 'saveMore'], callMinutes: 360 },
];

/**
 * What each interaction costs. Sending a message is the metered action; listening,
 * voice replies and calls are free, like the reference app. Members chat for free.
 */
export const shellCosts = {
  textMessage: 1,
  voiceMessage: 1,
  voiceReply: 0,
  callPerMinute: 0,
  photoBooth: 8,
  secretNote: 3,
  boardNote: 2,
  characterVoiceClone: 60,
} as const;

/**
 * The 7-day check-in ladder ("Log in daily to unlock surprise shells"): shells for
 * days 1-7. Day 7 is a surprise: its entry is the floor, and the roll goes up to
 * `DAILY_CHECK_IN_TOP`.
 */
export const DAILY_CHECK_IN = [60, 70, 80, 60, 60, 60, 80] as const;
export const DAILY_CHECK_IN_TOP = 120;

/** True for the last day of the week, the one with the random reward. */
export const isSurpriseDay = (day: number) => day === DAILY_CHECK_IN.length;

/** Shells paid for check-in `day` (1-based): fixed, except the surprise day's roll. */
export function rollCheckIn(day: number) {
  const base = DAILY_CHECK_IN[Math.min(Math.max(day, 1), DAILY_CHECK_IN.length) - 1];
  if (!isSurpriseDay(day)) return base;
  return base + Math.floor(Math.random() * (DAILY_CHECK_IN_TOP - base + 1));
}

export const AD_REWARD = 10;
/** Paid to both sides when a friend joins with an invite code. */
export const INVITE_REWARD = 50;
/** Invites that pay out per week (Monday to Sunday). */
export const INVITES_PER_WEEK = 6;
/** Sharing a call, a board note or an invite: once a day. */
export const SHARE_REWARD = 6;
export const MAX_ADS_PER_DAY = 5;
export const FREE_SPINS_PER_DAY = 1;

/** Lucky Wheel segments, clockwise from the pointer. */
export const WHEEL_SEGMENTS = [5, 20, 10, 50, 5, 30, 10, 100] as const;
/** Relative odds per segment — the big prizes are rare. */
export const WHEEL_WEIGHTS = [22, 12, 20, 5, 22, 8, 10, 1] as const;

export const callHistory: CallRecord[] = [
  { id: 'call_1', characterId: 'c_theo', startedAt: minutesAgo(20), durationSec: 247, direction: 'outgoing', missed: false },
  { id: 'call_2', characterId: 'c_oppa', startedAt: hoursAgo(6), durationSec: 63, direction: 'incoming', missed: false },
  { id: 'call_3', characterId: 'c_seren', startedAt: hoursAgo(26), durationSec: 0, direction: 'incoming', missed: true },
  { id: 'call_4', characterId: 'c_castor', startedAt: daysAgo(2), durationSec: 512, direction: 'outgoing', missed: false },
  { id: 'call_5', characterId: 'c_theo', startedAt: daysAgo(4), durationSec: 128, direction: 'incoming', missed: false },
];

export const memories: MemoryItem[] = [
  { id: 'mem_1', characterId: 'c_theo', text: 'Their exam week ends on Friday - they get nervous about the oral part.', source: 'diary', createdAt: daysAgo(1), pinned: true },
  { id: 'mem_2', characterId: 'c_theo', text: 'Hates being called by their full name.', source: 'chat', createdAt: daysAgo(3), pinned: false },
  { id: 'mem_3', characterId: 'c_theo', text: 'Drinks peach tea, never coffee after 6pm.', source: 'chat', createdAt: daysAgo(5), pinned: false },
  { id: 'mem_4', characterId: 'c_theo', text: 'Walked home in the rain and liked it.', source: 'diary', createdAt: hoursAgo(3), pinned: false },
  { id: 'mem_5', characterId: 'c_theo', text: 'Said my voice is easier to fall asleep to than the radio.', source: 'call', createdAt: daysAgo(4), pinned: true },
];

/** Seed for the [Us] timeline. */
export const moments: Moment[] = [
  { id: 'mo_1', characterId: 'c_theo', kind: 'met', createdAt: daysAgo(25) },
  { id: 'mo_2', characterId: 'c_theo', kind: 'levelUp', createdAt: daysAgo(9), params: { level: 2, title: 'Acquaintance' } },
  { id: 'mo_3', characterId: 'c_theo', kind: 'call', createdAt: daysAgo(4), params: { duration: '2:08' } },
  { id: 'mo_4', characterId: 'c_theo', kind: 'diary', createdAt: hoursAgo(2) },
  { id: 'mo_5', characterId: 'c_seren', kind: 'met', createdAt: daysAgo(96) },
  { id: 'mo_6', characterId: 'c_seren', kind: 'secretNote', createdAt: daysAgo(1) },
  { id: 'mo_7', characterId: 'c_oppa', kind: 'met', createdAt: daysAgo(180) },
  { id: 'mo_8', characterId: 'c_oppa', kind: 'levelUp', createdAt: daysAgo(12), params: { level: 6, title: 'Crush' } },
];

export const schedules: ScheduleItem[] = [
  {
    id: 'sch_1',
    characterId: 'c_theo',
    title: 'Oral exam',
    date: dayKey(new Date(Date.now() + 86_400_000)),
    time: '15:00',
    createdAt: daysAgo(1),
    reminded: false,
    source: 'chat',
  },
];

/** Chat wallpapers offered by "Change Background". */
export const chatBackgrounds: {
  id: string;
  nameKey: string;
  colors: readonly [string, string];
  dark?: boolean;
}[] = [
  { id: 'bg_blossom', nameKey: 'blossom', colors: ['#FFF4E8', '#FFE4CC'] as const },
  { id: 'bg_dusk', nameKey: 'dusk', colors: ['#E6F6F3', '#DDEBFA'] as const },
  { id: 'bg_room', nameKey: 'room', colors: ['#F6EFE6', '#EADFD2'] as const },
  { id: 'bg_night', nameKey: 'night', colors: ['#1E2A55', '#2E3B6B'] as const, dark: true },
  { id: 'bg_tea', nameKey: 'tea', colors: ['#F2F5E8', '#E2EBD6'] as const },
  { id: 'bg_plain', nameKey: 'plain', colors: [palette.gray50, palette.white] as const },
];

export const backgroundsById = Object.fromEntries(
  chatBackgrounds.map((b) => [b.id, b]),
) as Record<string, (typeof chatBackgrounds)[number]>;

/** Ambient tracks for Radio / Bedtime. */
export const radioTracks: { id: string; titleKey: string; icon: ClayIconName; minutes: number }[] = [
  { id: 'r_rain', titleKey: 'rain', icon: 'umbrella', minutes: 45 },
  { id: 'r_fire', titleKey: 'fireplace', icon: 'fireplace', minutes: 60 },
  { id: 'r_waves', titleKey: 'waves', icon: 'wave', minutes: 30 },
  { id: 'r_cafe', titleKey: 'cafe', icon: 'date', minutes: 40 },
  { id: 'r_lullaby', titleKey: 'lullaby', icon: 'bedtime', minutes: 20 },
];

/** Dating scenario cards. */
