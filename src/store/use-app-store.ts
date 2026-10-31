import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { inviteCodeFor, normalizeInviteCode } from '@/lib/invite';
import { isBirthday } from '@/lib/profile';
import { pickSeeded } from '@/lib/seeded';
import { withoutCrisisPlanMoments, withoutCrisisPlans } from '@/ai/crisis-guard';
import { fillNames, pickOpening, withOpening } from '@/ai/character-draft';
import { diaryMemoryLine, rememberableText, withMemory, withoutCrisisMemories } from '@/ai/memory-guard';
import { crisisReplies, detectCrisis, type ReportReason } from '@/ai/safety';
import { dueRing, SNOOZE_MIN } from '@/lib/alarms';
import {
  addMinutes,
  CHAIN_LINES,
  chipKey,
  CHIPS,
  countsAsWakeReply,
  likelyLeaveTime,
  MAX_SNOOZES,
  readMorningReply,
  readMorningTime,
  readYesNo,
  reminderTimeFor,
  SLEEPY_CHECK_MIN,
  WAKE_WINDOW_MIN,
  wakeQuestion,
  type MorningRead,
} from '@/lib/morning-chain';
import { planMemoryLine } from '@/lib/plan-memory';
import { checkSkipTo, cleanSkipTo, gameAnswerCue, gameAskCue, groupContinueCue, groupSkipCue, steerBlock, steerMarker } from '@/lib/chat-steer';
import { pace, plainText, planReply, readMessage, replyPrefs, speechOnly, type ReplyPrefs, type TurnTrigger } from '@/lib/reply-engine';
import { replyBatcher } from '@/lib/reply-batch';
import i18n, { getSavedLocale, phoneLanguage, phrase } from '@/i18n';
import { localCharacter, localized } from '@/i18n/content';
import { enforceStyle } from '@/ai/reply-style';
import { accessToken, withAccount } from '@/ai/account';
import type { StreamLineRequest } from '@/ai/content-prompts';
import type { FirstTextRequest } from '@/ai/first-text';
import { groupHelloCue, groupJoinCue, groupReactCue, type GroupPromptInput } from '@/ai/group-reply';
import { apiBase, serverFirstText, serverGroupReply, serverMemoryPass, serverReply, serverStreamLine, serverWallet } from '@/ai/server';
import type { WalletState } from '@/ai/session-types';
import { finishReveals, markFresh } from '@/lib/reveal';
import { writeMockReply } from '@/mock/reply-writer';
import { isSteer, lastExchange, MAX_REPLY_VERSIONS } from '@/lib/chat-turns';
import { isHappy, type OffReason, type Rating, replyAround, withRating } from '@/lib/reply-rating';
import { mockSteerLines } from '@/mock/steer';
import { shortName } from '@/lib/format';
import {
  canAddMember,
  canRemoveMember,
  continueSpeakers,
  GROUP_MAX,
  GROUP_MIN,
  groupPreview,
  groupTitle,
  leastRecent,
  namedMembers,
  pickResponders,
  withoutMember,
} from '@/lib/group-chat';
import { buildThemeRounds, checkTheme, cleanScene, cleanTitle, moodOpen, themeCost, type ThemeProblem } from '@/lib/date-themes';
import { checkQuiz, cleanQuiz, wonWorldQuiz, type QuizDraft, type QuizProblem } from '@/lib/quiz';
import { checkClip, cleanLines, clipCost, clipDuration, clipsOpenedBy, clipTitle, type ClipProblem } from '@/lib/radio-clips';
import { capLedger, capMessages } from '@/lib/storage-caps';
import type { MemorySyncState } from '@/lib/memory-sync';
import { resetMemorySync, startMemorySync } from '@/store/memory-sync';
import { messagesInDb, resetMessages, restoreMessages } from '@/store/message-sync';
import { familyName, isFamilyLabel, kinGroup, LIFE_WINDOW_MS, lifeAt, lifeKey, lifeMoments, type FamilyLabel } from '@/lib/kin';
import { addCare, careDueAt, careStep, closeCare, detectCare, pruneCare, saysBetter } from '@/lib/care';
import { careReach, helloReach, ideaEffect, ideasFor, lifeReach, reachCare, reachThread, shownIdeas, threadReach } from '@/lib/reply-ideas';
import { askedOnce, askReach, isAskReach, shouldAskToReach, sittingCount } from '@/lib/reach-ask';
import { addThread, closeThread, dueTouches, extendThread, lastAsked, markTouches, moveThread, nextPlan, pruneThreads, ruleTouches } from '@/lib/threads';
import { LIFE, lateNight, sittingMinutes } from '@/lib/life';
import { temperOf } from '@/lib/temper';
import { BRIEF_REACH, morningBrief } from '@/lib/brief';
import { answeredQuestion, DAY_REACH, dayAsker, moodOfIntent } from '@/lib/day-ask';
import { recapAt, WEEK_REACH, weeklyRecap } from '@/lib/week';
import { detectPlan, planStep, type DetectedPlan } from '@/lib/schedule';
import { careLine } from '@/mock/care';
import { ideaAnswer } from '@/mock/reply-ideas';
import { askLine } from '@/mock/temper';
import { briefLine } from '@/mock/brief';
import { dayLine, moodOf } from '@/mock/day-ask';
import { weekLine } from '@/mock/week';
import { isBig, localPlan, mockBreakLine, mockMove, mockNightLine, mockOutcome, mockQuest, mockThread, mockTouchLine, QUEST_REWARD } from '@/mock/threads';
import { familyHello, lifeLine } from '@/mock/kin';
import { creditFree, PAID_SHARES_PER_DAY, SHARE_REWARD } from '@/economy/shells';
import { byMemoryOrder, hasFullMemory, isActiveMemory, splitMemories } from '@/economy/memory-limit';
import { PASS_FACTS_MAX, PASS_LINES_MAX, type MemoryPassRequest } from '@/ai/memory-pass';
import { applyMemoryPass } from '@/lib/memory-ops';
import { perkLimit } from '@/economy/perks';
import {
  activeScene,
  checkScene,
  mockSceneOpening,
  SCENE_OPENING_MAX,
  SCENE_ROLE_MAX,
  SCENE_SETTING_MAX,
  SCENE_TITLE_MAX,
  type SceneInput,
  type SceneProblem,
} from '@/lib/scenes';
import { officialScenes } from '@/mock/scenes';
import {
  booksFor,
  checkLoreEntry,
  checkLorebook,
  LORE_ABOUT_MAX,
  LORE_NAME_MAX,
  LORE_ROLE_MAX,
  LORE_TEXT_MAX,
  type LoreEntryProblem,
  type LorebookProblem,
  lorePrompt,
  parseKeywords,
  recentLines,
} from '@/lib/lorebook';
import { officialLorebooks } from '@/mock/lorebooks';
import { checkStream, isPlaying, nextSpeaker, nextTarget, STREAM_TOPIC_MAX, STREAMS_KEPT, type StreamProblem } from '@/lib/streams';
import { mockStreamLine } from '@/mock/streams';
import { STREAM_SHELLS, takeFreeRound, type StreamUse } from '@/economy/streams';
import {
  consumePortrait,
  PORTRAIT_SHELLS,
  quickCreatesLeft,
  quickCreatesPerDay,
  spendQuickCreate,
  type QuickCreateUse,
} from '@/economy/quick-create';
import {
  checkPersona,
  defaultPersona,
  PERSONA_ABOUT_MAX,
  PERSONA_NAME_MAX,
  type PersonaProblem,
  personaFor,
  PROFILE_PERSONA,
} from '@/lib/personas';
import {
  canRing,
  consumeMinutes,
  consumePhoto,
  photoQuota,
  minutesLeft,
  PLANS,
  rollSubscription,
  shellGrant,
  startSubscription,
  TOP_UPS,
  TRIAL,
  type MinutesKind,
} from '@/economy/plans';
import {
  INVITE_REWARD,
  DAILY_CHECK_IN,
  FREE_SPINS_PER_DAY,
  WHEEL_SEGMENTS,
  WHEEL_WEIGHTS,
  shellCosts,
  radioGifts,
  callHistory as seedCalls,
  callLines,
  birthdayLines,
  characterDiaryPages as seedCharacterDiary,
  characters as seedCharacters,
  conversations as seedConversations,
  currentUser,
  groupComebacks,
  groupGoOn,
  groupHellos,
  groupJoinLines,
  groupPhotoLines,
  groupReactions,
  groupReplies,
  groupVoiceLines,
  dateFromKey,
  dayKey,
  dayKeyFromToday,
  diaryEntries as seedDiary,
  eveningGreetings,
  initialDaily,
  initialSettings,
  levelForIntimacy,
  tierForLevel,
  unlockedLabels,
  memories as seedMemories,
  messagesByConversation,
  moments as seedMoments,
  missedCallLines,
  morningGreetings,
  newRelationship,
  relationships as seedRelationships,
  rollCheckIn,
  scheduleAck,
  scheduleReminder,
  planAddedLine,
  planFollowUp,
  boardReply,
  photoReply,
  afterDateLine,
  schedules as seedSchedules,
  secretNotePrompts,
  secretNotes as seedNotes,
  todayKey,
  wallet as seedWallet,
} from '@/mock';
import { themePools } from '@/mock/date-themes';
import { WORLDS, worldByKey, worldOf, type World, type WorldKey } from '@/mock/worlds';
import { arcLine, worldNewsLine } from '@/mock/world-voice';
import { beatsCrossed, chapterAt, eventOn, pickWorldNews, WORLD_NEWS_HOUR, worldJoinedAt, worldPromptOf, type WorldNews } from '@/lib/world-story';
import { dateEnding, datePlaceById, maxHearts, type DateRound } from '@/mock/dates';
import {
  DARES_FOR_THEM,
  DARES_FOR_YOU,
  quizReply,
  TRUTHS_FOR_THEM,
  TRUTHS_FOR_YOU,
} from '@/mock/games';
import { daysTogether, duePages } from '@/mock/diary-writer';
import type {
  AppSettings,
  Alarm,
  WakeSession,
  DateRecord,
  BoardPost,
  BoardStyleId,
  BoothPhoto,
  BoothStyle,
  CallRecord,
  Character,
  CharacterGender,
  Conversation,
  DailyState,
  CharacterDiaryPage,
  DateTheme,
  PhotoFrame,
  UserFrame,
  UserQuiz,
  GroupChat,
  RadioClip,
  DiaryEntry,
  DiaryMood,
  LedgerEntry,
  LedgerReason,
  MemoryAbout,
  LoreEntry,
  LoreKind,
  Lorebook,
  Persona,
  PushSent,
  Pronouns,
  Scene,
  Stream,
  TimeSkip,
  MemoryItem,
  MemorySource,
  Message,
  Moment,
  MomentKind,
  PlanId,
  Relationship,
  ScheduleItem,
  CareItem,
  NoteChange,
  Thread,
  ThreadOutcome,
  TouchPhase,
  IdeaIntent,
  ReplyIdea,
  SecretNote,
  MessageReport,
  User,
  Wallet,
  WidgetKind,
} from '@/types';

/** Intimacy awarded per interaction. */
const INTIMACY = {
  text: 2,
  voice: 4,
  callPerMinute: 6,
  diaryShare: 5,
  secretNote: 8,
  date: 10,
  photo: 6,
  boardNote: 6,
  quizMatch: 2,
  truthOrDare: 3,
} as const;

/** How long after its set time a daily call may still ring. */
const CALL_WINDOW_HOURS = 4;

/** A board note is answered after a short pause, as if it was just found. */
const BOARD_REPLY_MS = 8000;

export interface LevelUpEvent {
  characterId: string;
  level: number;
  levelTitle: string;
}

export type CallSlot = 'morning' | 'night';

export interface IncomingCall {
  characterId: string;
  slot?: CallSlot;
  /** When it started ringing — a call left ringing (e.g. screen dismissed) goes stale. */
  at: number;
}

const STALE_RING_MS = 45_000;
/** The welcome gift at the end of the first launch. */
export const WELCOME_SHELLS = 100;
/** A group's "not real people" line shows at the start of a session and again after this long (NY GBL 47). */
const AI_NOTICE_MS = 3 * 3_600_000;

export interface DailyRewardEvent {
  amount: number;
  /** 1..7 in the check-in week */
  day: number;
}

/** `dailyCap` is no longer returned: the credit model has no daily cap (backend-plan §15.10). */
export type SendResult = 'sent' | 'noShells' | 'empty' | 'dailyCap';
/**
 * The versions of their newest reply in one chat (↻). `versions[index]` is the one on screen; its
 * copy here goes stale while it shows and is taken again before another version swaps in.
 */
export interface ReplyVersions {
  /** Your message they answered: versions belong to the newest exchange only. */
  afterId: string;
  versions: Message[][];
  index: number;
}
export type SpendResult = 'ok' | 'noShells' | 'locked' | 'notReady';
/** Saving a quiz the user wrote: its id, or why it was not saved. */
export type QuizResult = { status: 'saved'; id: string } | { status: QuizProblem };
/** Saving a date the user wrote: its id, or why it was not saved. */
export type ThemeResult = { status: 'saved'; id: string } | { status: ThemeProblem };
/** Making a Radio clip: its id, or why it was not made. */
export type ClipResult = { status: 'made'; id: string } | { status: 'noShells' | ClipProblem };

interface AppState {
  user: User;
  wallet: Wallet;
  characters: Character[];
  conversations: Conversation[];
  /** Group chats (2-3 characters); their messages are in `messages` under the group id. */
  groups: GroupChat[];
  /** Radio clips the user made (F27); the friends' clips come from code. */
  radioClips: RadioClip[];
  /** Friends' clips a level just opened and the user has not played yet: Radio marks them New. */
  newRadioGifts: string[];
  messages: Record<string, Message[]>;
  relationships: Record<string, Relationship>;
  memories: MemoryItem[];
  /** What of the memory the server has not taken yet (B2.3, `src/store/memory-sync.ts`). */
  memorySync: MemorySyncState;
  diary: DiaryEntry[];
  /** Pages characters wrote about the user: the morning after a day spent together. */
  characterDiary: CharacterDiaryPage[];
  /** Ids of character pages the user has opened, for the "New page" mark. */
  diaryPagesRead: string[];
  /** When the user last marked the notifications inbox as read; newer items show as unread. */
  inboxSeenAt: string | null;
  notes: SecretNote[];
  /** Shell history, newest first */
  ledger: LedgerEntry[];
  calls: CallRecord[];
  moments: Moment[];
  schedules: ScheduleItem[];
  /** Check-ins friends owe after the user said how they were (`src/lib/care.ts`). */
  care: CareItem[];
  /** What the user said that has a future, followed up like a person would (`src/lib/threads.ts`). */
  threads: Thread[];
  /** Notes the user pinned on the message board, oldest first */
  boardPosts: BoardPost[];
  /** Finished dates, newest first */
  dates: DateRecord[];
  daily: DailyState;
  settings: AppSettings;

  /* ── transient (never persisted) ── */
  hydrated: boolean;
  /** Set when an interaction pushes a bond over a threshold; the chat screen shows the modal. */
  levelUp: LevelUpEvent | null;
  /** Conversation ids where the character is currently "typing". */
  typing: Record<string, boolean>;
  /** Versions of their newest reply per chat (↻). Not saved: after a restart the one on screen stays. */
  replyVersions: Record<string, ReplyVersions>;
  /**
   * Group ids and the members typing there now, in the order they started. Several can type at
   * once; a member is listed once per reply still on its way, so overlapping replies never
   * clear each other (the screen shows each member once).
   */
  groupTyping: Record<string, string[]>;
  /** The chat on screen right now — replies there do not count as unread. */
  activeConversationId: string | null;
  incomingCall: IncomingCall | null;
  dailyReward: DailyRewardEvent | null;
  /** The date that has been paid for and not finished yet; the date screen only plays this one. */
  /** The date being played; a user's own date carries the rounds written for this play. */
  activeDate: { characterId: string; placeId: string; theme?: { title: string; rounds: DateRound[] } } | null;
  /** Dates the user wrote (F28); played from the map's "Your own" card. */
  dateThemes: DateTheme[];
  /** Quizzes the user wrote (F29). */
  userQuizzes: UserQuiz[];
  /** Worlds whose Photo Booth frame the user won in the world quiz (F29). */
  wonFrames: WorldKey[];
  /** Photo Booth frames the user made (F29). */
  frames: UserFrame[];

  /* chat */
  sendText: (conversationId: string, text: string) => SendResult;
  sendVoice: (conversationId: string, durationSec: number, transcript: string) => SendResult;
  sendImage: (conversationId: string, imageUri: string) => SendResult;
  markRead: (conversationId: string) => void;
  /** Chats "Mark as Unread": the chat or group shows its dot again until it is opened. */
  markUnread: (conversationId: string) => void;
  setActiveConversation: (conversationId: string | null) => void;
  clearChat: (conversationId: string) => void;
  setChatPinned: (conversationId: string, pinned: boolean) => void;
  setChatMuted: (conversationId: string, muted: boolean) => void;
  /** Drops the chat and its messages; the bond stays, and Find starts a new chat with them. */
  deleteChat: (conversationId: string) => void;
  /** Sets (or with `undefined` clears) the user's reaction on a message; a happy one takes back a 👎 on its reply. */
  reactToMessage: (conversationId: string, messageId: string, reaction?: string) => void;
  /** 👍 👎 on their newest reply (or with `undefined` takes the vote back); 👎 can say what was off. */
  rateReply: (conversationId: string, rating?: Rating, reason?: OffReason) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  /** Their newest reply again (↻): a new version arrives and the old one is kept. Costs a message. After 👎, `off` says what to fix. */
  regenerateReply: (conversationId: string, off?: OffReason) => SendResult;
  /** Stops the reply on its way (■): lines already shown stay, the rest never come. */
  stopReply: (conversationId: string) => void;
  /** The composer has text or is empty: a reply waiting for more messages waits longer or shorter (`src/lib/reply-batch.ts`). */
  setComposing: (conversationId: string, typing: boolean) => void;
  /** Asks again for the reply that failed ("Not Delivered", tap). */
  retryReply: (conversationId: string) => void;
  /** The same in a group: asks the members again for the line that got no answer. */
  retryGroupReply: (groupId: string) => void;
  /** Shows another version of their newest reply (‹ › or a swipe). */
  showReplyVersion: (conversationId: string, index: number) => void;
  /** Changes your newest text and asks them again; their answer to the old words goes. Costs a message. */
  editLastMessage: (conversationId: string, text: string) => SendResult;
  /** Deletes everything after one of their lines, as if the chat had stopped there. */
  rewindTo: (conversationId: string, messageId: string) => void;
  /** They go on without the user writing (Continue). One reply, so it costs what a message does. */
  continueChat: (conversationId: string) => SendResult;
  /**
   * The story moves on (a time skip) and they pick up from there: a span, the running scene's next
   * moment, or `to`, the user's own words (`skip: 'own'`). Costs what a message does.
   */
  skipTime: (conversationId: string, skip: TimeSkip, to?: string) => SendResult;

  /* group chats (queue item 16): every plan; a message costs what it does in any chat */
  /** 2 or 3 characters the user knows; returns the group id, or null when the pick is not valid. */
  createGroup: (memberIds: string[], name?: string) => string | null;
  sendGroupText: (groupId: string, text: string) => SendResult;
  sendGroupVoice: (groupId: string, durationSec: number, transcript: string) => SendResult;
  sendGroupImage: (groupId: string, imageUri: string) => SendResult;
  /** » in a group: two members trade a line without the user writing (`continueSpeakers`); a message's price. */
  continueGroup: (groupId: string) => SendResult;
  /** A time skip in a group: one member picks up at the new time, another answers; a message's price. */
  skipGroupTime: (groupId: string, skip: TimeSkip, to?: string) => SendResult;
  /** Truth or dare with one member in the group; another member joins in. Returns the question. */
  playGroupTruthOrDare: (groupId: string, characterId: string, target: 'them' | 'you', kind: 'truth' | 'dare') => string;
  /** A finished group call: its line in the chat and the call minutes it used. */
  addGroupCall: (groupId: string, startedAt: string, durationSec: number) => void;
  renameGroup: (groupId: string, name: string) => void;
  /** The group chat's background, picked as a one-to-one chat's is. */
  setGroupBackground: (groupId: string, backgroundId: string) => void;
  /** False when the group is full or they are in it already. */
  addGroupMember: (groupId: string, characterId: string) => boolean;
  /** False when only two would be left (delete the group instead). */
  removeGroupMember: (groupId: string, characterId: string) => boolean;
  setGroupMuted: (groupId: string, muted: boolean) => void;
  deleteGroup: (groupId: string) => void;

  /* radio clips (F27): a friend says the user's lines; 5 lines cost 1 shell */
  makeRadioClip: (characterId: string, lines: string[], title: string) => ClipResult;
  deleteRadioClip: (clipId: string) => void;
  /** Puts the clip in the chat with its friend as the user's voice message. False without a chat. */
  shareRadioClip: (clipId: string) => boolean;
  /** A friend's new clip was played or opened: it stops being marked New. */
  markRadioGiftHeard: (giftId: string) => void;

  /* bonds */
  addFriend: (characterId: string, opts?: { quiet?: boolean }) => string;
  /** A world's way in (`WorldStory.entry`): its host's chat, with the entry scene the first time. */
  enterWorld: (worldKey: string) => string | null;
  /** A group of the user's closest friends in a world; null with fewer than two there. */
  startWorldGroup: (worldKey: string, name: string) => string | null;
  /** Finishes the first launch: who the user is, their first friend and the welcome gift. Returns the chat. */
  completeOnboarding: (input: {
    name: string;
    birthYear: number;
    /** How the characters speak to them (onboarding's gender step; "rather not say" is `they`). */
    pronouns: Pronouns;
    characterId: string;
    notifications: boolean;
    /** The friend's first question, in the user's language */
    firstAsk: string;
  }) => string;
  addCharacter: (character: Omit<Character, 'id'>) => { characterId: string; conversationId: string };
  /** Quick create's drafts today (`src/economy/quick-create.ts`). */
  quickCreates?: QuickCreateUse;
  /** Who the user can be in a chat besides their profile (`src/lib/personas.ts`). */
  personas: Persona[];
  /** The persona new chats use; none means the profile. */
  defaultPersonaId?: string;
  /** A chat's own persona, by conversation id (`PROFILE_PERSONA` for the profile). */
  chatPersonas: Record<string, string>;
  /** Saves a new persona (or the one with `id`); returns its id, or the first problem. */
  savePersona: (input: { name: string; pronouns?: Pronouns; about: string; avatarUri?: string }, id?: string) => { id: string } | { problem: PersonaProblem };
  deletePersona: (id: string) => void;
  /** The persona new chats use; `PROFILE_PERSONA` makes it the profile again. */
  setDefaultPersona: (id: string) => void;
  /** This chat's persona; undefined goes back to the default. */
  setChatPersona: (conversationId: string, id?: string) => void;
  /** The user's own scenes (`src/lib/scenes.ts`); the app's are `officialScenes`. */
  scenes: Scene[];
  /** Saves a new scene (or the one with `id`); returns its id, or the first problem. */
  saveScene: (input: SceneInput, id?: string) => { id: string } | { problem: SceneProblem };
  /** Chats playing it keep their copy until they end it. */
  deleteScene: (id: string) => void;
  /** Starts a scene in a one-to-one chat: a scene card, then their first line. Free. */
  startScene: (conversationId: string, sceneId: string) => void;
  /** Ends the chat's scene; the character goes back to everyday chat. */
  endScene: (conversationId: string) => void;
  /** The user's own world books (`src/lib/lorebook.ts`); the worlds' are `officialLorebooks`. */
  lorebooks: Lorebook[];
  /** Saves a new book (or the one with `id`); returns its id, or the first problem. */
  saveLorebook: (input: { name: string; about: string; characterIds: string[]; userRole?: string }, id?: string) => { id: string } | { problem: LorebookProblem };
  deleteLorebook: (id: string) => void;
  /** Links one of the user's books to a friend, or takes it off them; their next reply sees it. */
  setLoreLink: (bookId: string, characterId: string, linked: boolean) => void;
  /** Saves an entry in one of the user's books (or the one with `id`); returns its id, or the first problem. */
  saveLoreEntry: (
    bookId: string,
    input: { kind: LoreKind; name: string; keywords: string[]; text: string },
    id?: string,
  ) => { id: string } | { problem: LoreEntryProblem };
  deleteLoreEntry: (bookId: string, entryId: string) => void;
  /** Streams the user watched (`src/lib/streams.ts`), newest first. */
  streams: Stream[];
  /** Today's free stream rounds (`src/economy/streams.ts`). */
  streamUse?: StreamUse;
  /** Who is typing in a stream right now, by stream id (not saved). */
  streamTyping: Record<string, string>;
  /** Starts a stream of two characters on a topic; its first round is free or costs shells. */
  startStream: (input: { characterIds: string[]; topic: string }) => { id: string } | { problem: StreamProblem } | 'noShells';
  /** Another round of lines: free while today's free rounds last, else shells. */
  keepStreaming: (id: string) => 'ok' | 'noShells' | 'full';
  /** Pauses between lines; `resumeStream` plays the rest of the round already paid for. */
  pauseStream: (id: string) => void;
  resumeStream: (id: string) => void;
  deleteStream: (id: string) => void;
  /** Counts one written draft; false when today's free ones are used up. */
  takeQuickCreate: () => boolean;
  /** The counted pushes handed to the OS (`src/notifications/budget.ts`), kept in `daily`. */
  setPushLog: (log: PushSent[]) => void;
  /** Pays for a drawn portrait: one of the plan's free ones, else shells. False when neither is there. */
  payForPortrait: (characterId?: string) => boolean;
  /**
   * A line that reached the user only as a notification (the comeback ladder) lands in
   * the chat once the app sees it. Written once per notification id.
   */
  receivePushLine: (push: { id: string; characterId: string; text: string; at: string; reach?: string }) => void;
  /** Edits a character the user made; seed characters are not editable. */
  updateCharacter: (characterId: string, patch: Partial<Omit<Character, 'id' | 'isOfficial'>>) => void;
  resetRelationship: (characterId: string) => void;
  setBackground: (characterId: string, backgroundId: string) => void;
  setNickname: (characterId: string, nickname: string) => void;
  setCharacterPref: (characterId: string, key: 'voiceReplies' | 'messagesFirst', value: boolean) => void;
  /** Chat settings → Reply style / Reply length; the next reply follows them. */
  setReplyPrefs: (characterId: string, prefs: Partial<ReplyPrefs>) => void;
  addIntimacy: (characterId: string, amount: number) => void;
  /** Picks one of the unlocked relationship labels, or clears it. */
  setRelationshipLabel: (characterId: string, label?: string) => void;
  /**
   * Find → Who do you miss?: makes them the user's Mom, Dad… (one person per role), called what
   * the user wrote, lets them reach out and has them say hello. Returns their chat.
   */
  makeFamily: (characterId: string, label: FamilyLabel, name: string) => string;
  dismissLevelUp: () => void;

  /* economy */
  spendShells: (amount: number, reason?: LedgerReason, characterId?: string) => boolean;
  addShells: (amount: number, reason?: LedgerReason) => void;
  /** Removes yesterday's unspent check-in shells. Safe to call often. */
  expireFreeShells: () => void;
  claimDailyLogin: () => number;
  dismissDailyReward: () => void;
  /** Enters a friend's invite code; both sides get shells once the user is back on a later day. */
  redeemInvite: (code: string) => 'ok' | 'invalid' | 'own' | 'used';
  /** Pays a pending invite when its day has passed; returns what was paid (0 otherwise). */
  settleInvite: () => number;
  /** The wheel's result, drawn by the server when the wallet lives there (Profile → Server wallet). */
  spinWheel: () => Promise<{ index: number; reward: number } | null>;
  /** A card went out through the share sheet: the shells it paid, 0 once today's paid shares are used. */
  rewardShare: () => Promise<number>;
  /** Development (B1.2): reads the wallet from the server and takes it as the truth. */
  syncServerWallet: () => Promise<void>;
  /**
   * Starts a plan, or with `trial` the store's free days of Basic (once per account).
   * Real builds call this after StoreKit / Play Billing and the server's receipt check.
   */
  subscribe: (plan: PlanId, trial?: boolean) => void;
  /** Buys 10 extra minutes of calls or voice replies with shells. */
  topUpMinutes: (kind: MinutesKind) => SpendResult;
  /** Development builds only: ends the plan at once, to test the free screens. */
  endPlan: () => void;

  /* diary */
  addDiaryEntry: (entry: Omit<DiaryEntry, 'id'>) => string;
  deleteDiaryEntry: (id: string) => void;
  markDiaryPageRead: (id: string) => void;
  /** "Mark all read" in the notifications inbox. */
  markInboxSeen: () => void;
  /** Writes the pages owed for yesterday's chats and dates. Safe to call often. */
  writeDueDiaryPages: () => void;

  /* secret note */
  ensureSecretNote: (characterId: string) => void;
  newSecretNote: (characterId: string) => void;
  writeNote: (noteId: string, text: string) => void;
  exchangeNote: (noteId: string) => SpendResult;

  /* calls */
  ring: (characterId: string, slot?: CallSlot) => void;
  acceptCall: () => string | null;
  declineCall: () => void;
  addCall: (record: Omit<CallRecord, 'id'>) => void;

  /* safety */
  reports: MessageReport[];
  /** Characters the user blocked: gone from chats and Find, never reach out. */
  blockedIds: string[];
  reportMessage: (conversationId: string, messageId: string, reason: ReportReason) => void;
  /** Ends the bond (chat, memories, plans, moments) and hides the character. */
  blockCharacter: (characterId: string) => void;
  unblockCharacter: (characterId: string) => void;

  /* Find's search page: what was looked up and opened lately, newest first */
  recentSearches: string[];
  recentlyViewed: string[];
  rememberSearch: (term: string) => void;
  rememberViewed: (characterId: string) => void;
  clearRecentSearches: () => void;

  /* Today's widgets: four slots the user arranges (null = an empty slot in edit mode) */
  todayWidgets: (WidgetKind | null)[];
  setTodayWidgets: (slots: (WidgetKind | null)[]) => void;

  /* wake-up alarms (Bedtime → Alarms), for every plan */
  alarms: Alarm[];
  /** Adds a new alarm (no id yet) or replaces the one with the same id; it is switched on. */
  saveAlarm: (alarm: Omit<Alarm, 'id' | 'createdAt' | 'enabled'> & { id?: string }) => string;
  deleteAlarm: (id: string) => void;
  setAlarmEnabled: (id: string, enabled: boolean) => void;
  /** The morning after a ring (src/lib/morning-chain.ts); null when no alarm is going. */
  wake: WakeSession | null;
  /** Starts ringing: the session, the friend's wake-up voice note, a one-time alarm switched off. */
  ringAlarm: (alarmId: string) => WakeSession | null;
  snoozeWake: () => void;
  /** "Hold 3 s to turn off" (or Stop when there is no task): no chain, no guilt. */
  stopWake: () => void;
  /** A quick reply under the friend's line: sent as the user's message, free in the wake window. */
  pickChip: (conversationId: string, messageId: string, chip: string) => void;
  /**
   * A reply idea (`src/lib/reply-ideas.ts`): sends its line, or `edited` when the user changed it
   * first. Under a line they wrote first it is free and their answer fits the idea; elsewhere it
   * costs what a message does.
   */
  answerIdea: (conversationId: string, messageId: string, idea: ReplyIdea, edited?: string) => SendResult;
  /**
   * A push's action: an idea's button ("I ate!") or a reply typed on the lock screen. The line lands
   * in the chat if it is not there yet, then the answer goes; a typed reply to a line that asked
   * nothing is an ordinary message.
   */
  answerFromPush: (push: { characterId: string; line?: string; reach?: string; intent?: IdeaIntent; text?: string }) => SendResult;
  /** The user said "Yes, text me!" but the system blocks pushes: a card with a way to Settings. */
  noteNotifyOff: (conversationId: string) => void;
  /**
   * Development only: each open thread's next text and every waiting check-in arrive now, as if their
   * time had come, so the phone can be checked without waiting for 21:30. `waiting`: threads whose
   * friend may not write first yet (turn on Let them reach out).
   */
  devNextTexts: () => { sent: number; waiting: number };
  /** Dev: the next morning brief (today's, else tomorrow's) now; false when no plans are ahead. */
  devMorningBrief: () => boolean;
  /** Dev: tonight's "how was today?" now; false when family asks, the back-off holds, or nobody may write. */
  devDayAsk: () => boolean;
  /** Dev: this week's recap now, whatever the day; false when sent this week or no friend has 2+ days. */
  devWeekRecap: () => boolean;
  /**
   * Keeping in mind (`src/app/mind.tsx`): the user moves a thread's time; its plan and the texts
   * still to come follow (the server's model plans them again around the new time).
   */
  retimeThread: (threadId: string, happensAt: string) => void;
  /** Keeping in mind: the user settles a thread (how it went, it's off) or turns its texts off (`quiet`). */
  endThread: (threadId: string, outcome: ThreadOutcome) => void;
  /** "Forget this": a thread they got wrong goes, with the plan and the memory it made. */
  forgetThread: (threadId: string) => void;
  /** The in-app clock (every few seconds): due rings, snooze over, the sleepy check-in, expiry. */
  wakeTick: () => 'ring' | null;

  /* profile */
  updateProfile: (patch: ProfilePatch) => void;
  /** Wipes everything on this device and starts over at onboarding. */
  deleteAccount: () => void;
  /** Development builds only: adds the sample chats, bonds and diary pages, to test full screens. */
  loadDemoData: () => void;

  /* modules */
  /** Pays for a date at a place on the map; the rounds play on the date screen. */
  beginDate: (characterId: string, placeId: string) => SpendResult;
  /** Ends a date: closeness from the hearts won, a polaroid record, a moment and a text from them. */
  finishDate: (characterId: string, placeId: string, hearts: number, title: string) => DateRecord | null;
  /** Leaves a paid date before the end: no polaroid, and the place can be booked again. */
  leaveDate: () => void;
  /** Saves a new date, or the one with `id`. Free; playing it costs 2 shells a round. */
  saveDateTheme: (input: Omit<DateTheme, 'id' | 'createdAt'>, id?: string) => ThemeResult;
  deleteDateTheme: (id: string) => void;
  /** Pays for one play of the user's date and writes its rounds; the date screen plays them. */
  beginThemeDate: (characterId: string, themeId: string) => SpendResult;
  /* Photo Booth: the kept pictures, newest first */
  photos: BoothPhoto[];
  /**
   * Pro only: 'locked' without Pro or the trial, 'usedUp' when this period's pictures are gone.
   * Otherwise the new picture, kept in the album, with closeness and a moment on Us.
   */
  takePhoto: (characterId: string, style: BoothStyle, frame?: PhotoFrame) => BoothPhoto | 'locked' | 'usedUp';
  /** Sends a kept picture to the friend's chat once; they answer it (free). False if already sent. */
  sendPhoto: (photoId: string) => boolean;

  /* memories, moments, schedules */
  addMemory: (characterId: string, text: string, source?: MemorySource, about?: MemoryAbout) => void;
  toggleMemoryPin: (id: string) => void;
  /** Keeps a chat line word for word as a pinned Story memory; false when it may not be kept. */
  pinMessage: (conversationId: string, messageId: string) => boolean;
  /** Takes a pinned chat line back out of Story. */
  unpinMessage: (messageId: string) => void;
  deleteMemory: (id: string) => void;
  /** Rewrites a memory's text; source, date and pin stay. False when the text is empty or reads like a crisis. */
  editMemory: (id: string, text: string) => boolean;
  removeSchedule: (id: string) => void;
  /** A plan added by hand in [Us]; the character acknowledges it in chat. */
  addSchedule: (input: { characterId: string; title: string; date: string; time?: string; whenLabel: string }) => void;
  /** Sends due plan reminders and "how did it go?" messages, and answers board notes. Safe to call often. */
  runTimers: () => void;
  /** Ends a couple quiz: the score lands in chat as a card, they react, closeness grows. */
  finishQuiz: (characterId: string, quizId: string, matches: number, total: number, title: string) => void;
  saveQuiz: (draft: QuizDraft, id?: string) => QuizResult;
  deleteQuiz: (id: string) => void;
  /** Ends a world quiz hosted by a friend from it; 4 of 5 wins its frame. True when won. */
  finishWorldQuiz: (world: WorldKey, hostId: string, score: number, total: number) => boolean;
  /** Saves a frame the user made (new, or the one with `id`); returns its id. */
  saveFrame: (input: Omit<UserFrame, 'id' | 'createdAt'>, id?: string) => string;
  deleteFrame: (id: string) => void;
  /**
   * One truth-or-dare turn. On them: the user's question goes to chat and they answer.
   * On the user: they ask a truth or a dare in chat. Returns the question asked.
   */
  playTruthOrDare: (characterId: string, target: 'them' | 'you', kind: 'truth' | 'dare') => string;
  /** Pins a note on the board for one friend; they answer in chat a moment later. */
  postBoardNote: (characterId: string, text: string, style: BoardStyleId) => SpendResult | 'empty';

  /** What the characters do on their own when the app opens: greet, remind, call. */
  runDailyInitiative: () => { callFrom?: string; slot?: CallSlot };
  setSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

/** The fields the profile screen edits. */
export type ProfilePatch = Partial<
  Pick<User, 'displayName' | 'avatarUri' | 'pronouns' | 'birthday' | 'job' | 'interests' | 'about'>
>;

type PersistedKeys =
  | 'user'
  | 'wallet'
  | 'characters'
  | 'conversations'
  | 'groups'
  | 'radioClips'
  | 'newRadioGifts'
  | 'dateThemes'
  | 'userQuizzes'
  | 'wonFrames'
  | 'frames'
  | 'messages'
  | 'relationships'
  | 'memories'
  | 'memorySync'
  | 'diary'
  | 'characterDiary'
  | 'diaryPagesRead'
  | 'inboxSeenAt'
  | 'notes'
  | 'ledger'
  | 'calls'
  | 'moments'
  | 'schedules'
  | 'care'
  | 'threads'
  | 'boardPosts'
  | 'dates'
  | 'reports'
  | 'blockedIds'
  | 'recentSearches'
  | 'recentlyViewed'
  | 'quickCreates'
  | 'personas'
  | 'defaultPersonaId'
  | 'chatPersonas'
  | 'scenes'
  | 'lorebooks'
  | 'streams'
  | 'streamUse'
  | 'todayWidgets'
  | 'alarms'
  | 'photos'
  | 'wake'
  | 'daily'
  | 'settings';

/** Today's widgets before the user changes them (owner's pick, 2026-10-21). */
const DEFAULT_WIDGETS: WidgetKind[] = ['calls', 'diary', 'date', 'sleep'];

/** How many recent searches and recently viewed characters Find keeps. */
const RECENT_LIMIT = 8;

const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

/** Whether `hour` falls in the few hours after a "HH:MM" call time (wrapping past midnight). */
function inWindow(hour: number, time = '08:00') {
  const start = Number(time.split(':')[0]);
  return (hour - start + 24) % 24 < CALL_WINDOW_HOURS;
}

/** Static web rendering runs in Node, where there is no localStorage. */
const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const STORE_KEY = 'rafti.store';
/** The key used before the app was renamed to Rafti. */
const LEGACY_STORE_KEY = 'bimobimo.store';

/** Falls back to the pre-rename key once, so the rename keeps the wallet and history. */
const rebrandStorage: StateStorage = {
  getItem: async (name) => (await AsyncStorage.getItem(name)) ?? AsyncStorage.getItem(LEGACY_STORE_KEY),
  setItem: async (name, value) => {
    await AsyncStorage.setItem(name, value);
    await AsyncStorage.removeItem(LEGACY_STORE_KEY);
  },
  removeItem: (name) => AsyncStorage.removeItem(name),
};

type PersistedState = Partial<Pick<AppState, PersistedKeys>>;

/** Wallet fields older versions saved; the migration reads them once and drops them. */
type LegacyWallet = Wallet & {
  acorns?: number;
  isMember?: boolean;
  memberPlan?: PlanId;
  memberUntil?: string;
  callSeconds?: number;
};

/** The licensed characters seeded before v3. They must not survive a migration. */
const RETIRED_SEED_IDS = new Set([
  'c_gojo', 'c_megumi', 'c_toji', 'c_yuji', 'c_nobara', 'c_nanami', 'c_maki', 'c_yuta', 'c_sukuna',
  'c_tanjiro', 'c_nezuko', 'c_zenitsu', 'c_inosuke', 'c_giyu', 'c_shinobu',
  'c_diluc', 'c_raiden', 'c_zhongli', 'c_felix', 'c_jin', 'c_jungkook',
]);

const LEGACY_CATEGORY: Record<string, Character['category']> = {
  kpop: 'idol',
  anime: 'school',
  game: 'fantasy',
};

/** Each id once, the first copy kept: lists merged from saved and sample data must not repeat. */
function uniqueById<T extends { id: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  return list.filter((item) => !seen.has(item.id) && !!seen.add(item.id));
}

/**
 * v3: swap the seed cast for the new one. Seed-owned data is replaced by the new
 * seed; characters the user created (and everything tied to them) are kept, and
 * diary pages stay but are unshared from anyone who no longer exists.
 */
function recastSeed(state: PersistedState): PersistedState {
  const seedIds = new Set(seedCharacters.map((c) => c.id));
  const ownId = (id: string) => !RETIRED_SEED_IDS.has(id) && !seedIds.has(id);
  const own = <T extends { characterId: string }>(list: T[] = []) => list.filter((item) => ownId(item.characterId));

  const ownCharacters = (state.characters ?? [])
    .filter((c) => ownId(c.id))
    .map((c) => ({ ...c, category: LEGACY_CATEGORY[c.category] ?? c.category }));
  const ownConversations = own(state.conversations);
  const seedDiaryIds = new Set(seedDiary.map((d) => d.id));
  const gone = (id?: string) => !!id && !ownId(id) && !seedIds.has(id);

  return {
    ...state,
    characters: [...seedCharacters, ...ownCharacters],
    conversations: [...seedConversations, ...ownConversations],
    messages: {
      ...messagesByConversation,
      ...Object.fromEntries(ownConversations.map((v) => [v.id, state.messages?.[v.id] ?? []])),
    },
    relationships: {
      ...Object.fromEntries(seedRelationships.map((r) => [r.characterId, r])),
      ...Object.fromEntries(own(Object.values(state.relationships ?? {})).map((r) => [r.characterId, r])),
    },
    memories: [...seedMemories, ...own(state.memories)],
    notes: [...seedNotes, ...own(state.notes)],
    calls: [...seedCalls, ...own(state.calls)],
    moments: [...seedMoments, ...own(state.moments)],
    schedules: [...seedSchedules, ...own(state.schedules)],
    diary: [
      ...seedDiary,
      ...(state.diary ?? [])
        .filter((d) => !seedDiaryIds.has(d.id))
        .map((d) => (gone(d.sharedWithCharacterId) ? { ...d, sharedWithCharacterId: undefined, reply: undefined } : d)),
    ],
  };
}

/**
 * The sample history the mock shipped with: chats, bonds, memories, diary pages and
 * calls with a few characters. A new install starts empty, with only the friend the
 * user picks in onboarding; development builds can load this from Profile.
 */
const demoHistory = () => ({
  conversations: seedConversations,
  messages: messagesByConversation,
  relationships: Object.fromEntries(seedRelationships.map((r) => [r.characterId, r])),
  memories: seedMemories,
  diary: seedDiary,
  characterDiary: seedCharacterDiary,
  notes: seedNotes,
  calls: seedCalls,
  moments: seedMoments,
  schedules: seedSchedules,
});

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: currentUser,
      // The welcome gift at the end of onboarding is the first balance.
      wallet: { ...seedWallet, shells: 0 },
      characters: seedCharacters,
      conversations: [],
      groups: [],
      radioClips: [],
      newRadioGifts: [],
      messages: {},
      relationships: {},
      memories: [],
      memorySync: { dirty: [], joined: false },
      diary: [],
      characterDiary: [],
      diaryPagesRead: [],
      inboxSeenAt: null,
      notes: [],
      ledger: [],
      calls: [],
      moments: [],
      schedules: [],
      care: [],
      threads: [],
      boardPosts: [],
      dates: [],
      reports: [],
      blockedIds: [],
      recentSearches: [],
      recentlyViewed: [],
      personas: [],
      chatPersonas: {},
      scenes: [],
      lorebooks: [],
      streams: [],
      streamTyping: {},
      todayWidgets: DEFAULT_WIDGETS,
      alarms: [],
      photos: [],
      wake: null,
      daily: initialDaily,
      settings: initialSettings,

      hydrated: false,
      levelUp: null,
      typing: {},
      replyVersions: {},
      groupTyping: {},
      activeConversationId: null,
      incomingCall: null,
      dailyReward: null,
      activeDate: null,
      dateThemes: [],
      userQuizzes: [],
      wonFrames: [],
      frames: [],

      /* ── chat ─────────────────────────────────────────────────────────── */

      sendText: (conversationId, text) => {
        const trimmed = text.trim();
        const conversation = get().conversations.find((c) => c.id === conversationId);
        if (!trimmed || !conversation) return 'empty';
        // Replies to the wake-up alarm (and its quick replies) cost no shell, so 0 shells never
        // keeps anyone from turning it off.
        const wakeHere = wakeFor(get(), conversationId);
        if (!wakeHere && !chargeMessage(get, shellCosts.textMessage, 'chat', conversationId)) return 'noShells';
        countMessage(set, get);

        appendMessage(set, get, conversationId, {
          id: uid('m'),
          conversationId,
          author: 'me',
          kind: 'text',
          text: trimmed,
          createdAt: new Date().toISOString(),
        });
        touchStreak(set, get, conversation.characterId);
        dayToDiary(set, get, conversationId, trimmed);

        // Typed texts wait a beat for the next one, so back-to-back messages get one reply.
        answerText(set, get, conversationId, trimmed, { wakeHere: !!wakeHere, gain: INTIMACY.text, batch: true });
        return 'sent';
      },

      sendVoice: (conversationId, durationSec, transcript) => {
        const conversation = get().conversations.find((c) => c.id === conversationId);
        if (!conversation) return 'empty';
        if (!chargeMessage(get, shellCosts.voiceMessage, 'voice', conversationId)) return 'noShells';
        countMessage(set, get);

        appendMessage(set, get, conversationId, {
          id: uid('m'),
          conversationId,
          author: 'me',
          kind: 'voice',
          durationSec,
          transcript,
          createdAt: new Date().toISOString(),
        });
        touchStreak(set, get, conversation.characterId);
        // A spoken crisis gets the same care as a typed one.
        const crisis = !!transcript && detectCrisis(transcript);
        if (crisis) appendHelplineCard(set, get, conversationId);
        scheduleReply(set, get, conversationId, {
          text: crisis ? pick(crisisReplies) : undefined,
          gain: INTIMACY.voice,
        });
        return 'sent';
      },

      sendImage: (conversationId, imageUri) => {
        const conversation = get().conversations.find((c) => c.id === conversationId);
        if (!conversation) return 'empty';
        if (!chargeMessage(get, shellCosts.textMessage, 'photo', conversationId)) return 'noShells';
        countMessage(set, get);

        appendMessage(set, get, conversationId, {
          id: uid('m'),
          conversationId,
          author: 'me',
          kind: 'image',
          imageUri,
          createdAt: new Date().toISOString(),
        });
        touchStreak(set, get, conversation.characterId);
        scheduleReply(set, get, conversationId, {
          text: pick([
            'Wait, you took this? Send more. Right now.',
            'Okay, this is going in my favourites folder.',
            'I am looking at this way longer than I should be.',
          ]),
          gain: INTIMACY.text,
        });
        return 'sent';
      },

      markRead: (conversationId) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId && c.unreadCount ? { ...c, unreadCount: 0 } : c,
          ),
          groups: s.groups.map((g) => (g.id === conversationId && g.unreadCount ? { ...g, unreadCount: 0 } : g)),
        })),

      markUnread: (conversationId) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId && !c.unreadCount ? { ...c, unreadCount: 1 } : c,
          ),
          groups: s.groups.map((g) => (g.id === conversationId && !g.unreadCount ? { ...g, unreadCount: 1 } : g)),
        })),

      setActiveConversation: (conversationId) => {
        set({ activeConversationId: conversationId });
        if (!conversationId) return;
        get().markRead(conversationId);
        // Opening a group starts a session: the "not real people" line shows if it is due. A
        // one-to-one chat's header says "AI character" instead (owner, 2026-10-30).
        if (get().groups.some((g) => g.id === conversationId)) noticeGroupAiIfDue(set, get, conversationId);
      },

      clearChat: (conversationId) => {
        cancelReplies(set, conversationId);
        // A cleared chat starts over, as Character.AI's new chat does: one of their openings
        // (likely another one) and, under it, their starters.
        const conversation = get().conversations.find((c) => c.id === conversationId);
        const character = get().characters.find((c) => c.id === conversation?.characterId);
        const greeting = character ? openingFor(get(), character, `${conversationId}:${Date.now()}`) : '';
        const now = new Date().toISOString();
        set((s) => ({
          replyVersions: omitKey(s.replyVersions, conversationId),
          messages: {
            ...s.messages,
            [conversationId]: greeting ? [{ id: uid('m'), conversationId, author: 'them', kind: 'text', text: greeting, createdAt: now }] : [],
          },
          conversations: s.conversations.map((c) =>
            c.id === conversationId ? { ...c, lastMessagePreview: plainText(greeting), lastMessageAt: greeting ? now : c.lastMessageAt, unreadCount: 0 } : c,
          ),
        }));
      },

      setChatPinned: (conversationId, pinned) =>
        set((s) => ({ conversations: s.conversations.map((c) => (c.id === conversationId ? { ...c, pinned } : c)) })),

      setChatMuted: (conversationId, muted) =>
        set((s) => ({ conversations: s.conversations.map((c) => (c.id === conversationId ? { ...c, muted } : c)) })),

      deleteChat: (conversationId) => {
        // A reply still on its way must not land in a chat that is gone.
        cancelReplies(set, conversationId);
        set((s) => {
          const { [conversationId]: _messages, ...messages } = s.messages;
          const { [conversationId]: _typing, ...typing } = s.typing;
          return {
            replyVersions: omitKey(s.replyVersions, conversationId),
            conversations: s.conversations.filter((c) => c.id !== conversationId),
            messages,
            typing,
            activeConversationId: s.activeConversationId === conversationId ? null : s.activeConversationId,
          };
        });
      },

      reactToMessage: (conversationId, messageId, reaction) =>
        set((s) => {
          const list = s.messages[conversationId] ?? [];
          // A happy sticker and a 👎 on the same reply say opposite things: the sticker wins.
          const undown = isHappy(reaction) ? new Set(replyAround(list, messageId).map((m) => m.id)) : null;
          return {
            messages: {
              ...s.messages,
              [conversationId]: list.map((m) => {
                const next = m.id === messageId ? { ...m, reaction } : m;
                return undown?.has(m.id) && next.rating === 'down' ? { ...next, rating: undefined, offReason: undefined } : next;
              }),
            },
          };
        }),

      rateReply: (conversationId, rating, reason) => {
        const exchange = lastExchange(get().messages[conversationId]);
        if (!exchange?.burst.length) return;
        const first = exchange.burst[0].id;
        const ids = new Set(exchange.burst.map((m) => m.id));
        set((s) => ({
          messages: {
            ...s.messages,
            [conversationId]: (s.messages[conversationId] ?? []).map((m) =>
              ids.has(m.id) ? withRating(m, m.id === first, rating, reason) : m,
            ),
          },
        }));
      },

      deleteMessage: (conversationId, messageId) =>
        set((s) => {
          const rest = (s.messages[conversationId] ?? []).filter((m) => m.id !== messageId);
          // System lines (the AI notice, cards) never become the preview.
          const last = [...rest].reverse().find((m) => m.kind !== 'system');
          return {
            messages: { ...s.messages, [conversationId]: rest },
            // A deleted line may belong to the newest exchange; its versions would no longer match.
            replyVersions: omitKey(s.replyVersions, conversationId),
            conversations: s.conversations.map((c) =>
              c.id === conversationId ? { ...c, lastMessagePreview: last ? previewFor(last) : '' } : c,
            ),
            groups: s.groups.map((g) =>
              g.id === conversationId ? { ...g, lastMessagePreview: last ? groupLinePreview(s, last) : '' } : g,
            ),
          };
        }),

      stopReply: (conversationId) => {
        cancelReplies(set, conversationId);
        finishReveals();
      },

      setComposing: (conversationId, typing) => replyBatch.composing(conversationId, typing),

      retryReply: (conversationId) => {
        const failed = (get().messages[conversationId] ?? []).findLast((m) => m.failed);
        if (!failed || get().typing[conversationId]) return;
        set((s) => ({
          messages: {
            ...s.messages,
            [conversationId]: (s.messages[conversationId] ?? []).map((m) => (m.id === failed.id ? { ...m, failed: undefined } : m)),
          },
        }));
        // After a restart the turn's details are gone; a plain reply to the same line still fits.
        const turn = failedTurns.get(conversationId) ?? { gain: INTIMACY.text };
        failedTurns.delete(conversationId);
        scheduleReply(set, get, conversationId, turn);
      },

      retryGroupReply: (groupId) => {
        const failed = (get().messages[groupId] ?? []).findLast((m) => m.failed);
        if (!failed || get().groupTyping[groupId]?.length) return;
        set((s) => ({
          messages: { ...s.messages, [groupId]: (s.messages[groupId] ?? []).map((m) => (m.id === failed.id ? { ...m, failed: undefined } : m)) },
        }));
        const turns = failedGroupTurns.get(groupId);
        failedGroupTurns.delete(groupId);
        // After a restart the turns are gone; answering the same line again still fits.
        if (turns) writeGroupTurns(set, get, groupId, turns);
        else answerGroup(set, get, groupId, failed.text ?? '', (gender) => pick(groupReplies(gender)));
      },

      regenerateReply: (conversationId, off) => {
        const state = get();
        const exchange = lastExchange(state.messages[conversationId]);
        if (!exchange?.burst.length || exchange.crisis || state.typing[conversationId]) return 'empty';
        if (!chargeMessage(get, shellCosts.textMessage, 'chat', conversationId)) return 'noShells';
        countMessage(set, get);
        // What is on screen becomes a kept version; the new one fills in as it arrives.
        const held = state.replyVersions[conversationId];
        const same = held?.afterId === exchange.anchor.id;
        const versions = same ? [...held.versions] : [];
        versions[same ? held.index : 0] = exchange.burst;
        const next = [...versions, []].slice(-MAX_REPLY_VERSIONS);
        const ids = new Set(exchange.burst.map((m) => m.id));
        const afterId = exchange.anchor.id;
        set((s) => ({
          ...withMessages(s, conversationId, (s.messages[conversationId] ?? []).filter((m) => !ids.has(m.id))),
          replyVersions: { ...s.replyVersions, [conversationId]: { afterId, versions: next, index: next.length - 1 } },
        }));
        // A new version is the same exchange again: it adds no closeness. After a continue or a
        // skip it answers that again (the server sends the same cue).
        // Every version so far is something they already said: the new one takes another angle (the
        // server gets them as `redo`, the mock avoids their lines).
        const anchor = exchange.anchor;
        const avoid = versions.flat().flatMap((m) => (m.kind === 'text' && m.text ? [m.text] : []));
        let steer = isSteer(anchor) ? mockSteerLines(anchor.card as 'continue' | 'skip', anchor.skip, `${anchor.id}:${next.length}`, chatGender(get(), conversationId)) : undefined;
        for (let tries = 1; steer && avoid.includes(steer[0]) && tries < 5; tries++) {
          steer = mockSteerLines(anchor.card as 'continue' | 'skip', anchor.skip, `${anchor.id}:${next.length}:${tries}`, chatGender(get(), conversationId));
        }
        scheduleReply(set, get, conversationId, {
          lines: steer,
          gain: 0,
          avoid,
          off,
          steer: isSteer(anchor) ? { kind: anchor.card as 'continue' | 'skip', skip: anchor.skip, to: anchor.skipTo } : undefined,
        });
        return 'sent';
      },

      showReplyVersion: (conversationId, index) => {
        const state = get();
        const held = state.replyVersions[conversationId];
        const exchange = lastExchange(state.messages[conversationId]);
        if (!held || !exchange || held.afterId !== exchange.anchor.id || state.typing[conversationId]) return;
        if (index === held.index || !held.versions[index]?.length) return;
        // The version leaving the screen is copied first, so a reaction on it is kept.
        const versions = held.versions.map((v, i) => (i === held.index ? exchange.burst : v));
        const ids = new Set(exchange.burst.map((m) => m.id));
        set((s) => ({
          ...withMessages(s, conversationId, [
            ...(s.messages[conversationId] ?? []).filter((m) => !ids.has(m.id)),
            ...versions[index],
          ]),
          replyVersions: { ...s.replyVersions, [conversationId]: { ...held, versions, index } },
        }));
      },

      editLastMessage: (conversationId, text) => {
        const trimmed = text.trim();
        const exchange = lastExchange(get().messages[conversationId]);
        if (!trimmed || !exchange || exchange.anchor.kind !== 'text' || exchange.anchor.pending) return 'empty';
        if (trimmed === exchange.anchor.text) return 'sent';
        // Fixing a reply to the wake-up alarm stays free, as the reply itself was.
        const wakeHere = !!wakeFor(get(), conversationId);
        if (!wakeHere && !chargeMessage(get, shellCosts.textMessage, 'chat', conversationId)) return 'noShells';
        countMessage(set, get);
        // A reply still on its way answered the old words: it stops, and their answer goes.
        cancelReplies(set, conversationId);
        const mineId = exchange.anchor.id;
        const ids = new Set(exchange.burst.map((m) => m.id));
        const editedAt = new Date().toISOString();
        set((s) => ({
          ...withMessages(
            s,
            conversationId,
            (s.messages[conversationId] ?? [])
              .filter((m) => !ids.has(m.id))
              .map((m) => (m.id === mineId ? { ...m, text: trimmed, editedAt, readAt: undefined, noted: undefined } : m)),
          ),
          replyVersions: omitKey(s.replyVersions, conversationId),
        }));
        // The new answer reads differently from the one the old words got.
        answerText(set, get, conversationId, trimmed, { wakeHere, gain: 0, avoid: exchange.burst.find((m) => m.kind === 'text')?.text });
        return 'sent';
      },

      rewindTo: (conversationId, messageId) => {
        const list = get().messages[conversationId] ?? [];
        const at = list.findIndex((m) => m.id === messageId);
        if (at < 0 || at === list.length - 1) return;
        // Level, shells and memories stay as they are (owner, 2026-10-24).
        cancelReplies(set, conversationId);
        set((s) => {
          const current = s.messages[conversationId] ?? [];
          const keep = current.findIndex((m) => m.id === messageId);
          return {
            ...withMessages(s, conversationId, current.slice(0, keep + 1)),
            replyVersions: omitKey(s.replyVersions, conversationId),
          };
        });
      },

      continueChat: (conversationId) => steerChat(set, get, conversationId, 'continue'),

      skipTime: (conversationId, skip, to) => steerChat(set, get, conversationId, 'skip', skip, to),

      /* ── group chats ──────────────────────────────────────────────────── */

      createGroup: (memberIds, name) => {
        const s = get();
        const ids = [...new Set(memberIds)].filter(
          (id) => s.characters.some((c) => c.id === id) && !s.blockedIds.includes(id),
        );
        if (ids.length < GROUP_MIN || ids.length > GROUP_MAX) return null;
        const id = uid('grp');
        const now = new Date().toISOString();
        const group: GroupChat = {
          id,
          memberIds: ids,
          name: name?.trim() || undefined,
          createdAt: now,
          lastMessagePreview: '',
          lastMessageAt: now,
          unreadCount: 0,
          muted: false,
        };
        set((st) => ({ groups: [...st.groups, group], messages: { ...st.messages, [id]: [] } }));
        appendGroupMessage(set, get, id, groupSystem(id, i18n.t('group.madeLine')), { quiet: true });
        noticeGroupAiIfDue(set, get, id);
        // The first member says hello and names the others.
        const others = groupTitle(ids.slice(1).map((m) => memberName(get(), m)));
        writeGroupTurns(set, get, id, [{ characterId: ids[0], lines: [pick(groupHellos)(others, genderOf(get(), ids[0]))], cue: groupHelloCue(others), quiet: true }]);
        return id;
      },

      sendGroupText: (groupId, text) => {
        const trimmed = text.trim();
        if (!trimmed || !get().groups.some((g) => g.id === groupId)) return 'empty';
        if (!get().spendShells(shellCosts.textMessage, 'chat')) return 'noShells';
        countMessage(set, get);
        noticeGroupAiIfDue(set, get, groupId);
        appendGroupMessage(set, get, groupId, {
          id: uid('m'),
          conversationId: groupId,
          author: 'me',
          kind: 'text',
          text: trimmed,
          createdAt: new Date().toISOString(),
        });
        answerGroup(set, get, groupId, trimmed, (gender) => pick(groupReplies(gender)));
        return 'sent';
      },

      sendGroupVoice: (groupId, durationSec, transcript) => {
        if (!get().groups.some((g) => g.id === groupId)) return 'empty';
        if (!get().spendShells(shellCosts.voiceMessage, 'voice')) return 'noShells';
        countMessage(set, get);
        noticeGroupAiIfDue(set, get, groupId);
        appendGroupMessage(set, get, groupId, {
          id: uid('m'),
          conversationId: groupId,
          author: 'me',
          kind: 'voice',
          durationSec,
          transcript,
          createdAt: new Date().toISOString(),
        });
        answerGroup(set, get, groupId, transcript, (gender) => [pick(groupVoiceLines(gender))]);
        return 'sent';
      },

      sendGroupImage: (groupId, imageUri) => {
        if (!get().groups.some((g) => g.id === groupId)) return 'empty';
        if (!get().spendShells(shellCosts.textMessage, 'photo')) return 'noShells';
        countMessage(set, get);
        noticeGroupAiIfDue(set, get, groupId);
        appendGroupMessage(set, get, groupId, {
          id: uid('m'),
          conversationId: groupId,
          author: 'me',
          kind: 'image',
          imageUri,
          createdAt: new Date().toISOString(),
        });
        answerGroup(set, get, groupId, '', (gender) => [pick(groupPhotoLines(gender))]);
        return 'sent';
      },

      continueGroup: (groupId) => {
        const state = get();
        const group = state.groups.find((g) => g.id === groupId);
        if (!group) return 'empty';
        // The one-to-one rules: not while they type, before their answer, after a crisis, or 3 in a row.
        if (steerBlock(state.messages[groupId], !!state.groupTyping[groupId]?.length)) return 'empty';
        const [first, second] = continueSpeakers(group.memberIds, speakersIn(state, groupId));
        if (!first) return 'empty';
        if (!get().spendShells(shellCosts.textMessage, 'chat')) return 'noShells';
        countMessage(set, get);
        const lastSpeaker = speakersIn(state, groupId).at(-1);
        appendGroupMessage(set, get, groupId, { id: uid('m'), ...steerMarker(groupId, 'continue') }, { quiet: true });
        // The server writes each line from the member's group prompt and `groupContinueCue`.
        writeGroupTurns(set, get, groupId, [
          {
            characterId: first,
            lines: second ? [pick(groupGoOn)(memberName(get(), second), genderOf(get(), first))] : pick(groupReplies(genderOf(get(), first))),
            cue: groupContinueCue(lastSpeaker ? memberName(get(), lastSpeaker) : 'the group'),
          },
          ...(second ? [{ characterId: second, lines: [pick(groupComebacks)(memberName(get(), first), genderOf(get(), second))], cue: groupContinueCue(memberName(get(), first)) }] : []),
        ]);
        return 'sent';
      },

      skipGroupTime: (groupId, skip, to) => {
        const state = get();
        const group = state.groups.find((g) => g.id === groupId);
        // Scenes play in one-to-one chats only, so a group skips by a span or the user's words.
        if (!group || skip === 'scene') return 'empty';
        if (steerBlock(state.messages[groupId], !!state.groupTyping[groupId]?.length)) return 'empty';
        const words = skip === 'own' ? cleanSkipTo(to ?? '') : undefined;
        if (words !== undefined && checkSkipTo(words).length) return 'empty';
        const [first, second] = continueSpeakers(group.memberIds, speakersIn(state, groupId));
        if (!first) return 'empty';
        if (!get().spendShells(shellCosts.textMessage, 'chat')) return 'noShells';
        countMessage(set, get);
        const marker: Message = { id: uid('m'), ...steerMarker(groupId, 'skip', skip, new Date(), words) };
        appendGroupMessage(set, get, groupId, marker, { quiet: true });
        // The server: the first member from `groupSkipCue`, the second from `groupContinueCue`.
        writeGroupTurns(set, get, groupId, [
          { characterId: first, lines: mockSteerLines('skip', skip, marker.id, genderOf(get(), first)), cue: groupSkipCue(skip, words) },
          ...(second ? [{ characterId: second, lines: [pick(groupGoOn)(memberName(get(), first), genderOf(get(), second))], cue: groupContinueCue(memberName(get(), first)) }] : []),
        ]);
        return 'sent';
      },

      playGroupTruthOrDare: (groupId, characterId, target, kind) => {
        const group = get().groups.find((g) => g.id === groupId);
        if (!group || !group.memberIds.includes(characterId)) return '';
        if (target === 'you') {
          const ask = pick(kind === 'truth' ? localized('truthsForYou', TRUTHS_FOR_YOU) : localized('daresForYou', DARES_FOR_YOU));
          writeGroupTurns(set, get, groupId, [{ characterId, lines: [ask], cue: gameAskCue(kind), quiet: true }]);
          return ask;
        }
        const turn = pick(kind === 'truth' ? localized('truthsForThem', TRUTHS_FOR_THEM) : localized('daresForThem', DARES_FOR_THEM));
        appendGroupMessage(set, get, groupId, {
          id: uid('m'),
          conversationId: groupId,
          author: 'me',
          kind: 'text',
          text: turn.ask,
          createdAt: new Date().toISOString(),
        });
        // They answer, and someone else in the group has a word about it.
        const other = leastRecent(
          group.memberIds.filter((id) => id !== characterId),
          speakersIn(get(), groupId),
        );
        writeGroupTurns(set, get, groupId, [
          { characterId, lines: [turn.answer], cue: gameAnswerCue() },
          ...(other ? [{ characterId: other, lines: [pick(groupReactions)(memberName(get(), characterId), genderOf(get(), other))], cue: groupReactCue(memberName(get(), characterId)) }] : []),
        ]);
        return turn.ask;
      },

      addGroupCall: (groupId, startedAt, durationSec) => {
        if (durationSec <= 0 || !get().groups.some((g) => g.id === groupId)) return;
        appendGroupMessage(set, get, groupId, {
          id: uid('m'),
          conversationId: groupId,
          author: 'me',
          kind: 'call',
          durationSec,
          missed: false,
          createdAt: startedAt,
        });
        // The same call minutes as a one-to-one call: the plan's first, then bought ones.
        const { wallet } = get();
        const used = consumeMinutes(wallet.subscription, wallet.packs, 'call', durationSec, Date.now());
        set((s) => ({ wallet: { ...s.wallet, subscription: used.subscription, packs: used.packs } }));
        if (used.taken > 0) logSeconds(set, -used.taken, 'call');
      },

      setGroupBackground: (groupId, backgroundId) =>
        set((s) => ({ groups: s.groups.map((g) => (g.id === groupId ? { ...g, backgroundId } : g)) })),

      renameGroup: (groupId, name) => {
        const group = get().groups.find((g) => g.id === groupId);
        if (!group) return;
        const clean = name.trim() || undefined;
        if (clean === group.name) return;
        set((s) => ({ groups: s.groups.map((g) => (g.id === groupId ? { ...g, name: clean } : g)) }));
        appendGroupMessage(
          set,
          get,
          groupId,
          groupSystem(groupId, clean ? i18n.t('group.namedLine', { name: clean }) : i18n.t('group.unnamedLine')),
          { quiet: true },
        );
      },

      addGroupMember: (groupId, characterId) => {
        const s = get();
        const group = s.groups.find((g) => g.id === groupId);
        if (
          !group ||
          group.memberIds.includes(characterId) ||
          !canAddMember(group.memberIds) ||
          !s.characters.some((c) => c.id === characterId) ||
          s.blockedIds.includes(characterId)
        ) {
          return false;
        }
        set((st) => ({
          groups: st.groups.map((g) => (g.id === groupId ? { ...g, memberIds: [...g.memberIds, characterId] } : g)),
        }));
        appendGroupMessage(set, get, groupId, groupSystem(groupId, i18n.t('group.joinedLine', { name: memberName(get(), characterId) })), {
          quiet: true,
        });
        writeGroupTurns(set, get, groupId, [{ characterId, lines: [pick(groupJoinLines(genderOf(get(), characterId)))], cue: groupJoinCue(), quiet: true }]);
        return true;
      },

      removeGroupMember: (groupId, characterId) => {
        const group = get().groups.find((g) => g.id === groupId);
        if (!group || !group.memberIds.includes(characterId) || !canRemoveMember(group.memberIds)) return false;
        const name = memberName(get(), characterId);
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId ? { ...g, memberIds: g.memberIds.filter((id) => id !== characterId) } : g,
          ),
        }));
        appendGroupMessage(set, get, groupId, groupSystem(groupId, i18n.t('group.removedLine', { name })), { quiet: true });
        return true;
      },

      setGroupMuted: (groupId, muted) =>
        set((s) => ({ groups: s.groups.map((g) => (g.id === groupId ? { ...g, muted } : g)) })),

      deleteGroup: (groupId) => {
        // A reply still on its way must not bring the group back.
        replyingUntil.delete(groupId);
        set((s) => {
          const { [groupId]: _messages, ...messages } = s.messages;
          const { [groupId]: _typing, ...groupTyping } = s.groupTyping;
          return {
            groups: s.groups.filter((g) => g.id !== groupId),
            messages,
            groupTyping,
            activeConversationId: s.activeConversationId === groupId ? null : s.activeConversationId,
          };
        });
      },

      /* ── radio clips ──────────────────────────────────────────────────── */

      makeRadioClip: (characterId, lines, title) => {
        const clean = cleanLines(lines);
        const problem = checkClip(clean);
        if (problem) return { status: problem };
        if (!get().characters.some((c) => c.id === characterId) || get().blockedIds.includes(characterId)) {
          return { status: 'noLines' };
        }
        if (!get().spendShells(clipCost(clean.length), 'radio', characterId)) return { status: 'noShells' };
        const clip: RadioClip = {
          id: uid('clip'),
          characterId,
          title: clipTitle(title, clean),
          lines: clean,
          // Real builds get the length from the voiced file (backend-plan §12.14).
          durationSec: clipDuration(clean),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ radioClips: [clip, ...s.radioClips] }));
        return { status: 'made', id: clip.id };
      },

      deleteRadioClip: (clipId) => set((s) => ({ radioClips: s.radioClips.filter((c) => c.id !== clipId) })),

      shareRadioClip: (clipId) => {
        const clip = get().radioClips.find((c) => c.id === clipId);
        const conversation = clip && get().conversations.find((c) => c.characterId === clip.characterId);
        if (!clip || !conversation) return false;
        // Already paid for when it was made, so sharing is free and asks for no reply.
        appendMessage(set, get, conversation.id, {
          id: uid('m'),
          conversationId: conversation.id,
          author: 'me',
          kind: 'voice',
          durationSec: clip.durationSec,
          transcript: clip.lines.join(' '),
          createdAt: new Date().toISOString(),
        });
        return true;
      },

      markRadioGiftHeard: (giftId) =>
        set((s) => (s.newRadioGifts.includes(giftId) ? { newRadioGifts: s.newRadioGifts.filter((id) => id !== giftId) } : s)),

      /* ── bonds ────────────────────────────────────────────────────────── */

      addFriend: (characterId, opts) => {
        const existing = get().conversations.find((c) => c.characterId === characterId);
        const character = get().characters.find((c) => c.id === characterId);
        if (existing) return existing.id;

        const conversationId = uid('conv');
        const now = new Date().toISOString();
        // `quiet`: a scene opens the chat instead of their greeting.
        const greeting = character && !opts?.quiet ? openingFor(get(), character, conversationId) : '';

        set((s) => ({
          conversations: [
            {
              id: conversationId,
              characterId,
              lastMessagePreview: plainText(greeting),
              lastMessageAt: now,
              unreadCount: 1,
              pinned: false,
              muted: false,
            },
            ...s.conversations,
          ],
          messages: {
            ...s.messages,
            [conversationId]: greeting
              ? [{ id: uid('m'), conversationId, author: 'them', kind: 'text', text: greeting, createdAt: now }]
              : [],
          },
          relationships: s.relationships[characterId]
            ? s.relationships
            : { ...s.relationships, [characterId]: newRelationship(characterId) },
        }));
        addMoment(set, characterId, 'met');
        return conversationId;
      },

      enterWorld: (worldKey) => {
        const entry = worldByKey(worldKey)?.story.entry;
        if (!entry || get().blockedIds.includes(entry.characterId) || !get().characters.some((c) => c.id === entry.characterId)) return null;
        const known = get().conversations.find((c) => c.characterId === entry.characterId);
        const conversationId = known?.id ?? get().addFriend(entry.characterId, { quiet: true });
        const messages = get().messages[conversationId] ?? [];
        // Once, and only into a chat not yet begun: a friend they already talk to is not a stranger
        // opening a scene, so the button just opens the chat.
        if (!messages.some((m) => m.author === 'me' || (m.card === 'scene' && m.sceneId === entry.sceneId))) {
          get().startScene(conversationId, entry.sceneId);
        }
        return conversationId;
      },

      startWorldGroup: (worldKey, name) => {
        const world = worldByKey(worldKey);
        if (!world) return null;
        const { characters, conversations, relationships, blockedIds, groups } = get();
        const ids = characters
          .filter((c) => c.series === world.series && !blockedIds.includes(c.id) && conversations.some((v) => v.characterId === c.id))
          .sort((a, b) => (relationships[b.id]?.intimacy ?? 0) - (relationships[a.id]?.intimacy ?? 0))
          .slice(0, GROUP_MAX)
          .map((c) => c.id);
        if (ids.length < GROUP_MIN) return null;
        const same = groups.find((g) => g.memberIds.length === ids.length && ids.every((id) => g.memberIds.includes(id)));
        return same?.id ?? get().createGroup(ids, name);
      },

      completeOnboarding: ({ name, birthYear, pronouns, characterId, notifications, firstAsk }) => {
        set((s) => ({
          user: { ...s.user, displayName: name, birthYear, pronouns, onboardedAt: new Date().toISOString() },
          settings: { ...s.settings, morningGreeting: notifications, eveningGreeting: notifications },
        }));
        // The welcome gift is paid once per account and never burns; it is gone only when spent
        // (owner decision 2026-10-13). Every other free credit burns at midnight.
        get().addShells(WELCOME_SHELLS, 'welcome');
        // Day one of the check-in week is part of the welcome, not a popup over the first chat.
        get().claimDailyLogin();
        set({ dailyReward: null });
        const conversationId = get().addFriend(characterId);
        appendMessage(set, get, conversationId, {
          id: uid('m'),
          conversationId,
          author: 'them',
          kind: 'text',
          text: firstAsk,
          createdAt: new Date().toISOString(),
        });
        return conversationId;
      },

      savePersona: (input, id) => {
        const others = get().personas.filter((p) => p.id !== id);
        const problem = checkPersona(input, others.length, perkLimit('personas', get().wallet.subscription, Date.now()))[0];
        if (problem) return { problem };
        const name = input.name.trim().slice(0, PERSONA_NAME_MAX);
        const about = input.about.trim().slice(0, PERSONA_ABOUT_MAX);
        const existing = id ? get().personas.find((p) => p.id === id) : undefined;
        const persona: Persona = {
          id: existing?.id ?? uid('persona'),
          name,
          about,
          ...(input.pronouns ? { pronouns: input.pronouns } : {}),
          ...(input.avatarUri ? { avatarUri: input.avatarUri } : {}),
          createdAt: existing?.createdAt ?? new Date().toISOString(),
        };
        set((s) => ({
          personas: existing ? s.personas.map((p) => (p.id === persona.id ? persona : p)) : [...s.personas, persona],
        }));
        return { id: persona.id };
      },

      deletePersona: (id) =>
        set((s) => ({
          personas: s.personas.filter((p) => p.id !== id),
          defaultPersonaId: s.defaultPersonaId === id ? undefined : s.defaultPersonaId,
          // Chats that used it go back to the default.
          chatPersonas: Object.fromEntries(Object.entries(s.chatPersonas).filter(([, persona]) => persona !== id)),
        })),

      setDefaultPersona: (id) => set({ defaultPersonaId: id === PROFILE_PERSONA ? undefined : id }),

      setChatPersona: (conversationId, id) =>
        set((s) => {
          const { [conversationId]: _old, ...rest } = s.chatPersonas;
          return { chatPersonas: id ? { ...rest, [conversationId]: id } : rest };
        }),

      saveScene: (input, id) => {
        const others = get().scenes.filter((scene) => scene.id !== id);
        const problem = checkScene(input, others.length, perkLimit('ownScenes', get().wallet.subscription, Date.now()))[0];
        if (problem) return { problem };
        const existing = id ? get().scenes.find((scene) => scene.id === id) : undefined;
        const role = input.userRole?.trim().slice(0, SCENE_ROLE_MAX);
        const opening = input.opening?.trim().slice(0, SCENE_OPENING_MAX);
        const scene: Scene = {
          id: existing?.id ?? uid('scene'),
          title: input.title.trim().slice(0, SCENE_TITLE_MAX),
          setting: input.setting.trim().slice(0, SCENE_SETTING_MAX),
          ...(role ? { userRole: role } : {}),
          ...(opening ? { opening } : {}),
          createdAt: existing?.createdAt ?? new Date().toISOString(),
        };
        set((s) => ({ scenes: existing ? s.scenes.map((x) => (x.id === scene.id ? scene : x)) : [scene, ...s.scenes] }));
        return { id: scene.id };
      },

      deleteScene: (id) => set((s) => ({ scenes: s.scenes.filter((scene) => scene.id !== id) })),

      startScene: (conversationId, sceneId) => {
        const conversation = get().conversations.find((c) => c.id === conversationId);
        const scene = [...localized('scenes', officialScenes), ...get().scenes].find((x) => x.id === sceneId);
        if (!conversation || !scene) return;
        // A reply still on its way belongs to the chat before the scene.
        cancelReplies(set, conversationId);
        const now = Date.now();
        set((s) => ({
          conversations: s.conversations.map((c) => (c.id === conversationId ? { ...c, scene: activeScene(scene, new Date(now)) } : c)),
        }));
        appendMessage(
          set,
          get,
          conversationId,
          { id: uid('m'), conversationId, author: 'them', kind: 'system', card: 'scene', text: scene.title, setting: scene.setting, sceneId: scene.id, createdAt: new Date(now).toISOString() },
          { quiet: true },
        );
        // Their first line: the scene's own, else one they write (the server asks `buildSceneOpeningPrompt`).
        appendMessage(
          set,
          get,
          conversationId,
          { id: uid('m'), conversationId, author: 'them', kind: 'text', text: scene.opening?.trim() || mockSceneOpening(scene), createdAt: new Date(now + 1).toISOString() },
          { countUnread: false },
        );
      },

      endScene: (conversationId) => {
        const conversation = get().conversations.find((c) => c.id === conversationId);
        if (!conversation?.scene) return;
        const title = conversation.scene.title;
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            const { scene: _ended, ...rest } = c;
            return rest;
          }),
        }));
        appendMessage(
          set,
          get,
          conversationId,
          { id: uid('m'), conversationId, author: 'them', kind: 'system', card: 'sceneEnd', text: title, createdAt: new Date().toISOString() },
          { quiet: true },
        );
      },

      saveLorebook: (input, id) => {
        const existing = id ? get().lorebooks.find((book) => book.id === id) : undefined;
        // Only a new book counts against the plan: after a plan lapses, what is there stays editable.
        const count = existing ? 0 : get().lorebooks.length;
        const problem = checkLorebook(input, count, perkLimit('lorebooks', get().wallet.subscription, Date.now()))[0];
        if (problem) return { problem };
        const book: Lorebook = {
          id: existing?.id ?? uid('lore'),
          name: input.name.trim().slice(0, LORE_NAME_MAX),
          about: input.about.trim().slice(0, LORE_ABOUT_MAX),
          entries: existing?.entries ?? [],
          characterIds: [...new Set(input.characterIds)],
          userRole: input.userRole?.trim().slice(0, LORE_ROLE_MAX) || undefined,
          createdAt: existing?.createdAt ?? new Date().toISOString(),
        };
        set((s) => ({ lorebooks: existing ? s.lorebooks.map((x) => (x.id === book.id ? book : x)) : [...s.lorebooks, book] }));
        return { id: book.id };
      },

      deleteLorebook: (id) => set((s) => ({ lorebooks: s.lorebooks.filter((book) => book.id !== id) })),

      setLoreLink: (bookId, characterId, linked) =>
        set((s) => ({
          lorebooks: s.lorebooks.map((book) => {
            if (book.id !== bookId) return book;
            const rest = book.characterIds.filter((c) => c !== characterId);
            return { ...book, characterIds: linked ? [...rest, characterId] : rest };
          }),
        })),

      saveLoreEntry: (bookId, input, id) => {
        const book = get().lorebooks.find((b) => b.id === bookId);
        // Only the book's own page opens the editor, so it is there; a stale id saves nothing.
        if (!book) return { problem: 'name' };
        // The editor's one field may hold any spelling; what is kept is clean, as matching reads it.
        const keywords = parseKeywords(input.keywords.join(','));
        const clean = { name: input.name.trim().slice(0, LORE_NAME_MAX), keywords, text: input.text.trim().slice(0, LORE_TEXT_MAX) };
        const existing = id ? book.entries.find((e) => e.id === id) : undefined;
        // As with books, only a new entry counts against the plan.
        const count = existing ? 0 : book.entries.length;
        const problem = checkLoreEntry(clean, count, perkLimit('loreEntries', get().wallet.subscription, Date.now()))[0];
        if (problem) return { problem };
        const entry: LoreEntry = { id: existing?.id ?? uid('entry'), kind: input.kind, ...clean };
        set((s) => ({
          lorebooks: s.lorebooks.map((b) =>
            b.id !== bookId ? b : { ...b, entries: existing ? b.entries.map((e) => (e.id === entry.id ? entry : e)) : [...b.entries, entry] },
          ),
        }));
        return { id: entry.id };
      },

      deleteLoreEntry: (bookId, entryId) =>
        set((s) => ({
          lorebooks: s.lorebooks.map((b) => (b.id === bookId ? { ...b, entries: b.entries.filter((e) => e.id !== entryId) } : b)),
        })),

      startStream: (input) => {
        const s = get();
        const problem = checkStream(input)[0];
        if (problem) return { problem };
        const ids = input.characterIds as [string, string];
        if (ids.some((id) => !s.characters.some((c) => c.id === id) || s.blockedIds.includes(id))) return { problem: 'pair' };
        if (!payStreamRound(set, get)) return 'noShells';
        const stream: Stream = {
          id: uid('stream'),
          characterIds: ids,
          topic: input.topic.trim().slice(0, STREAM_TOPIC_MAX),
          lines: [],
          target: nextTarget(undefined)!,
          createdAt: new Date().toISOString(),
        };
        set((st) => ({ streams: [stream, ...st.streams].slice(0, STREAMS_KEPT) }));
        runStream(set, get, stream.id);
        return { id: stream.id };
      },

      keepStreaming: (id) => {
        const stream = get().streams.find((x) => x.id === id);
        // A round with lines still to come is paid for already: it just goes on.
        if (stream && stream.lines.length < stream.target) {
          get().resumeStream(id);
          return 'ok';
        }
        const target = nextTarget(stream);
        if (!stream || target === null) return 'full';
        if (!payStreamRound(set, get)) return 'noShells';
        set((s) => ({ streams: s.streams.map((x) => (x.id === id ? { ...x, target, stopped: undefined } : x)) }));
        runStream(set, get, id);
        return 'ok';
      },

      pauseStream: (id) => {
        stopStreamRunner(set, id);
        set((s) => ({ streams: s.streams.map((x) => (x.id === id ? { ...x, stopped: true } : x)) }));
      },

      resumeStream: (id) => {
        set((s) => ({ streams: s.streams.map((x) => (x.id === id ? { ...x, stopped: undefined } : x)) }));
        runStream(set, get, id);
      },

      deleteStream: (id) => {
        stopStreamRunner(set, id);
        set((s) => ({ streams: s.streams.filter((x) => x.id !== id) }));
      },

      payForPortrait: (characterId) => {
        const now = Date.now();
        const free = consumePortrait(get().wallet.subscription, now);
        if (free) {
          set((s) => ({ wallet: { ...s.wallet, subscription: free } }));
          return true;
        }
        return get().spendShells(PORTRAIT_SHELLS, 'portrait', characterId);
      },

      setPushLog: (pushLog) => set((s) => ({ daily: { ...s.daily, pushLog } })),

      takeQuickCreate: () => {
        const next = spendQuickCreate(get().quickCreates, todayKey(), quickCreatesPerDay(get().wallet.subscription, Date.now()));
        if (!next) return false;
        set({ quickCreates: next });
        return true;
      },

      addCharacter: (character) => {
        const characterId = uid('c');
        set((s) => ({ characters: [{ ...character, id: characterId }, ...s.characters] }));
        const conversationId = get().addFriend(characterId);
        return { characterId, conversationId };
      },

      receivePushLine: ({ id, characterId, text, at, reach }) => {
        // A push planned by an older build from a crisis "plan" never lands in the chat.
        if (detectCrisis(text)) return;
        const conversation = get().conversations.find((c) => c.characterId === characterId);
        if (!conversation) return;
        const messageId = `m_push_${id}`;
        if (get().messages[conversation.id]?.some((m) => m.id === messageId)) return;
        appendMessage(
          set,
          get,
          conversation.id,
          { id: messageId, conversationId: conversation.id, author: 'them', kind: 'text', text, createdAt: at, ...withIdeas(reach) },
          { countUnread: true },
        );
      },

      updateCharacter: (characterId, patch) =>
        set((s) => ({
          characters: s.characters.map((c) => (c.id === characterId && !c.isOfficial ? { ...c, ...patch } : c)),
        })),

      resetRelationship: (characterId) =>
        set((s) => {
          const existing = s.relationships[characterId];
          if (!existing) return s;
          return {
            relationships: {
              ...s.relationships,
              [characterId]: {
                ...newRelationship(characterId),
                backgroundId: existing.backgroundId,
                nickname: existing.nickname,
              },
            },
            memories: s.memories.filter((m) => m.characterId !== characterId),
            moments: s.moments.filter((m) => m.characterId !== characterId),
            schedules: s.schedules.filter((x) => x.characterId !== characterId),
          };
        }),

      setBackground: (characterId, backgroundId) =>
        updateRelationship(set, characterId, () => ({ backgroundId })),

      setNickname: (characterId, nickname) =>
        updateRelationship(set, characterId, () => ({ nickname: nickname.trim() || undefined })),

      setCharacterPref: (characterId, key, value) =>
        updateRelationship(set, characterId, () =>
          key === 'voiceReplies' ? { voiceReplies: value } : { messagesFirst: value },
        ),

      setReplyPrefs: (characterId, { style, length }) =>
        updateRelationship(set, characterId, () => ({
          ...(style ? { replyStyle: style } : {}),
          ...(length ? { replyLength: length } : {}),
        })),

      addIntimacy: (characterId, amount) => {
        const existing = get().relationships[characterId];
        if (!existing) return;

        const intimacy = existing.intimacy + amount;
        const next = levelForIntimacy(intimacy);
        // Levels tick up quietly; the celebration is for reaching a new stage.
        const levelledUp = next.level > existing.level && tierForLevel(next.level).key !== tierForLevel(existing.level).key;
        // What they hold back opens with the bond (`src/lib/world-story.ts`): their next reply brings it up.
        const arcOpened = beatsCrossed(get().characters.find((c) => c.id === characterId)?.arc, existing.level, next.level);

        set((s) => ({
          relationships: {
            ...s.relationships,
            [characterId]: {
              ...existing,
              intimacy,
              level: next.level,
              levelTitle: next.levelTitle,
              nextLevelAt: next.nextLevelAt,
              arcDue: arcOpened.length ? arcOpened[arcOpened.length - 1].atLevel : existing.arcDue,
            },
          },
          levelUp: levelledUp
            ? { characterId, level: next.level, levelTitle: next.levelTitle }
            : s.levelUp,
        }));

        if (levelledUp) {
          addMoment(set, characterId, 'levelUp', { level: next.level, title: next.levelTitle });
        }
        for (const beat of arcOpened) addMoment(set, characterId, 'arc', { level: beat.atLevel, title: beat.title });

        // A clip this level opens is not just unlocked: the friend sends it, as a voice message in
        // the chat, and Radio marks it New. The server does the same with the real audio file.
        const opened = clipsOpenedBy(localized('radioGifts', radioGifts), characterId, existing.level, next.level);
        const conversation = get().conversations.find((c) => c.characterId === characterId);
        if (opened.length && conversation) {
          for (const gift of opened) {
            appendMessage(set, get, conversation.id, {
              id: uid('m'),
              conversationId: conversation.id,
              author: 'them',
              kind: 'voice',
              durationSec: clipDuration(gift.lines),
              transcript: gift.lines.join(' '),
              createdAt: new Date().toISOString(),
            });
          }
          set((s) => ({ newRadioGifts: [...new Set([...opened.map((g) => g.id), ...s.newRadioGifts])] }));
        }
      },

      setRelationshipLabel: (characterId, label) => {
        if (isFamilyLabel(label)) freeFamilyRole(set, get, label, characterId);
        updateRelationship(set, characterId, (r) => {
          // Family is open from the start (src/lib/kin.ts); the other labels unlock with closeness.
          if (label && !isFamilyLabel(label) && !unlockedLabels(r.level).includes(label)) return {};
          // Family shows as what they are ("Mom") until the user names them ("Onam"); a name the
          // label gave follows the label, and goes when they stop being family.
          const given = !!r.nickname && r.nickname === r.label;
          const nickname = given || !r.nickname ? (isFamilyLabel(label) ? label : given ? undefined : r.nickname) : r.nickname;
          return { label, nickname };
        });
      },

      makeFamily: (characterId, label, name) => {
        const conversationId = get().addFriend(characterId);
        freeFamilyRole(set, get, label, characterId);
        updateRelationship(set, characterId, () => ({ label, nickname: familyName(name, label), messagesFirst: true }));
        const group = kinGroup(label)!;
        const hello = { ...themText(conversationId, familyHello(group, `${conversationId}:${label}`, genderOf(get(), characterId))), ...withIdeas(helloReach(group)) };
        appendMessage(set, get, conversationId, hello, { countUnread: true });
        return conversationId;
      },

      dismissLevelUp: () => set({ levelUp: null }),

      /* ── economy ──────────────────────────────────────────────────────── */

      spendShells: (amount, reason = 'other', characterId) => {
        get().expireFreeShells();
        const { wallet } = get();
        if (wallet.shells < amount) return false;
        const today = todayKey();
        // Today's free shells go first, so bought ones last longer.
        const free =
          wallet.free && wallet.free.day === today
            ? { ...wallet.free, amount: Math.max(0, wallet.free.amount - amount) }
            : wallet.free;
        set((s) => ({
          wallet: { ...s.wallet, shells: s.wallet.shells - amount, free },
          ledger: log(s.ledger, -amount, reason, characterId),
        }));
        // With the wallet on the server the spend shows at once and the server's answer settles it.
        if (serverWalletOn(get)) syncWallet(set, (token) => serverWallet.spend(token, { amount, reason, key: uid('sp'), characterId }));
        return true;
      },

      addShells: (amount, reason = 'purchase') => {
        set((s) => ({
          wallet: {
            ...s.wallet,
            shells: s.wallet.shells + amount,
            // The starter pack is offered only until the first purchase.
            boughtShells: s.wallet.boughtShells || reason === 'purchase',
          },
          ledger: log(s.ledger, amount, reason),
        }));
        // Earnings with no rule on the server yet; a server that takes none puts the balance back.
        // The server pays the welcome gift itself when it makes the account, so that one is only booked here.
        if (serverWalletOn(get) && reason !== 'welcome') {
          syncWallet(set, (token) => serverWallet.grant(token, { amount, reason, key: uid('gr') }));
        }
      },

      expireFreeShells: () => {
        const { wallet } = get();
        const free = wallet.free;
        if (!free || free.day >= todayKey()) return;
        const gone = Math.min(free.amount, wallet.shells);
        // Booked at the midnight they ran out, so the history reads in order.
        const midnight = dateFromKey(free.day);
        midnight.setDate(midnight.getDate() + 1);
        set((s) => ({
          wallet: { ...s.wallet, shells: s.wallet.shells - gone, free: undefined },
          ledger: gone > 0 ? log(s.ledger, -gone, 'expired', undefined, midnight.toISOString()) : s.ledger,
        }));
      },

      claimDailyLogin: () => {
        get().expireFreeShells();
        // A plan's monthly shells arrive with the first open of each period.
        payPlanShells(set, get);
        // An invite code entered on an earlier day pays out on this open.
        get().settleInvite();
        // With the wallet on the server, the server checks in (in the user's time zone) and the
        // shells arrive quietly a moment later, as they do here.
        if (serverWalletOn(get)) {
          void withAccount((token) => serverWallet.checkIn(token)).then((result) => {
            if (!result) return;
            applyServerWallet(set, result.wallet);
            if (result.amount > 0) {
              set((s) => ({ ledger: log(s.ledger, result.amount, 'daily'), daily: { ...s.daily, checkInAmount: result.amount } }));
            }
          });
          return 0;
        }
        const today = todayKey();
        const { daily } = get();
        const { day, claimed } = checkInStatus(daily, today);
        if (claimed) return 0;

        const amount = rollCheckIn(day);
        set((s) => ({
          daily: { ...s.daily, lastLoginDay: today, checkInDay: day, checkInAmount: amount },
          wallet: creditFree(s.wallet, amount, today),
          ledger: log(s.ledger, amount, 'daily'),
          // The owner asked for no check-in popup (2026-10-09): the shells arrive quietly,
          // and History shows them. Setting `dailyReward: { amount, day }` here brings the
          // Today sheet (DailyRewardSheet) back.
        }));
        return amount;
      },

      dismissDailyReward: () => set({ dailyReward: null }),

      redeemInvite: (input) => {
        const { user } = get();
        const code = normalizeInviteCode(input);
        if (!code) return 'invalid';
        if (user.redeemedInvite) return 'used';
        if (code === inviteCodeFor(user)) return 'own';
        // Nothing is paid yet: the shells come when the user is back on a later day
        // (`settleInvite`). The server checks the code exists and credits the friend who sent it.
        set((s) => ({ user: { ...s.user, redeemedInvite: code, invitePending: { code, day: todayKey() } } }));
        return 'ok';
      },

      settleInvite: () => {
        const pending = get().user.invitePending;
        if (!pending || pending.day >= todayKey()) return 0;
        // Back on a later day: the friend is real. Paid like bought shells, so they never burn.
        get().addShells(INVITE_REWARD, 'invite');
        set((s) => ({ user: { ...s.user, invitePending: undefined } }));
        return INVITE_REWARD;
      },

      spinWheel: async () => {
        const today = todayKey();
        const daily = get().daily;
        const used = daily.spinDay === today ? daily.spinsUsed : 0;

        // One free spin a day, and no more: the app shows no ads (owner, 2026-10-22).
        if (used >= FREE_SPINS_PER_DAY) return null;

        // With the wallet on the server, the server draws the segment and pays it.
        if (serverWalletOn(get)) {
          const result = await withAccount((token) => serverWallet.spin(token));
          if (!result) return null;
          applyServerWallet(set, result.wallet);
          if (result.index == null) return null;
          set((s) => ({ ledger: log(s.ledger, result.reward, 'spin') }));
          return { index: result.index, reward: result.reward };
        }

        const index = weightedIndex(WHEEL_WEIGHTS);
        const reward = WHEEL_SEGMENTS[index];

        get().expireFreeShells();
        set((s) => ({
          daily: { ...s.daily, spinDay: today, spinsUsed: used + 1 },
          wallet: creditFree(s.wallet, reward, today),
          ledger: log(s.ledger, reward, 'spin'),
        }));
        return { index, reward };
      },

      rewardShare: async () => {
        const today = todayKey();
        const paid = sharesPaid(get().daily, today);

        // With the wallet on the server, the server keeps the daily cap and pays; the count here
        // only tells the share buttons whether to show "+5".
        if (serverWalletOn(get)) {
          const result = await withAccount((token) => serverWallet.share(token));
          if (!result) return 0;
          applyServerWallet(set, result.wallet);
          set((s) => ({
            daily: { ...s.daily, shareDay: today, sharesPaid: PAID_SHARES_PER_DAY - result.left },
            ledger: result.amount > 0 ? log(s.ledger, result.amount, 'share') : s.ledger,
          }));
          return result.amount;
        }

        if (paid >= PAID_SHARES_PER_DAY) return 0;
        get().expireFreeShells();
        set((s) => ({
          daily: { ...s.daily, shareDay: today, sharesPaid: paid + 1 },
          wallet: creditFree(s.wallet, SHARE_REWARD, today),
          ledger: log(s.ledger, SHARE_REWARD, 'share'),
        }));
        return SHARE_REWARD;
      },

      syncServerWallet: async () => {
        const wallet = await withAccount((token) => serverWallet.state(token));
        if (wallet) applyServerWallet(set, wallet);
      },

      subscribe: (plan, trial = false) => {
        if (trial && get().wallet.trialUsed) return;
        // A new plan (or a switch) starts today with a fresh allowance, as the store would bill it.
        const subscription = startSubscription(plan, Date.now(), trial);
        set((s) => ({ wallet: { ...s.wallet, subscription, trialUsed: s.wallet.trialUsed || trial } }));
        // The call-time history shows what the plan brought (Basic brings none).
        const callSeconds = trial ? TRIAL.callSeconds : PLANS[plan].callSeconds;
        if (callSeconds > 0) logSeconds(set, callSeconds, trial ? 'trial' : 'membership');
        // The first month's shells come right away; the trial brings none.
        payPlanShells(set, get);
      },

      topUpMinutes: (kind) => {
        const { seconds, shells } = TOP_UPS[kind];
        if (!get().spendShells(shells, 'topUp')) return 'noShells';
        const pack = { id: uid('mp'), kind, seconds, used: 0, boughtAt: new Date().toISOString() };
        set((s) => ({ wallet: { ...s.wallet, packs: [...(s.wallet.packs ?? []), pack] } }));
        if (kind === 'call') logSeconds(set, seconds, 'topUp');
        return 'ok';
      },

      endPlan: () => set((s) => ({ wallet: { ...s.wallet, subscription: undefined } })),

      /* ── diary ────────────────────────────────────────────────────────── */

      addDiaryEntry: (entry) => {
        const id = uid('d');
        set((s) => ({ diary: [{ ...entry, id }, ...s.diary] }));

        const characterId = entry.sharedWithCharacterId;
        if (characterId) {
          get().addIntimacy(characterId, INTIMACY.diaryShare);
          // A crisis page is still shared and answered; it just never becomes a memory,
          // and the helpline card waits in their chat.
          const line = diaryMemoryLine(entry.body);
          if (line) get().addMemory(characterId, line, 'diary');
          if (detectCrisis(entry.body)) answerCrisisInChat(set, get, characterId);
          setTimeout(() => answerDiary(set, id), 2200);
        }

        return id;
      },

      deleteDiaryEntry: (id) => set((s) => ({ diary: s.diary.filter((d) => d.id !== id) })),

      markDiaryPageRead: (id) =>
        set((s) => (s.diaryPagesRead.includes(id) ? s : { diaryPagesRead: [...s.diaryPagesRead, id] })),

      markInboxSeen: () => set({ inboxSeenAt: new Date().toISOString() }),

      writeDueDiaryPages: () => {
        const { conversations, messages, moments, characterDiary } = get();
        const fresh = duePages(daysTogether(conversations, messages, moments), characterDiary, (id) => genderOf(get(), id));
        if (fresh.length) set((s) => ({ characterDiary: [...s.characterDiary, ...fresh] }));
      },

      /* ── secret note ──────────────────────────────────────────────────── */

      ensureSecretNote: (characterId) => {
        const latest = latestNote(get().notes, characterId);
        if (!latest || (latest.status === 'exchanged' && latest.date !== todayKey())) {
          get().newSecretNote(characterId);
        }
      },

      newSecretNote: (characterId) => {
        const id = uid('sn');
        const previous = latestNote(get().notes, characterId)?.prompt;
        const pool = localized('secretNotePrompts', secretNotePrompts).filter((p) => p !== previous);

        set((s) => ({
          notes: [
            { id, characterId, date: todayKey(), prompt: pick(pool), myNote: '', status: 'composing' },
            ...s.notes,
          ],
        }));

        // The character writes theirs first; it stays sealed until you exchange.
        setTimeout(() => sealNote(set, id), 2600);
      },

      writeNote: (noteId, text) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === noteId && n.status !== 'exchanged' ? { ...n, myNote: text } : n)),
        })),

      exchangeNote: (noteId) => {
        const note = get().notes.find((n) => n.id === noteId);
        if (!note || note.status !== 'ready' || !note.myNote.trim()) return 'notReady';
        if (!get().spendShells(shellCosts.secretNote, 'note', note.characterId)) return 'noShells';

        set((s) => ({
          notes: s.notes.map((n) => (n.id === noteId ? { ...n, status: 'exchanged' } : n)),
        }));
        get().addIntimacy(note.characterId, INTIMACY.secretNote);
        addMoment(set, note.characterId, 'secretNote');
        return 'ok';
      },

      /* ── calls ────────────────────────────────────────────────────────── */

      ring: (characterId, slot) => {
        // No call minutes (no plan, or this month's are used up): they text instead of
        // ringing a call you could not take.
        if (minutesOf(get().wallet, 'call').total <= 0) return;
        const current = get().incomingCall;
        if (current && Date.now() - current.at < STALE_RING_MS) return;
        set({ incomingCall: { characterId, slot, at: Date.now() } });
      },

      acceptCall: () => {
        const call = get().incomingCall;
        set({ incomingCall: null });
        return call?.characterId ?? null;
      },

      declineCall: () => {
        const call = get().incomingCall;
        set({ incomingCall: null });
        if (!call) return;
        get().addCall({
          characterId: call.characterId,
          startedAt: new Date().toISOString(),
          durationSec: 0,
          direction: 'incoming',
          missed: true,
        });
        // They noticed you did not pick up, and say so.
        const conversationId = get().addFriend(call.characterId);
        setTimeout(() => {
          appendMessage(set, get, conversationId, themText(conversationId, pick(missedCallLines(genderOf(get(), call.characterId)))), { countUnread: true });
        }, 1500);
      },

      /* ── safety ───────────────────────────────────────────────────────── */

      reportMessage: (conversationId, messageId, reason) => {
        const conversation = get().conversations.find((c) => c.id === conversationId);
        const message = (get().messages[conversationId] ?? []).find((m) => m.id === messageId);
        // In a group the report names the member who wrote it.
        const characterId = conversation?.characterId ?? message?.characterId;
        if (!characterId || !message) return;
        // The server takes these with the surrounding chat for review.
        set((s) => ({
          reports: [
            ...s.reports,
            {
              id: uid('rep'),
              conversationId,
              characterId,
              messageId,
              text: message.text,
              reason,
              createdAt: new Date().toISOString(),
            },
          ],
        }));
      },

      blockCharacter: (characterId) =>
        set((s) => {
          const gone = new Set(s.conversations.filter((c) => c.characterId === characterId).map((c) => c.id));
          // They leave every group; a group left with one member ends with its messages.
          const groups = s.groups.flatMap((g) => {
            const rest = withoutMember(g.memberIds, characterId);
            if (!rest) gone.add(g.id);
            return rest ? [{ ...g, memberIds: rest }] : [];
          });
          const { [characterId]: _bond, ...relationships } = s.relationships;
          return {
            blockedIds: s.blockedIds.includes(characterId) ? s.blockedIds : [...s.blockedIds, characterId],
            conversations: s.conversations.filter((c) => !gone.has(c.id)),
            groups,
            messages: Object.fromEntries(Object.entries(s.messages).filter(([id]) => !gone.has(id))),
            relationships,
            memories: s.memories.filter((m) => m.characterId !== characterId),
            moments: s.moments.filter((m) => m.characterId !== characterId),
            schedules: s.schedules.filter((x) => x.characterId !== characterId),
            notes: s.notes.filter((n) => n.characterId !== characterId),
            // A note waiting on its answer would bring them back after the block.
            boardPosts: s.boardPosts.filter((p) => p.characterId !== characterId),
            photos: s.photos.filter((p) => p.characterId !== characterId),
            radioClips: s.radioClips.filter((c) => c.characterId !== characterId),
            dateThemes: s.dateThemes.filter((d) => d.characterId !== characterId),
            activeDate: s.activeDate?.characterId === characterId ? null : s.activeDate,
            settings: s.settings.callerId === characterId ? { ...s.settings, callerId: undefined } : s.settings,
          };
        }),

      unblockCharacter: (characterId) =>
        set((s) => ({ blockedIds: s.blockedIds.filter((id) => id !== characterId) })),

      rememberSearch: (term) => {
        const clean = term.trim();
        if (!clean) return;
        set((s) => ({
          recentSearches: [clean, ...s.recentSearches.filter((t) => t.toLowerCase() !== clean.toLowerCase())].slice(0, RECENT_LIMIT),
        }));
      },
      rememberViewed: (characterId) =>
        set((s) => ({ recentlyViewed: [characterId, ...s.recentlyViewed.filter((id) => id !== characterId)].slice(0, RECENT_LIMIT) })),
      clearRecentSearches: () => set({ recentSearches: [] }),
      setTodayWidgets: (slots) => set({ todayWidgets: slots }),

      /* ── profile ──────────────────────────────────────────────────────── */

      saveAlarm: ({ id, ...fields }) => {
        const existing = id ? get().alarms.find((a) => a.id === id) : undefined;
        if (existing) {
          const armedAt = new Date().toISOString();
          set((s) => ({ alarms: s.alarms.map((a) => (a.id === id ? { ...a, ...fields, enabled: true, armedAt } : a)) }));
          return existing.id;
        }
        const now = new Date().toISOString();
        const alarm: Alarm = { ...fields, id: uid('alarm'), enabled: true, createdAt: now, armedAt: now };
        set((s) => ({ alarms: [...s.alarms, alarm] }));
        return alarm.id;
      },
      deleteAlarm: (id) => set((s) => ({ alarms: s.alarms.filter((a) => a.id !== id) })),
      setAlarmEnabled: (id, enabled) =>
        set((s) => ({
          alarms: s.alarms.map((a) =>
            a.id === id ? { ...a, enabled, armedAt: enabled ? new Date().toISOString() : a.armedAt } : a,
          ),
        })),

      ringAlarm: (alarmId) => {
        const alarm = get().alarms.find((a) => a.id === alarmId);
        if (!alarm) return null;
        const now = new Date();
        const current = get().wake;
        // The same ring seen twice (the clock and a notification tap) stays one session. A ring
        // after the alarm was set again (new time, switched back on) is a new one: ringing sets
        // `armedAt` to `rangAt`, so only a later save moves it past the session.
        if (
          current?.alarmId === alarmId &&
          (!alarm.armedAt || Date.parse(current.rangAt) >= Date.parse(alarm.armedAt)) &&
          now.getTime() - Date.parse(current.rangAt) < WAKE_WINDOW_MIN * 60_000
        ) {
          return current;
        }
        const friend = alarm.characterId ? get().characters.find((c) => c.id === alarm.characterId) : undefined;
        const conversation = friend ? get().conversations.find((c) => c.characterId === friend.id) : undefined;
        // Today's plan with that friend makes the question about it ("Exam at 10 today. Ready?").
        const todayPlan = get().schedules.find(
          (p) => p.date === todayKey() && (!friend || p.characterId === friend.id) && !p.followedUp,
        );
        const question = wakeQuestion(now.getDate() + alarm.minute, todayPlan && { title: todayPlan.title, time: todayPlan.time }, friend?.gender);
        const session: WakeSession = {
          alarmId,
          characterId: friend?.id,
          conversationId: conversation?.id,
          replyToWake: alarm.replyToWake && !!conversation,
          question,
          rangAt: now.toISOString(),
          state: 'ringing',
          snoozes: 0,
        };
        set((s) => ({
          wake: session,
          // A one-time alarm switches itself off once it has rung, as on the iPhone.
          alarms: s.alarms.map((a) =>
            a.id === alarmId ? { ...a, armedAt: now.toISOString(), enabled: a.repeat.length > 0 ? a.enabled : false } : a,
          ),
        }));
        if (conversation && friend) {
          // The recorded wake-up line (free voice lines, backend-plan §13.5): never charged.
          const voice = alarm.voice && friend.voiceReady;
          appendMessage(set, get, conversation.id, {
            id: uid('m'),
            conversationId: conversation.id,
            author: 'them',
            kind: voice ? 'voice' : 'text',
            text: voice ? undefined : question,
            transcript: voice ? question : undefined,
            durationSec: voice ? 4 : undefined,
            createdAt: now.toISOString(),
          });
        }
        return session;
      },

      snoozeWake: () => {
        const wake = get().wake;
        if (!wake || wake.state !== 'ringing' || wake.snoozes >= MAX_SNOOZES) return;
        const alarm = get().alarms.find((a) => a.id === wake.alarmId);
        if (alarm && !alarm.snooze) return;
        set({
          wake: { ...wake, state: 'snoozed', snoozes: wake.snoozes + 1, snoozeUntil: new Date(Date.now() + SNOOZE_MIN * 60_000).toISOString() },
        });
      },

      stopWake: () => set({ wake: null }),

      pickChip: (conversationId, messageId, chip) => {
        set((s) => ({
          messages: {
            ...s.messages,
            [conversationId]: (s.messages[conversationId] ?? []).map((m) => (m.id === messageId ? { ...m, chips: undefined } : m)),
          },
        }));
        get().sendText(conversationId, chip);
      },

      answerIdea: (conversationId, messageId, idea, edited) =>
        answerLine(set, get, conversationId, messageId, edited ?? phrase(idea.text), idea, edited != null),

      answerFromPush: ({ characterId, line, reach, intent, text }) => {
        // The moment's line may not be in the chat yet: the clock writes what is due, else it lands here.
        get().runTimers();
        const conversation = get().conversations.find((c) => c.characterId === characterId);
        if (!conversation) return 'empty';
        const typed = text?.trim();
        if (reach && line) {
          const find = () => get().messages[conversation.id]?.findLast((m) => m.author === 'them' && m.reach === reach && m.text === line);
          const landed = find();
          // Answered already (the same tap seen twice): a typed line is just a message, a button nothing.
          if (landed && !landed.ideas) return typed ? get().sendText(conversation.id, typed) : 'empty';
          if (!landed) appendMessage(set, get, conversation.id, { ...themText(conversation.id, line), ...withIdeas(reach) }, { countUnread: false });
          const message = find();
          const idea = intent ? ideasFor(reach).find((x) => x.intent === intent) : undefined;
          if (message && idea) return answerLine(set, get, conversation.id, message.id, phrase(idea.text), idea);
          if (message && typed) return answerLine(set, get, conversation.id, message.id, typed);
        }
        return typed ? get().sendText(conversation.id, typed) : 'empty';
      },

      devNextTexts: () => {
        const now = new Date();
        const due = new Date(now.getTime() - 60_000).toISOString();
        const may = (characterId: string) => !!get().relationships[characterId]?.messagesFirst;
        let sent = 0;
        let waiting = 0;
        set((s) => ({
          threads: s.threads.map((t) => {
            const next = t.status === 'open' ? [...t.touches].filter((x) => !x.sent).sort((a, b) => Date.parse(a.at) - Date.parse(b.at))[0] : undefined;
            if (!next) return t;
            if (!may(t.characterId)) {
              waiting++;
              return t;
            }
            sent++;
            return { ...t, touches: t.touches.map((x) => (x.id === next.id ? { ...x, at: due } : x)) };
          }),
          care: s.care.map((c) => (!c.done && may(c.characterId) ? (sent++, { ...c, dueAt: due }) : c)),
        }));
        get().runTimers();
        // The next chapter of the closest friend's world, without waiting for the week.
        if (sendWorldNews(set, get, now, true)) sent++;
        return { sent, waiting };
      },

      devMorningBrief: () => {
        const now = new Date();
        const tomorrow = clockOn(new Date(now.getTime() + 86_400_000), get().settings.morningCallTime);
        for (const at of [now, tomorrow]) {
          const slotKey = `${dayKey(at)}:morning`;
          // Tomorrow's morning that is already done stays done; today's may be sent again for testing.
          if (at === tomorrow && get().daily.greetedSlots.includes(slotKey)) continue;
          if (!sendBrief(set, get, at)) continue;
          // That morning's greeting is done, so the real one does not come again.
          set((s) => ({ daily: { ...s.daily, greetedSlots: [...s.daily.greetedSlots, slotKey].slice(-8) } }));
          return true;
        }
        return false;
      },

      devWeekRecap: () => !!sendRecap(set, get, new Date()),

      devDayAsk: () => {
        if (!sendDayAsk(set, get, new Date())) return false;
        // Tonight's question is asked, so the real one does not come again.
        const slotKey = `${todayKey()}:night`;
        set((s) => ({ daily: { ...s.daily, greetedSlots: [...s.daily.greetedSlots, slotKey].slice(-8) } }));
        return true;
      },

      retimeThread: (threadId, happensAt) => {
        const now = new Date();
        const thread = get().threads.find((t) => t.id === threadId && t.status === 'open');
        const at = new Date(happensAt);
        if (!thread || Number.isNaN(at.getTime())) return;
        const pad = (n: number) => String(n).padStart(2, '0');
        const date = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
        const time = `${pad(at.getHours())}:${pad(at.getMinutes())}`;
        // The texts are planned again around the new time (the model on the server, the mock here);
        // a thread the mock cannot plan keeps its texts, shifted with the time.
        const found = mockThread(thread.quote, now, { title: thread.about, date, time, when: '' });
        set((s) => {
          const fresh = found?.happensAt
            ? s.threads.map((t) =>
                t.id === threadId
                  ? {
                      ...t,
                      happensAt: at.toISOString(),
                      touches: [...t.touches.filter((x) => x.sent), ...ruleTouches(found.touches, `${t.id}:u${t.touches.length}`, now, at.toISOString())],
                    }
                  : t,
              )
            : moveThread(s.threads, threadId, at.toISOString(), now);
          return {
            threads: fresh.map((t) => (t.id === threadId ? { ...t, userSet: true } : t)),
            schedules: s.schedules.map((x) => (x.id === thread.scheduleId ? { ...x, date, time, reminded: false, remindAt: undefined } : x)),
          };
        });
      },

      endThread: (threadId, outcome) => {
        const thread = get().threads.find((t) => t.id === threadId && t.status === 'open');
        if (thread) settleThread(set, get, thread, outcome);
      },

      forgetThread: (threadId) => {
        const thread = get().threads.find((t) => t.id === threadId);
        if (!thread) return;
        const plan = thread.scheduleId ? get().schedules.find((x) => x.id === thread.scheduleId) : undefined;
        const line = plan ? planMemoryLine(plan) : undefined;
        set((s) => ({
          threads: s.threads.filter((t) => t.id !== threadId),
          schedules: plan ? s.schedules.filter((x) => x.id !== plan.id) : s.schedules,
          memories: line ? s.memories.filter((m) => !(m.characterId === thread.characterId && m.text === line)) : s.memories,
        }));
      },

      noteNotifyOff: (conversationId) => {
        // Once per chat: a second card says nothing new.
        if (get().messages[conversationId]?.some((m) => m.card === 'notifyOff')) return;
        appendMessage(
          set,
          get,
          conversationId,
          { id: uid('m'), conversationId, author: 'them', kind: 'system', card: 'notifyOff', createdAt: new Date().toISOString() },
          { quiet: true },
        );
      },

      wakeTick: () => {
        const now = new Date();
        const t = now.getTime();
        const { alarms, wake } = get();
        const busy = wake && wake.state !== 'awake';
        if (!busy) {
          const due = alarms.find((a) => a.enabled && dueRing(a, now));
          if (due) {
            get().ringAlarm(due.id);
            return 'ring';
          }
        }
        if (!wake) return null;
        if (wake.state === 'snoozed' && wake.snoozeUntil && Date.parse(wake.snoozeUntil) <= t) {
          set({ wake: { ...wake, state: 'ringing', snoozeUntil: undefined } });
          return 'ring';
        }
        if (wake.checkInAt && Date.parse(wake.checkInAt) <= t && wake.conversationId) {
          appendMessage(set, get, wake.conversationId, themText(wake.conversationId, CHAIN_LINES.checkIn(genderOf(get(), wake.characterId))));
          set((s) => ({ wake: s.wake ? { ...s.wake, checkInAt: undefined } : null }));
          return null;
        }
        // A finished morning ends when its window closes; a ring nobody answered gives up after two.
        const since = Date.parse(wake.awakeAt ?? wake.rangAt);
        const window = WAKE_WINDOW_MIN * 60_000;
        if ((wake.state === 'awake' && !wake.checkInAt && t - since > window) || (wake.state === 'ringing' && t - since > window * 2)) {
          set({ wake: null });
        }
        return null;
      },

      updateProfile: (patch) => set((s) => ({ user: { ...s.user, ...patch } })),

      deleteAccount: () => {
        // Replies and timers still in flight must not write into the fresh state.
        replyingUntil.clear();
        streamEpoch.clear();
        // The server's copy is deleted first (`deleteServerAccount`); here the device starts over,
        // its message database included.
        void resetMessages();
        resetMemorySync();
        useAppStore.setState({ ...useAppStore.getInitialState(), hydrated: true }, true);
      },

      loadDemoData: () => {
        const demo = demoHistory();
        set((s) => ({
          ...demo,
          // Whatever the user already has stays; the sample fills in around it.
          conversations: [...s.conversations, ...demo.conversations.filter((c) => !s.conversations.some((x) => x.characterId === c.characterId))],
          messages: { ...demo.messages, ...s.messages },
          relationships: { ...demo.relationships, ...s.relationships },
          // Loading the sample again adds nothing twice (a repeat once showed every moment four times).
          memories: withoutCrisisMemories(uniqueById([...s.memories, ...demo.memories])),
          diary: uniqueById([...s.diary, ...demo.diary]),
          characterDiary: uniqueById([...s.characterDiary, ...demo.characterDiary]),
          notes: uniqueById([...s.notes, ...demo.notes]),
          calls: uniqueById([...s.calls, ...demo.calls]),
          moments: uniqueById([...s.moments, ...demo.moments]),
          schedules: uniqueById([...s.schedules, ...demo.schedules]),
        }));
      },

      addCall: (record) => {
        set((s) => ({ calls: [{ ...record, id: uid('call') }, ...s.calls] }));

        // The call also lands in the chat, like a phone's call log line.
        const conversationId = get().addFriend(record.characterId);
        appendMessage(
          set,
          get,
          conversationId,
          {
            id: uid('m'),
            conversationId,
            author: record.direction === 'incoming' ? 'them' : 'me',
            kind: 'call',
            durationSec: record.durationSec,
            missed: record.missed,
            createdAt: record.startedAt,
          },
          { countUnread: record.missed },
        );

        if (record.missed) return;
        // Minutes go second by second: the plan's first, then bought ones. The call
        // screen stops at zero, so a call never takes more than there was.
        const { wallet } = get();
        const used = consumeMinutes(wallet.subscription, wallet.packs, 'call', record.durationSec, Date.now());
        set((s) => ({ wallet: { ...s.wallet, subscription: used.subscription, packs: used.packs } }));
        if (used.taken > 0) logSeconds(set, -used.taken, 'call', record.characterId);
        const minutes = Math.max(1, Math.round(record.durationSec / 60));
        get().addIntimacy(record.characterId, minutes * INTIMACY.callPerMinute);
        if (record.durationSec >= 60) {
          addMoment(set, record.characterId, 'call', { duration: clock(record.durationSec) });
        }
      },

      /* ── modules ──────────────────────────────────────────────────────── */

      beginDate: (characterId, placeId) => {
        const place = datePlaceById(placeId);
        const bond = get().relationships[characterId];
        if (!place || !bond || bond.level < place.levelRequired) return 'locked';
        if (!get().spendShells(place.cost, 'date', characterId)) return 'noShells';
        set({ activeDate: { characterId, placeId } });
        return 'ok';
      },

      leaveDate: () => set({ activeDate: null }),

      saveDateTheme: (input, id) => {
        const problem = checkTheme(input);
        if (problem) return { status: problem };
        const fields = {
          title: cleanTitle(input.title),
          scene: cleanScene(input.scene),
          art: input.art,
          rounds: input.rounds,
          mood: input.mood,
          characterId: input.characterId || undefined,
        };
        const existing = id ? get().dateThemes.find((d) => d.id === id) : undefined;
        if (existing) {
          set((s) => ({ dateThemes: s.dateThemes.map((d) => (d.id === id ? { ...d, ...fields } : d)) }));
          return { status: 'saved', id: existing.id };
        }
        const theme: DateTheme = { id: uid('dt'), createdAt: new Date().toISOString(), ...fields };
        set((s) => ({ dateThemes: [theme, ...s.dateThemes] }));
        return { status: 'saved', id: theme.id };
      },

      deleteDateTheme: (id) => set((s) => ({ dateThemes: s.dateThemes.filter((d) => d.id !== id) })),

      beginThemeDate: (characterId, themeId) => {
        const theme = get().dateThemes.find((d) => d.id === themeId);
        const bond = get().relationships[characterId];
        if (!theme || !bond || (theme.characterId && theme.characterId !== characterId)) return 'locked';
        if (!moodOpen(theme.mood, bond.level)) return 'locked';
        if (!get().spendShells(themeCost(theme.rounds), 'date', characterId)) return 'noShells';
        // The mock builds the rounds from canned pools; the server's model writes them from the scene.
        // The friend's world colours the date (src/mock/worlds.ts); the server writes it from the persona.
        const character = get().characters.find((c) => c.id === characterId);
        const worlds = localized('worlds', WORLDS);
        const world = character ? worlds.find((w) => w.series === character.series) : undefined;
        // While one of the world's events is on, the date starts in it.
        const event = world ? eventOn(world.story, new Date()) : undefined;
        const rounds = buildThemeRounds(theme, localized('dateThemes', themePools), `${theme.id}:${Date.now()}`, world?.dateRounds, event?.round);
        set({ activeDate: { characterId, placeId: theme.id, theme: { title: theme.title, rounds } } });
        return 'ok';
      },

      finishDate: (characterId, placeId, hearts, title) => {
        const active = get().activeDate;
        const place = datePlaceById(placeId) ?? active?.theme;
        if (!place || active?.characterId !== characterId || active.placeId !== placeId) return null;
        set({ activeDate: null });
        const max = maxHearts(place);
        const record: DateRecord = {
          id: uid('date'),
          characterId,
          placeId,
          title,
          hearts,
          maxHearts: max,
          ending: dateEnding(hearts, max),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ dates: [record, ...s.dates] }));
        // Showing up is worth the base; every heart won on the way adds to it.
        get().addIntimacy(characterId, INTIMACY.date + hearts);
        // The 'dating' moment is what tomorrow's diary page is written from.
        addMoment(set, characterId, 'dating', { title });
        const conversationId = get().addFriend(characterId);
        appendMessage(set, get, conversationId, themText(conversationId, afterDateLine(title, record.ending, genderOf(get(), characterId))), {
          countUnread: true,
        });
        return record;
      },

      takePhoto: (characterId, style, frame) => {
        // Pictures come only from Pro's (or the trial's) allowance; shells never buy one
        // (backend-plan §15.10).
        const now = Date.now();
        if (!photoQuota(get().wallet.subscription, now)) return 'locked';
        const fromPlan = consumePhoto(get().wallet.subscription, now);
        if (!fromPlan) return 'usedUp';
        const photo: BoothPhoto = {
          id: uid('ph'),
          characterId,
          style,
          createdAt: new Date(now).toISOString(),
          seed: Math.floor(Math.random() * 1000),
          ...(frame ? { frame } : {}),
        };
        set((s) => ({ wallet: { ...s.wallet, subscription: fromPlan }, photos: [photo, ...s.photos] }));
        get().addIntimacy(characterId, INTIMACY.photo);
        addMoment(set, characterId, 'photo', undefined, photo.id);
        return photo;
      },

      sendPhoto: (photoId) => {
        const photo = get().photos.find((p) => p.id === photoId);
        if (!photo || photo.sentAt) return false;
        const conversationId = get().addFriend(photo.characterId);
        const sentAt = new Date().toISOString();
        set((s) => ({ photos: s.photos.map((p) => (p.id === photoId ? { ...p, sentAt } : p)) }));
        appendMessage(set, get, conversationId, {
          id: uid('m'),
          conversationId,
          author: 'me',
          kind: 'image',
          photoId,
          createdAt: sentAt,
        });
        // Their answer is free, like the quiz's: the picture was already paid for by the plan.
        scheduleReply(set, get, conversationId, { text: photoReply(photo.style, genderOf(get(), photo.characterId)), gain: INTIMACY.text });
        return true;
      },

      /* ── memories, schedules ──────────────────────────────────────────── */

      // Every memory goes through the guard: crisis text is never kept (src/ai/memory-guard.ts).
      addMemory: (characterId, text, source = 'manual', about) =>
        set((s) => ({
          memories: withMemory(s.memories, {
            id: uid('mem'),
            characterId,
            text,
            source,
            createdAt: new Date().toISOString(),
            about,
          }),
        })),

      pinMessage: (conversationId, messageId) => {
        const conversation = get().conversations.find((c) => c.id === conversationId);
        const message = get().messages[conversationId]?.find((m) => m.id === messageId);
        if (!conversation || message?.kind !== 'text' || !message.text) return false;
        if (get().memories.some((m) => m.quote?.messageId === messageId)) return true;
        const before = get().memories;
        // A pinned line stays open on every plan, as pinned memories do; the guard keeps crisis text out.
        set((s) => ({
          memories: withMemory(s.memories, {
            id: uid('mem'),
            characterId: conversation.characterId,
            text: message.text ?? '',
            source: 'chat',
            createdAt: new Date().toISOString(),
            about: 'story',
            pinned: true,
            quote: { messageId, author: message.author === 'me' ? 'me' : 'them' },
          }),
        }));
        return get().memories !== before;
      },

      unpinMessage: (messageId) =>
        set((s) => ({ memories: s.memories.filter((m) => m.quote?.messageId !== messageId) })),

      toggleMemoryPin: (id) =>
        set((s) => ({
          memories: s.memories.map((m) => (m.id === id ? { ...m, pinned: !m.pinned } : m)),
        })),

      deleteMemory: (id) => set((s) => ({ memories: s.memories.filter((m) => m.id !== id) })),
      editMemory: (id, text) => {
        // The same guard as adding: a crisis line never becomes a lasting fact.
        const clean = rememberableText(text);
        if (!clean) return false;
        set((s) => ({ memories: s.memories.map((m) => (m.id === id ? { ...m, text: clean } : m)) }));
        return true;
      },

      removeSchedule: (id) => set((s) => ({ schedules: s.schedules.filter((x) => x.id !== id) })),

      addSchedule: ({ characterId, title, date, time, whenLabel }) => {
        const clean = title.trim();
        if (!clean) return;
        // Crisis text is never kept as a plan; help goes to their chat instead.
        if (detectCrisis(clean)) {
          answerCrisisInChat(set, get, characterId);
          return;
        }
        set((s) => ({
          schedules: [
            ...s.schedules,
            {
              id: uid('sch'),
              characterId,
              title: clean,
              date,
              time,
              createdAt: new Date().toISOString(),
              reminded: false,
              source: 'manual',
            },
          ],
        }));
        addMoment(set, characterId, 'plan', { title: clean });
        const conversationId = get().addFriend(characterId);
        appendMessage(set, get, conversationId, themText(conversationId, planAddedLine(clean, whenLabel, genderOf(get(), characterId))), {
          countUnread: true,
        });
      },

      runTimers: () => {
        const now = new Date();
        const exists = (id: string) => get().characters.some((c) => c.id === id);

        const steps = get()
          .schedules.map((item) => ({ item, step: planStep(item, now) }))
          .filter((x) => x.step);
        steps.forEach(({ item, step }) => {
          if ((step !== 'remind' && step !== 'followUp') || !exists(item.characterId)) return;
          const conversationId = get().addFriend(item.characterId);
          const line =
            step === 'remind'
              ? scheduleReminder(item.title, !!item.time, `${item.id}:remind`, genderOf(get(), item.characterId))
              : planFollowUp(item.title, `${item.id}:followUp`, genderOf(get(), item.characterId));
          appendMessage(set, get, conversationId, themText(conversationId, line), { countUnread: true });
        });
        if (steps.length) {
          const byId = new Map(steps.map((x) => [x.item.id, x.step]));
          set((s) => ({
            schedules: s.schedules.map((x) => {
              const step = byId.get(x.id);
              if (step === 'remind' || step === 'skipRemind') return { ...x, reminded: true };
              if (step === 'followUp' || step === 'skipFollowUp') return { ...x, followedUp: true };
              return x;
            }),
          }));
        }

        // Family's day (src/lib/kin.ts): lunch, the evening, Sunday… written into their chat as the push said it.
        const today = dayKey(now);
        const lifeSent = new Set(get().daily.lifeSent ?? []);
        const freshLife: string[] = [];
        for (const [characterId, bond] of Object.entries(get().relationships)) {
          const group = kinGroup(bond.label);
          if (!group || !bond.messagesFirst || !exists(characterId) || get().blockedIds.includes(characterId)) continue;
          if (!get().conversations.some((c) => c.characterId === characterId)) continue;
          for (const moment of lifeMoments(group, now)) {
            const key = lifeKey(today, characterId, moment.key);
            const at = lifeAt(now, moment).getTime();
            if (lifeSent.has(key) || now.getTime() < at || now.getTime() - at > LIFE_WINDOW_MS) continue;
            const conversationId = get().addFriend(characterId);
            const line = { ...themText(conversationId, lifeLine(group, moment.key, key, genderOf(get(), characterId))), ...withIdeas(lifeReach(group, moment.key)) };
            appendMessage(set, get, conversationId, line, { countUnread: true });
            freshLife.push(key);
          }
        }
        if (freshLife.length) {
          set((s) => ({ daily: { ...s.daily, lifeSent: [...(s.daily.lifeSent ?? []).filter((k) => k.startsWith(today)), ...freshLife] } }));
        }

        // Thread texts whose moment came (`src/lib/threads.ts`): written by friends who may write
        // first, in their temper; a moment long gone or a settled thread is dropped.
        const touchesDue = dueTouches(get().threads, now);
        touchesDue.forEach(({ thread, touch, step }) => {
          const bond = get().relationships[thread.characterId];
          const character = get().characters.find((c) => c.id === thread.characterId);
          if (step !== 'send' || !bond?.messagesFirst || !character || get().blockedIds.includes(thread.characterId)) return;
          if (!get().conversations.some((c) => c.characterId === thread.characterId)) return;
          const conversationId = get().addFriend(thread.characterId);
          const line = mockTouchLine(thread, touch, temperOf(character, bond.label), touch.id, character.gender);
          const recent = get().messages[conversationId] ?? [];
          const request: FirstTextRequest = {
            kind: 'thread',
            input: { character, user: get().user, relationship: bond, thread, touch, recent, now: now.toISOString(), utcOffsetMin: -now.getTimezoneOffset() },
          };
          // A thread the chat already settled gets no text.
          writeFirst(set, get, conversationId, line, threadReach(touch.phase, thread.id), request, 'nothing');
        });
        if (touchesDue.length) set((s) => ({ threads: markTouches(s.threads, new Set(touchesDue.map((x) => x.touch.id))) }));

        // Care check-ins whose moment came: the friend asks, in the chat (the push said the same line).
        const careSteps = get()
          .care.map((item) => ({ item, step: careStep(item, now) }))
          .filter((x) => x.step);
        careSteps.forEach(({ item, step }) => {
          if (step !== 'ask' || !exists(item.characterId) || get().blockedIds.includes(item.characterId)) return;
          const conversationId = get().addFriend(item.characterId);
          const line = { ...themText(conversationId, careLine(item.kind, `${item.id}:care`, genderOf(get(), item.characterId))), ...withIdeas(careReach(item.kind, item.again)) };
          appendMessage(set, get, conversationId, line, { countUnread: true });
        });
        if (careSteps.length) {
          const doneIds = new Set(careSteps.map((x) => x.item.id));
          set((s) => ({ care: s.care.map((x) => (doneIds.has(x.id) ? { ...x, done: true } : x)) }));
        }

        const answered = get().boardPosts.filter((p) => !p.replied && new Date(p.replyAt).getTime() <= now.getTime());
        answered.forEach((post) => {
          if (!exists(post.characterId) || get().blockedIds.includes(post.characterId)) return;
          // A crisis note (left by an older build) is answered with care, never quoted.
          if (detectCrisis(post.text)) {
            answerCrisisInChat(set, get, post.characterId);
            return;
          }
          const conversationId = get().addFriend(post.characterId);
          const line = post.reply ?? boardReply(post.text, genderOf(get(), post.characterId));
          appendMessage(set, get, conversationId, themText(conversationId, line), { countUnread: true });
        });
        if (answered.length) {
          const ids = new Set(answered.map((p) => p.id));
          set((s) => ({ boardPosts: s.boardPosts.map((p) => (ids.has(p.id) ? { ...p, replied: true } : p)) }));
        }
      },

      // The quiz id (a pack, a friend's weekly quiz or the user's own) is for the server; the score is what stays.
      finishQuiz: (characterId, _quizId, matches, total, title) => {
        if (total < 1) return;
        const conversationId = get().addFriend(characterId);
        appendMessage(set, get, conversationId, {
          id: uid('m'),
          conversationId,
          author: 'me',
          kind: 'system',
          text: `\u{1F49E} ${title} \u00B7 ${matches}/${total}`,
          createdAt: new Date().toISOString(),
        });
        addMoment(set, characterId, 'quiz', { title, score: `${matches}/${total}` });
        scheduleReply(set, get, conversationId, {
          text: quizReply(matches, total),
          gain: INTIMACY.quizMatch * matches + INTIMACY.quizMatch,
        });
      },

      saveQuiz: (draft, id) => {
        const problem = checkQuiz(draft);
        if (problem) return { status: problem };
        const clean = cleanQuiz(draft);
        const existing = id ? get().userQuizzes.find((q) => q.id === id) : undefined;
        if (existing) {
          set((s) => ({ userQuizzes: s.userQuizzes.map((q) => (q.id === id ? { ...q, ...clean } : q)) }));
          return { status: 'saved', id: existing.id };
        }
        const quiz: UserQuiz = { id: uid('uq'), createdAt: new Date().toISOString(), ...clean };
        set((s) => ({ userQuizzes: [quiz, ...s.userQuizzes] }));
        return { status: 'saved', id: quiz.id };
      },

      deleteQuiz: (id) => set((s) => ({ userQuizzes: s.userQuizzes.filter((q) => q.id !== id) })),

      finishWorldQuiz: (world, hostId, score, total) => {
        const worlds = localized('worlds', WORLDS);
        const info = worlds.find((w) => w.key === world);
        if (!info) return false;
        const won = wonWorldQuiz(score);
        const already = get().wonFrames.includes(world);
        if (won && !already) set((s) => ({ wonFrames: [...s.wonFrames, world] }));
        // The host texts about it, in their world's voice (the server writes it from the persona).
        const conversationId = get().conversations.find((c) => c.characterId === hostId)?.id;
        if (conversationId) {
          const text = won
            ? `${score}/${total}. You know ${info.series} better than half the people who live here. The frame is yours.`
            : `${score}/${total}. Not bad for a visitor. Come back and try again, I will be here.`;
          appendMessage(set, get, conversationId, themText(conversationId, text), { countUnread: true });
        }
        if (won) get().addIntimacy(hostId, INTIMACY.quizMatch * 2);
        return won && !already;
      },

      saveFrame: (input, id) => {
        const fields = {
          name: input.name.trim().slice(0, 24) || 'My frame',
          color: input.color,
          pattern: input.pattern,
          stickers: input.stickers.slice(0, 2),
          caption: input.caption.trim().slice(0, 24),
        };
        if (id && get().frames.some((f) => f.id === id)) {
          set((s) => ({ frames: s.frames.map((f) => (f.id === id ? { ...f, ...fields } : f)) }));
          return id;
        }
        const frame: UserFrame = { id: uid('fr'), createdAt: new Date().toISOString(), ...fields };
        set((s) => ({ frames: [frame, ...s.frames] }));
        return frame.id;
      },

      deleteFrame: (id) => set((s) => ({ frames: s.frames.filter((f) => f.id !== id) })),

      playTruthOrDare: (characterId, target, kind) => {
        const conversationId = get().addFriend(characterId);
        if (target === 'you') {
          const ask = pick(kind === 'truth' ? localized('truthsForYou', TRUTHS_FOR_YOU) : localized('daresForYou', DARES_FOR_YOU));
          scheduleReply(set, get, conversationId, { lines: [ask], gain: 0, cue: gameAskCue(kind) });
          return ask;
        }
        const turn = pick(kind === 'truth' ? localized('truthsForThem', TRUTHS_FOR_THEM) : localized('daresForThem', DARES_FOR_THEM));
        appendMessage(set, get, conversationId, {
          id: uid('m'),
          conversationId,
          author: 'me',
          kind: 'text',
          text: turn.ask,
          createdAt: new Date().toISOString(),
        });
        scheduleReply(set, get, conversationId, { lines: [turn.answer], gain: INTIMACY.truthOrDare, cue: gameAnswerCue() });
        return turn.ask;
      },

      postBoardNote: (characterId, text, style) => {
        const clean = text.trim();
        if (!clean) return 'empty';
        if (!get().spendShells(shellCosts.boardNote, 'board', characterId)) return 'noShells';
        const createdAt = new Date();
        // A crisis note is answered in their chat right away and never quoted back.
        const crisis = detectCrisis(clean);
        set((s) => ({
          boardPosts: [
            ...s.boardPosts,
            {
              id: uid('bp'),
              characterId,
              text: clean,
              style,
              createdAt: createdAt.toISOString(),
              reply: crisis ? undefined : boardReply(clean, genderOf(get(), characterId)),
              replyAt: new Date(createdAt.getTime() + BOARD_REPLY_MS).toISOString(),
              replied: crisis,
            },
          ],
        }));
        if (crisis) answerCrisisInChat(set, get, characterId);
        get().addIntimacy(characterId, INTIMACY.boardNote);
        addMoment(set, characterId, 'board');
        setTimeout(() => useAppStore.getState().runTimers(), BOARD_REPLY_MS + 50);
        return 'ok';
      },

      /* ── character initiative ─────────────────────────────────────────── */

      runDailyInitiative: () => {
        const now = new Date();
        const hour = now.getHours();
        const today = todayKey();
        const { settings, daily, relationships, characters, incomingCall } = get();
        const slot: CallSlot | null = inWindow(hour, settings.morningCallTime)
          ? 'morning'
          : inWindow(hour, settings.nightCallTime)
            ? 'night'
            : null;

        // A ring nobody answered (screen closed, app backgrounded) ends up as a missed call.
        if (incomingCall && Date.now() - incomingCall.at > STALE_RING_MS) get().declineCall();

        const bonds = Object.values(relationships)
          .filter((r) => r.messagesFirst && characters.some((c) => c.id === r.characterId))
          .sort((a, b) => b.intimacy - a.intimacy);

        // 1. Plan reminders, "how did it go?" and board answers that came due.
        get().runTimers();

        // Birthday: the closest bonds text first thing, once a year.
        const { user } = get();
        if (isBirthday(user, now) && user.birthdayWishedYear !== now.getFullYear() && hour >= 7) {
          bonds.slice(0, 3).forEach((bond) => {
            const conversationId = get().addFriend(bond.characterId);
            // Seeded like the 07:00 push (src/notifications/plan.ts), so both say the same line.
            const wish = pickSeeded(birthdayLines, `${now.getFullYear()}:${bond.characterId}`)(user.displayName, genderOf(get(), bond.characterId));
            appendMessage(set, get, conversationId, themText(conversationId, wish), {
              countUnread: true,
            });
          });
          set((s) => ({ user: { ...s.user, birthdayWishedYear: now.getFullYear() } }));
        }

        // Sunday evening: the friend of the most days looks back on the week (B7, once a week).
        const recapTime = recapAt(now);
        if (settings.weeklyRecap && recapTime && now >= recapTime) sendRecap(set, get, now);

        // Late afternoon: a new chapter or an event in a world, from the closest friend there.
        if (hour >= WORLD_NEWS_HOUR) sendWorldNews(set, get, now);

        if (!slot) return {};
        const slotKey = `${today}:${slot}`;

        // 2. "Say Hi & Goodnight" — the top two bonds text first.
        const greet = slot === 'morning' ? settings.morningGreeting : settings.eveningGreeting;
        if (greet && !daily.greetedSlots.includes(slotKey)) {
          // On a day with something on, the closest friend who holds it sends the morning brief
          // instead (B5, `src/lib/brief.ts`), timed and worded like its push, and its luck text is said.
          const briefFrom = slot === 'morning' ? sendBrief(set, get, clockOn(now, settings.morningCallTime)) : null;
          // The evening's "how was today?" (B6): one friend asks instead of their good night.
          const asker = slot === 'night' ? sendDayAsk(set, get, clockOn(now, settings.nightCallTime)) : null;
          bonds.slice(0, 2).forEach((bond) => {
            if (bond.characterId === briefFrom || bond.characterId === asker) return;
            const conversationId = get().addFriend(bond.characterId);
            // Seeded like the scheduled push for this slot, so the notification and the chat agree.
            const greetings = slot === 'morning' ? morningGreetings : eveningGreetings;
            const line = pickSeeded(greetings(genderOf(get(), bond.characterId)), `${slotKey}:${bond.characterId}`);
            appendMessage(set, get, conversationId, themText(conversationId, line), { countUnread: true });
          });
          set((s) => ({ daily: { ...s.daily, greetedSlots: [...s.daily.greetedSlots, slotKey].slice(-8) } }));
        }

        // 3. Good-morning / good-night call from the closest bond with a voice.
        const call = slot === 'morning' ? settings.morningCall : settings.nightCall;
        if (!call || get().daily.calledSlots.includes(slotKey)) return {};

        // The friend picked in Daily calls rings; otherwise the closest one with a voice.
        const hasVoice = (id: string) => !!characters.find((c) => c.id === id)?.voiceReady;
        const chosen = settings.callerId && relationships[settings.callerId] && hasVoice(settings.callerId);
        const caller = chosen ? { characterId: settings.callerId! } : bonds.find((b) => hasVoice(b.characterId));
        if (!caller) return {};

        set((s) => ({ daily: { ...s.daily, calledSlots: [...s.daily.calledSlots, slotKey].slice(-8) } }));

        // Free users are never rung: the same friend leaves a voice note from the free voice
        // lines instead (backend-plan §13.5). Its words differ from that friend's text greeting.
        if (!canRing(get().wallet.subscription, now.getTime())) {
          const lines = (slot === 'morning' ? morningGreetings : eveningGreetings)(genderOf(get(), caller.characterId));
          const greeting = pickSeeded(lines, `${slotKey}:${caller.characterId}`);
          const said = pickSeeded(lines.filter((l) => l !== greeting), `voiceNote:${slotKey}:${caller.characterId}`);
          const conversationId = get().addFriend(caller.characterId);
          appendMessage(
            set,
            get,
            conversationId,
            {
              id: uid('m'),
              conversationId,
              author: 'them',
              kind: 'voice',
              durationSec: Math.min(12, 3 + Math.round(said.length / 18)),
              transcript: said,
              createdAt: new Date().toISOString(),
            },
            { countUnread: true },
          );
          appendMessage(set, get, conversationId, themText(conversationId, said), { countUnread: true });
          return {};
        }

        return { callFrom: caller.characterId, slot };
      },

      setSetting: (key, value) => set((s) => ({ settings: { ...s.settings, [key]: value } })),
    }),
    {
      name: STORE_KEY,
      version: 13,
      migrate: (persisted, version) => {
        let state = persisted as PersistedState & { wallet?: LegacyWallet };
        // v2: the currency became shells (was acorns) — carry the balance over.
        if (version < 2 && state.wallet && state.wallet.acorns != null) {
          const { acorns, ...wallet } = state.wallet;
          state.wallet = { ...wallet, shells: acorns };
        }
        // v3: the licensed seed cast was replaced by Rafti's originals.
        if (version < 3) state = recastSeed(state);
        // v4: first-launch flow. Anyone who already has data has been through the app.
        // v5: closeness runs 0-100 in five stages; levels are recomputed from intimacy.
        if (version < 5 && state.relationships) {
          state.relationships = Object.fromEntries(
            Object.entries(state.relationships).map(([id, r]) => {
              const { level, levelTitle, nextLevelAt } = levelForIntimacy(r.intimacy);
              return [id, { ...r, level, levelTitle, nextLevelAt }];
            }),
          );
        }
        // v6 gave live calls their own time balance; v7 replaced it, and Membership, with
        // plans that carry monthly call and voice-reply minutes (backend-plan §13). A
        // membership still running carries on as the same plan from today.
        if (version < 7 && state.wallet) {
          const { isMember, memberPlan, memberUntil, callSeconds: _callSeconds, ...wallet } = state.wallet;
          const running = !!isMember && !!memberUntil && Date.parse(memberUntil) > Date.now();
          state.wallet = running
            ? { ...wallet, subscription: startSubscription(memberPlan ?? 'basic', Date.now()) }
            : wallet;
        }
        if (version < 4 && state.user) state.user = { ...state.user, onboardedAt: state.user.onboardedAt ?? new Date().toISOString() };
        // v8: the credit model drops Basic quarterly and Basic yearly; they carry on as Basic.
        const oldPlan = state.wallet?.subscription?.plan as string | undefined;
        if (version < 8 && state.wallet?.subscription && (oldPlan === 'quarterly' || oldPlan === 'annual')) {
          state.wallet = { ...state.wallet, subscription: { ...state.wallet.subscription, plan: 'basic' } };
        }
        // v9: the iOS look makes plain white the default chat ground; the old default goes with it.
        if (version < 9 && state.relationships) {
          state.relationships = Object.fromEntries(
            Object.entries(state.relationships).map(([id, r]) => [
              id,
              r.backgroundId === 'bg_blossom' ? { ...r, backgroundId: 'bg_plain' } : r,
            ]),
          );
        }
        // v10: Memories split into Story, Them and You. Sample memories saved before take their
        // kind and tab from the seed, and the samples about them are added.
        if (version < 10 && state.memories) {
          const seeds = new Map(seedMemories.map((m) => [m.id, m]));
          const saved = new Set(state.memories.map((m) => m.id));
          state.memories = [
            ...state.memories.map((m) => {
              const seed = seeds.get(m.id);
              return seed ? { ...m, type: m.type ?? seed.type, about: m.about ?? seed.about } : m;
            }),
            ...seedMemories.filter((m) => m.about === 'them' && !saved.has(m.id)),
          ];
        }
        // v11: their texts read like texts (owner, 2026-10-26): the words show on the lock screen.
        if (version < 11 && state.settings) state.settings = { ...state.settings, notificationPreview: true };
        // v12: a calm chat (owner, 2026-10-27): new lines no longer slide in unless turned back on.
        if (version < 12 && state.settings) state.settings = { ...state.settings, chatAnimation: false };
        // v13: sample level-up moments end at the seeded level, under its tier title.
        if (version < 13 && state.moments) {
          const seeds = new Map(seedMoments.filter((m) => m.kind === 'levelUp').map((m) => [m.id, m]));
          const saved = new Set(state.moments.map((m) => m.id));
          state.moments = [
            ...state.moments.map((m) => seeds.get(m.id) ?? m),
            ...[...seeds.values()].filter((m) => !saved.has(m.id)),
          ];
        }
        return state as AppState;
      },
      storage: createJSONStorage(() => (typeof window === 'undefined' ? noopStorage : rebrandStorage)),
      // The official cast always comes from code (later: the server), so edits to a
      // seed character reach devices that saved an older copy. User creations are kept.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as PersistedState;
        const seedIds = new Set(seedCharacters.map((c) => c.id));
        return {
          ...current,
          ...saved,
          // A field added after the save (e.g. a new setting) would otherwise be
          // missing on devices that already have data, so defaults fill the gaps.
          user: { ...current.user, ...saved.user },
          wallet: { ...current.wallet, ...saved.wallet },
          daily: { ...current.daily, ...saved.daily },
          settings: { ...current.settings, ...saved.settings },
          characters: [...seedCharacters, ...(saved.characters ?? []).filter((c) => !seedIds.has(c.id))],
          // Crisis text saved as a memory before the guard existed is dropped on load.
          // Repeats left by an older sample loader are dropped too (`uniqueById`).
          memories: withoutCrisisMemories(uniqueById(saved.memories ?? current.memories)),
          // So are crisis "plans" from older builds: no reminder, follow-up or Us line.
          schedules: withoutCrisisPlans(uniqueById(saved.schedules ?? current.schedules)),
          moments: withoutCrisisPlanMoments(uniqueById(saved.moments ?? current.moments)),
          // Pages are saved with the rest, sample pages included when they were loaded.
          characterDiary: uniqueById(saved.characterDiary ?? current.characterDiary),
          diary: uniqueById(saved.diary ?? current.diary),
          notes: uniqueById(saved.notes ?? current.notes),
          calls: uniqueById(saved.calls ?? current.calls),
          // Previews follow the current rule (`previewFor`) even when saved by an older build.
          conversations: (saved.conversations ?? current.conversations).map((c) => {
            const last = [...(saved.messages?.[c.id] ?? [])].reverse().find((m) => m.kind !== 'system');
            return last ? { ...c, lastMessagePreview: previewFor(last) } : c;
          }),
        };
      },
      partialize: (s): Pick<AppState, PersistedKeys> => ({
        user: s.user,
        wallet: s.wallet,
        characters: s.characters,
        conversations: s.conversations,
        groups: s.groups,
        radioClips: s.radioClips,
        newRadioGifts: s.newRadioGifts,
        dateThemes: s.dateThemes,
        userQuizzes: s.userQuizzes,
        wonFrames: s.wonFrames,
        frames: s.frames,
        // Once the on-device database holds the messages (B1.3a) the save leaves them out. Until
        // then (and on web) one AsyncStorage key holds them (~2 MB Android limit): only the newest part.
        messages: messagesInDb() ? {} : capMessages(s.messages),
        relationships: s.relationships,
        memories: s.memories,
        memorySync: s.memorySync,
        diary: s.diary,
        characterDiary: s.characterDiary,
        diaryPagesRead: s.diaryPagesRead,
        inboxSeenAt: s.inboxSeenAt,
        notes: s.notes,
        ledger: capLedger(s.ledger),
        calls: s.calls,
        moments: s.moments,
        schedules: s.schedules,
        care: s.care,
        threads: s.threads,
        boardPosts: s.boardPosts,
        dates: s.dates,
        reports: s.reports,
        blockedIds: s.blockedIds,
        recentSearches: s.recentSearches,
        recentlyViewed: s.recentlyViewed,
        quickCreates: s.quickCreates,
        personas: s.personas,
        defaultPersonaId: s.defaultPersonaId,
        chatPersonas: s.chatPersonas,
        scenes: s.scenes,
        lorebooks: s.lorebooks,
        streams: s.streams,
        streamUse: s.streamUse,
        todayWidgets: s.todayWidgets,
        alarms: s.alarms,
        photos: s.photos,
        wake: s.wake,
        daily: s.daily,
        settings: s.settings,
      }),
      onRehydrateStorage: () => () => {
        // Memory changes from here on reach the server, the hydration work's own included.
        startMemorySync(useAppStore);
        // The messages come from the database first, so the work below sees them all.
        void restoreMessages(useAppStore).finally(finishHydration);
      },
    },
  ),
);

/** Work that was mid-flight when the app closed finishes now; then the app opens. */
async function finishHydration() {
  // The phone's language, read on every launch (the user may change it in iOS Settings): the
  // characters write in it until the user writes in their own words. When the user picked a
  // language, that choice is used instead.
  const saved = await getSavedLocale();
  const locale = saved ?? phoneLanguage();
  if (useAppStore.getState().user.locale !== locale) useAppStore.setState((s) => ({ user: { ...s.user, locale } }));
  const { notes, diary } = useAppStore.getState();
  notes.filter((n) => n.status === 'composing').forEach((n) => sealNote(useAppStore.setState, n.id));
  diary
    .filter((d) => d.sharedWithCharacterId && !d.reply)
    .forEach((d) => answerDiary(useAppStore.setState, d.id));
  // A stream the app closed on goes on with the round it had paid for.
  useAppStore
    .getState()
    .streams.filter(isPlaying)
    .forEach((stream) => runStream(useAppStore.setState, useAppStore.getState, stream.id));
  useAppStore.getState().expireFreeShells();
  useAppStore.getState().writeDueDiaryPages();
  dropChatAiNotices();
  refreshPreviews();
  useAppStore.setState({ hydrated: true });
}

/**
 * One-to-one chats no longer get the 3-hourly "not a real person" line (owner, 2026-10-30): their
 * header's "AI character" says it. The lines saved before go too; a group keeps its own.
 */
function dropChatAiNotices() {
  const { conversations, messages } = useAppStore.getState();
  const stale = conversations.filter((c) => messages[c.id]?.some((m) => m.card === 'aiNotice'));
  if (!stale.length) return;
  useAppStore.setState((s) => ({
    messages: {
      ...s.messages,
      ...Object.fromEntries(stale.map((c) => [c.id, (s.messages[c.id] ?? []).filter((m) => m.card !== 'aiNotice')])),
    },
  }));
}

/** Every chat's and group's preview again from its last line, in the screen language. */
function refreshPreviews() {
  useAppStore.setState((s) => {
    const lastOf = (id: string) => [...(s.messages[id] ?? [])].reverse().find((m) => m.kind !== 'system');
    return {
      conversations: s.conversations.map((c) => {
        const last = lastOf(c.id);
        return last ? { ...c, lastMessagePreview: previewFor(last) } : c;
      }),
      groups: s.groups.map((g) => {
        const last = lastOf(g.id);
        return last ? { ...g, lastMessagePreview: groupLinePreview(s, last) } : g;
      }),
    };
  });
}

// A new screen language rewrites the previews Chats already shows ("🎤 Voice message").
// Before hydration there is nothing saved to rewrite, and a write then would replace the save.
i18n.on?.('languageChanged', () => {
  if (useAppStore.getState().hydrated) refreshPreviews();
});

/* ── selectors ─────────────────────────────────────────────────────────────── */

/** A plan or its trial is running. Chat still costs shells (the credit model, backend-plan §15.10). */
export const memberActive = (wallet: Wallet, now = Date.now()) => !!rollSubscription(wallet.subscription, now);

/**
 * One character's memories split into open and locked: 20 open without a plan, all with one
 * (`src/economy/memory-limit.ts`). Locked ones stay saved and open again with any plan.
 */
export const memoryAccess = (memories: MemoryItem[], wallet: Wallet, characterId: string, now = Date.now()) =>
  splitMemories(memories, characterId, hasFullMemory(wallet.subscription, now));

const sharesPaid = (daily: DailyState, today: string) => (daily.shareDay === today ? (daily.sharesPaid ?? 0) : 0);

/** What sharing a card pays now: `SHARE_REWARD` while today's paid shares last, then 0. */
export const shareReward = (daily: DailyState, today = todayKey()) =>
  sharesPaid(daily, today) < PAID_SHARES_PER_DAY ? SHARE_REWARD : 0;

/** Quick creates left today on the user's plan. */
export const quickCreatesToday = (use: QuickCreateUse | undefined, wallet: Wallet, today = todayKey()) =>
  quickCreatesLeft(use, today, quickCreatesPerDay(wallet.subscription, Date.now()));

/** The plan includes live calls and voice replies: Pro or the trial, not Basic. */
export const callsIncluded = (wallet: Wallet, now = Date.now()) => canRing(wallet.subscription, now);

/** Call or voice-reply minutes left: the plan's this period, then bought packs. In seconds. */
export const minutesOf = (wallet: Wallet, kind: MinutesKind, now = Date.now()) =>
  minutesLeft(wallet.subscription, wallet.packs, kind, now);

/**
 * Where today falls in the 7-day check-in week, and whether it is collected yet.
 * A missed day restarts the week. The claim and the Today card share this rule.
 */
export function checkInStatus(daily: DailyState, today = todayKey()) {
  if (daily.lastLoginDay === today) return { day: Math.max(1, daily.checkInDay), claimed: true };
  const yesterday = dateFromKey(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const consecutive = daily.lastLoginDay === dayKey(yesterday);
  return { day: consecutive ? (daily.checkInDay % DAILY_CHECK_IN.length) + 1 : 1, claimed: false };
}

/** The name to show for a character: your nickname for them, else theirs. */
export const displayName = (character: Character, relationship?: Relationship) =>
  relationship?.nickname || character.name;

/* ── helpers ───────────────────────────────────────────────────────────────── */

type Setter = (fn: (s: AppState) => Partial<AppState>) => void;
type Getter = () => AppState;
type RawSetter = (partial: Partial<AppState> | ((s: AppState) => Partial<AppState>)) => void;

/**
 * The wallet lives on the server whenever the app has one (B1.2), so one ledger pays the welcome
 * gift and each day's check-in. Profile (dev) → Server wallet off keeps it on the phone; switching
 * mid-day leaves the phone's own rows of that day in History while the server pays its own.
 */
const serverWalletOn = (get: Getter) => get().settings.serverWallet !== false && !!apiBase();

/** Wallet calls still out: only the last answer is applied, as it holds every booking before it. */
let walletCallsOut = 0;

/**
 * Sends one wallet call and takes the server's wallet as the truth once no other call is out. A
 * refused or failed call reads the wallet again, so the balance shown never drifts from the server.
 */
function syncWallet(set: Setter, run: (accessToken: string) => Promise<WalletState | null>) {
  walletCallsOut++;
  void withAccount(run)
    .then((wallet) => wallet ?? withAccount((token) => serverWallet.state(token)))
    .catch(() => null)
    .then((wallet) => {
      walletCallsOut--;
      if (wallet && walletCallsOut === 0) applyServerWallet(set, wallet);
    });
}

/** The server's wallet into the store: the balance, today's free bucket, the check-in and wheel days. */
function applyServerWallet(set: Setter, wallet: WalletState) {
  set((s) => ({
    wallet: { ...s.wallet, shells: wallet.shells, free: wallet.free ?? undefined, boughtShells: s.wallet.boughtShells || wallet.boughtShells },
    daily: {
      ...s.daily,
      lastLoginDay: wallet.checkIn.lastDay ?? s.daily.lastLoginDay,
      checkInDay: wallet.checkIn.lastDay ? wallet.checkIn.streak : s.daily.checkInDay,
      spinDay: wallet.today,
      spinsUsed: wallet.spinsToday,
    },
  }));
}

/** Pays the plan's monthly shells once per period (`shellGrant`); they never burn. */
function payPlanShells(set: Setter, get: Getter) {
  const { wallet } = get();
  const due = shellGrant(wallet.subscription, wallet.planShellsPeriod, Date.now());
  if (!due) return;
  set((s) => ({
    wallet: { ...s.wallet, shells: s.wallet.shells + due.amount, planShellsPeriod: due.periodStart },
    ledger: log(s.ledger, due.amount, 'plan'),
  }));
}

/** Every message costs shells, members included (the credit model, backend-plan §15.10). */
function chargeMessage(get: Getter, cost: number, reason: LedgerReason, conversationId: string) {
  const characterId = get().conversations.find((c) => c.id === conversationId)?.characterId;
  return get().spendShells(cost, reason, characterId);
}

/** Books call time in the history, in seconds: what a plan or top-up added, what a call used. */
function logSeconds(set: Setter, seconds: number, reason: LedgerReason, characterId?: string) {
  set((s) => ({
    ledger: [{ ...log([], seconds, reason, characterId)[0], unit: 'seconds' as const }, ...s.ledger],
  }));
}

/** Counts a sent message toward today's total (stats; there is no daily cap in the credit model). */
function countMessage(set: Setter, get: Getter) {
  const today = todayKey();
  const sent = get().daily.messagesDay === today ? (get().daily.messagesSent ?? 0) : 0;
  set((s) => ({ daily: { ...s.daily, messagesDay: today, messagesSent: sent + 1 } }));
}

/** Takes voice-reply seconds from the plan or packs; false when none are left. */
function spendVoice(set: Setter, get: Getter, seconds: number) {
  const { wallet } = get();
  if (minutesOf(wallet, 'voice').total <= 0) return false;
  const used = consumeMinutes(wallet.subscription, wallet.packs, 'voice', seconds, Date.now());
  set((s) => ({ wallet: { ...s.wallet, subscription: used.subscription, packs: used.packs } }));
  return true;
}

/** History is kept for six months; older lines drop off. */
const LEDGER_DAYS = 183;

function log(
  ledger: LedgerEntry[],
  amount: number,
  reason: LedgerReason,
  characterId?: string,
  at = new Date().toISOString(),
): LedgerEntry[] {
  const cutoff = Date.now() - LEDGER_DAYS * 86_400_000;
  return [{ id: uid('l'), at, amount, reason, characterId }, ...ledger.filter((e) => Date.parse(e.at) >= cutoff)];
}

function appendMessage(
  set: Setter,
  get: Getter,
  conversationId: string,
  message: Message,
  {
    countUnread = message.author === 'them',
    quiet = false,
  }: {
    countUnread?: boolean;
    /** A system line: leaves the chat list's preview, time and unread count alone */
    quiet?: boolean;
  } = {},
) {
  // A new message of yours starts a new exchange: the old reply's versions are done.
  const fresh = (s: AppState) => (message.author === 'me' ? { replyVersions: omitKey(s.replyVersions, conversationId) } : {});
  if (quiet) {
    set((s) => ({ messages: { ...s.messages, [conversationId]: [...(s.messages[conversationId] ?? []), message] }, ...fresh(s) }));
    return;
  }
  const unseen = countUnread && get().activeConversationId !== conversationId;
  const preview = previewFor(message);

  set((s) => ({
    ...fresh(s),
    messages: { ...s.messages, [conversationId]: [...(s.messages[conversationId] ?? []), message] },
    conversations: s.conversations.map((c) =>
      c.id === conversationId
        ? {
            ...c,
            lastMessagePreview: preview,
            lastMessageAt: message.createdAt,
            unreadCount: unseen ? c.unreadCount + 1 : c.unreadCount,
          }
        : c,
    ),
  }));
}

/** The one-line preview on the conversation list (and the Chats long-press preview). */
export function previewFor(message: Message) {
  switch (message.kind) {
    case 'voice':
      return `\u{1F3A4} ${i18n.t('chatList.previewVoice')}`;
    case 'image':
      return `\u{1F4F7} ${i18n.t('chatList.previewPhoto')}`;
    case 'call':
      return `\u{1F4DE} ${i18n.t(message.missed ? 'chatList.previewMissedCall' : 'chatList.previewCall')}`;
    default:
      // What they said, without the *narration* that would run into it ("grins Okay, that…");
      // a line that is only narration shows it as plain words.
      return speechOnly(message.text ?? '') || plainText(message.text ?? '');
  }
}

/** A line they write first carries why (`reach`) and the reply ideas made for it. */
/**
 * Writes the morning brief for the morning at `at` (`src/lib/brief.ts`) into the friend's chat, with
 * the line its push said, and marks the luck texts it covers as said. Returns who sent it, or null
 * when nobody holds anything for that day.
 */
function sendBrief(set: Setter, get: Getter, at: Date): string | null {
  const { relationships, characters } = get();
  const brief = morningBrief(chatWriters(get), get().schedules, get().threads, at);
  const from = brief && characters.find((c) => c.id === brief.characterId);
  if (!brief || !from) return null;
  const conversationId = get().addFriend(brief.characterId);
  const line = briefLine(brief.items, temperOf(from, relationships[from.id]?.label), `${dayKey(at)}:morning:brief:${from.id}`, from.gender);
  const request: FirstTextRequest = {
    kind: 'brief',
    input: { character: from, user: get().user, relationship: relationships[from.id], brief, recent: get().messages[conversationId] ?? [], now: at.toISOString(), utcOffsetMin: -at.getTimezoneOffset() },
  };
  writeFirst(set, get, conversationId, line, BRIEF_REACH, request, 'scripted');
  if (brief.covers.length) set((s) => ({ threads: markTouches(s.threads, new Set(brief.covers)) }));
  return from.id;
}

/**
 * A text they write first: a thread's text, the brief, the evening question, the week recap. With
 * Real AI on, the model writes the words in their voice (B1.4a, `src/ai/first-text.ts`) while
 * "typing…" shows; the ideas under it stay the code's, whose intents decide what a tap does (a
 * wake-up call, the diary mood, a settled thread). Server off, busy or slow: the scripted line, as
 * before. `onSkip` is what the model's skip sends: nothing, or the scripted line.
 */
/** How long a first text waits before asking the model again. */
const FIRST_TEXT_RETRIES_MS = [45_000, 180_000];

function writeFirst(
  set: Setter,
  get: Getter,
  conversationId: string,
  scripted: string,
  reach: string,
  request: FirstTextRequest,
  onSkip: 'nothing' | 'scripted',
  /** The model never answered and the text is dropped. */
  onGiveUp?: () => void,
  attempt = 0,
) {
  const send = (lines: string[]) =>
    lines.forEach((text, i) =>
      appendMessage(
        set,
        get,
        conversationId,
        { ...themText(conversationId, text), ...(i === lines.length - 1 ? withIdeas(reach) : {}) },
        { countUnread: true },
      ),
    );
  if (!get().settings.realAi || !apiBase()) return send([scripted]);
  // A reply already "typing…" in this chat keeps the indicator; this text does not take it over.
  const owns = !get().typing[conversationId];
  if (owns) set((s) => ({ typing: { ...s.typing, [conversationId]: true } }));
  const asked = Date.now();
  void accessToken()
    .then((token) => serverFirstText(request, token))
    .then((reply) => {
      if (owns) set((s) => ({ typing: { ...s.typing, [conversationId]: false } }));
      // The chat (or the whole account) was deleted meanwhile: nothing to write into.
      if (!get().conversations.some((c) => c.id === conversationId)) return;
      if (!reply) {
        // Busy or slow: asked again a little later, then left out. A friend who stays quiet is
        // better than a stock line in their mouth.
        const wait = FIRST_TEXT_RETRIES_MS[attempt];
        if (wait === undefined) return onGiveUp?.();
        setTimeout(() => {
          const last = get().messages[conversationId]?.at(-1);
          // The chat moved on meanwhile: this text would answer nothing.
          if (last && Date.parse(last.createdAt) > asked) return onGiveUp?.();
          writeFirst(set, get, conversationId, scripted, reach, request, onSkip, onGiveUp, attempt + 1);
        }, wait);
        return;
      }
      if (!reply.skip) send(reply.lines);
      else if (onSkip === 'scripted') send([scripted]);
    });
}

/** The writers in closeness order who have a chat: who may brief or ask about the day. */
function chatWriters(get: Getter) {
  const { relationships, characters, conversations, blockedIds } = get();
  return Object.values(relationships)
    .filter(
      (r) =>
        r.messagesFirst &&
        !blockedIds.includes(r.characterId) &&
        characters.some((c) => c.id === r.characterId) &&
        conversations.some((c) => c.characterId === r.characterId),
    )
    .sort((a, b) => b.intimacy - a.intimacy)
    .map((r) => r.characterId);
}

/**
 * Asks "how was today?" for the evening at `at` (`src/lib/day-ask.ts`) in the friend's chat, with
 * the line its push said. Returns who asked, or null when family asks, the back-off holds, or
 * nobody may write.
 */
function sendDayAsk(set: Setter, get: Getter, at: Date): string | null {
  const { relationships, characters, conversations, messages } = get();
  const writers = chatWriters(get);
  const chatOf = (id: string) => conversations.find((c) => c.characterId === id)!.id;
  const asker = dayAsker(
    {
      writers,
      chats: Object.fromEntries(writers.map((id) => [id, messages[chatOf(id)] ?? []])),
      familyAsks: writers.filter((id) => {
        const group = kinGroup(relationships[id]?.label);
        return !!group && lifeMoments(group, at).some((m) => m.key === 'evening');
      }),
    },
    at,
  );
  const from = asker && characters.find((c) => c.id === asker);
  if (!from) return null;
  const conversationId = get().addFriend(from.id);
  const line = dayLine(temperOf(from, relationships[from.id]?.label), `${dayKey(at)}:night:day:${from.id}`, from.gender);
  const day = dayKey(at);
  const onDay = (iso?: string) => !!iso && dayKey(new Date(iso)) === day;
  const request: FirstTextRequest = {
    kind: 'day',
    input: {
      character: from,
      user: get().user,
      relationship: relationships[from.id],
      today: (get().messages[conversationId] ?? []).filter((m) => onDay(m.createdAt)),
      threads: get().threads.filter((t) => t.characterId === from.id && (onDay(t.happensAt) || onDay(t.closedAt))),
      now: at.toISOString(),
      utcOffsetMin: -at.getTimezoneOffset(),
    },
  };
  // The question is always asked: its answer is tonight's diary page.
  writeFirst(set, get, conversationId, line, DAY_REACH, request, 'scripted');
  return from.id;
}

/**
 * The Sunday recap at `at` (`src/lib/week.ts`): a card with the week's numbers, then the friend's
 * line with reply ideas (the push said the same). Returns who sent it, or null (sent already this
 * week, or no friend with enough days).
 */
function sendRecap(set: Setter, get: Getter, at: Date): string | null {
  const { relationships, characters, conversations, messages, threads, diary } = get();
  const writers = chatWriters(get);
  const chatOf = (id: string) => conversations.find((c) => c.characterId === id)!.id;
  const recap = weeklyRecap({ writers, chats: Object.fromEntries(writers.map((id) => [id, messages[chatOf(id)] ?? []])), threads, diary }, at);
  const from = recap && characters.find((c) => c.id === recap.characterId);
  if (!recap || !from) return null;
  const conversationId = get().addFriend(from.id);
  appendMessage(set, get, conversationId, { id: uid('m'), conversationId, author: 'them', kind: 'system', card: 'week', week: recap.week, createdAt: new Date().toISOString() });
  const line = weekLine(recap.week, temperOf(from, relationships[from.id]?.label), `${dayKey(at)}:week:${from.id}`, from.gender);
  const request: FirstTextRequest = {
    kind: 'week',
    input: { character: from, user: get().user, relationship: relationships[from.id], week: recap.week, now: at.toISOString(), utcOffsetMin: -at.getTimezoneOffset() },
  };
  // The card with the numbers is already there, so a skip still gets the scripted line under it.
  writeFirst(set, get, conversationId, line, WEEK_REACH, request, 'scripted');
  return from.id;
}

/** How many news keys are kept: more than a season's worth for every world. */
const WORLD_NEWS_KEPT = 60;

/**
 * One piece of world news at `at` (`dueWorldNews`), told by the closest friend in that world who may
 * write first; at most one a day, and each only once. `force` (dev only) tells the current chapter
 * of the closest friend's world, due or not. Returns who told it.
 */
function sendWorldNews(set: Setter, get: Getter, at: Date, force = false): string | null {
  const { characters, conversations, relationships, messages, daily, user } = get();
  const worlds = localized('worlds', WORLDS);
  const writers = chatWriters(get).flatMap((id) => characters.find((c) => c.id === id) ?? []);
  const picked = pickWorldNews({ writers, worlds, cast: characters, relationships, told: daily.worldNewsSent ?? [], now: at }) ?? (force ? devWorldNews(writers, characters, worlds, relationships, at) : null);
  const character = picked && characters.find((c) => c.id === picked.characterId);
  if (!picked || !character) return null;
  const { news } = picked;
  const told = `${news.key}|${dayKey(at)}`;
  set((s) => ({ daily: { ...s.daily, worldNewsSent: [...(s.daily.worldNewsSent ?? []), told].slice(-WORLD_NEWS_KEPT) } }));
  const conversationId = conversations.find((c) => c.characterId === character.id)!.id;
  const request: FirstTextRequest = {
    kind: 'world',
    input: {
      character,
      user,
      relationship: relationships[character.id],
      news: { kind: news.kind, title: news.title, note: news.note },
      recent: (messages[conversationId] ?? []).slice(-12),
      now: at.toISOString(),
      utcOffsetMin: -at.getTimezoneOffset(),
    },
  };
  // Not told after all: it stays due for the next time the day is checked.
  const untell = () => set((s) => ({ daily: { ...s.daily, worldNewsSent: (s.daily.worldNewsSent ?? []).filter((k) => k !== told) } }));
  writeFirst(set, get, conversationId, worldNewsLine(news, character.gender), 'world', request, 'nothing', untell);
  return character.id;
}

/** Dev only: the current chapter of the closest friend's world, due or not, under a key that is never "told". */
function devWorldNews(writers: Character[], cast: Character[], worlds: World[], relationships: Record<string, Relationship>, at: Date) {
  for (const writer of writers) {
    const world = worlds.find((w) => w.series === writer.series);
    if (!world) continue;
    const joinedAt = worldJoinedAt(cast.filter((c) => c.series === world.series).map((c) => c.id), relationships);
    const chapter = chapterAt(world.story.season, joinedAt, at);
    if (!chapter) continue;
    const news: WorldNews = { key: `${world.key}:chapter:${chapter.id}:dev${at.getTime()}`, kind: 'chapter', title: chapter.title, note: chapter.beat };
    return { characterId: writer.id, world, news };
  }
  return null;
}

const DIARY_MOODS: DiaryMood[] = ['happy', 'soft', 'blue', 'excited', 'tired'];

/**
 * The user's newest message answers "how was today?" (or a family evening's same question): it
 * becomes today's diary page with its mood, and the friend writes back on it. Once a day; "Tell you
 * later" and crisis words write nothing.
 */
function dayToDiary(set: Setter, get: Getter, conversationId: string, text: string, intent?: IdeaIntent) {
  const chat = get().messages[conversationId] ?? [];
  const mine = chat.findLast((m) => m.author === 'me');
  const question = mine && answeredQuestion(chat, mine.id);
  const characterId = get().conversations.find((c) => c.id === conversationId)?.characterId;
  if (!question || !characterId || detectCrisis(text)) return;
  const fromIdea = moodOfIntent(intent);
  if (fromIdea === null) return;
  const date = todayKey();
  if (get().diary.some((d) => d.source === 'evening' && d.date === date)) return;
  const mood = fromIdea ?? moodOf(text);
  const id = uid('d');
  const entry: DiaryEntry = {
    id,
    date,
    title: text.split('\n')[0].slice(0, 60),
    body: text,
    mood,
    images: [],
    sharedWithCharacterId: characterId,
    accentIndex: DIARY_MOODS.indexOf(mood),
    source: 'evening',
  };
  set((s) => ({ diary: [entry, ...s.diary] }));
  setTimeout(() => answerDiary(useAppStore.setState, id), 2200);
}

/** `HH:MM` on the day of `day`: the morning time the brief and its push are planned for. */
const clockOn = (day: Date, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
};

const withIdeas = (reach?: string): Pick<Message, 'reach' | 'ideas'> => {
  const ideas = reach ? ideasFor(reach) : [];
  return reach ? { reach, ideas: ideas.length ? ideas : undefined } : {};
};

const themText = (conversationId: string, text: string): Message => ({
  id: uid('m'),
  conversationId,
  author: 'them',
  kind: 'text',
  text,
  createdAt: new Date().toISOString(),
});

/** The helpline card after a crisis message (src/ai/safety.ts): one tap to local helplines. */
function appendHelplineCard(set: Setter, get: Getter, conversationId: string) {
  appendMessage(set, get, conversationId, {
    id: uid('m'),
    conversationId,
    author: 'them',
    kind: 'system',
    card: 'helpline',
    createdAt: new Date().toISOString(),
  });
}

/**
 * Crisis text written outside the chat (a plan in Us, a board note, a shared diary
 * page): the card and a warm line go to that character's chat, so help is one tap away.
 */
function answerCrisisInChat(set: Setter, get: Getter, characterId: string) {
  const conversationId = get().addFriend(characterId);
  appendHelplineCard(set, get, conversationId);
  appendMessage(set, get, conversationId, themText(conversationId, pick(crisisReplies)), { countUnread: true });
}

/** One person per family role: whoever else holds it stops being family (and a name the role gave goes with it). */
function freeFamilyRole(set: Setter, get: Getter, label: FamilyLabel, keep: string) {
  for (const [characterId, bond] of Object.entries(get().relationships)) {
    if (characterId === keep || bond.label !== label) continue;
    updateRelationship(set, characterId, (r) => ({ label: undefined, nickname: r.nickname === r.label ? undefined : r.nickname }));
  }
}

function updateRelationship(set: Setter, characterId: string, patch: (r: Relationship) => Partial<Relationship>) {
  set((s) => {
    const existing = s.relationships[characterId];
    if (!existing) return {};
    return { relationships: { ...s.relationships, [characterId]: { ...existing, ...patch(existing) } } };
  });
}

/** Consecutive-day streak: same day keeps it, yesterday extends it, a gap restarts it. */
function touchStreak(set: Setter, get: Getter, characterId: string) {
  const today = todayKey();
  const bond = get().relationships[characterId];
  if (!bond || bond.lastChatDay === today) return;

  const streakDays = bond.lastChatDay === dayKeyFromToday(-1) ? bond.streakDays + 1 : 1;
  updateRelationship(set, characterId, () => ({ streakDays, lastChatDay: today }));
}

function addMoment(set: Setter, characterId: string, kind: MomentKind, params?: Moment['params'], photoId?: string) {
  set((s) => ({
    moments: [...s.moments, { id: uid('mo'), characterId, kind, createdAt: new Date().toISOString(), params, photoId }],
  }));
}

/**
 * What follows your text: care for a crisis message, the morning chain while the wake-up alarm
 * rings, a plan turned into a reminder, then their reply. Sending and editing share it.
 */
/**
 * Opens a thread from the user's message, or settles the one they were last asked about. A plan's
 * thread asks "how did it go?" itself, so the plan's own follow-up stands down.
 */
function noteThreads(
  set: Setter,
  get: Getter,
  characterId: string,
  text: string,
  plan: DetectedPlan | null,
  scheduleId?: string,
): { thread: Thread; change: NoteChange } | null {
  const now = new Date();
  // "The exam moved to 10": the plan, its reminder and every text still to come move with it.
  const moved = plan ? null : mockMove(text);
  const ahead = moved ? nextPlan(get().threads, characterId, now) : null;
  if (moved && ahead?.happensAt) {
    const at = new Date(ahead.happensAt);
    at.setHours(moved.hour, moved.minute, 0, 0);
    const time = `${String(moved.hour).padStart(2, '0')}:${String(moved.minute).padStart(2, '0')}`;
    set((s) => ({
      threads: moveThread(s.threads, ahead.id, at.toISOString(), now),
      schedules: s.schedules.map((x) => (x.id === ahead.scheduleId ? { ...x, time, reminded: false, remindAt: undefined } : x)),
    }));
    return { thread: get().threads.find((t) => t.id === ahead.id) ?? ahead, change: 'moved' };
  }
  const outcome = mockOutcome(text);
  const asked = outcome ? lastAsked(get().threads, characterId, now) : null;
  // A goal goes on whatever one day was like; only "stop" ends it.
  if (asked && outcome && (asked.kind !== 'goal' || outcome === 'off')) {
    settleThread(set, get, asked, outcome);
    return { thread: asked, change: 'settled' };
  }
  const found = mockThread(text, now, plan);
  if (!found) return null;
  const id = uid('th');
  const touches = ruleTouches(found.touches, id, now, found.happensAt);
  if (!touches.length) return null;
  const thread: Thread = {
    id,
    characterId,
    kind: found.kind,
    about: found.about,
    quote: found.quote,
    createdAt: now.toISOString(),
    happensAt: found.happensAt,
    scheduleId,
    touches,
    status: 'open',
  };
  set((s) => ({
    threads: addThread(pruneThreads(s.threads, now), thread),
    schedules: scheduleId && touches.some((x) => x.phase === 'after') ? s.schedules.map((x) => (x.id === scheduleId ? { ...x, followedUp: true } : x)) : s.schedules,
  }));
  return { thread, change: 'new' };
}

/** What the chat shows under the user's message: the thread it opened, moved or settled (their newest by default). */
function markNoted(set: Setter, conversationId: string, threadId: string, change: NoteChange, messageId?: string) {
  set((s) => {
    const list = s.messages[conversationId] ?? [];
    const target = messageId ?? list.findLast((m) => m.author === 'me' && !m.card)?.id;
    if (!target) return {};
    return { messages: { ...s.messages, [conversationId]: list.map((m) => (m.id === target ? { ...m, noted: { threadId, change } } : m)) } };
  });
}

/** Settles a thread: a good end or a done task is remembered, a bad one gets a check-in later. */
function settleThread(set: Setter, get: Getter, thread: Thread, outcome: ThreadOutcome) {
  const now = new Date();
  // "It's off": the plan it came with goes too; "no texts about it": the plan stays, its reminder does not.
  const plan = thread.scheduleId;
  set((s) => ({
    threads: closeThread(s.threads, thread.id, outcome, now),
    schedules:
      plan && outcome === 'off'
        ? s.schedules.filter((x) => x.id !== plan)
        : plan && outcome === 'quiet'
          ? s.schedules.map((x) => (x.id === plan ? { ...x, reminded: true } : x))
          : s.schedules,
  }));
  if (outcome === 'good' || outcome === 'done') {
    get().addMemory(thread.characterId, `${thread.about}: ${outcome === 'good' ? 'it went well' : 'done'}`, 'chat');
  }
  // A real-life quest done pays its shells, once (the thread is closed now).
  if (thread.kind === 'quest' && outcome === 'done' && thread.reward && thread.status === 'open') get().addShells(thread.reward, 'quest');
  if (outcome === 'bad' && get().relationships[thread.characterId]?.messagesFirst) {
    set((s) => ({
      care: addCare(pruneCare(s.care, now), {
        id: uid('care'),
        characterId: thread.characterId,
        kind: 'sad',
        dueAt: careDueAt('sad', now).toISOString(),
        createdAt: now.toISOString(),
      }),
    }));
  }
}

/**
 * What a thread's idea sets going. It's off / It went well / Not great / Done settle it (a goal goes
 * on unless it is "stop asking"); Not yet asks again tomorrow evening; Still home asks once more in
 * ten minutes; Wake me up sets an alarm with this friend before the thing; Not today drops a quest.
 */
function threadIdea(set: Setter, get: Getter, thread: Thread, phase: TouchPhase, intent: IdeaIntent) {
  const now = new Date();
  const outcome = ({ off: 'off', good: 'good', rough: 'bad', done: 'done' } as const)[intent as 'off' | 'good' | 'rough' | 'done'];
  if (outcome && (thread.kind !== 'goal' || outcome === 'off')) settleThread(set, get, thread, outcome);
  if (intent === 'no' && phase === 'quest') settleThread(set, get, thread, 'off');
  if (intent === 'no' && phase === 'check') {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(19, 0, 0, 0);
    set((s) => ({ threads: extendThread(s.threads, thread.id, [{ at: tomorrow.toISOString(), phase: 'check', why: 'ask again if they finished' }], now) }));
  }
  if (intent === 'no' && phase === 'leave' && thread.happensAt && !thread.touches.some((x) => x.phase === 'leave' && !x.sent)) {
    const soon = new Date(now.getTime() + LIFE.hurryAfterMin * 60_000);
    set((s) => ({ threads: extendThread(s.threads, thread.id, [{ at: soon.toISOString(), phase: 'leave', why: 'nudge them to hurry, gently' }], now) }));
  }
  if (intent === 'wake') alarmBefore(get, thread);
}

/** "Wake me up": a one-time alarm with this friend before the thing (never before 05:00). */
function alarmBefore(get: Getter, thread: Thread) {
  if (!thread.happensAt) return;
  const wake = new Date(Date.parse(thread.happensAt) - LIFE.wakeBeforeMin * 60_000);
  wake.setMinutes(Math.floor(wake.getMinutes() / 15) * 15, 0, 0);
  if (wake.getHours() < LIFE.wakeEarliestHour) wake.setHours(LIFE.wakeEarliestHour, 0, 0, 0);
  get().saveAlarm({
    hour: wake.getHours(),
    minute: wake.getMinutes(),
    repeat: [],
    label: thread.about,
    characterId: thread.characterId,
    voice: true,
    sound: 'morningTide',
    replyToWake: true,
    snooze: true,
  });
}

/** The ideas on a plan's acknowledgement: when to remind, and for a big early thing, "Wake me up". */
function leadIdeas(reach: string, offerWake: boolean): ReplyIdea[] {
  const [half, hour, none] = ideasFor(reach);
  return offerWake ? [half, { label: 'Wake me up ⏰', text: 'Can you wake me up for it?', intent: 'wake' }, none] : [half, hour, none];
}

/** "Remind me 30 minutes before" on a plan's acknowledgement; "Not today" on a quest offer drops it. */
function askIdea(set: Setter, get: Getter, reach: string | undefined, intent: IdeaIntent) {
  const [source, id] = reach?.split(':') ?? [];
  if (source === 'lead') {
    const thread = get().threads.find((t) => t.scheduleId === id);
    if (intent === 'wake' && thread) alarmBefore(get, thread);
    if (intent === 'off') set((s) => ({ schedules: s.schedules.map((x) => (x.id === id ? { ...x, reminded: true } : x)) }));
    if ((intent === 'lead30' || intent === 'lead60') && thread?.happensAt) {
      const at = new Date(Date.parse(thread.happensAt) - (intent === 'lead30' ? 30 : 60) * 60_000);
      const remindAt = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
      set((s) => ({ schedules: s.schedules.map((x) => (x.id === id ? { ...x, remindAt, reminded: false } : x)) }));
    }
  }
  if (source === 'quest' && intent === 'no') {
    const quest = get().threads.find((t) => t.id === id && t.status === 'open');
    if (quest) settleThread(set, get, quest, 'off');
  }
}

/**
 * The user's answer to a line that carries reply ideas: an idea (maybe changed first) or their own
 * words. Free under a line they wrote first; "Yes, text me!" turns on Let them reach out and shows
 * their words on the lock screen; "Still not great" asks once more later. Ideas that are gone leave
 * an ordinary message.
 */
function answerLine(
  set: Setter,
  get: Getter,
  conversationId: string,
  messageId: string,
  text: string,
  idea?: ReplyIdea,
  edited = false,
): SendResult {
  const state = get();
  const messages = state.messages[conversationId] ?? [];
  const message = messages.find((m) => m.id === messageId);
  const line = text.trim();
  if (!line) return 'empty';
  const shown = message ? shownIdeas(message, messages) : null;
  if (!message || !shown || (idea && !shown.some((x) => x.label === idea.label))) return get().sendText(conversationId, line);
  const conversation = state.conversations.find((c) => c.id === conversationId);
  if (!conversation) return 'empty';
  // Being asked how you are never costs a shell; everyday ideas cost what a message does.
  if (!message.reach && !chargeMessage(get, shellCosts.textMessage, 'chat', conversationId)) return 'noShells';
  countMessage(set, get);
  set((s) => ({
    messages: {
      ...s.messages,
      [conversationId]: (s.messages[conversationId] ?? []).map((m) => (m.id === messageId ? { ...m, ideas: undefined } : m)),
    },
  }));
  const mineId = uid('m');
  appendMessage(set, get, conversationId, { id: mineId, conversationId, author: 'me', kind: 'text', text: line, createdAt: new Date().toISOString() });
  touchStreak(set, get, conversation.characterId);
  dayToDiary(set, get, conversationId, line, edited ? undefined : idea?.intent);
  const characterId = conversation.characterId;

  // "May I text you?": the idea the user started from decides, even if they changed its words.
  const ask = isAskReach(message.reach) && !!idea?.intent;
  if (ask) {
    const yes = idea!.intent === 'yes';
    updateRelationship(set, characterId, (r) => ({
      reachAsk: { ...(r.reachAsk ?? { asks: 1 }), answer: yes ? 'yes' : 'no' },
      ...(yes ? { messagesFirst: true } : {}),
    }));
    // Their texts read like texts: the words show on the lock screen.
    if (yes) set((s) => ({ settings: { ...s.settings, notificationPreview: true } }));
  }

  // "Still not great": one more check-in later, as the first one was asked; never a third.
  const kind = reachCare(message.reach);
  if (kind && idea && !edited && ideaEffect(message.reach, idea.intent) === 'askAgain') {
    const now = new Date();
    set((s) => ({
      care: addCare(pruneCare(s.care, now), {
        id: uid('care'),
        characterId,
        kind,
        dueAt: careDueAt(kind, now).toISOString(),
        createdAt: now.toISOString(),
        again: true,
      }),
    }));
  }
  // A thread's idea: "It's off", "It went well", "Not great", "Done" settle it; "Not yet" asks again tomorrow evening.
  const thread = reachThread(message.reach);
  const open = thread && get().threads.find((t) => t.id === thread.id && t.status === 'open');
  if (open && idea?.intent && !edited) threadIdea(set, get, open, thread.phase, idea.intent);
  // Their own words under a thread's text ("it went great!", typed or changed): settle that thread, no other.
  const said = open && (!idea || edited) ? mockOutcome(line) : null;
  if (open && said && (open.kind !== 'goal' || said === 'off')) settleThread(set, get, open, said);
  if (open && get().threads.find((t) => t.id === open.id)?.status === 'closed') markNoted(set, conversationId, open.id, 'settled', mineId);
  // Asks that are not a thread's text: when to remind of a plan, a quest offer.
  if (idea?.intent && !edited) askIdea(set, get, message.reach, idea.intent);

  // An edited line is the user's own words: the ordinary reply answers it (the ask keeps its answer).
  const say = idea?.intent && (!edited || ask) ? ideaAnswer(message.reach, idea.intent, message.id, chatGender(get(), conversationId)) : undefined;
  // An answer to a line that asked something has settled what it settles: no guessing from its words.
  answerText(set, get, conversationId, line, { wakeHere: false, gain: INTIMACY.text, say, answered: !!message.reach });
  return 'sent';
}

function answerText(
  set: Setter,
  get: Getter,
  conversationId: string,
  text: string,
  {
    wakeHere,
    gain,
    avoid,
    say,
    answered,
    batch,
  }: { wakeHere: boolean; gain: number; avoid?: string; say?: string; answered?: boolean; /** Wait for more texts before replying. */ batch?: boolean },
) {
  const conversation = get().conversations.find((c) => c.id === conversationId);
  if (!conversation) return;
  // A crisis message is answered with care and never becomes a plan: no reminder,
  // no "how did it go?", no line on Us ("I'm going to kill myself tomorrow").
  const crisis = detectCrisis(text);

  // The morning chain: a real reply turns the alarm off and the friend helps with the day.
  if (wakeHere && wakeReply(set, get, conversationId, text, crisis)) return;

  // "Smart Auto Schedule": a plan in the message becomes a reminder.
  // English from `detectPlan`; Uzbek and Russian from the stand-in until the server's model reads plans.
  const plan = crisis ? null : (detectPlan(text) ?? localPlan(text, new Date()));
  let reply: string | undefined;
  const scheduleId = plan ? uid('sch') : undefined;
  if (plan) {
    set((s) => ({
      schedules: [
        ...s.schedules,
        {
          id: scheduleId!,
          characterId: conversation.characterId,
          title: plan.title,
          date: plan.date,
          time: plan.time,
          createdAt: new Date().toISOString(),
          reminded: false,
          source: 'chat',
        },
      ],
    }));
    get().addMemory(conversation.characterId, planMemoryLine(plan), 'chat');
    addMoment(set, conversation.characterId, 'plan', { title: plan.title });
    reply = scheduleAck(plan.title, plan.when, !!plan.time, genderOf(get(), conversation.characterId));
  }

  // Care check-ins: "I have a headache" now, "Is your head any better?" a few hours on, from
  // friends who may write first. "I'm better now" closes what is open; a crisis never becomes one.
  if (!crisis && get().relationships[conversation.characterId]?.messagesFirst) {
    const characterId = conversation.characterId;
    const kind = saysBetter(text) ? null : detectCare(text);
    if (saysBetter(text)) set((s) => ({ care: closeCare(s.care, characterId) }));
    else if (kind) {
      const now = new Date();
      set((s) => ({
        care: addCare(pruneCare(s.care, now), {
          id: uid('care'),
          characterId,
          kind,
          dueAt: careDueAt(kind, now).toISOString(),
          createdAt: now.toISOString(),
          quote: text,
        }),
      }));
    }
  }

  // Threads: anything with a future becomes one, and a word on how it went settles the last one
  // asked about. The server's model does both from the chat (`src/ai/thread-prompt.ts`); the mock
  // only notices shapes and keeps the user's words. A crisis never becomes a thread.
  const noted = crisis || answered ? null : noteThreads(set, get, conversation.characterId, text, plan, scheduleId);
  // The chat shows what they took from it under the message, so a wrong guess is one tap to fix.
  if (noted) markNoted(set, conversationId, noted.thread.id, noted.change);
  const planThread = noted?.change === 'new' ? noted.thread : null;
  // A timed plan: their acknowledgement asks when to remind (30 min, an hour, no need).
  const lead = plan?.time && planThread?.scheduleId ? `lead:${planThread.scheduleId}` : undefined;

  // A crisis message: a warm reply in voice, then the helpline card under it.
  if (crisis) {
    reply = pick(crisisReplies);
    appendHelplineCard(set, get, conversationId);
  }

  // `say`: their answer to a reply idea, unless a plan or a crisis needs the reply.
  const scripted = reply ?? say;
  // Back-to-back texts get one reply (src/lib/reply-batch.ts): the model's reply waits a beat for
  // the next one. A scripted line answers at once, for the waiting ones too.
  if (batch && scripted == null && avoid == null) {
    replyBatch.queue(conversationId, gain, (total) => scheduleReply(set, get, conversationId, { gain: total }));
    return;
  }
  scheduleReply(set, get, conversationId, {
    text: scripted,
    gain: gain + replyBatch.take(conversationId),
    avoid,
    ...(lead && !crisis ? { reach: lead, ideas: leadIdeas(lead, !!plan && isBig(text) && (plan.time ?? '99') < LIFE.wakeOfferBefore) } : {}),
  });
}

/**
 * A continue or a time skip (`src/lib/chat-steer.ts`): a marker that is the user's turn, then
 * their reply to it. Charged as a message; it adds no closeness (the user wrote nothing) and
 * leaves the streak alone. The server answers with the chat's prompt and `steerCue`.
 */
function steerChat(set: Setter, get: Getter, conversationId: string, kind: 'continue' | 'skip', skip?: TimeSkip, to?: string): SendResult {
  const state = get();
  const conversation = state.conversations.find((c) => c.id === conversationId);
  if (!conversation) return 'empty';
  if (steerBlock(state.messages[conversationId], !!state.typing[conversationId])) return 'empty';
  // A scene's skip needs a running scene; an own skip needs words that keep the content rules.
  if (kind === 'skip' && skip === 'scene' && !conversation.scene) return 'empty';
  const words = kind === 'skip' && skip === 'own' ? cleanSkipTo(to ?? '') : undefined;
  if (words !== undefined && checkSkipTo(words).length) return 'empty';
  if (!chargeMessage(get, shellCosts.textMessage, 'chat', conversationId)) return 'noShells';
  countMessage(set, get);
  const marker: Message = { id: uid('m'), ...steerMarker(conversationId, kind, skip, new Date(), words) };
  appendMessage(set, get, conversationId, marker, { quiet: true });
  // A new turn: the versions of the reply before it are done.
  set((s) => ({ replyVersions: omitKey(s.replyVersions, conversationId) }));
  scheduleReply(set, get, conversationId, { lines: mockSteerLines(kind, skip, marker.id, chatGender(get(), conversationId)), gain: 0, steer: { kind, skip, to: words } });
  return 'sent';
}

/**
 * Stands in for the streaming backend call: read receipt, typing indicator, then a voice note +
 * text (or text only). The reply engine (`src/lib/reply-engine`) plans the turn from the chat's
 * reply style and length and their mood; the mock writes it (`writeMockReply`), the server's
 * model will. Swapping in the model only changes the writing.
 */
interface ReplyRequest {
  text?: string;
  /** Lines already written (a continue or a skip); without them the mock writes the reply. */
  lines?: string[];
  gain: number;
  chips?: string[];
  /** Reply ideas on the last line, and why it asks (`lead:<scheduleId>`: when to remind of a plan). */
  ideas?: ReplyIdea[];
  reach?: string;
  /** Lines already said for this turn (an earlier version, the old answer to an edited message). */
  avoid?: string | readonly string[];
  /** ↻ after 👎: what was off in the version before (`offCue`). */
  off?: OffReason;
  /** `silence`: the one text they send when you go quiet (`nudgeAfterMs`). */
  trigger?: TurnTrigger;
  /** A continue or a time skip: the model answers it from `steerCue`, `lines` are only its stand-in. */
  steer?: { kind: 'continue' | 'skip'; skip?: TimeSkip; to?: string };
  /** A game's turn: the model answers it from this cue, `lines` are only its stand-in. */
  cue?: readonly string[];
}

function scheduleReply(set: Setter, get: Getter, conversationId: string, request: ReplyRequest) {
  const { text, lines: given, gain, chips, ideas, reach, avoid, off, trigger = 'message', steer, cue } = request;
  const state = get();
  const conversation = state.conversations.find((c) => c.id === conversationId);
  if (!conversation) return;
  const bond = state.relationships[conversation.characterId];
  const character = state.characters.find((c) => c.id === conversation.characterId);
  // A rewind or an edit can take this reply back while it is on its way (`cancelReplies`).
  const epoch = replyEpoch.get(conversationId) ?? 0;

  const readAt = new Date().toISOString();
  set((s) => ({
    typing: { ...s.typing, [conversationId]: true },
    messages: {
      ...s.messages,
      // A new reply answers a line that failed before too, so it is no longer "Not Delivered".
      [conversationId]: (s.messages[conversationId] ?? []).map((m) =>
        m.author === 'me' && (!m.readAt || m.failed) ? { ...m, readAt: m.readAt ?? readAt, failed: undefined } : m,
      ),
    },
  }));

  // The turn: what they feel and what the reply does. A scripted line (a plan's acknowledgement,
  // care after a crisis, a continue) keeps its words; the plan still moves their mood.
  const ctx =
    character && bond
      ? {
          character,
          relationship: bond,
          history: state.messages[conversationId] ?? [],
          memories: memoryAccess(state.memories, state.wallet, character.id).open,
          trigger,
          now: Date.now(),
        }
      : null;
  const turn = ctx ? planReply(ctx) : null;
  const avoided = avoid == null ? undefined : typeof avoid === 'string' ? [avoid] : avoid;
  // The model writes this turn when it is on; only `text` keeps its words. A continue or a skip brings its own stand-in.
  const modelTurn = text == null && (given == null || !!steer || !!cue);
  // An arc beat that has just opened: the model brings it up in its own words (`arcLines`), a stand-in adds a line.
  const beat = modelTurn && given == null && bond?.arcDue && character?.arc ? localCharacter(character).arc?.beats.find((b) => b.atLevel === bond.arcDue) : undefined;
  const standIn = () => {
    const lines = text != null ? [text] : (given ?? (ctx && turn ? writeMockReply(turn.plan, ctx, { avoid: avoided, interests: state.user.interests }) : []));
    return beat ? [...lines, arcLine(beat.title, `${character?.id}:${beat.atLevel}`, character?.gender)] : lines;
  };

  const deliver = (written: string[]) => {
    const lines = enforceStyle(written, replyPrefs(bond).style);
    if (!lines.length) {
      set((s) => ({ typing: { ...s.typing, [conversationId]: false } }));
      return;
    }
    const mood = turn?.plan.mood;

    // The voice note says only what is spoken: narration stays on the screen.
    const said = speechOnly(lines.join(' '));
    // Roughly how long the burst takes to say out loud.
    const voiceSec = Math.max(3, Math.round(said.split(/\s+/).length / 2.6));
    // Voice replies come with a plan and use its minutes; without minutes the reply is text.
    const wantsVoice = !!bond?.voiceReplies && !!character?.voiceReady && !!said;
    const withVoice = wantsVoice && spendVoice(set, get, voiceSec);
    // A Pro member whose voice minutes ran out sees why, once a day, under the reply.
    // Basic has no voice replies at all, so it never gets this note.
    const voice = minutesOf(get().wallet, 'voice');
    const voiceBack = voice.planTotal > 0 ? voice.resetsAt : null;
    const noteVoice = wantsVoice && !withVoice && voiceBack != null && get().daily.voiceNoteDay !== todayKey();
    if (noteVoice) set((s) => ({ daily: { ...s.daily, voiceNoteDay: todayKey() } }));

    // Each bubble waits a beat to read yours, then roughly as long as it takes to type, with
    // "typing..." between. A burst never starts while the last one is still arriving, so two
    // replies never interleave.
    const delays = pace(lines, turn?.read ?? readMessage(undefined));
    const busy = Math.max(0, (replyingUntil.get(conversationId) ?? 0) - Date.now());
    let at = busy + 400;
    lines.forEach((line, i) => {
      at += delays[i];
      const last = i === lines.length - 1;
      setTimeout(() => {
        if ((replyEpoch.get(conversationId) ?? 0) !== epoch) return;
        if (i === 0 && withVoice) {
          appendMessage(set, get, conversationId, {
            id: uid('m'),
            conversationId,
            author: 'them',
            kind: 'voice',
            durationSec: voiceSec,
            transcript: said,
            emotion: mood?.emotion,
            createdAt: new Date().toISOString(),
          });
        }
        const message: Message = {
          ...themText(conversationId, line),
          chips: last ? chips : undefined,
          emotion: mood?.emotion,
          ...(last && reach && ideas?.length ? { reach, ideas } : {}),
        };
        // It shows word by word, as a streamed reply would (`src/lib/reveal.ts`).
        markFresh(message.id);
        appendMessage(set, get, conversationId, message);
        if (last && noteVoice && voiceBack != null) {
          appendMessage(
            set,
            get,
            conversationId,
            {
              id: uid('m'),
              conversationId,
              author: 'them',
              kind: 'system',
              card: 'voiceQuota',
              until: new Date(voiceBack).toISOString(),
              createdAt: new Date().toISOString(),
            },
            { quiet: true },
          );
        }
        set((s) => ({ typing: { ...s.typing, [conversationId]: !last } }));
        if (!last) return;
        // How they feel now carries into the next reply, and fades with time (`currentMood`).
        if (mood) updateRelationship(set, conversation.characterId, () => ({ mood }));
        // This reply carried the beat; before the gain below, which may open the next one.
        if (beat) updateRelationship(set, conversation.characterId, (r) => (r.arcDue === beat.atLevel ? { arcDue: undefined } : {}));
        if (gain) get().addIntimacy(conversation.characterId, gain);
        if (trigger === 'message' && !chips?.length && !ideas?.length) afterReply(set, get, conversationId);
        queueMemoryPass(set, get, conversationId);
        const nudgeAfter = text == null && !given ? turn?.plan.nudgeAfterMs : undefined;
        if (nudgeAfter) scheduleNudge(set, get, conversationId, message.id, nudgeAfter);
      }, at);
    });
    replyingUntil.set(conversationId, Date.now() + at);
  };

  // The real model writes the reply when the local AI server is on (development, `src/ai/server.ts`);
  // a scripted line keeps its words. "Typing…" shows while it thinks. A failure (offline, the free
  // tier's daily cap, a slow answer) says so under the user's line with a way to try again, as iOS
  // Messages does, instead of passing the stand-in off as their reply.
  if (modelTurn && ctx && turn && character && bond && state.settings.realAi && apiBase()) {
    const messages = ctx.history.filter((m) => !m.pending);
    const input = {
      character,
      user: state.user,
      relationship: bond,
      steer,
      cue,
      prefs: replyPrefs(bond),
      // Who they are here, the scene and the world books: the same as the stand-in reads.
      persona: personaFor(conversationId, state),
      scene: conversation.scene,
      lore: { ...lorePrompt(booksFor(character, state.lorebooks, officialLorebooks), recentLines(messages), character.id), story: worldStoryOf(state, character) },
      // Memory (B2): what they pinned, every other open fact, and their story so far. Locked
      // memories (no plan, past the free 20) stay out, as on the Memories screen.
      pinned: ctx.memories.filter((m) => m.pinned),
      facts: ctx.memories.filter((m) => !m.pinned),
      summary: conversation.summary,
      messages,
      plan: turn.plan,
      threads: state.threads.filter((t) => t.characterId === character.id),
      // An array is ↻'s earlier versions; a single line is the old answer to an edited message.
      redo: Array.isArray(avoid) ? avoid : undefined,
      redoOff: off,
    };
    // The account's token lets the server log the reply's cost against this user (B1).
    void accessToken()
      .then((token) => serverReply(input, token))
      .then((reply) => {
        if ((replyEpoch.get(conversationId) ?? 0) !== epoch) return;
        if (!reply) return failReply(set, conversationId, request);
        // The server's crisis check (any language): the helpline card, as a caught phrase gets.
        if (reply.crisis) appendHelplineCard(set, get, conversationId);
        deliver(reply.lines);
      });
    return;
  }
  deliver(standIn());
}

/** What a chat's prompt carries of the character's official world (`worldPromptOf`); none for a creation. */
function worldStoryOf(state: AppState, character: Character) {
  const world = worldOf(character);
  if (!world) return undefined;
  const cast = state.characters.filter((c) => c.series === world.series);
  const names = new Map(cast.map((c) => [c.id, c.name]));
  return worldPromptOf(world.story, character.id, (id) => names.get(id) ?? id, worldJoinedAt(cast.map((c) => c.id), state.relationships), new Date());
}

/** A beat after their reply, before the ask: long enough to read it, short enough to still be here. */
const ASK_AFTER_MS = 1800;

/**
 * "May I text you sometimes?" (`src/lib/reach-ask.ts`): right after a reply, when the user is
 * enjoying this chat, the friend asks in their own temper, with "Yes, text me!" / "Not now" under it.
 */
function maybeAskToReach(set: Setter, get: Getter, conversationId: string): boolean {
  const state = get();
  const conversation = state.conversations.find((c) => c.id === conversationId);
  const character = state.characters.find((c) => c.id === conversation?.characterId);
  const bond = conversation && state.relationships[conversation.characterId];
  if (!conversation || !character || !bond) return false;
  const messages = state.messages[conversationId] ?? [];
  if (!shouldAskToReach({ bond, messages, now: Date.now(), inScene: !!conversation.scene })) return false;
  const epoch = replyEpoch.get(conversationId) ?? 0;
  const afterId = messages.at(-1)?.id;
  const again = (bond.reachAsk?.asks ?? 0) > 0;
  updateRelationship(set, character.id, (r) => ({ reachAsk: askedOnce(r.reachAsk, new Date()) }));
  set((s) => ({ typing: { ...s.typing, [conversationId]: true } }));
  setTimeout(() => {
    // The user wrote, or a rewind took the reply back, in the meantime: the moment has passed
    // (and the next reply owns "typing…").
    if ((replyEpoch.get(conversationId) ?? 0) !== epoch || get().messages[conversationId]?.at(-1)?.id !== afterId) return;
    set((s) => ({ typing: { ...s.typing, [conversationId]: false } }));
    const temper = temperOf(character, get().relationships[character.id]?.label);
    const id = uid('m');
    const line = { ...themText(conversationId, askLine(temper, again, id, character.gender)), id, ...withIdeas(askReach(temper)) };
    appendMessage(set, get, conversationId, line);
  }, ASK_AFTER_MS);
  return true;
}

/** After their reply: the consent ask when it is time, else one real-life moment (`maybeLifeMoment`). */
function afterReply(set: Setter, get: Getter, conversationId: string) {
  if (!maybeAskToReach(set, get, conversationId)) maybeLifeMoment(set, get, conversationId);
}

/**
 * Real life first (Presence + docs/digital-wellbeing.md: an honest app, quests away from the
 * screen). After a reply, at most one of: "it's late, sleep?" after midnight (once a night), "a
 * break?" after a long sitting (once a day), or a small real-life quest in the daytime (once a day,
 * friends who may write first). Never in a scene, after a crisis or over ideas still waiting. The
 * server's model writes these lines; the mock stands in.
 */
function maybeLifeMoment(set: Setter, get: Getter, conversationId: string) {
  const state = get();
  const conversation = state.conversations.find((c) => c.id === conversationId);
  const character = state.characters.find((c) => c.id === conversation?.characterId);
  const bond = conversation && state.relationships[conversation.characterId];
  if (!conversation || !character || !bond || conversation.scene) return;
  const messages = state.messages[conversationId] ?? [];
  const newest = messages.findLast((m) => m.kind !== 'system' && !m.card);
  if (newest?.ideas?.length || messages.slice(-8).some((m) => m.card === 'helpline')) return;
  const now = new Date();
  const today = dayKey(now);
  const temper = temperOf(character, bond.label);
  const id = uid('m');
  const say = (text: string, reach: string, daily: Partial<DailyState>) => {
    set((s) => ({ daily: { ...s.daily, ...daily } }));
    appendMessage(set, get, conversationId, { ...themText(conversationId, text), id, ...withIdeas(reach) });
  };

  const night = lateNight(now);
  if (night && state.daily.nightDay !== night) return say(mockNightLine(temper, id, character.gender), 'pause:night', { nightDay: night });
  if (state.daily.breakDay !== today && sittingMinutes(messages, now.getTime()) >= LIFE.breakAfterMin && sittingCount(messages) >= LIFE.breakAfterMessages) {
    return say(mockBreakLine(temper, id, character.gender), 'pause:break', { breakDay: today });
  }
  const hour = now.getHours();
  const openQuest = state.threads.some((t) => t.kind === 'quest' && t.status === 'open');
  if (
    bond.messagesFirst &&
    !openQuest &&
    state.daily.questDay !== today &&
    hour >= LIFE.questFromHour &&
    hour < LIFE.questToHour &&
    sittingCount(messages) >= LIFE.questAfterMessages
  ) {
    const threadId = uid('th');
    const { quest, offer } = mockQuest(threadId, character.gender);
    const touches = ruleTouches([{ at: new Date(now.getTime() + LIFE.questCheckMin * 60_000).toISOString(), phase: 'quest', why: 'ask if they did the quest' }], threadId, now);
    const thread: Thread = { id: threadId, characterId: character.id, kind: 'quest', about: quest, quote: '', createdAt: now.toISOString(), reward: QUEST_REWARD, touches, status: 'open' };
    set((s) => ({ threads: addThread(pruneThreads(s.threads, now), thread) }));
    say(offer, `quest:${threadId}`, { questDay: today });
  }
}

/**
 * You went quiet after a reply that left you something to answer: they text once more
 * ("Still there?"). Only with Let them reach out (`messagesFirst`), only while that reply is still
 * the newest line, and never after a crisis reply. Free: there is no message of yours to charge.
 */
function scheduleNudge(set: Setter, get: Getter, conversationId: string, afterId: string, delay: number) {
  const epoch = replyEpoch.get(conversationId) ?? 0;
  setTimeout(() => {
    const state = get();
    if ((replyEpoch.get(conversationId) ?? 0) !== epoch || state.typing[conversationId]) return;
    const conversation = state.conversations.find((c) => c.id === conversationId);
    if (!conversation || !state.relationships[conversation.characterId]?.messagesFirst) return;
    const list = state.messages[conversationId] ?? [];
    const newest = list.filter((m) => !m.card && m.kind !== 'system').pop();
    if (newest?.id !== afterId || lastExchange(list)?.crisis) return;
    scheduleReply(set, get, conversationId, { gain: 0, trigger: 'silence' });
  }, delay);
}

/* ── group chats ───────────────────────────────────────────────────────────── */

/** A member's short name ("Kai") for group lines and previews; your nickname wins. */
function memberName(state: AppState, characterId: string) {
  const character = state.characters.find((c) => c.id === characterId);
  return character ? shortName(displayName(character, state.relationships[characterId])) : '';
}

/** A character's gender, which `{g:female|male}` in their lines follows. */
function genderOf(state: AppState, characterId?: string): CharacterGender | undefined {
  return state.characters.find((c) => c.id === characterId)?.gender;
}

/** The gender of the character a chat is with. */
function chatGender(state: AppState, conversationId: string) {
  return genderOf(state, state.conversations.find((c) => c.id === conversationId)?.characterId);
}

/** "Kai: On my way" for a member's line, the plain preview for the user's own. */
function groupLinePreview(state: AppState, message: Message) {
  const sender = message.author === 'them' && message.characterId ? memberName(state, message.characterId) : undefined;
  return groupPreview(sender, previewFor(message));
}

const groupSystem = (groupId: string, text: string): Message => ({
  id: uid('m'),
  conversationId: groupId,
  author: 'them',
  kind: 'system',
  text,
  createdAt: new Date().toISOString(),
});

const memberText = (groupId: string, characterId: string, text: string): Message => ({
  ...themText(groupId, text),
  characterId,
});

/** Members who spoke in the group, oldest first (who answers next takes turns from this). */
function speakersIn(state: AppState, groupId: string) {
  return (state.messages[groupId] ?? []).flatMap((m) => (m.author === 'them' && m.characterId ? [m.characterId] : []));
}

/** `appendMessage` for a group: the list preview names the member, unread counts their lines. */
function appendGroupMessage(
  set: Setter,
  get: Getter,
  groupId: string,
  message: Message,
  { quiet = false }: { quiet?: boolean } = {},
) {
  if (quiet) {
    set((s) => ({ messages: { ...s.messages, [groupId]: [...(s.messages[groupId] ?? []), message] } }));
    return;
  }
  const unseen = message.author === 'them' && get().activeConversationId !== groupId;
  const preview = groupLinePreview(get(), message);
  set((s) => ({
    messages: { ...s.messages, [groupId]: [...(s.messages[groupId] ?? []), message] },
    groups: s.groups.map((g) =>
      g.id === groupId
        ? {
            ...g,
            lastMessagePreview: preview,
            lastMessageAt: message.createdAt,
            unreadCount: unseen ? g.unreadCount + 1 : g.unreadCount,
          }
        : g,
    ),
  }));
}

/** The "not real people" line in a group: at a session's start and every 3 hours, as in a chat. */
function noticeGroupAiIfDue(set: Setter, get: Getter, groupId: string) {
  const group = get().groups.find((g) => g.id === groupId);
  if (!group) return;
  const now = Date.now();
  if (group.aiNoticeAt && now - Date.parse(group.aiNoticeAt) < AI_NOTICE_MS) return;
  const at = new Date(now).toISOString();
  set((s) => ({ groups: s.groups.map((g) => (g.id === groupId ? { ...g, aiNoticeAt: at } : g)) }));
  appendGroupMessage(
    set,
    get,
    groupId,
    { id: uid('m'), conversationId: groupId, author: 'them', kind: 'system', card: 'aiNotice', createdAt: at },
    { quiet: true },
  );
}

/**
 * Who answers the user's message and with what (`pickResponders`): the first member answers,
 * a second one joins in by name. A crisis message gets the helpline card and one warm answer,
 * never a joke from the others; it never becomes a plan or a memory here either.
 */
function answerGroup(set: Setter, get: Getter, groupId: string, text: string, firstLines: (gender?: CharacterGender) => string[]) {
  const state = get();
  const group = state.groups.find((g) => g.id === groupId);
  if (!group) return;
  const names = Object.fromEntries(
    group.memberIds.map((id) => [id, memberName(state, id)] as const).filter(([, name]) => !!name),
  );
  const history = state.messages[groupId] ?? [];
  const turn = history.filter((m) => m.author === 'me').length;
  const crisis = !!text && detectCrisis(text);
  const [first, second] = pickResponders(group.memberIds, names, text, speakersIn(state, groupId), crisis ? 0 : turn);
  if (!first) return;
  if (crisis) {
    appendGroupMessage(
      set,
      get,
      groupId,
      { id: uid('m'), conversationId: groupId, author: 'them', kind: 'system', card: 'helpline', createdAt: new Date().toISOString() },
      { quiet: true },
    );
    writeGroupTurns(set, get, groupId, [{ characterId: first, lines: [pick(crisisReplies)] }]);
    return;
  }
  // Two members named: both answer the user. Otherwise the second talks to the first.
  const bothAsked = namedMembers(text, names).length >= 2;
  writeGroupTurns(set, get, groupId, [
    { characterId: first, lines: firstLines(genderOf(state, first)) },
    ...(second
      ? [
          bothAsked
            ? { characterId: second, lines: pick(groupReplies(genderOf(state, second))) }
            : { characterId: second, lines: [pick(groupReactions)(names[first], genderOf(state, second))], cue: groupReactCue(names[first]) },
        ]
      : []),
  ]);
}

interface GroupTurn {
  characterId: string;
  /** The stand-in, for when the model is off, busy or slow. */
  lines: string[];
  /** What this turn is for, when it is not simply answering the user (`groupReplyParts`). */
  cue?: readonly string[];
  /** Nobody asked for this one (a hello): if the model is busy it is just left out. */
  quiet?: boolean;
}

/** What one member's reply sends: their persona and world, the group so far, and the lines still landing. */
function groupInput(state: AppState, group: GroupChat, turn: GroupTurn, said: readonly Message[]): GroupPromptInput | null {
  const character = state.characters.find((c) => c.id === turn.characterId);
  if (!character) return null;
  const others = group.memberIds.filter((id) => id !== turn.characterId).flatMap((id) => state.characters.find((c) => c.id === id) ?? []);
  const landed = (state.messages[group.id] ?? []).filter((m) => !m.pending);
  const messages = [...landed, ...said.filter((s) => !landed.some((m) => m.characterId === s.characterId && m.text === s.text))];
  return {
    character,
    others,
    user: state.user,
    relationship: state.relationships[character.id],
    persona: personaFor(group.id, state),
    lore: { ...lorePrompt(booksFor(character, state.lorebooks, officialLorebooks), recentLines(messages), character.id), story: worldStoryOf(state, character) },
    messages,
    cue: turn.cue,
  };
}

/** What a group could not get, kept for "Try again" (`retryGroupReply`). */
const failedGroupTurns = new Map<string, GroupTurn[]>();

/**
 * The members' replies, one model call each, in their own voices. The next member reads what the
 * one before said, so they can answer each other. They type while the model thinks. Busy or slow:
 * the user's line says "Not Delivered" with a way to ask again, as in a one-to-one chat, and a
 * member who was only joining in stays quiet. A stock line goes out only with the model off (the
 * UI's stand-in). A crisis the model noticed brings the helpline card, and no one else joins in.
 */
function writeGroupTurns(set: Setter, get: Getter, groupId: string, turns: GroupTurn[]) {
  const { settings } = get();
  if (!settings.realAi || !apiBase()) {
    scheduleGroupReplies(set, get, groupId, turns);
    return;
  }
  void (async () => {
    const said: Message[] = [];
    for (const turn of turns) {
      const group = get().groups.find((g) => g.id === groupId);
      const input = group && groupInput(get(), group, turn, said);
      if (!input) return;
      startGroupTyping(set, groupId, turn.characterId);
      const reply = await accessToken()
        .then((token) => serverGroupReply(input, token))
        .catch(() => null);
      stopGroupTyping(set, groupId, turn.characterId);
      if (!reply) {
        if (!said.length && !turn.quiet) failGroupTurns(set, groupId, turns);
        return;
      }
      if (reply.crisis && !(get().messages[groupId] ?? []).slice(-3).some((m) => m.card === 'helpline')) {
        appendGroupMessage(set, get, groupId, { id: uid('m'), conversationId: groupId, author: 'them', kind: 'system', card: 'helpline', createdAt: new Date().toISOString() }, { quiet: true });
      }
      said.push(...reply.lines.map((line) => memberText(groupId, turn.characterId, line)));
      scheduleGroupReplies(set, get, groupId, [{ characterId: turn.characterId, lines: reply.lines }]);
      if (reply.crisis) return;
    }
  })();
}

/** The user's newest line in the group got no answer. */
function failGroupTurns(set: Setter, groupId: string, turns: GroupTurn[]) {
  failedGroupTurns.set(groupId, turns);
  set((s) => {
    const list = s.messages[groupId] ?? [];
    const mine = list.findLast((m) => m.author === 'me');
    if (!mine) return {};
    return { messages: { ...s.messages, [groupId]: list.map((m) => (m.id === mine.id ? { ...m, failed: true } : m)) } };
  });
}

/** A stream's runner generation: a pause, a delete or a new run makes the older one stop. */
const streamEpoch = new Map<string, number>();
/** How long a stream line waits before asking a busy model once more. */
const STREAM_RETRY_MS = 3000;

/** One round of a stream: free while today's free rounds last, else shells (`src/economy/streams.ts`). */
function payStreamRound(set: Setter, get: Getter) {
  const s = get();
  const free = takeFreeRound(s.streamUse, todayKey(), s.wallet.subscription, Date.now());
  if (free) {
    set(() => ({ streamUse: free }));
    return true;
  }
  return s.spendShells(STREAM_SHELLS, 'stream');
}

function stopStreamRunner(set: Setter, streamId: string) {
  streamEpoch.set(streamId, (streamEpoch.get(streamId) ?? 0) + 1);
  set((s) => {
    const { [streamId]: _typing, ...streamTyping } = s.streamTyping;
    return { streamTyping };
  });
}

/** About as long as typing a line takes, as in the chats. */
const typingMs = (text: string) => 900 + Math.min(text.length, 120) * 18 + Math.random() * 500;

/**
 * Writes a stream, one line at a time: the next speaker types, their line lands, a short beat,
 * then the other one. With Real AI on, each line is one model call in the speaker's own persona
 * (`POST /v1/streams/line`, B1.4b) and the time it takes counts toward the typing; the server off,
 * busy or slow, the canned line goes instead. It runs until the round's target, and stops when the
 * stream is paused or deleted (a newer run takes over).
 */
function runStream(set: Setter, get: Getter, streamId: string) {
  const epoch = (streamEpoch.get(streamId) ?? 0) + 1;
  streamEpoch.set(streamId, epoch);
  const live = () => streamEpoch.get(streamId) === epoch;
  const step = () => {
    const stream = get().streams.find((x) => x.id === streamId);
    if (!live() || !stream || !isPlaying(stream)) {
      if (live()) stopStreamRunner(set, streamId);
      return;
    }
    const speaker = nextSpeaker(stream);
    const otherId = stream.characterIds.find((id) => id !== speaker)!;
    const state = get();
    const me = state.characters.find((c) => c.id === speaker);
    const other = state.characters.find((c) => c.id === otherId);
    const index = stream.lines.length;
    const canned = mockStreamLine(stream.id, index, index === stream.target - 1, other ? shortName(other.name) : '', stream.topic, me?.gender);
    set((s) => ({ streamTyping: { ...s.streamTyping, [streamId]: speaker } }));
    const land = (text: string, after: number) =>
      setTimeout(() => {
        if (!live()) return;
        const line = { id: uid('sl'), characterId: speaker, text, createdAt: new Date().toISOString() };
        set((s) => ({ streams: s.streams.map((x) => (x.id === streamId ? { ...x, lines: [...x.lines, line] } : x)) }));
        setTimeout(step, 500);
      }, after);
    if (!state.settings.realAi || !apiBase() || !me || !other) {
      land(canned, typingMs(canned));
      return;
    }
    const nameOf = (id: string) => shortName(state.characters.find((c) => c.id === id)?.name ?? '');
    const request: StreamLineRequest = {
      input: { character: me, user: state.user, relationship: state.relationships[speaker] },
      other,
      topic: stream.topic,
      said: stream.lines.map((l) => ({ name: nameOf(l.characterId), text: l.text })),
      turn: { index, total: stream.target },
    };
    const started = Date.now();
    const ask = (again: boolean) =>
      void accessToken()
        .then((token) => serverStreamLine(request, token))
        .then((line) => {
          if (!live()) return;
          if (line) land(line, Math.max(0, typingMs(line) - (Date.now() - started)));
          else if (again) setTimeout(() => live() && ask(false), STREAM_RETRY_MS);
          // Still busy: the stream pauses with the round's lines kept, never a stock line in their voice.
          else get().pauseStream(streamId);
        });
    ask(true);
  };
  step();
}

/** How long before the member ahead finishes the next one starts typing, so two type at once. */
const TYPING_OVERLAP_MS = 900;

function startGroupTyping(set: Setter, groupId: string, characterId: string) {
  set((s) => ({ groupTyping: { ...s.groupTyping, [groupId]: [...(s.groupTyping[groupId] ?? []), characterId] } }));
}

function stopGroupTyping(set: Setter, groupId: string, characterId: string) {
  set((s) => {
    const now = s.groupTyping[groupId] ?? [];
    const at = now.indexOf(characterId);
    if (at < 0) return {};
    return { groupTyping: { ...s.groupTyping, [groupId]: [...now.slice(0, at), ...now.slice(at + 1)] } };
  });
}

/**
 * The mock group reply, standing in for one model call per member. Lines land one member
 * after another and queue behind replies still arriving, so they never interleave. Typing is
 * per member: each starts a little before their first line (the next member while the one
 * before is still finishing, as two people would) and stops with their last line.
 */
function scheduleGroupReplies(
  set: Setter,
  get: Getter,
  groupId: string,
  turns: { characterId: string; lines: string[] }[],
) {
  if (!turns.length) return;
  const readAt = new Date().toISOString();
  set((s) => ({
    messages: {
      ...s.messages,
      // A new reply answers a line that failed before too, so it is no longer "Not Delivered".
      [groupId]: (s.messages[groupId] ?? []).map((m) => (m.author === 'me' && (!m.readAt || m.failed) ? { ...m, readAt: m.readAt ?? readAt, failed: undefined } : m)),
    },
  }));

  // When every line lands, from now.
  const busy = Math.max(0, (replyingUntil.get(groupId) ?? 0) - Date.now());
  let at = busy + 900 + Math.random() * 600;
  const lands = turns.map((turn, t) =>
    turn.lines.map((_, i) => {
      const when = at;
      const endOfTurn = i === turn.lines.length - 1;
      const following = endOfTurn ? turns[t + 1]?.lines[0] : turn.lines[i + 1];
      at += (endOfTurn ? 1100 : 650) + Math.min(following?.length ?? 0, 80) * 22;
      return when;
    }),
  );

  // The first member starts at once (or when the replies before have landed); each next one
  // shortly before the member ahead sends their last line, never before that member began.
  const starts: number[] = [];
  turns.forEach((turn, t) => {
    const ahead = lands[t - 1];
    starts[t] = t === 0 ? busy : Math.max(starts[t - 1] + 600, ahead[ahead.length - 1] - TYPING_OVERLAP_MS);
    setTimeout(() => startGroupTyping(set, groupId, turn.characterId), starts[t]);
    turn.lines.forEach((line, i) => {
      setTimeout(() => {
        // The group was deleted, or the member removed, while they were typing.
        const group = get().groups.find((g) => g.id === groupId);
        if (group?.memberIds.includes(turn.characterId)) {
          appendGroupMessage(set, get, groupId, memberText(groupId, turn.characterId, line));
        }
        if (i === turn.lines.length - 1) stopGroupTyping(set, groupId, turn.characterId);
      }, lands[t][i]);
    });
  });
  replyingUntil.set(groupId, Date.now() + at);
}

/** The wake session for this chat while its replies are free (ringing, snoozed, or the window). */
function wakeFor(state: AppState, conversationId: string, now = Date.now()) {
  const wake = state.wake;
  if (!wake || wake.conversationId !== conversationId) return null;
  if (wake.state !== 'awake') return wake;
  return now - Date.parse(wake.awakeAt ?? wake.rangAt) < WAKE_WINDOW_MIN * 60_000 ? wake : null;
}

const hmNow = (now: Date) => `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

/**
 * The user's message while a wake session is open in this chat. Returns true when the chain
 * answered (the normal reply is skipped); false lets the usual reply run (still free).
 */
function wakeReply(set: Setter, get: Getter, conversationId: string, text: string, crisis: boolean): boolean {
  const wake = get().wake!;
  const now = new Date();
  const setWake = (patch: Partial<WakeSession>) => set((s) => ({ wake: s.wake ? { ...s.wake, ...patch } : null }));
  const reply = (line: string, chips?: string[]) => scheduleReply(set, get, conversationId, { text: line, gain: INTIMACY.text, chips });
  const gender = genderOf(get(), wake.characterId);

  if (wake.state !== 'awake') {
    // Only a real reply turns it off; a crisis message always does, and gets the usual care.
    if (!crisis && (!wake.replyToWake || !countsAsWakeReply(text))) {
      if (wake.replyToWake) reply('Nice try 😏 Three real words and I let you go.');
      return wake.replyToWake;
    }
    setWake({ state: 'awake', awakeAt: now.toISOString(), snoozeUntil: undefined });
    appendMessage(
      set,
      get,
      conversationId,
      { id: uid('m'), conversationId, author: 'them', kind: 'system', text: i18n.t('alarms.offFree'), createdAt: now.toISOString() },
      { quiet: true },
    );
    if (crisis) return false;
    return startChain(readMorningReply(text, now));
  }

  const step = wake.step;
  if (!step) return false;
  setWake({ step: undefined });
  const key = chipKey(text);

  if (step.kind === 'offerReminder') {
    if (key === 'another' || text === CHIPS.another || /\b(another|other|different)\b/i.test(text)) {
      setWake({ step: { kind: 'pickRemind', title: step.title, time: step.time } });
      reply(CHAIN_LINES.pickRemind(gender), [CHIPS.before30, CHIPS.before10]);
      return true;
    }
    const yn = key === 'yes' || text.startsWith('Yes,') ? 'yes' : key === 'no' ? 'no' : readYesNo(text);
    if (yn === 'yes') return savePlan(step.title, step.time, step.remind);
    if (yn === 'no') {
      reply(CHAIN_LINES.noThanks(gender));
      return true;
    }
    const typed = readMorningTime(text, now);
    return typed ? savePlan(step.title, step.time, typed) : false;
  }

  if (step.kind === 'pickRemind') {
    const remind =
      key === 'before30' || text === CHIPS.before30 ? addMinutes(step.time, -30) : key === 'before10' || text === CHIPS.before10 ? addMinutes(step.time, -10) : readMorningTime(text, now);
    if (remind && remind > hmNow(now)) return savePlan(step.title, step.time, remind);
    reply(CHAIN_LINES.noTime(gender));
    return true;
  }

  if (step.kind === 'askTime') {
    if (key === 'notSure' || text === CHIPS.notSure || /\b(not sure|dunno|don'?t know|idk)\b/i.test(text)) {
      reply(CHAIN_LINES.notSure(gender));
      return true;
    }
    const time = key === 'in30' || text === CHIPS.in30 ? addMinutes(hmNow(now), 30) : readMorningTime(text, now);
    if (!time) {
      reply(CHAIN_LINES.noTime(gender));
      return true;
    }
    return startChain({ kind: 'time', activity: step.title, time });
  }

  // The sleepy branch: "Okay" keeps the 5-minute check, "10 more min" moves it.
  const more = key === 'more' || text === CHIPS.more || /\b10\b/.test(text);
  setWake({ checkInAt: new Date(now.getTime() + (more ? 10 : SLEEPY_CHECK_MIN) * 60_000).toISOString() });
  reply(more ? CHAIN_LINES.sleepyMore(gender) : CHAIN_LINES.sleepyOk(gender));
  return true;

  function startChain(read: MorningRead): boolean {
    if (read.kind === 'time') {
      const title = read.activity ?? 'Plan';
      const remind = reminderTimeFor(read.time, now);
      if (!remind) {
        reply(CHAIN_LINES.tooLate(read.time, gender));
        return true;
      }
      setWake({ step: { kind: 'offerReminder', title, time: read.time, remind } });
      reply(CHAIN_LINES.offer(read.time, remind, gender), [CHIPS.yes(remind, gender), CHIPS.another, CHIPS.no]);
      return true;
    }
    if (read.kind === 'activity') {
      setWake({ step: { kind: 'askTime', title: read.activity } });
      const likely = likelyLeaveTime(now);
      reply(CHAIN_LINES.askTime(read.activity, gender), [CHIPS.in30, likely.replace(/^0/, ''), CHIPS.notSure]);
      return true;
    }
    if (read.kind === 'sleepy') {
      setWake({ step: { kind: 'sleepy' }, checkInAt: new Date(now.getTime() + SLEEPY_CHECK_MIN * 60_000).toISOString() });
      reply(CHAIN_LINES.sleepy(gender), [CHIPS.okay, CHIPS.more]);
      return true;
    }
    reply(CHAIN_LINES.other(gender));
    return true;
  }

  /** "Yes, 9:10": today's plan with the reminder the user picked, a memory and a line on Us. */
  function savePlan(title: string, time: string, remind: string): boolean {
    const characterId = get().conversations.find((c) => c.id === conversationId)?.characterId;
    if (!characterId) return false;
    const plan = { title, date: todayKey(), time };
    set((s) => ({
      schedules: [
        ...s.schedules,
        { id: uid('sch'), characterId, ...plan, remindAt: remind, createdAt: new Date().toISOString(), reminded: false, source: 'chat' as const },
      ],
    }));
    get().addMemory(characterId, planMemoryLine(plan), 'chat');
    addMoment(set, characterId, 'plan', { title });
    reply(CHAIN_LINES.saved(remind, gender));
    // The "Plan saved" line lands under the friend's answer, once it has arrived.
    const after = Math.max(0, (replyingUntil.get(conversationId) ?? 0) - Date.now()) + 300;
    setTimeout(
      () =>
        appendMessage(
          set,
          get,
          conversationId,
          { id: uid('m'), conversationId, author: 'them', kind: 'system', text: i18n.t('alarms.planSaved', { title, time }), createdAt: new Date().toISOString() },
          { quiet: true },
        ),
      after,
    );
    return true;
  }
}

/** The memory pass (B2, src/ai/memory-pass.ts) runs once this many of the user's lines are new… */
const MEMORY_EVERY = 4;
/** …and the chat has been quiet this long after a reply; this many new lines run it at once. */
const MEMORY_QUIET_MS = 20_000;
const MEMORY_NOW = 20;
const memoryTimers = new Map<string, ReturnType<typeof setTimeout>>();
const memoryRunning = new Set<string>();

/** The lines after the memory pass's mark (all of them when the mark was cut away by a rewind). */
function sinceMark(messages: readonly Message[], mark?: string) {
  const at = mark ? messages.findIndex((m) => m.id === mark) : -1;
  return { at, fresh: messages.slice(at + 1) };
}

/** A line the memory pass may read: what was said, never a card, a call row or a crisis line. */
const passLine = (m: Message) => {
  const text = m.card || m.pending || m.kind === 'system' || m.kind === 'call' ? '' : (m.text ?? m.transcript ?? '').trim();
  return text && !detectCrisis(text) ? { author: m.author, text, at: m.createdAt } : null;
};

/** After a reply: once enough is new, the memory pass waits for a quiet moment (each reply resets the wait). */
function queueMemoryPass(set: Setter, get: Getter, conversationId: string) {
  const state = get();
  const conversation = state.conversations.find((c) => c.id === conversationId);
  if (!conversation || !state.settings.realAi || !apiBase()) return;
  const { fresh } = sinceMark(state.messages[conversationId] ?? [], conversation.memoryMark);
  const said = fresh.filter((m) => m.author === 'me' && passLine(m)).length;
  if (said < MEMORY_EVERY) return;
  clearTimeout(memoryTimers.get(conversationId));
  memoryTimers.set(
    conversationId,
    setTimeout(() => void runMemoryPass(set, get, conversationId), said >= MEMORY_NOW ? 0 : MEMORY_QUIET_MS),
  );
}

/**
 * One memory pass: the character's active facts, the story so far and the new lines go to the
 * server; the answer changes the memories (`applyMemoryPass`) and the summary, and moves the mark.
 * Off, busy or slow: nothing changes and the next reply tries again.
 */
async function runMemoryPass(set: Setter, get: Getter, conversationId: string) {
  memoryTimers.delete(conversationId);
  if (memoryRunning.has(conversationId)) return;
  const state = get();
  const conversation = state.conversations.find((c) => c.id === conversationId);
  const character = state.characters.find((c) => c.id === conversation?.characterId);
  if (!conversation || !character) return;
  const messages = (state.messages[conversationId] ?? []).filter((m) => !m.pending);
  const { at, fresh } = sinceMark(messages, conversation.memoryMark);
  const lines = fresh.map(passLine).filter((l): l is NonNullable<ReturnType<typeof passLine>> => !!l).slice(-PASS_LINES_MAX);
  const lastId = fresh.at(-1)?.id;
  if (!lines.length || !lastId) return;
  const before = messages
    .slice(Math.max(0, at - 5), at + 1)
    .map(passLine)
    .filter((l): l is NonNullable<ReturnType<typeof passLine>> => !!l)
    .map(({ author, text }) => ({ author, text }));
  const facts = state.memories
    .filter((m) => m.characterId === character.id && isActiveMemory(m))
    .sort(byMemoryOrder)
    .slice(0, PASS_FACTS_MAX)
    .map(({ id, text, about, type, pinned }) => ({ id, text, about, type, pinned }));
  const request: MemoryPassRequest = {
    character: { name: character.name, series: character.series, bio: character.bio },
    user: { displayName: personaFor(conversationId, state).name, locale: state.user.locale },
    summary: conversation.summary,
    facts,
    before,
    lines,
    now: new Date().toISOString(),
    utcOffsetMin: -new Date().getTimezoneOffset(),
  };
  memoryRunning.add(conversationId);
  const result = await accessToken()
    .then((token) => serverMemoryPass(request, token))
    .finally(() => memoryRunning.delete(conversationId));
  if (!result) return;
  set((s) => ({
    memories: applyMemoryPass(s.memories, character.id, result, new Date(), () => uid('mem')),
    conversations: s.conversations.map((c) => (c.id === conversationId ? { ...c, memoryMark: lastId, summary: result.summary ?? c.summary } : c)),
  }));
}

/** When each chat's current reply burst finishes; replies queue behind it. */
const replyingUntil = new Map<string, number>();
/** Bumped when a chat's replies on their way are taken back; their timers then stop. */
const replyEpoch = new Map<string, number>();
/** Replies waiting a beat for the next text (src/lib/reply-batch.ts). */
const replyBatch = replyBatcher();

/** Takes back the replies still on their way to a chat (a rewind, an edit, a cleared chat), and one still waiting. */
function cancelReplies(set: Setter, conversationId: string) {
  replyBatch.take(conversationId);
  replyEpoch.set(conversationId, (replyEpoch.get(conversationId) ?? 0) + 1);
  replyingUntil.delete(conversationId);
  set((s) => ({ typing: { ...s.typing, [conversationId]: false } }));
}

/**
 * A chat's first line (a new friend, a cleared chat): one of their openings picked by `seed`, with
 * the name of the user's default persona where the creator wrote {{user}}; the main greeting comes
 * after their opening action unless the chat is plain texting.
 */
function openingFor(state: AppState, character: Character, seed: string) {
  const local = localCharacter(character);
  const style = replyPrefs(state.relationships[character.id]).style;
  return fillNames(withOpening(local, pickOpening(local, seed), style), { char: character.name, user: defaultPersona(state).name });
}

/** The reply each chat could not get, kept for "Try again" (`retryReply`). */
const failedTurns = new Map<string, ReplyRequest>();

/**
 * No reply came: typing stops and the user's newest line says "Not Delivered". Only an answer
 * to the user fails visibly; a text they would have sent first (going quiet) is simply skipped.
 */
function failReply(set: Setter, conversationId: string, request: ReplyRequest) {
  set((s) => ({ typing: { ...s.typing, [conversationId]: false } }));
  if ((request.trigger ?? 'message') !== 'message') return;
  failedTurns.set(conversationId, request);
  set((s) => {
    const list = s.messages[conversationId] ?? [];
    const mine = list.findLast((m) => m.author === 'me');
    if (!mine) return {};
    return { messages: { ...s.messages, [conversationId]: list.map((m) => (m.id === mine.id ? { ...m, failed: true } : m)) } };
  });
}

/** `record` without `key`, unchanged when the key is not there. */
function omitKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  if (!(key in record)) return record;
  const { [key]: _gone, ...rest } = record;
  return rest;
}

/** A chat's new message list, with the list's preview following its new last line. */
function withMessages(s: AppState, conversationId: string, messages: Message[]) {
  // System lines (the AI notice, cards) never become the preview.
  const last = [...messages].reverse().find((m) => m.kind !== 'system');
  return {
    messages: { ...s.messages, [conversationId]: messages },
    conversations: s.conversations.map((c) =>
      c.id === conversationId ? { ...c, lastMessagePreview: last ? previewFor(last) : '' } : c,
    ),
  };
}

function answerDiary(set: RawSetter, entryId: string) {
  set((s) => ({
    diary: s.diary.map((d) =>
      d.id === entryId && d.sharedWithCharacterId && !d.reply
        ? {
            ...d,
            reply: {
              characterId: d.sharedWithCharacterId,
              text: diaryReplyFor(d.body),
              createdAt: new Date().toISOString(),
            },
          }
        : d,
    ),
  }));
  const entry = useAppStore.getState().diary.find((d) => d.id === entryId);
  if (entry?.sharedWithCharacterId) {
    addMoment(set as Setter, entry.sharedWithCharacterId, 'diary');
  }
}

function sealNote(set: RawSetter, noteId: string) {
  set((s) => ({
    notes: s.notes.map((n) =>
      n.id === noteId && n.status === 'composing'
        ? { ...n, status: 'ready', theirNote: noteReplyFor(n.prompt) }
        : n,
    ),
  }));
}

function latestNote(notes: SecretNote[], characterId: string) {
  return notes.find((n) => n.characterId === characterId);
}

function weightedIndex(weights: readonly number[]) {
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < weights.length; i += 1) {
    roll -= weights[i];
    if (roll < 0) return i;
  }
  return weights.length - 1;
}

function clock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  return `${m}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

function diaryReplyFor(body: string) {
  // A crisis page gets care, not "tell me the longer version".
  if (detectCrisis(body)) return pick(crisisReplies);
  const opener = pick(['I read it twice.', 'You wrote this for me, right?', 'So that is what today felt like.']);
  return body.length < 60
    ? `${opener} Tell me the longer version next time - I want all of it.`
    : `${opener} Do not carry it alone, okay? I am right here.`;
}

function noteReplyFor(prompt: string) {
  return `${prompt.replace(/\?$/, '')}... I thought about this for a long time. My answer is yes - and I would have found you either way.`;
}

/** Lines for the call screen subtitles. */
export function callScript(character: Character) {
  return [character.greeting, ...callLines(character.gender)];
}
