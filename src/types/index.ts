import type { TileName } from '@/assets/brand/registry';

export type CharacterCategory = 'school' | 'fantasy' | 'idol' | 'daily' | 'original';
export type CharacterGender = 'male' | 'female';

export interface Character {
  id: string;
  name: string;
  /** Creator handle shown on discovery cards, e.g. "@luckymoppy" */
  handle: string;
  bio: string;
  category: CharacterCategory;
  /** For the Find filter and the server prompt; user creations may leave it out. */
  gender?: CharacterGender;
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
  /** The relationship you picked from the labels your stage unlocks, e.g. "Crush" */
  label?: string;
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
  /** The user's reaction to this message: a Rafti sticker name (see REACTION_STICKERS) */
  reaction?: string;
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
 * A page a character writes in their own diary about the user. It is written the
 * morning after a chat or a date with them, so a quiet day leaves no page.
 */
export interface CharacterDiaryPage {
  id: string;
  characterId: string;
  /** Day key of the morning it was written */
  date: string;
  /** ISO time it was written */
  writtenAt: string;
  mood: DiaryMood;
  /** Paragraphs, in the character's voice */
  body: string[];
  /** What it was written after */
  source: 'chat' | 'date';
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
export type MomentKind = 'met' | 'levelUp' | 'call' | 'diary' | 'secretNote' | 'dating' | 'photo' | 'plan' | 'board' | 'quiz';

export interface Moment {
  id: string;
  characterId: string;
  kind: MomentKind;
  createdAt: string;
  /** Interpolation values for the `us.moments.<kind>` string. */
  params?: Record<string, string | number>;
}

/**
 * A plan with a friend: mentioned in chat ("exam tomorrow at 3pm") or added in [Us].
 * The character texts ten minutes before (or that morning when there is no time)
 * and asks how it went afterwards.
 */
export interface ScheduleItem {
  id: string;
  characterId: string;
  title: string;
  /** Day key, e.g. "2026-09-28" */
  date: string;
  /** "HH:MM", 24-hour; missing for "any time that day" */
  time?: string;
  createdAt: string;
  reminded: boolean;
  /** The "how did it go?" message has been sent (or its moment has passed). */
  followedUp?: boolean;
  source?: 'chat' | 'manual';
}

/** A finished date: it becomes a polaroid in "Our dates" and a diary page the next morning. */
export interface DateRecord {
  id: string;
  characterId: string;
  placeId: string;
  title: string;
  hearts: number;
  maxHearts: number;
  ending: 'sweet' | 'warm' | 'funny';
  createdAt: string;
}

export type BoardStyleId = 'cloud' | 'gingham' | 'stripes' | 'heart' | 'kraft' | 'notebook' | 'pinned';

/** A note the user pinned on the message board for one friend; they answer it in chat. */
export interface BoardPost {
  id: string;
  characterId: string;
  text: string;
  style: BoardStyleId;
  createdAt: string;
  /** Their answer, kept with the note once it has arrived */
  reply?: string;
  /** When the answer lands; it is held back to feel read rather than instant */
  replyAt: string;
  replied: boolean;
}

export type MemberPlan = 'basic' | 'pro' | 'quarterly';

/** Why the shell balance moved; drives the line in the account history. */
export type LedgerReason =
  | 'welcome'
  | 'daily'
  | 'expired'
  | 'ad'
  | 'spin'
  | 'purchase'
  | 'chat'
  | 'voice'
  | 'photo'
  | 'note'
  | 'board'
  | 'invite'
  | 'share'
  | 'date'
  | 'photoBooth'
  | 'voiceClone'
  | 'trial'
  | 'membership'
  | 'call'
  | 'other';

/** One line in the shell history. Positive amounts are credits. */
export interface LedgerEntry {
  id: string;
  at: string;
  amount: number;
  reason: LedgerReason;
  characterId?: string;
  /** Shells by default; call time is booked in seconds */
  unit?: 'shells' | 'seconds';
}

export interface Wallet {
  shells: number;
  /**
   * The part of `shells` that came from today's check-in. It is spent first and
   * whatever is left expires at midnight; bought shells never expire.
   */
  free?: { day: string; amount: number };
  /** Live-call time left, in seconds. Separate from shells. */
  callSeconds?: number;
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
  /** Only the year is kept, for the 18+ gate. */
  birthYear?: number;
  /** Set when the first-launch flow is finished; until then the app opens on it. */
  onboardedAt?: string;
  /** The free-trial call note was shown once */
  callIntroSeen?: boolean;
  /** A friend's invite code entered here; it can be used only once */
  redeemedInvite?: string;
  /** When friends joined with this user's code (credited by the server later) */
  inviteCredits?: string[];
  /** Profile details the characters can use; all optional, see `profileCompletion`. */
  pronouns?: Pronouns;
  /** "MM-DD": the year stays the one from the 18+ gate. */
  birthday?: string;
  job?: string;
  interests?: string[];
  about?: string;
  /** Year of the last birthday the characters already celebrated. */
  birthdayWishedYear?: number;
}

export type Pronouns = 'she' | 'he' | 'they';

/** Once-a-day bookkeeping: login reward, greetings, calls, ads, wheel. */
export interface DailyState {
  lastLoginDay?: string;
  /** 1..7, the position in the check-in week */
  checkInDay: number;
  /** Shells paid by the latest check-in (day 7 is a random roll, so it is kept). */
  checkInAmount?: number;
  /** e.g. "2026-09-27:morning" — greetings already delivered */
  greetedSlots: string[];
  /** e.g. "2026-09-27:night" — calls already placed */
  calledSlots: string[];
  adsDay?: string;
  adsWatched: number;
  spinDay?: string;
  spinsUsed: number;
  /** The day the share reward was last paid */
  shareDay?: string;
}

export interface AppSettings {
  morningGreeting: boolean;
  eveningGreeting: boolean;
  morningCall: boolean;
  nightCall: boolean;
  /** "HH:MM": the good-morning call can ring from this time for a few hours */
  morningCallTime: string;
  /** "HH:MM": the good-night call can ring from this time for a few hours */
  nightCallTime: string;
  /** Who places the daily calls; the closest friend with a voice when unset */
  callerId?: string;
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
  /** Live-call minutes added with each purchase */
  callMinutes?: number;
}
