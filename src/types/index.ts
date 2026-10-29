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
  /** More openings besides `greeting`; a new chat starts with one of them. */
  greetings?: string[];
  tags: string[];
  /** How they text when the user is away; from the tags when missing (`temperOf`). */
  temper?: Temper;
  /** A few words under the name: how they would sum themselves up. */
  tagline?: string;
  /**
   * A short action before their first greeting (`*holds up a sleepy puppy*`), shown in Mixed and Story
   * chats and left out in Talk ones (`withOpening`).
   */
  opening?: string;
  /** One small, endearing flaw the model plays ("Forgets his own lunch, never yours"). */
  quirk?: string;
  /** What they look like, in words; their picture is drawn from it. */
  look?: string;
  /**
   * Private sample dialog showing how they talk, never shown in a chat. Each line starts
   * with `{{char}}:` or `{{random_user_1}}:` (`src/ai/character-draft.ts`).
   */
  definition?: string;
  /** Up to 3 first lines the user can tap to open a new chat. */
  starters?: string[];
  /** Height in centimetres, shown as feet and inches in the US (`heightLabel`). */
  heightCm?: number;
  /** A few things they love and can't stand, shown on the chat's first card and the profile. */
  likes?: string[];
  dislikes?: string[];
  /** Where they come from and what they want now, in a few sentences (third person). */
  backstory?: string;
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
  /** They may text or call first (morning / night greetings, one text when you go quiet). */
  messagesFirst: boolean;
  /** "May I text you sometimes?" (`src/lib/reach-ask.ts`): how often they asked and what the user said. */
  reachAsk?: ReachAsk;
  /** Chat settings → Reply style. Older saves lack it: read it through `replyPrefs()`. */
  replyStyle?: ReplyStyle;
  /** Chat settings → Reply length. */
  replyLength?: ReplyLength;
  /** How they feel right now; carries from one reply to the next and fades with time. */
  mood?: Mood;
}

/**
 * How a reply reads (Character.AI's "response style"). `talk` is texting: spoken lines, no
 * narration. `mix` is dialogue with a small *action* now and then. `story` is roleplay prose:
 * actions and the scene in *asterisks*, and the story moves on each turn.
 */
export type ReplyStyle = 'talk' | 'mix' | 'story';

/** `auto` mirrors how much you wrote, the way people match each other's energy. */
export type ReplyLength = 'short' | 'auto' | 'long';

export type Emotion = 'calm' | 'happy' | 'playful' | 'shy' | 'tender' | 'worried' | 'sad' | 'annoyed';

export interface Mood {
  emotion: Emotion;
  /** 0..1 */
  intensity: number;
  /** ISO time it was last felt; it fades back to their temperament from here. */
  at: string;
}

export type MessageKind = 'text' | 'voice' | 'image' | 'system' | 'call';
/**
 * How far a time skip moves the story (`src/lib/chat-steer.ts`): one of four spans, the running
 * scene's next moment, or the user's own words (`Message.skipTo`).
 */
export type TimeSkip = 'later' | 'evening' | 'nextMorning' | 'week' | 'scene' | 'own';
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
  /** The user's line got no reply (the model failed or was out of reach): "Not Delivered", tap to try again. */
  failed?: boolean;
  /** Rendered as a low-contrast bubble (the echo of what the character heard) */
  muted?: boolean;
  /** The user's reaction to this message: a Rafti sticker name (see REACTION_STICKERS) */
  reaction?: string;
  /** 👍 👎 on their reply, kept on its first line; the friend never sees it (`src/lib/reply-rating.ts`). */
  rating?: 'up' | 'down';
  /** Why a reply was marked down (`OffReason`). */
  offReason?: string;
  /** You changed this message after sending it; the chat says "Edited" under it (iOS Messages). */
  editedAt?: string;
  /** Call rows: the call was not picked up. */
  missed?: boolean;
  /**
   * A system line drawn by the chat instead of a bubble: the helpline card after a
   * crisis message, the "AI character" notice, or the note that voice minutes ran out.
   */
  card?: 'helpline' | 'aiNotice' | 'voiceQuota' | 'scene' | 'sceneEnd' | 'continue' | 'skip' | 'notifyOff' | 'week';
  /** week cards: the week's numbers with this friend (`src/lib/week.ts`). */
  week?: WeekStats;
  /** voiceQuota lines: when the plan's voice minutes come back */
  until?: string;
  /** scene cards: the scene that starts here (`text` is its title). */
  setting?: string;
  /** skip markers: how far the story moved on (`src/lib/chat-steer.ts`). */
  skip?: TimeSkip;
  /** An own skip: where the story moves to, in the user's words ("After the concert"). */
  skipTo?: string;
  /** Quick replies under the friend's line (the morning chain); gone once one is tapped. */
  chips?: string[];
  /**
   * Reply ideas under a line they wrote first (`src/lib/reply-ideas.ts`): "I ate!" / "Not yet".
   * Gone once the user answers; a tap sends the idea's text, free.
   */
  ideas?: ReplyIdea[];
  /** Why they wrote first (`reachKey`): a family moment, a care check-in, a hello. */
  reach?: string;
  /**
   * Your message opened, moved or settled a thread: the chat shows what they took from it under the
   * bubble ("📌 Exam · Tomorrow 9:00"), tap to change it (`src/components/mind`).
   */
  noted?: { threadId: string; change: NoteChange };
  /** Group chats: the member who wrote it (author 'them'). */
  characterId?: string;
  /** Their feeling when they wrote it (`src/lib/reply-engine`); later the voice's tone. */
  emotion?: Emotion;
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
  /** The chat background, as a one-to-one chat's (`Relationship.backgroundId`); missing = plain. */
  backgroundId?: string;
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
  /** The scene this chat is playing now, until the user ends it (`src/lib/scenes.ts`). */
  scene?: ActiveScene;
  /** Their story so far, kept short by the memory pass (B2, src/ai/memory-pass.ts); the prompt's YOUR STORY SO FAR. */
  summary?: string;
  /** The last message the memory pass has read; it reads only what came after. */
  memoryMark?: string;
}

/**
 * A scene to play in a chat (Character.AI's Scenes): where you are, what is happening, who you
 * are in it, and the character's first line. Some come with the app; the user writes their own.
 */
export interface Scene {
  id: string;
  title: string;
  setting: string;
  /** Who the user is in it. */
  userRole?: string;
  /** The character's first line; without one they write their own. */
  opening?: string;
  /** Comes with the app (`src/mock/scenes.ts`); the user's own are editable. */
  official?: boolean;
  createdAt: string;
}

/** A scene running in a chat: a copy, so editing or deleting the scene leaves the chat as it was. */
export interface ActiveScene {
  sceneId: string;
  title: string;
  setting: string;
  userRole?: string;
  startedAt: string;
}

/** One line of a stream: who said it and what. */
export interface StreamLine {
  id: string;
  characterId: string;
  text: string;
  createdAt: string;
}

/**
 * A stream (Character.AI's Stream, `src/lib/streams.ts`): two characters talk about a topic the
 * user picked while the user watches. Each paid round adds lines up to `target`.
 */
export interface Stream {
  id: string;
  /** The two who talk; the first one opens. */
  characterIds: [string, string];
  topic: string;
  lines: StreamLine[];
  /** How many lines the rounds so far paid for; lines keep coming until there are this many. */
  target: number;
  /** The user stopped it before `target`. */
  stopped?: boolean;
  createdAt: string;
}

/** What a world book entry is about (Character.AI's Lorebook kinds, ours trimmed). */
export type LoreKind = 'person' | 'place' | 'thing' | 'event' | 'group' | 'rule';

/**
 * One fact of a world (`src/lib/lorebook.ts`): it joins a reply's prompt only when its name or
 * one of its keywords comes up in the chat.
 */
export interface LoreEntry {
  id: string;
  kind: LoreKind;
  name: string;
  keywords: string[];
  text: string;
  /** A person who is one of the cast: left out of their own chats, where they are the persona. */
  characterId?: string;
}

/**
 * A world book (Character.AI's Lorebook): a few lines about the world that always ride in the
 * prompt, and entries that join when they come up. One book serves many characters.
 */
export interface Lorebook {
  id: string;
  name: string;
  /** The world in a few lines; always in the prompt of the characters it serves. */
  about: string;
  entries: LoreEntry[];
  /** The friends a book of the user's serves; an official one serves its world's cast (`series`). */
  characterIds: string[];
  /** Official books: the world (`Character.series`) whose whole cast it serves. */
  series?: string;
  /** Comes with the app (`src/mock/lorebooks.ts`); read-only. */
  official?: boolean;
  createdAt: string;
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
  /** `evening`: the user's answer to "how was today?" (`src/lib/day-ask.ts`), one a day. */
  source?: 'evening';
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
/** Whose memory it is, the Memories tabs (canvas `MemTabs.dc.html`): your story together, them, you. */
export type MemoryAbout = 'story' | 'them' | 'you';
/** A chat line kept word for word (long press, Pin to Memories). */
export interface MemoryQuote {
  messageId: string;
  author: 'me' | 'them';
}

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
  /** A plan or event's date (YYYY-MM-DD): 30 days after it the fact is archived (backend-plan 12.2). */
  until?: string;
  /** Missing = about you (every memory before the tabs was). */
  about?: MemoryAbout;
  /** Set when the memory is a pinned chat line; the chat marks that line. */
  quote?: MemoryQuote;
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
/** How the user said they are, for a friend to ask about later (`src/lib/care.ts`). */
export type CareKind = 'headache' | 'sick' | 'tired' | 'stressed' | 'sad' | 'lonely' | 'hungry' | 'hurt' | 'fight';

/** A check-in a friend owes: "Is your head any better?" a few hours after the user said it hurt. */
export interface CareItem {
  id: string;
  characterId: string;
  kind: CareKind;
  /** When they ask (never at night). */
  dueAt: string;
  createdAt: string;
  /** Asked, its moment passed, or the user already said they are better. */
  done?: boolean;
  /** A second ask after "Still not great"; there is no third. */
  again?: boolean;
  /** What the user said, as they said it ("Why did they write?" shows it). */
  quote?: string;
}

/**
 * Where a friend's text sits around the thing: before it ("good luck"), at leaving time ("time to
 * go"), the evening before ("sleep early"), after it ("how did it go?"), a check on a task, a goal
 * or a real-life quest.
 */
export type TouchPhase = 'before' | 'leave' | 'eve' | 'after' | 'check' | 'goal' | 'quest';

/**
 * What a thread is: something the user said with a future (`follow`), a plan with a time (`plan`),
 * a habit they want to change (`goal`), or a small real-life quest the friend gave (`quest`).
 */
export type ThreadKind = 'follow' | 'plan' | 'goal' | 'quest';

/** One text a friend means to send about a thread (`src/lib/threads.ts`). */
export interface Touch {
  /** `${threadId}:${n}`: the push and the chat say the same line. */
  id: string;
  at: string;
  /** Why they write then, in the model's own words ("wish luck, check they are leaving on time"). */
  why: string;
  phase: TouchPhase;
  /** Sent, or dropped because its moment passed. */
  sent?: boolean;
}

/** How it went; `quiet`: the user turned off texts about it in the app (the thing may still happen). */
export type ThreadOutcome = 'good' | 'bad' | 'done' | 'off' | 'quiet';

/** What a message of the user's did to a thread: opened it, moved its time, or settled it. */
export type NoteChange = 'new' | 'moved' | 'settled';

/** Something the user said that has a future, followed up like a person would (`src/lib/threads.ts`). */
export interface Thread {
  id: string;
  characterId: string;
  /** A few words: what it is ("the maths exam"). */
  about: string;
  /** What the user said, as they said it. */
  quote: string;
  createdAt: string;
  /** When it happens, when known. */
  happensAt?: string;
  /** The plan it came with (Us → plans), if any. */
  scheduleId?: string;
  /** `follow` when missing (threads saved before kinds). */
  kind?: ThreadKind;
  /** Shells a quest pays when the user says it is done. */
  reward?: number;
  /** The user set its time themselves in the app (Keeping in mind); the model keeps it. */
  userSet?: boolean;
  touches: Touch[];
  status: 'open' | 'closed';
  outcome?: ThreadOutcome;
  closedAt?: string;
}

/** How a character texts when the user is away (`src/lib/temper.ts`). */
export type Temper = 'warm' | 'teasing' | 'sulky' | 'clingy' | 'shy';

/** The consent ask's history with one friend. */
export interface ReachAsk {
  asks: number;
  /** ISO time of the last ask. */
  lastAt?: string;
  answer?: 'yes' | 'no';
}

/** What the user means by a reply idea; it picks their answer and what happens next. */
export type IdeaIntent =
  | 'yes'
  | 'no'
  | 'now'
  | 'good'
  | 'rough'
  | 'later'
  | 'call'
  | 'missed'
  | 'thanks'
  | 'better'
  | 'worse'
  | 'ask'
  | 'onWay'
  | 'off'
  | 'done'
  | 'wake'
  | 'lead30'
  | 'lead60';

/** A reply the user can send with one tap: a short label on the pill and the line it sends. */
export interface ReplyIdea {
  label: string;
  text: string;
  intent?: IdeaIntent;
}

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
  /**
   * Minutes, Photo Booth pictures and drawn character portraits used in the current period; a new period starts from
   * zero. `lastPortraitAt` keeps the trial to one free portrait a day.
   */
  usage: { periodStart: string; callSeconds: number; voiceSeconds: number; photos?: number; portraits?: number; lastPortraitAt?: string };
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
  | 'portrait'
  | 'stream'
  | 'trial'
  | 'membership'
  | 'call'
  | 'topUp'
  | 'plan'
  | 'radio'
  | 'quest'
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

/**
 * Who the user is in a chat, besides their own profile (Character.AI's personas,
 * `src/lib/personas.ts`): a name, pronouns and a few lines the character should know.
 */
export interface Persona {
  id: string;
  name: string;
  pronouns?: Pronouns;
  about: string;
  avatarUri?: string;
  createdAt: string;
}

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
  /** Family's moments written today (`lifeKey`: "2026-10-25:c_kai:lunch"), so each goes once. */
  lifeSent?: string[];
  /** The day a friend gave a real-life quest (one a day, `src/lib/life.ts`). */
  questDay?: string;
  /** The day a friend suggested a break after a long sitting. */
  breakDay?: string;
  /** The night (keyed by the evening's day) a friend said it is late, go to sleep. */
  nightDay?: string;
  /** Counted pushes handed to the OS (`src/notifications/budget.ts`); the past ones of today were sent. */
  pushLog?: PushSent[];
}

/** A week with one friend, for the Sunday recap (`src/lib/week.ts`). */
export interface WeekStats {
  /** Days of the last 7 the user wrote to them. */
  days: number;
  messages: number;
  /** Their threads that went well or got done, a few by name. */
  wins: string[];
  winCount: number;
  quests: number;
  /** Diary pages shared with them. */
  pages: number;
  /** The shared pages' most common mood. */
  mood?: DiaryMood;
}

/** One counted push the planner handed to the OS: enough to count it and space the next ones. */
export interface PushSent {
  id: string;
  at: string;
  characterId?: string;
}

export interface AppSettings {
  morningGreeting: boolean;
  eveningGreeting: boolean;
  /** Sunday evening: the friend looks back on the week together (`src/lib/week.ts`). */
  weeklyRecap: boolean;
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
  /** Development: replies come from the real model on the local server (`src/ai/server.ts`). */
  realAi?: boolean;
  /** B1.2: the wallet lives on the server whenever the app has one; `false` (dev) keeps it on the phone. */
  serverWallet?: boolean;
  /** Development (B1.3b): the chats are copied to the local server's database and can be read back. */
  serverMessages?: boolean;
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
