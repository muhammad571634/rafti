import type { TileName } from '@/assets/brand/registry';

export type CharacterCategory = 'school' | 'fantasy' | 'idol' | 'daily' | 'original';

export interface Character {
  id: string;
  name: string;
  /** Creator handle shown on discovery cards, e.g. "@luckymoppy" */
  handle: string;
  bio: string;
  category: CharacterCategory;
  /** World used to group cards on the Find screen */
  series?: string;
  /** Picked from the gallery; bundled seed art is looked up by `id` in assets/avatars. */
  avatarUri?: string;
  /** Index into `avatarGradients` for the placeholder avatar */
  accentIndex: number;
  /** Voice model finished training -> green check on the card */
  voiceReady: boolean;
  isOfficial: boolean;
  greeting: string;
  tags: string[];
}

export interface Relationship {
  characterId: string;
  intimacy: number;
  level: number;
  levelTitle: string;
  /** Points needed to reach the next level */
  nextLevelAt: number;
  streakDays: number;
  /** Day key of the last message you sent them — drives the streak. */
  lastChatDay?: string;
  /** ISO date — shown as "Anniversary: 8/26/2026" */
  anniversary: string;
  backgroundId: string;
  /** What you call them; falls back to the character name. */
  nickname?: string;
  /** Replies come as a voice note + text, like the reference chat. */
  voiceReplies: boolean;
  /** They may text or call first (morning / night greetings). */
  messagesFirst: boolean;
}

export type MessageKind = 'text' | 'voice' | 'image' | 'system' | 'call';
export type MessageAuthor = 'me' | 'them';

export interface Message {
  id: string;
  conversationId: string;
  author: MessageAuthor;
  kind: MessageKind;
  text?: string;
  /** Speech-to-text of a voice message, rendered as a muted sub-bubble */
  transcript?: string;
  durationSec?: number;
  imageUri?: string;
  createdAt: string;
  readAt?: string;
  /** Local-only optimistic message waiting on the model */
  pending?: boolean;
  /** Rendered as a low-contrast bubble (the echo of what the character heard) */
  muted?: boolean;
  /** Call rows: the call was not picked up. */
  missed?: boolean;
}

export interface Conversation {
  id: string;
  characterId: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
  pinned: boolean;
  muted: boolean;
}

export type DiaryMood = 'happy' | 'soft' | 'blue' | 'excited' | 'tired';

export interface DiaryEntry {
  id: string;
  /** ISO date (day granularity) */
  date: string;
  title: string;
  body: string;
  mood: DiaryMood;
  images: string[];
  sharedWithCharacterId?: string;
  /** The character "reads" the entry and writes back */
  reply?: { characterId: string; text: string; createdAt: string };
  accentIndex: number;
}

/**
 * composing -> the character is still writing theirs ("Thinking...")
 * ready     -> theirs is sealed; write yours and exchange to open both
 * exchanged -> both notes are visible
 */
export type SecretNoteStatus = 'composing' | 'ready' | 'exchanged';

export interface SecretNote {
  id: string;
  characterId: string;
  date: string;
  prompt: string;
  myNote: string;
  theirNote?: string;
  status: SecretNoteStatus;
}

export interface CallRecord {
  id: string;
  characterId: string;
  startedAt: string;
  durationSec: number;
  direction: 'incoming' | 'outgoing';
  missed: boolean;
}

export type MemorySource = 'chat' | 'diary' | 'call' | 'manual';

export interface MemoryItem {
  id: string;
  characterId: string;
  text: string;
  source: MemorySource;
  createdAt: string;
  pinned: boolean;
}

/** The [Us] timeline: every sweet moment with a character is recorded. */
export type MomentKind = 'met' | 'levelUp' | 'call' | 'diary' | 'secretNote' | 'dating' | 'photo';

export interface Moment {
  id: string;
  characterId: string;
  kind: MomentKind;
  createdAt: string;
  /** Interpolation values for the `us.moments.<kind>` string. */
  params?: Record<string, string | number>;
}

/** Plans you mentioned in chat ("exam tomorrow") — the character reminds you on the day. */
export interface ScheduleItem {
  id: string;
  characterId: string;
  title: string;
  /** Day key, e.g. "2026-09-28" */
  date: string;
  createdAt: string;
  reminded: boolean;
}

export type MemberPlan = 'basic' | 'pro' | 'quarterly';

export interface Wallet {
  shells: number;
  /** Photo Booth currency */
  film: number;
  isMember: boolean;
  memberPlan?: MemberPlan;
  memberUntil?: string;
}

export interface User {
  id: string;
  displayName: string;
  handle: string;
  avatarUri?: string;
  accentIndex: number;
  locale: string;
}

/** Once-a-day bookkeeping: login reward, greetings, calls, ads, wheel. */
export interface DailyState {
  lastLoginDay?: string;
  /** 1..7, the position in the check-in week */
  checkInDay: number;
  /** e.g. "2026-09-27:morning" — greetings already delivered */
  greetedSlots: string[];
  /** e.g. "2026-09-27:night" — calls already placed */
  calledSlots: string[];
  adsDay?: string;
  adsWatched: number;
  spinDay?: string;
  spinsUsed: number;
}

export interface AppSettings {
  morningGreeting: boolean;
  eveningGreeting: boolean;
  morningCall: boolean;
  nightCall: boolean;
  chatAnimation: boolean;
}

export interface HomeModule {
  key: string;
  /** i18n key under `home.modules` */
  labelKey: string;
  route: string;
  /** Key into the Rafti tile art (assets/brand) */
  tile: TileName;
  badge?: number;
}

export interface ShellPack {
  id: string;
  shells: number;
  bonus: number;
  /** Display price from the store; real builds take it localized from StoreKit / Play Billing. */
  price: string;
  /** The same price as a number, for per-shell value maths. */
  amount: number;
  /** The pack most people pick: pre-selected in the store. */
  popular?: boolean;
}

export interface MembershipPlan {
  id: MemberPlan;
  price: string;
  /** Days of membership granted */
  days: number;
  /** i18n keys under `store.perks` */
  perks: string[];
  highlight?: boolean;
}
