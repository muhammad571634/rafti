import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { inviteCodeFor, normalizeInviteCode } from '@/lib/invite';
import { isBirthday } from '@/lib/profile';
import { detectPlan, planStep } from '@/lib/schedule';
import {
  AD_REWARD,
  INVITE_REWARD,
  SHARE_REWARD,
  DAILY_CHECK_IN,
  FREE_SPINS_PER_DAY,
  MAX_ADS_PER_DAY,
  WHEEL_SEGMENTS,
  WHEEL_WEIGHTS,
  shellCosts,
  callHistory as seedCalls,
  callLines,
  replyBursts,
  birthdayLines,
  interestLines,
  characterDiaryPages as seedCharacterDiary,
  characters as seedCharacters,
  conversations as seedConversations,
  currentUser,
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
  membershipPlans,
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
  afterDateLine,
  schedules as seedSchedules,
  secretNotePrompts,
  secretNotes as seedNotes,
  todayKey,
  wallet as seedWallet,
} from '@/mock';
import { dateEnding, datePlaceById, maxHearts } from '@/mock/dates';
import {
  DARES_FOR_THEM,
  DARES_FOR_YOU,
  quizPackById,
  quizReply,
  TRUTHS_FOR_THEM,
  TRUTHS_FOR_YOU,
} from '@/mock/games';
import { daysTogether, duePages } from '@/mock/diary-writer';
import type {
  AppSettings,
  DateRecord,
  BoardPost,
  BoardStyleId,
  CallRecord,
  Character,
  Conversation,
  DailyState,
  CharacterDiaryPage,
  DiaryEntry,
  LedgerEntry,
  LedgerReason,
  MemberPlan,
  MemoryItem,
  MemorySource,
  Message,
  Moment,
  MomentKind,
  Relationship,
  ScheduleItem,
  SecretNote,
  User,
  Wallet,
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
/** Every new user gets a 15-minute trial of live calls. */
export const CALL_TRIAL_SECONDS = 15 * 60;

export interface DailyRewardEvent {
  amount: number;
  /** 1..7 in the check-in week */
  day: number;
}

export type SendResult = 'sent' | 'noShells' | 'empty';
export type SpendResult = 'ok' | 'noShells' | 'locked' | 'notReady';

interface AppState {
  user: User;
  wallet: Wallet;
  characters: Character[];
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  relationships: Record<string, Relationship>;
  memories: MemoryItem[];
  diary: DiaryEntry[];
  /** Pages characters wrote about the user: the morning after a day spent together. */
  characterDiary: CharacterDiaryPage[];
  /** Ids of character pages the user has opened, for the "New page" mark. */
  diaryPagesRead: string[];
  notes: SecretNote[];
  /** Shell history, newest first */
  ledger: LedgerEntry[];
  calls: CallRecord[];
  moments: Moment[];
  schedules: ScheduleItem[];
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
  /** The chat on screen right now — replies there do not count as unread. */
  activeConversationId: string | null;
  incomingCall: IncomingCall | null;
  dailyReward: DailyRewardEvent | null;
  /** Shells just paid for a share; a small banner shows it and clears it. */
  shareReward: number | null;
  /** The date that has been paid for and not finished yet; the date screen only plays this one. */
  activeDate: { characterId: string; placeId: string } | null;

  /* chat */
  sendText: (conversationId: string, text: string) => SendResult;
  sendVoice: (conversationId: string, durationSec: number, transcript: string) => SendResult;
  sendImage: (conversationId: string, imageUri: string) => SendResult;
  markRead: (conversationId: string) => void;
  setActiveConversation: (conversationId: string | null) => void;
  clearChat: (conversationId: string) => void;
  /** Sets (or with `undefined` clears) the user's reaction on a message. */
  reactToMessage: (conversationId: string, messageId: string, reaction?: string) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;

  /* bonds */
  addFriend: (characterId: string) => string;
  /** Finishes the first launch: who the user is, their first friend and the welcome gift. Returns the chat. */
  completeOnboarding: (input: {
    name: string;
    birthYear: number;
    characterId: string;
    notifications: boolean;
    /** The friend's first question, in the user's language */
    firstAsk: string;
  }) => string;
  addCharacter: (character: Omit<Character, 'id'>) => { characterId: string; conversationId: string };
  resetRelationship: (characterId: string) => void;
  setBackground: (characterId: string, backgroundId: string) => void;
  setNickname: (characterId: string, nickname: string) => void;
  setCharacterPref: (characterId: string, key: 'voiceReplies' | 'messagesFirst', value: boolean) => void;
  addIntimacy: (characterId: string, amount: number) => void;
  /** Picks one of the unlocked relationship labels, or clears it. */
  setRelationshipLabel: (characterId: string, label?: string) => void;
  dismissLevelUp: () => void;

  /* economy */
  spendShells: (amount: number, reason?: LedgerReason, characterId?: string) => boolean;
  addShells: (amount: number, reason?: LedgerReason) => void;
  /** Removes yesterday's unspent check-in shells. Safe to call often. */
  expireFreeShells: () => void;
  claimDailyLogin: () => number;
  dismissDailyReward: () => void;
  watchAd: () => number;
  /** Pays the daily share reward once a day; returns what was paid (0 when already paid today). */
  claimShareReward: () => number;
  dismissShareReward: () => void;
  /** Enters a friend's invite code: both sides get shells once. */
  redeemInvite: (code: string) => 'ok' | 'invalid' | 'own' | 'used';
  spinWheel: () => { index: number; reward: number } | null;
  subscribe: (plan: MemberPlan) => void;

  /* diary */
  addDiaryEntry: (entry: Omit<DiaryEntry, 'id'>) => string;
  deleteDiaryEntry: (id: string) => void;
  markDiaryPageRead: (id: string) => void;
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
  /** The one-time note about the free call trial has been shown. */
  markCallIntroSeen: () => void;

  /* profile */
  updateProfile: (patch: ProfilePatch) => void;
  /** Wipes everything on this device and starts over at onboarding. */
  deleteAccount: () => void;

  /* modules */
  /** Pays for a date at a place on the map; the rounds play on the date screen. */
  beginDate: (characterId: string, placeId: string) => SpendResult;
  /** Ends a date: closeness from the hearts won, a polaroid record, a moment and a text from them. */
  finishDate: (characterId: string, placeId: string, hearts: number, title: string) => DateRecord | null;
  takePhoto: (characterId: string) => SpendResult;

  /* memories, moments, schedules */
  addMemory: (characterId: string, text: string, source?: MemorySource) => void;
  toggleMemoryPin: (id: string) => void;
  deleteMemory: (id: string) => void;
  removeSchedule: (id: string) => void;
  /** A plan added by hand in [Us]; the character acknowledges it in chat. */
  addSchedule: (input: { characterId: string; title: string; date: string; time?: string; whenLabel: string }) => void;
  /** Sends due plan reminders and "how did it go?" messages, and answers board notes. Safe to call often. */
  runTimers: () => void;
  /** Ends a couple quiz: the score lands in chat as a card, they react, closeness grows. */
  finishQuiz: (characterId: string, packId: string, matches: number, title: string) => void;
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
  | 'messages'
  | 'relationships'
  | 'memories'
  | 'diary'
  | 'characterDiary'
  | 'diaryPagesRead'
  | 'notes'
  | 'ledger'
  | 'calls'
  | 'moments'
  | 'schedules'
  | 'boardPosts'
  | 'dates'
  | 'daily'
  | 'settings';

const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

/** Now and then a free reply ends by asking about one of the user's interests. */
function withInterest(lines: string[], interests: string[] | undefined) {
  if (!interests?.length || Math.random() > 0.2) return lines;
  return [...lines, pick(interestLines)(pick(interests))];
}

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

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: currentUser,
      wallet: seedWallet,
      characters: seedCharacters,
      conversations: seedConversations,
      messages: messagesByConversation,
      relationships: Object.fromEntries(seedRelationships.map((r) => [r.characterId, r])),
      memories: seedMemories,
      diary: seedDiary,
      characterDiary: seedCharacterDiary,
      diaryPagesRead: [],
      notes: seedNotes,
      ledger: [],
      calls: seedCalls,
      moments: seedMoments,
      schedules: seedSchedules,
      boardPosts: [],
      dates: [],
      daily: initialDaily,
      settings: initialSettings,

      hydrated: false,
      levelUp: null,
      typing: {},
      activeConversationId: null,
      incomingCall: null,
      dailyReward: null,
      shareReward: null,
      activeDate: null,

      /* ── chat ─────────────────────────────────────────────────────────── */

      sendText: (conversationId, text) => {
        const trimmed = text.trim();
        const conversation = get().conversations.find((c) => c.id === conversationId);
        if (!trimmed || !conversation) return 'empty';
        if (!chargeMessage(get, shellCosts.textMessage, 'chat', conversationId)) return 'noShells';

        appendMessage(set, get, conversationId, {
          id: uid('m'),
          conversationId,
          author: 'me',
          kind: 'text',
          text: trimmed,
          createdAt: new Date().toISOString(),
        });
        touchStreak(set, get, conversation.characterId);

        // "Smart Auto Schedule": a plan in the message becomes a reminder.
        const plan = detectPlan(trimmed);
        let reply: string | undefined;
        if (plan) {
          set((s) => ({
            schedules: [
              ...s.schedules,
              {
                id: uid('sch'),
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
          get().addMemory(conversation.characterId, `${plan.title} - ${plan.when}.`, 'chat');
          addMoment(set, conversation.characterId, 'plan', { title: plan.title });
          reply = scheduleAck(plan.title, plan.when, !!plan.time);
        }

        scheduleReply(set, get, conversationId, { text: reply, gain: INTIMACY.text });
        return 'sent';
      },

      sendVoice: (conversationId, durationSec, transcript) => {
        const conversation = get().conversations.find((c) => c.id === conversationId);
        if (!conversation) return 'empty';
        if (!chargeMessage(get, shellCosts.voiceMessage, 'voice', conversationId)) return 'noShells';

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
        scheduleReply(set, get, conversationId, { gain: INTIMACY.voice });
        return 'sent';
      },

      sendImage: (conversationId, imageUri) => {
        const conversation = get().conversations.find((c) => c.id === conversationId);
        if (!conversation) return 'empty';
        if (!chargeMessage(get, shellCosts.textMessage, 'photo', conversationId)) return 'noShells';

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
        })),

      setActiveConversation: (conversationId) => {
        set({ activeConversationId: conversationId });
        if (conversationId) get().markRead(conversationId);
      },

      clearChat: (conversationId) =>
        set((s) => ({
          messages: { ...s.messages, [conversationId]: [] },
          conversations: s.conversations.map((c) =>
            c.id === conversationId ? { ...c, lastMessagePreview: '', unreadCount: 0 } : c,
          ),
        })),

      reactToMessage: (conversationId, messageId, reaction) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [conversationId]: (s.messages[conversationId] ?? []).map((m) =>
              m.id === messageId ? { ...m, reaction } : m,
            ),
          },
        })),

      deleteMessage: (conversationId, messageId) =>
        set((s) => {
          const rest = (s.messages[conversationId] ?? []).filter((m) => m.id !== messageId);
          const last = rest[rest.length - 1];
          return {
            messages: { ...s.messages, [conversationId]: rest },
            conversations: s.conversations.map((c) =>
              c.id === conversationId ? { ...c, lastMessagePreview: last ? previewFor(last) : '' } : c,
            ),
          };
        }),

      /* ── bonds ────────────────────────────────────────────────────────── */

      addFriend: (characterId) => {
        const existing = get().conversations.find((c) => c.characterId === characterId);
        const character = get().characters.find((c) => c.id === characterId);
        if (existing) return existing.id;

        const conversationId = uid('conv');
        const now = new Date().toISOString();
        const greeting = character?.greeting ?? '';

        set((s) => ({
          conversations: [
            {
              id: conversationId,
              characterId,
              lastMessagePreview: greeting,
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

      completeOnboarding: ({ name, birthYear, characterId, notifications, firstAsk }) => {
        set((s) => ({
          user: { ...s.user, displayName: name, birthYear, onboardedAt: new Date().toISOString() },
          settings: { ...s.settings, morningGreeting: notifications, eveningGreeting: notifications },
        }));
        get().addShells(WELCOME_SHELLS, 'welcome');
        creditCallTime(set, CALL_TRIAL_SECONDS, 'trial');
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

      addCharacter: (character) => {
        const characterId = uid('c');
        set((s) => ({ characters: [{ ...character, id: characterId }, ...s.characters] }));
        const conversationId = get().addFriend(characterId);
        return { characterId, conversationId };
      },

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

      addIntimacy: (characterId, amount) => {
        const existing = get().relationships[characterId];
        if (!existing) return;

        const intimacy = existing.intimacy + amount;
        const next = levelForIntimacy(intimacy);
        // Levels tick up quietly; the celebration is for reaching a new stage.
        const levelledUp = next.level > existing.level && tierForLevel(next.level).key !== tierForLevel(existing.level).key;

        set((s) => ({
          relationships: {
            ...s.relationships,
            [characterId]: {
              ...existing,
              intimacy,
              level: next.level,
              levelTitle: next.levelTitle,
              nextLevelAt: next.nextLevelAt,
            },
          },
          levelUp: levelledUp
            ? { characterId, level: next.level, levelTitle: next.levelTitle }
            : s.levelUp,
        }));

        if (levelledUp) {
          addMoment(set, characterId, 'levelUp', { level: next.level, title: next.levelTitle });
        }
      },

      setRelationshipLabel: (characterId, label) =>
        updateRelationship(set, characterId, (r) =>
          !label || unlockedLabels(r.level).includes(label) ? { label } : {},
        ),

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
        return true;
      },

      addShells: (amount, reason = 'purchase') =>
        set((s) => ({
          wallet: { ...s.wallet, shells: s.wallet.shells + amount },
          ledger: log(s.ledger, amount, reason),
        })),

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
        const today = todayKey();
        const { daily } = get();
        const { day, claimed } = checkInStatus(daily, today);
        if (claimed) return 0;

        const amount = rollCheckIn(day);
        set((s) => ({
          daily: { ...s.daily, lastLoginDay: today, checkInDay: day, checkInAmount: amount },
          wallet: { ...s.wallet, shells: s.wallet.shells + amount, free: { day: today, amount } },
          ledger: log(s.ledger, amount, 'daily'),
          dailyReward: { amount, day },
        }));
        return amount;
      },

      dismissDailyReward: () => set({ dailyReward: null }),

      watchAd: () => {
        const today = todayKey();
        const daily = get().daily;
        const watched = daily.adsDay === today ? daily.adsWatched : 0;
        if (watched >= MAX_ADS_PER_DAY) return 0;

        // Real builds credit this from the rewarded-ad SDK callback.
        set((s) => ({
          daily: { ...s.daily, adsDay: today, adsWatched: watched + 1 },
          wallet: { ...s.wallet, shells: s.wallet.shells + AD_REWARD },
          ledger: log(s.ledger, AD_REWARD, 'ad'),
        }));
        return AD_REWARD;
      },

      claimShareReward: () => {
        const today = todayKey();
        if (get().daily.shareDay === today) return 0;
        set((s) => ({
          daily: { ...s.daily, shareDay: today },
          wallet: { ...s.wallet, shells: s.wallet.shells + SHARE_REWARD },
          ledger: log(s.ledger, SHARE_REWARD, 'share'),
          shareReward: SHARE_REWARD,
        }));
        return SHARE_REWARD;
      },

      dismissShareReward: () => set({ shareReward: null }),

      redeemInvite: (input) => {
        const { user } = get();
        const code = normalizeInviteCode(input);
        if (!code) return 'invalid';
        if (user.redeemedInvite) return 'used';
        if (code === inviteCodeFor(user)) return 'own';
        // The server checks the code exists and credits the friend who sent it.
        set((s) => ({
          user: { ...s.user, redeemedInvite: code },
          wallet: { ...s.wallet, shells: s.wallet.shells + INVITE_REWARD },
          ledger: log(s.ledger, INVITE_REWARD, 'invite'),
        }));
        return 'ok';
      },

      spinWheel: () => {
        const today = todayKey();
        const daily = get().daily;
        const used = daily.spinDay === today ? daily.spinsUsed : 0;
        const adsWatched = daily.adsDay === today ? daily.adsWatched : 0;

        // One free spin a day; after that each spin costs one of the day's ad views.
        const free = used < FREE_SPINS_PER_DAY;
        if (!free && adsWatched >= MAX_ADS_PER_DAY) return null;

        const index = weightedIndex(WHEEL_WEIGHTS);
        const reward = WHEEL_SEGMENTS[index];

        set((s) => ({
          daily: {
            ...s.daily,
            spinDay: today,
            spinsUsed: used + 1,
            ...(free ? {} : { adsDay: today, adsWatched: adsWatched + 1 }),
          },
          wallet: { ...s.wallet, shells: s.wallet.shells + reward },
          ledger: log(s.ledger, reward, 'spin'),
        }));
        return { index, reward };
      },

      subscribe: (planId) => {
        // Real builds complete StoreKit / Play Billing and verify the receipt server-side first.
        const plan = membershipPlans.find((p) => p.id === planId);
        if (!plan) return;
        const base = memberActive(get().wallet) ? new Date(get().wallet.memberUntil!) : new Date();
        base.setDate(base.getDate() + plan.days);
        set((s) => ({
          wallet: { ...s.wallet, isMember: true, memberPlan: planId, memberUntil: base.toISOString() },
        }));
        if (plan.callMinutes) creditCallTime(set, plan.callMinutes * 60, 'membership');
      },

      /* ── diary ────────────────────────────────────────────────────────── */

      addDiaryEntry: (entry) => {
        const id = uid('d');
        set((s) => ({ diary: [{ ...entry, id }, ...s.diary] }));

        const characterId = entry.sharedWithCharacterId;
        if (characterId) {
          get().addIntimacy(characterId, INTIMACY.diaryShare);
          const firstSentence = entry.body.split(/(?<=[.!?])\s/)[0]?.slice(0, 120);
          if (firstSentence) get().addMemory(characterId, firstSentence, 'diary');
          setTimeout(() => answerDiary(set, id), 2200);
        }

        return id;
      },

      deleteDiaryEntry: (id) => set((s) => ({ diary: s.diary.filter((d) => d.id !== id) })),

      markDiaryPageRead: (id) =>
        set((s) => (s.diaryPagesRead.includes(id) ? s : { diaryPagesRead: [...s.diaryPagesRead, id] })),

      writeDueDiaryPages: () => {
        const { conversations, messages, moments, characterDiary } = get();
        const fresh = duePages(daysTogether(conversations, messages, moments), characterDiary);
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
        const pool = secretNotePrompts.filter((p) => p !== previous);

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
        // No call time left: they text instead of ringing a call you could not take.
        if ((get().wallet.callSeconds ?? 0) <= 0) return;
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
          appendMessage(set, get, conversationId, themText(conversationId, pick(missedCallLines)), { countUnread: true });
        }, 1500);
      },

      markCallIntroSeen: () => set((s) => ({ user: { ...s.user, callIntroSeen: true } })),

      /* ── profile ──────────────────────────────────────────────────────── */

      updateProfile: (patch) => set((s) => ({ user: { ...s.user, ...patch } })),

      deleteAccount: () => {
        // Replies and timers still in flight must not write into the fresh state.
        replyingUntil.clear();
        // The server deletes the account later; here the device starts over.
        useAppStore.setState({ ...useAppStore.getInitialState(), hydrated: true }, true);
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
        // Call time is spent second by second; the call screen stops at zero.
        const spent = Math.min(record.durationSec, get().wallet.callSeconds ?? 0);
        if (spent > 0) creditCallTime(set, -spent, 'call', record.characterId);
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

      finishDate: (characterId, placeId, hearts, title) => {
        const place = datePlaceById(placeId);
        const active = get().activeDate;
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
        appendMessage(set, get, conversationId, themText(conversationId, afterDateLine(title, record.ending)), {
          countUnread: true,
        });
        return record;
      },

      takePhoto: (characterId) => {
        if (!get().spendShells(shellCosts.photoBooth, 'photoBooth', characterId)) return 'noShells';
        get().addIntimacy(characterId, INTIMACY.photo);
        addMoment(set, characterId, 'photo');
        return 'ok';
      },

      /* ── memories, schedules ──────────────────────────────────────────── */

      addMemory: (characterId, text, source = 'manual') =>
        set((s) => ({
          memories: [
            { id: uid('mem'), characterId, text, source, createdAt: new Date().toISOString(), pinned: false },
            ...s.memories,
          ],
        })),

      toggleMemoryPin: (id) =>
        set((s) => ({
          memories: s.memories.map((m) => (m.id === id ? { ...m, pinned: !m.pinned } : m)),
        })),

      deleteMemory: (id) => set((s) => ({ memories: s.memories.filter((m) => m.id !== id) })),

      removeSchedule: (id) => set((s) => ({ schedules: s.schedules.filter((x) => x.id !== id) })),

      addSchedule: ({ characterId, title, date, time, whenLabel }) => {
        const clean = title.trim();
        if (!clean) return;
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
        appendMessage(set, get, conversationId, themText(conversationId, planAddedLine(clean, whenLabel)), {
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
          const line = step === 'remind' ? scheduleReminder(item.title, !!item.time) : planFollowUp(item.title);
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

        const answered = get().boardPosts.filter((p) => !p.replied && new Date(p.replyAt).getTime() <= now.getTime());
        answered.forEach((post) => {
          if (!exists(post.characterId)) return;
          const conversationId = get().addFriend(post.characterId);
          const line = post.reply ?? boardReply(post.text);
          appendMessage(set, get, conversationId, themText(conversationId, line), { countUnread: true });
        });
        if (answered.length) {
          const ids = new Set(answered.map((p) => p.id));
          set((s) => ({ boardPosts: s.boardPosts.map((p) => (ids.has(p.id) ? { ...p, replied: true } : p)) }));
        }
      },

      finishQuiz: (characterId, packId, matches, title) => {
        const pack = quizPackById(packId);
        if (!pack) return;
        const total = pack.questions.length;
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

      playTruthOrDare: (characterId, target, kind) => {
        const conversationId = get().addFriend(characterId);
        if (target === 'you') {
          const ask = pick(kind === 'truth' ? TRUTHS_FOR_YOU : DARES_FOR_YOU);
          appendMessage(set, get, conversationId, themText(conversationId, ask));
          return ask;
        }
        const turn = pick(kind === 'truth' ? TRUTHS_FOR_THEM : DARES_FOR_THEM);
        appendMessage(set, get, conversationId, {
          id: uid('m'),
          conversationId,
          author: 'me',
          kind: 'text',
          text: turn.ask,
          createdAt: new Date().toISOString(),
        });
        scheduleReply(set, get, conversationId, { text: turn.answer, gain: INTIMACY.truthOrDare });
        return turn.ask;
      },

      postBoardNote: (characterId, text, style) => {
        const clean = text.trim();
        if (!clean) return 'empty';
        if (!get().spendShells(shellCosts.boardNote, 'board', characterId)) return 'noShells';
        const createdAt = new Date();
        set((s) => ({
          boardPosts: [
            ...s.boardPosts,
            {
              id: uid('bp'),
              characterId,
              text: clean,
              style,
              createdAt: createdAt.toISOString(),
              reply: boardReply(clean),
              replyAt: new Date(createdAt.getTime() + BOARD_REPLY_MS).toISOString(),
              replied: false,
            },
          ],
        }));
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
            appendMessage(set, get, conversationId, themText(conversationId, pick(birthdayLines)(user.displayName)), {
              countUnread: true,
            });
          });
          set((s) => ({ user: { ...s.user, birthdayWishedYear: now.getFullYear() } }));
        }

        if (!slot) return {};
        const slotKey = `${today}:${slot}`;

        // 2. "Say Hi & Goodnight" — the top two bonds text first.
        const greet = slot === 'morning' ? settings.morningGreeting : settings.eveningGreeting;
        if (greet && !daily.greetedSlots.includes(slotKey)) {
          bonds.slice(0, 2).forEach((bond) => {
            const conversationId = get().addFriend(bond.characterId);
            const line = pick(slot === 'morning' ? morningGreetings : eveningGreetings);
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
        return { callFrom: caller.characterId, slot };
      },

      setSetting: (key, value) => set((s) => ({ settings: { ...s.settings, [key]: value } })),
    }),
    {
      name: STORE_KEY,
      version: 6,
      migrate: (persisted, version) => {
        let state = persisted as PersistedState & { wallet?: Wallet & { acorns?: number } };
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
        // v6: live-call time became its own balance; everyone already here gets the trial.
        if (version < 6 && state.wallet && state.wallet.callSeconds == null) {
          state.wallet = { ...state.wallet, callSeconds: CALL_TRIAL_SECONDS };
        }
        if (version < 4 && state.user) state.user = { ...state.user, onboardedAt: state.user.onboardedAt ?? new Date().toISOString() };
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
          // Seed pages come from code; pages written on this device are kept.
          characterDiary: [
            ...seedCharacterDiary,
            ...(saved.characterDiary ?? []).filter((p) => !seedCharacterDiary.some((seed) => seed.id === p.id)),
          ],
        };
      },
      partialize: (s): Pick<AppState, PersistedKeys> => ({
        user: s.user,
        wallet: s.wallet,
        characters: s.characters,
        conversations: s.conversations,
        messages: s.messages,
        relationships: s.relationships,
        memories: s.memories,
        diary: s.diary,
        characterDiary: s.characterDiary,
        diaryPagesRead: s.diaryPagesRead,
        notes: s.notes,
        ledger: s.ledger,
        calls: s.calls,
        moments: s.moments,
        schedules: s.schedules,
        boardPosts: s.boardPosts,
        dates: s.dates,
        daily: s.daily,
        settings: s.settings,
      }),
      onRehydrateStorage: () => () => {
        // Work that was mid-flight when the app closed finishes now.
        const { notes, diary } = useAppStore.getState();
        notes.filter((n) => n.status === 'composing').forEach((n) => sealNote(useAppStore.setState, n.id));
        diary
          .filter((d) => d.sharedWithCharacterId && !d.reply)
          .forEach((d) => answerDiary(useAppStore.setState, d.id));
        useAppStore.getState().expireFreeShells();
        useAppStore.getState().writeDueDiaryPages();
        useAppStore.setState({ hydrated: true });
      },
    },
  ),
);

/* ── selectors ─────────────────────────────────────────────────────────────── */

export const memberActive = (wallet: Wallet) =>
  wallet.isMember && !!wallet.memberUntil && new Date(wallet.memberUntil).getTime() > Date.now();

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

/** Members chat for free; everyone else spends shells per message. */
function chargeMessage(get: Getter, cost: number, reason: LedgerReason, conversationId: string) {
  if (memberActive(get().wallet)) return true;
  const characterId = get().conversations.find((c) => c.id === conversationId)?.characterId;
  return get().spendShells(cost, reason, characterId);
}

/** Moves the call-time balance and books it in the history, in seconds. */
function creditCallTime(set: Setter, seconds: number, reason: LedgerReason, characterId?: string) {
  set((s) => ({
    wallet: { ...s.wallet, callSeconds: Math.max(0, (s.wallet.callSeconds ?? 0) + seconds) },
    ledger: [{ ...log([], seconds, reason, characterId)[0], unit: 'seconds' as const }, ...s.ledger],
  }));
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
  { countUnread = message.author === 'them' }: { countUnread?: boolean } = {},
) {
  const unseen = countUnread && get().activeConversationId !== conversationId;
  const preview = previewFor(message);

  set((s) => ({
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

/** The one-line preview on the conversation list. */
function previewFor(message: Message) {
  switch (message.kind) {
    case 'voice':
      return '\u{1F3A4} Voice message';
    case 'image':
      return '\u{1F4F7} Photo';
    case 'call':
      return message.missed ? '\u{1F4DE} Missed call' : '\u{1F4DE} Voice call';
    default:
      return message.text ?? '';
  }
}

const themText = (conversationId: string, text: string): Message => ({
  id: uid('m'),
  conversationId,
  author: 'them',
  kind: 'text',
  text,
  createdAt: new Date().toISOString(),
});

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

function addMoment(set: Setter, characterId: string, kind: MomentKind, params?: Moment['params']) {
  set((s) => ({
    moments: [...s.moments, { id: uid('mo'), characterId, kind, createdAt: new Date().toISOString(), params }],
  }));
}

/**
 * Stands in for the streaming backend call: read receipt, typing indicator, then
 * a voice note + text (or text only). Swapping in a real model only changes this.
 */
function scheduleReply(
  set: Setter,
  get: Getter,
  conversationId: string,
  { text, gain }: { text?: string; gain: number },
) {
  const conversation = get().conversations.find((c) => c.id === conversationId);
  if (!conversation) return;

  const readAt = new Date().toISOString();
  set((s) => ({
    typing: { ...s.typing, [conversationId]: true },
    messages: {
      ...s.messages,
      [conversationId]: (s.messages[conversationId] ?? []).map((m) =>
        m.author === 'me' && !m.readAt ? { ...m, readAt } : m,
      ),
    },
  }));

  // A scripted line (a plan's acknowledgement) is one text; a free reply comes as a burst.
  const lines = text ? [text] : withInterest(pick(replyBursts), get().user.interests);
  const bond = get().relationships[conversation.characterId];
  const character = get().characters.find((c) => c.id === conversation.characterId);
  const withVoice = !!bond?.voiceReplies && !!character?.voiceReady;

  // Each line waits roughly as long as it takes to type, with "typing..." shown between.
  // A burst never starts while the last one is still arriving, so two replies never interleave.
  const busy = Math.max(0, (replyingUntil.get(conversationId) ?? 0) - Date.now());
  let at = busy + 900 + Math.random() * 600;
  lines.forEach((line, i) => {
    const last = i === lines.length - 1;
    setTimeout(() => {
      if (i === 0 && withVoice) {
        const said = lines.join(' ');
        appendMessage(set, get, conversationId, {
          id: uid('m'),
          conversationId,
          author: 'them',
          kind: 'voice',
          // Roughly how long the burst takes to say out loud.
          durationSec: Math.max(3, Math.round(said.split(/\s+/).length / 2.6)),
          transcript: said,
          createdAt: new Date().toISOString(),
        });
      }
      appendMessage(set, get, conversationId, themText(conversationId, line));
      set((s) => ({ typing: { ...s.typing, [conversationId]: !last } }));
      if (last && gain) get().addIntimacy(conversation.characterId, gain);
    }, at);
    at += 650 + Math.min(lines[i + 1]?.length ?? 0, 80) * 22;
  });
  replyingUntil.set(conversationId, Date.now() + at);
}

/** When each chat's current reply burst finishes; replies queue behind it. */
const replyingUntil = new Map<string, number>();

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
  return [character.greeting, ...callLines];
}
