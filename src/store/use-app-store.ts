import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { detectPlan } from '@/lib/schedule';
import {
  AD_REWARD,
  DAILY_CHECK_IN,
  FREE_SPINS_PER_DAY,
  MAX_ADS_PER_DAY,
  WHEEL_SEGMENTS,
  WHEEL_WEIGHTS,
  shellCosts,
  callHistory as seedCalls,
  callLines,
  cannedReplies,
  characters as seedCharacters,
  conversations as seedConversations,
  currentUser,
  dayKeyFromToday,
  diaryEntries as seedDiary,
  eveningGreetings,
  initialDaily,
  initialSettings,
  levelForIntimacy,
  membershipPlans,
  memories as seedMemories,
  messagesByConversation,
  moments as seedMoments,
  morningGreetings,
  newRelationship,
  relationships as seedRelationships,
  scheduleAck,
  scheduleReminder,
  schedules as seedSchedules,
  secretNotePrompts,
  secretNotes as seedNotes,
  todayKey,
  wallet as seedWallet,
} from '@/mock';
import type {
  AppSettings,
  CallRecord,
  Character,
  Conversation,
  DailyState,
  DiaryEntry,
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
} as const;

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
  notes: SecretNote[];
  calls: CallRecord[];
  moments: Moment[];
  schedules: ScheduleItem[];
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

  /* chat */
  sendText: (conversationId: string, text: string) => SendResult;
  sendVoice: (conversationId: string, durationSec: number, transcript: string) => SendResult;
  sendImage: (conversationId: string, imageUri: string) => SendResult;
  markRead: (conversationId: string) => void;
  setActiveConversation: (conversationId: string | null) => void;
  clearChat: (conversationId: string) => void;

  /* bonds */
  addFriend: (characterId: string) => string;
  addCharacter: (character: Omit<Character, 'id'>) => { characterId: string; conversationId: string };
  resetRelationship: (characterId: string) => void;
  setBackground: (characterId: string, backgroundId: string) => void;
  setNickname: (characterId: string, nickname: string) => void;
  setCharacterPref: (characterId: string, key: 'voiceReplies' | 'messagesFirst', value: boolean) => void;
  addIntimacy: (characterId: string, amount: number) => void;
  dismissLevelUp: () => void;

  /* economy */
  spendShells: (amount: number) => boolean;
  addShells: (amount: number) => void;
  claimDailyLogin: () => number;
  dismissDailyReward: () => void;
  watchAd: () => number;
  spinWheel: () => { index: number; reward: number } | null;
  subscribe: (plan: MemberPlan) => void;

  /* diary */
  addDiaryEntry: (entry: Omit<DiaryEntry, 'id'>) => string;
  deleteDiaryEntry: (id: string) => void;

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

  /* modules */
  startDate: (characterId: string, cost: number, levelRequired: number, title: string) => SpendResult;
  takePhoto: (characterId: string) => SpendResult;

  /* memories, moments, schedules */
  addMemory: (characterId: string, text: string, source?: MemorySource) => void;
  toggleMemoryPin: (id: string) => void;
  deleteMemory: (id: string) => void;
  removeSchedule: (id: string) => void;

  /** What the characters do on their own when the app opens: greet, remind, call. */
  runDailyInitiative: () => { callFrom?: string; slot?: CallSlot };
  setSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

type PersistedKeys =
  | 'user'
  | 'wallet'
  | 'characters'
  | 'conversations'
  | 'messages'
  | 'relationships'
  | 'memories'
  | 'diary'
  | 'notes'
  | 'calls'
  | 'moments'
  | 'schedules'
  | 'daily'
  | 'settings';

const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

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
      notes: seedNotes,
      calls: seedCalls,
      moments: seedMoments,
      schedules: seedSchedules,
      daily: initialDaily,
      settings: initialSettings,

      hydrated: false,
      levelUp: null,
      typing: {},
      activeConversationId: null,
      incomingCall: null,
      dailyReward: null,

      /* ── chat ─────────────────────────────────────────────────────────── */

      sendText: (conversationId, text) => {
        const trimmed = text.trim();
        const conversation = get().conversations.find((c) => c.id === conversationId);
        if (!trimmed || !conversation) return 'empty';
        if (!chargeMessage(get, shellCosts.textMessage)) return 'noShells';

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
                createdAt: new Date().toISOString(),
                reminded: false,
              },
            ],
          }));
          get().addMemory(conversation.characterId, `${plan.title} - ${plan.when}.`, 'chat');
          reply = scheduleAck(plan.title, plan.when);
        }

        scheduleReply(set, get, conversationId, { text: reply, gain: INTIMACY.text });
        return 'sent';
      },

      sendVoice: (conversationId, durationSec, transcript) => {
        const conversation = get().conversations.find((c) => c.id === conversationId);
        if (!conversation) return 'empty';
        if (!chargeMessage(get, shellCosts.voiceMessage)) return 'noShells';

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
        if (!chargeMessage(get, shellCosts.textMessage)) return 'noShells';

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
        const levelledUp = next.level > existing.level;

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

      dismissLevelUp: () => set({ levelUp: null }),

      /* ── economy ──────────────────────────────────────────────────────── */

      spendShells: (amount) => {
        const { wallet } = get();
        if (wallet.shells < amount) return false;
        set({ wallet: { ...wallet, shells: wallet.shells - amount } });
        return true;
      },

      addShells: (amount) => set((s) => ({ wallet: { ...s.wallet, shells: s.wallet.shells + amount } })),

      claimDailyLogin: () => {
        const today = todayKey();
        const { daily, wallet } = get();
        if (daily.lastLoginDay === today) return 0;

        const consecutive = daily.lastLoginDay === dayKeyFromToday(-1);
        const day = consecutive ? (daily.checkInDay % DAILY_CHECK_IN.length) + 1 : 1;
        const amount = DAILY_CHECK_IN[day - 1];

        set({
          daily: { ...daily, lastLoginDay: today, checkInDay: day },
          wallet: { ...wallet, shells: wallet.shells + amount },
          dailyReward: { amount, day },
        });
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
        }));
        return AD_REWARD;
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
        if (!get().spendShells(shellCosts.secretNote)) return 'noShells';

        set((s) => ({
          notes: s.notes.map((n) => (n.id === noteId ? { ...n, status: 'exchanged' } : n)),
        }));
        get().addIntimacy(note.characterId, INTIMACY.secretNote);
        addMoment(set, note.characterId, 'secretNote');
        return 'ok';
      },

      /* ── calls ────────────────────────────────────────────────────────── */

      ring: (characterId, slot) => {
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
        const minutes = Math.max(1, Math.round(record.durationSec / 60));
        get().addIntimacy(record.characterId, minutes * INTIMACY.callPerMinute);
        if (record.durationSec >= 60) {
          addMoment(set, record.characterId, 'call', { duration: clock(record.durationSec) });
        }
      },

      /* ── modules ──────────────────────────────────────────────────────── */

      startDate: (characterId, cost, levelRequired, title) => {
        const bond = get().relationships[characterId];
        if (!bond || bond.level < levelRequired) return 'locked';
        if (!get().spendShells(cost)) return 'noShells';

        const conversationId = get().addFriend(characterId);
        appendMessage(set, get, conversationId, {
          id: uid('m'),
          conversationId,
          author: 'them',
          kind: 'system',
          text: `\u{1F4CD} ${title}`,
          createdAt: new Date().toISOString(),
        });
        get().addIntimacy(characterId, INTIMACY.date);
        addMoment(set, characterId, 'dating', { title });
        scheduleReply(set, get, conversationId, {
          text: `So... ${title.toLowerCase()}. Just the two of us. Where do you want to start?`,
          gain: 0,
        });
        return 'ok';
      },

      takePhoto: (characterId) => {
        if (!get().spendShells(shellCosts.photoBooth)) return 'noShells';
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

      /* ── character initiative ─────────────────────────────────────────── */

      runDailyInitiative: () => {
        const now = new Date();
        const hour = now.getHours();
        const today = todayKey();
        const slot: CallSlot | null = hour >= 5 && hour < 12 ? 'morning' : hour >= 20 || hour < 2 ? 'night' : null;
        const { settings, daily, relationships, characters, incomingCall } = get();

        // A ring nobody answered (screen closed, app backgrounded) ends up as a missed call.
        if (incomingCall && Date.now() - incomingCall.at > STALE_RING_MS) get().declineCall();

        const bonds = Object.values(relationships)
          .filter((r) => r.messagesFirst && characters.some((c) => c.id === r.characterId))
          .sort((a, b) => b.intimacy - a.intimacy);

        // 1. Due reminders from plans mentioned in chat.
        const due = get().schedules.filter((x) => x.date <= today && !x.reminded);
        if (due.length) {
          due.forEach((item) => {
            const conversationId = get().addFriend(item.characterId);
            appendMessage(set, get, conversationId, themText(conversationId, scheduleReminder(item.title)), {
              countUnread: true,
            });
          });
          set((s) => ({
            schedules: s.schedules.map((x) => (due.some((d) => d.id === x.id) ? { ...x, reminded: true } : x)),
          }));
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

        const caller = bonds.find((b) => characters.find((c) => c.id === b.characterId)?.voiceReady);
        if (!caller) return {};

        set((s) => ({ daily: { ...s.daily, calledSlots: [...s.daily.calledSlots, slotKey].slice(-8) } }));
        return { callFrom: caller.characterId, slot };
      },

      setSetting: (key, value) => set((s) => ({ settings: { ...s.settings, [key]: value } })),
    }),
    {
      name: STORE_KEY,
      version: 3,
      migrate: (persisted, version) => {
        let state = persisted as PersistedState & { wallet?: Wallet & { acorns?: number } };
        // v2: the currency became shells (was acorns) — carry the balance over.
        if (version < 2 && state.wallet && state.wallet.acorns != null) {
          const { acorns, ...wallet } = state.wallet;
          state.wallet = { ...wallet, shells: acorns };
        }
        // v3: the licensed seed cast was replaced by Rafti's originals.
        if (version < 3) state = recastSeed(state);
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
          characters: [...seedCharacters, ...(saved.characters ?? []).filter((c) => !seedIds.has(c.id))],
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
        notes: s.notes,
        calls: s.calls,
        moments: s.moments,
        schedules: s.schedules,
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
        useAppStore.setState({ hydrated: true });
      },
    },
  ),
);

/* ── selectors ─────────────────────────────────────────────────────────────── */

export const memberActive = (wallet: Wallet) =>
  wallet.isMember && !!wallet.memberUntil && new Date(wallet.memberUntil).getTime() > Date.now();

/** The name to show for a character: your nickname for them, else theirs. */
export const displayName = (character: Character, relationship?: Relationship) =>
  relationship?.nickname || character.name;

/* ── helpers ───────────────────────────────────────────────────────────────── */

type Setter = (fn: (s: AppState) => Partial<AppState>) => void;
type Getter = () => AppState;
type RawSetter = (partial: Partial<AppState> | ((s: AppState) => Partial<AppState>)) => void;

/** Members chat for free; everyone else spends shells per message. */
function chargeMessage(get: Getter, cost: number) {
  if (memberActive(get().wallet)) return true;
  return get().spendShells(cost);
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

  setTimeout(() => {
    const reply = text ?? pick(cannedReplies);
    const bond = get().relationships[conversation.characterId];
    const character = get().characters.find((c) => c.id === conversation.characterId);
    const withVoice = !!bond?.voiceReplies && !!character?.voiceReady;
    const now = new Date().toISOString();

    set((s) => ({ typing: { ...s.typing, [conversationId]: false } }));

    if (withVoice) {
      appendMessage(set, get, conversationId, {
        id: uid('m'),
        conversationId,
        author: 'them',
        kind: 'voice',
        // Roughly how long the line takes to say out loud.
        durationSec: Math.max(3, Math.round(reply.split(/\s+/).length / 2.6)),
        transcript: reply,
        createdAt: now,
      });
    }
    appendMessage(set, get, conversationId, themText(conversationId, reply));

    if (gain) get().addIntimacy(conversation.characterId, gain);
  }, 1100 + Math.random() * 900);
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
