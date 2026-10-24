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
  /** User creations (F15): what the creator set; the server prompt uses all of it. */
  age?: number;
  speakingStyle?: SpeakingStyle;
  /** What they are to the user */
  role?: CharacterRole;
  /** A stock voice; a cloned voice has none (its id lives on the server). */
  voicePreset?: VoicePreset;
  /** Public creations wait for review before anyone else can find them. */
  visibility?: 'private' | 'public';
  review?: 'pending' | 'approved' | 'rejected';
  /**
   * Official characters only: the day it went live. Pro can add it from then, everyone else
   * 7 days later (`src/economy/early-access.ts`). Left out for the launch cast and creations.
   */
  releasedAt?: string;
}

export type SpeakingStyle = 'casual' | 'gentle' | 'playful' | 'formal' | 'poetic' | 'dry';
export type CharacterRole = 'friend' | 'crush' | 'partner' | 'mentor' | 'rival' | 'family';
export type VoicePreset = 'warm' | 'bright' | 'soft' | 'deep' | 'calm' | 'lively';

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
  /** A Photo Booth picture sent to the chat (drawn from the kept photo, not a file). */
  photoId?: string;
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
  /**
   * A system line drawn by the chat instead of a bubble: the helpline card after a
   * crisis message, the "AI character" notice, or the note that voice minutes ran out.
   */
  card?: 'helpline' | 'aiNotice' | 'voiceQuota';
  /** voiceQuota lines: when the plan's voice minutes come back */
  until?: string;
  /** Quick replies under the friend's line (the morning chain); gone once one is tapped. */
  chips?: string[];
  /** Group chats: the member who wrote it (author 'them'). */
  characterId?: string;
}

/**
 * A group chat: the user and 2 or 3 characters (queue item 16). Its messages live in
 * `messages[id]` beside the one-to-one chats. Group messages leave levels and memories
 * alone; those grow in the one-to-one chats.
 */
export interface GroupChat {
  id: string;
  /** 2 or 3 character ids, in the order they joined. */
  memberIds: string[];
  /** What the user called it; empty means the members' names ("Kai, Theo & Hana"). */
  name?: string;
  createdAt: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
  muted: boolean;
  /** When the "not real people" notice last showed, as in a one-to-one chat. */
  aiNoticeAt?: string;
}

/**
 * A Radio clip (F27): a friend says the user's lines in their voice. The user's own clips are
 * saved; the friends' clips come from code (`radioGifts`) and some open at a level.
 */
export interface RadioClip {
  id: string;
  characterId: string;
  title: string;
  /** 1 to 5 lines, said in order. */
  lines: string[];
  durationSec: number;
  createdAt: string;
}

/** A clip a friend made for the user; plays once the level with them reaches `unlockLevel`. */
export interface RadioGift {
  id: string;
  characterId: string;
  title: string;
  lines: string[];
  unlockLevel?: number;
}

/** A message the user reported; the server's review queue gets it with its context. */
export interface MessageReport {
  id: string;
  conversationId: string;
  characterId: string;
  messageId: string;
  text?: string;
  reason: 'harmful' | 'sexual' | 'offCharacter' | 'other';
  createdAt: string;
}

export interface Conversation {
  id: string;
  characterId: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
  pinned: boolean;
  muted: boolean;
  /** When the "not a real person" notice last showed: again at session start and every 3 hours. */
  aiNoticeAt?: string;
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
  /** Kind of fact (docs/backend-plan.md 12.1), used to group facts in the prompt. */
  type?: MemoryType;
  /** 0-1, set by the server's fact extractor (backend-plan 12.1); missing = 0.5. */
  importance?: number;
  /** Lifecycle (backend-plan 12.2); missing = active. Only active facts reach the prompt. */
  status?: 'active' | 'superseded' | 'archived';
  /** A superseded fact points at the fact that replaced it. */
  supersededBy?: string;
}

export type MemoryType =
  | 'preference'
  | 'dislike'
  | 'personal_fact'
  | 'schedule'
  | 'milestone'
  | 'promise'
  | 'habit'
  | 'event';

/** The [Us] timeline: every sweet moment with a character is recorded. */
export type MomentKind = 'met' | 'levelUp' | 'call' | 'diary' | 'secretNote' | 'dating' | 'photo' | 'plan' | 'board' | 'quiz';

export interface Moment {
  id: string;
  characterId: string;
  kind: MomentKind;
  createdAt: string;
  /** Interpolation values for the `us.moments.<kind>` string. */
  params?: Record<string, string | number>;
  /** The Photo Booth picture this moment shows (photo moments). */
  photoId?: string;
}

export type BoothStyle = 'polaroid' | 'film' | 'studio' | 'street';

/**
 * A Photo Booth picture, kept in the album. It is drawn on the phone from the friend's art in its
 * style (`BoothPicture`), so only these fields are saved; an image model replaces the drawing later.
 */
export interface BoothPhoto {
  id: string;
  characterId: string;
  style: BoothStyle;
  createdAt: string;
  /** Varies the film strip's frames, so two strips of one friend differ. */
  seed: number;
  /** When it was sent to the friend's chat; a photo is sent once. */
  sentAt?: string;
  /** The frame it was taken in (F29), kept with the picture so it never changes. */
  frame?: PhotoFrame;
}

/** How a Photo Booth frame dresses a picture's card: a world's frame or one the user made. */
export interface PhotoFrame {
  bg: string;
  pattern: 'none' | 'dots' | 'stripes' | 'check' | 'stars' | 'waves';
  patternColor: string;
  /** Caption and label color on this card. */
  ink: string;
  /** Up to two clay icon names, at the top-left and bottom-right corners. */
  stickers: string[];
  caption?: string;
  /** A neon double outline. */
  outline?: [string, string];
}

/** A frame the user made (F29): a color, a pattern, up to two stickers and a caption. */
export interface UserFrame {
  id: string;
  name: string;
  color: string;
  pattern: 'none' | 'dots' | 'stripes' | 'check';
  stickers: string[];
  caption: string;
  createdAt: string;
}

/** A quiz the user wrote (F29); any friend can play it and answers in their own way. */
export interface UserQuiz {
  id: string;
  title: string;
  questions: { text: string; options: string[] }[];
  createdAt: string;
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
  /** "HH:MM" the user asked to be reminded at (the morning chain); else 10 min before. */
  remindAt?: string;
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

export type DateMood = 'friendly' | 'flirty' | 'sweet';

/**
 * A date the user wrote (F28): the scene it starts with, a place name, a picture, rounds and
 * a mood. Played like a map place; the rounds are written fresh each time (src/lib/date-themes.ts).
 */
export interface DateTheme {
  id: string;
  /** The place name, shown as the date's title. */
  title: string;
  scene: string;
  /** A clay icon name (`THEME_ARTS`). */
  art: string;
  rounds: 3 | 5 | 8;
  mood: DateMood;
  /** Only this friend; empty means any friend. */
  characterId?: string;
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

/** The plans a user can subscribe to (docs/backend-plan.md §15.10): Basic monthly, Pro monthly, Pro yearly. */
export type PlanId = 'basic' | 'pro' | 'proAnnual';

/**
 * A plan bought in the store. The app keeps a mock copy until the server takes over
 * (RevenueCat → `subscriptions`); the rules live in `src/economy/plans.ts`.
 */
export interface Subscription {
  plan: PlanId;
  /** 'trial' for the store's free days, then 'active' */
  status: 'trial' | 'active';
  /** Start of the current term: the trial, or the paid month, quarter or year */
  termStart: string;
  /** Renews at the end of each term, like the store's auto-renewal; false ends it then */
  willRenew: boolean;
  /** Minutes (and Photo Booth pictures) used in the current period; a new period starts from zero */
  usage: { periodStart: string; callSeconds: number; voiceSeconds: number; photos?: number };
}

/** Extra minutes bought with shells: used after the plan's own and kept for 90 days. */
export interface MinutePack {
  id: string;
  kind: 'call' | 'voice';
  seconds: number;
  used: number;
  boughtAt: string;
}

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
  | 'topUp'
  | 'plan'
  | 'radio'
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
   * The part of `shells` that came free today (check-in, wheel, ads, share, invite).
   * It is spent first and whatever is left expires at midnight; bought shells and the
   * one-time welcome gift never expire (src/economy/shells.ts).
   */
  free?: { day: string; amount: number };
  /** Photo Booth currency */
  film: number;
  /** The plan, when there is one: calls, voice replies and unlimited chat come with it. */
  subscription?: Subscription;
  /** Extra call and voice-reply minutes bought with shells. */
  packs?: MinutePack[];
  /** The store gives one free trial per account. */
  trialUsed?: boolean;
  /** Set by the first shell purchase; until then the store offers the starter pack. */
  boughtShells?: boolean;
  /** Start of the plan period whose monthly shells were already paid (`shellGrant`). */
  planShellsPeriod?: string;
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
  /** A friend's invite code entered here; it can be used only once */
  redeemedInvite?: string;
  /**
   * The code was entered on `day`; both sides get their shells when the user comes back on a
   * later day (owner, 2026-10-22), so a throwaway account earns nothing.
   */
  invitePending?: { code: string; day: string };
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
  /** Messages sent today, for the members' fair-use limit */
  messagesDay?: string;
  messagesSent?: number;
  /** The day the "voice minutes used up" note last showed (once a day) */
  voiceNoteDay?: string;
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
  /** Haptic taps on presses, menus, wheels and outcomes (HIG: let people turn them off). */
  haptics: boolean;
  /** Show what they wrote on the lock screen. Off by default: an 18+ app keeps it private. */
  notificationPreview: boolean;
  /** Push kinds the user can switch off (Profile → Notifications, docs/push-plan.md). */
  notifyPlans: boolean;
  notifyDiary: boolean;
  /** The comeback ladder: the friend you talked with last writes while you are away. */
  notifyAway: boolean;
  notifyGifts: boolean;
  /** Store offers: opt-in only (App Store 4.5.4), so off until the user turns it on. */
  notifyOffers: boolean;
  quietHours: boolean;
  /** "HH:MM": no pushes from here to `quietTo` (may run past midnight). */
  quietFrom: string;
  quietTo: string;
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

/** Our own melodies for the wake-up alarm (assets/sounds/alarms); no licensed music. */
export type AlarmSound = 'morningTide' | 'shellChimes' | 'seaBreeze' | 'softBells' | 'lighthouse';

/** A wake-up alarm (Bedtime → Alarms), for every plan. Times are the phone's local time. */
export interface Alarm {
  id: string;
  /** 0-23 */
  hour: number;
  /** 0-59 */
  minute: number;
  /** Days it repeats, 0 = Sunday … 6 = Saturday; empty = rings once. */
  repeat: number[];
  /** Empty = "Alarm". */
  label: string;
  /** The friend who wakes you; none = melody only. */
  characterId?: string;
  /** The friend's recorded wake-up line plays with the melody. */
  voice: boolean;
  /**
   * A Radio clip with this friend (one the user made, or an open gift) plays instead of the
   * stock wake-up line; only used while `voice` is on.
   */
  clipId?: string;
  sound: AlarmSound;
  /** Wake-up task: a real reply in that friend's chat turns the alarm off. */
  replyToWake: boolean;
  snooze: boolean;
  enabled: boolean;
  createdAt: string;
  /** Rings before this moment are never due (set on save, switch-on and each ring). */
  armedAt?: string;
}

/**
 * The morning after a ring (src/lib/morning-chain.ts): ringing until a real reply in the
 * friend's chat, snoozed, then awake with at most one chain step waiting for an answer.
 */
export interface WakeSession {
  alarmId: string;
  characterId?: string;
  conversationId?: string;
  /** The task is on: only a reply (or "hold to turn off") stops it. */
  replyToWake: boolean;
  question: string;
  rangAt: string;
  state: 'ringing' | 'snoozed' | 'awake';
  snoozes: number;
  snoozeUntil?: string;
  awakeAt?: string;
  /** The chain step waiting for the user's answer. */
  step?:
    | { kind: 'offerReminder'; title: string; time: string; remind: string }
    | { kind: 'pickRemind'; title: string; time: string }
    | { kind: 'askTime'; title: string }
    | { kind: 'sleepy' };
  /** "Up yet?" from the friend at this moment (the sleepy branch). */
  checkInAt?: string;
}

/** A widget the Today screen can show (`src/components/today/widgets.tsx`). */
export type WidgetKind =
  | 'calls'
  | 'diary'
  | 'date'
  | 'sleep'
  | 'gifts'
  | 'store'
  | 'photos'
  | 'radio'
  | 'board'
  | 'contacts'
  | 'bond';
