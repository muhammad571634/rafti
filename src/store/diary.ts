/**
 * The diary and secret-note slice of the app store: the user's pages and the friend's answers, the
 * friend's own diary pages, and the sealed notes you swap. Split out of `use-app-store.ts` (0z351,
 * app audit P1-6); the persisted shape is unchanged. The chat helpers it calls come in as `deps`, so
 * this file imports nothing from the store at runtime.
 */
import type { AppState, addMoment, answerCrisisInChat, genderOf, writeBase, writeWithModel } from './use-app-store';
import type { Getter, RawSetter, Setter } from './slice-types';
import { uid } from './ids';
import i18n from '@/i18n';
import { diaryMemoryLine } from '@/ai/memory-guard';
import { crisisReplies, detectCrisis } from '@/ai/safety';
import { localized } from '@/i18n/content';
import { dailyNoteStep, depthMilestone, myMessageCount } from '@/lib/daily-note';
import { messageText } from '@/lib/story-continuity';
import { dayKey, secretNotePrompts, shellCosts, todayKey } from '@/mock';
import { type DayTogether, daysTogether, dueDays, duePages } from '@/mock/diary-writer';
import type { SecretNote } from '@/types';

/** How many diary pages one pass asks for: a week away must not become twenty calls at once. */
export const PAGES_AT_ONCE = 3;
/** How long a stock note takes to "write", with the model off. */
const NOTE_SEAL_MS = 2600;
/** Notes being asked for, so opening the screen twice asks once. */
const notesAsked = new Set<string>();
/** Today asks for a friend's daily note at most this often (a busy model is not asked on every visit). */
const NOTE_RETRY_MS = 10 * 60_000;
const dailyNoteTries = new Map<string, number>();
/** A page the model was too busy for waits this long before it is asked for again. */
const PAGE_RETRY_MS = 10 * 60_000;
const pagesAsked = new Map<string, number>();

export interface DiaryDeps {
  getState: Getter;
  modelOn: (get: Getter) => boolean | undefined;
  writeBase: typeof writeBase;
  writeWithModel: typeof writeWithModel;
  answerCrisisInChat: typeof answerCrisisInChat;
  addMoment: typeof addMoment;
  genderOf: typeof genderOf;
  intimacy: { diaryShare: number; secretNote: number };
  pick: <T>(list: readonly T[]) => T;
}

type DiaryActions = Pick<
  AppState,
  | 'addDiaryEntry' | 'deleteDiaryEntry' | 'markDiaryPageRead' | 'markInboxSeen' | 'writeDueDiaryPages' | 'ensureSecretNote'
  | 'newSecretNote' | 'leaveDailyNote' | 'retrySecretNote' | 'writeNote' | 'exchangeNote'
>;

/** The slice, made once with the store's helpers: its actions plus the pieces launch calls. */
export function createDiary(deps: DiaryDeps) {
  const { getState, modelOn, writeBase, writeWithModel, answerCrisisInChat, addMoment, genderOf, intimacy, pick } = deps;

  /** Their side of a secret note: the model writes it, sealed until you swap. Busy: the screen offers to try again. */
  function askSecretNote(set: RawSetter, get: Getter, noteId: string) {
    const note = get().notes.find((n) => n.id === noteId);
    if (!note || note.status !== 'composing' || notesAsked.has(noteId)) return;
    notesAsked.add(noteId);
    const base = modelOn(get) ? writeBase(note.characterId, true) : null;
    if (!base) {
      setTimeout(() => {
        notesAsked.delete(noteId);
        sealNote(set, noteId);
      }, NOTE_SEAL_MS);
      return;
    }
    const update = (patch: Partial<SecretNote>) => set((s) => ({ notes: s.notes.map((n) => (n.id === noteId && n.status === 'composing' ? { ...n, ...patch } : n)) }));
    update({ busy: undefined });
    void writeWithModel({ ...base, kind: 'note', question: note.prompt }).then((written) => {
      notesAsked.delete(noteId);
      update(written ? { status: 'ready', theirNote: written.note, busy: undefined } : { busy: true });
    });
  }

  /** The due diary pages, the newest first, each in the model's words. Busy: the page comes on a later pass. */
  function writePagesWithModel(set: Setter, get: Getter, due: { day: DayTogether; date: string }[]) {
    const now = Date.now();
    const keyOf = (x: { day: DayTogether; date: string }) => `${x.day.characterId}|${x.date}`;
    const fresh = [...due].reverse().filter((x) => now - (pagesAsked.get(keyOf(x)) ?? 0) > PAGE_RETRY_MS).slice(0, PAGES_AT_ONCE);
    for (const item of fresh) {
      pagesAsked.set(keyOf(item), now);
      const { day, date } = item;
      const state = get();
      const conversation = state.conversations.find((c) => c.characterId === day.characterId);
      const base = writeBase(day.characterId);
      if (!conversation || !base) continue;
      // A heavy day is written from nothing it could quote.
      const lines = day.heavy
        ? []
        : (state.messages[conversation.id] ?? []).filter((m) => dayKey(m.createdAt) === day.day).flatMap((m) => {
            // A call gives its lines under their own speakers, and never a crisis line to quote.
            if (m.kind === 'call' && m.callLines?.length) {
              return m.callLines.filter((l) => !detectCrisis(l.text)).map((l) => ({ mine: l.author === 'them', text: l.text }));
            }
            const text = messageText(m);
            return text ? [{ mine: m.author === 'them', text }] : [];
          });
      // What they said of their own day that day, so the page tells the same day (0z146).
      const own = state.relationships[day.characterId]?.ownDay?.find((l) => l.date === day.day)?.notes.map((n) => n.text);
      void writeWithModel({ ...base, kind: 'diary', day: { lines, dateTitle: day.dateTitle, heavy: day.heavy, ...(own?.length ? { own } : {}) } }).then((page) => {
        if (!page) return;
        const id = `cdp_${day.characterId}_${date}`;
        set((s) =>
          s.characterDiary.some((p) => p.id === id)
            ? s
            : { characterDiary: [...s.characterDiary, { id, characterId: day.characterId, date, writtenAt: new Date().toISOString(), mood: page.mood, source: day.dateTitle != null ? 'date' : 'chat', body: page.body }] },
        );
      });
    }
  }

  /** Their answer to a shared diary page, in the model's words. Busy: the page simply has no answer yet. */
  function writeDiaryReply(set: Setter, entryId: string, characterId: string, body: string) {
    const base = writeBase(characterId);
    if (!base) return;
    void writeWithModel({ ...base, recent: [{ author: 'me', text: body }], kind: 'diaryReply', entry: body }).then((written) => {
      if (!written) return;
      set((s) => ({
        diary: s.diary.map((d) => (d.id === entryId && !d.reply ? { ...d, reply: { characterId, text: written.reply, createdAt: new Date().toISOString() } } : d)),
      }));
      addMoment(set, characterId, 'diary', undefined, entryId);
    });
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
    const entry = getState().diary.find((d) => d.id === entryId);
    if (entry?.sharedWithCharacterId) {
      addMoment(set as Setter, entry.sharedWithCharacterId, 'diary', undefined, entry.id);
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

  const actions = (set: RawSetter, get: Getter): DiaryActions => ({
    /* ── diary ────────────────────────────────────────────────────────── */

    addDiaryEntry: (entry) => {
      const id = uid('d');
      set((s) => ({ diary: [{ ...entry, id }, ...s.diary] }));

      const characterId = entry.sharedWithCharacterId;
      if (characterId) {
        get().addIntimacy(characterId, intimacy.diaryShare);
        // A crisis page is still shared and answered; it just never becomes a memory,
        // and the helpline card waits in their chat.
        const line = diaryMemoryLine(entry.body);
        if (line) get().addMemory(characterId, line, 'diary');
        if (detectCrisis(entry.body)) answerCrisisInChat(set, get, characterId);
        // Care after a crisis keeps its words.
        if (modelOn(get) && !detectCrisis(entry.body)) writeDiaryReply(set, id, characterId, entry.body);
        else setTimeout(() => answerDiary(set, id), 2200);
      }

      return id;
    },

    // The page and the "wrote back" line on Us it made.
    deleteDiaryEntry: (id) => set((s) => ({ diary: s.diary.filter((d) => d.id !== id), moments: s.moments.filter((m) => !(m.kind === 'diary' && m.refId === id)) })),

    markDiaryPageRead: (id) =>
      set((s) => (s.diaryPagesRead.includes(id) ? s : { diaryPagesRead: [...s.diaryPagesRead, id] })),

    markInboxSeen: () => set({ inboxSeenAt: new Date().toISOString() }),

    writeDueDiaryPages: () => {
      // Before launch finishes the chats are still loading: a page from the moments alone would
      // miss what was said, and a crisis day would read as a light one. Launch writes them after.
      if (!get().hydrated) return;
      const { conversations, messages, moments, characterDiary } = get();
      const together = daysTogether(conversations, messages, moments);
      if (modelOn(get)) return writePagesWithModel(set, get, dueDays(together, characterDiary));
      const fresh = duePages(together, characterDiary, (id) => genderOf(get(), id));
      if (fresh.length) set((s) => ({ characterDiary: [...s.characterDiary, ...fresh] }));
    },

    /* ── secret note ──────────────────────────────────────────────────── */

    ensureSecretNote: (characterId) => {
      const latest = latestNote(get().notes, characterId);
      if (!latest || (latest.status === 'exchanged' && latest.date !== todayKey())) {
        get().newSecretNote(characterId);
      } else if (latest.status === 'composing') {
        // Left waiting by a restart: asked again.
        askSecretNote(set, get, latest.id);
      }
    },

    newSecretNote: (characterId, depth) => {
      const id = uid('sn');
      const previous = latestNote(get().notes, characterId)?.prompt;
      const pool = localized('secretNotePrompts', secretNotePrompts).filter((p) => p !== previous);
      // A keepsake asks what they never said; the model writes it from the chat and memories (`writeBase`).
      const prompt = depth ? i18n.t('secretNote.depthPrompt', { context: genderOf(get(), characterId) }) : pick(pool);

      set((s) => ({
        notes: [
          { id, characterId, date: todayKey(), prompt, myNote: '', status: 'composing', ...(depth ? { depth } : {}) },
          ...s.notes,
        ],
      }));

      // The character writes theirs first; it stays sealed until you exchange.
      askSecretNote(set, get, id);
    },

    leaveDailyNote: (characterId) => {
      const s = get();
      // Before launch finishes the chats are still loading: an empty chat would hide a helpline card.
      if (!s.hydrated) return;
      const chatId = s.conversations.find((c) => c.characterId === characterId)?.id;
      const chat = chatId ? (s.messages[chatId] ?? []) : [];
      const step = dailyNoteStep(s.notes, characterId, chat);
      const now = Date.now();
      // Every visit to Today calls this: a busy model is asked again only now and then.
      if (!step || now - (dailyNoteTries.get(characterId) ?? 0) < NOTE_RETRY_MS) return;
      dailyNoteTries.set(characterId, now);
      // Past every 40th message of theirs, the day's note is a keepsake of how far you have come.
      if (step === 'new') get().newSecretNote(characterId, depthMilestone(myMessageCount(chat), s.notes, characterId));
      else {
        const latest = latestNote(s.notes, characterId);
        if (latest) askSecretNote(set, get, latest.id);
      }
    },

    retrySecretNote: (noteId) => askSecretNote(set, get, noteId),

    writeNote: (noteId, text) =>
      set((s) => ({
        notes: s.notes.map((n) => (n.id === noteId && n.status !== 'exchanged' ? { ...n, myNote: text } : n)),
      })),

    exchangeNote: (noteId) => {
      const note = get().notes.find((n) => n.id === noteId);
      if (!note || note.status !== 'ready' || !note.myNote.trim()) return 'notReady';
      // A keepsake is the friend's gift: its swap is free.
      if (!note.depth && !get().spendShells(shellCosts.secretNote, 'note', note.characterId)) return 'noShells';

      set((s) => ({
        notes: s.notes.map((n) => (n.id === noteId ? { ...n, status: 'exchanged' } : n)),
      }));
      get().addIntimacy(note.characterId, intimacy.secretNote);
      addMoment(set, note.characterId, 'secretNote', undefined, note.id);
      return 'ok';
    },
  });

  return { actions, answerDiary, sealNote, writeDiaryReply };
}
