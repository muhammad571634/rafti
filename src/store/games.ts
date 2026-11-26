/**
 * Dates, quizzes, frames and truth or dare in the app store: the live date the model plays round by
 * round, date themes, the user's and the world's quizzes, photo frames won, and the one-to-one game.
 * Split out of `use-app-store.ts` (0z355, app audit P1-6); the persisted shape is unchanged. The chat
 * helpers it calls come in as `deps`, so this file imports nothing from the store at runtime.
 */
import type { AppState, INTIMACY, LiveDate, addMoment, appendMessage, displayName, genderOf, modelOn, pick, sayFirst, scheduleReply, touchStreak, worldEventNote, writeBase, writeWithModel } from './use-app-store';
import type { Getter, RawSetter, Setter } from './slice-types';
import { uid } from './ids';
import i18n from '@/i18n';
import { dateDoneCue, datePhotoCue, quizDoneCue, worldQuizCue } from '@/ai/moment-prompt';
import { localized } from '@/i18n/content';
import { gameAnswerCue, gameAskCue } from '@/lib/chat-steer';
import { buildThemeRounds, checkTheme, cleanScene, cleanTitle, moodAt, moodOpen, themeCost } from '@/lib/date-themes';
import { shortName } from '@/lib/format';
import { checkQuiz, cleanQuiz, wonWorldQuiz } from '@/lib/quiz';
import { eventOn } from '@/lib/world-story';
import { afterDateLine, datePhotoReply, shellCosts } from '@/mock';
import { themePools } from '@/mock/date-themes';
import { DATE_PLACES, type DateRound, dateEnding, datePlaceById, maxHearts } from '@/mock/dates';
import { DARES_FOR_THEM, DARES_FOR_YOU, TRUTHS_FOR_THEM, TRUTHS_FOR_YOU, quizReply } from '@/mock/games';
import { WORLDS } from '@/mock/worlds';
import { chargeMessage, countMessage } from '@/store/wallet';
import type { DateRecord, DateTheme, UserFrame, UserQuiz } from '@/types';
import { fill as fillVoice } from '@/i18n/voice';

export interface GameDeps {
  intimacy: typeof INTIMACY;
  addMoment: typeof addMoment;
  appendMessage: typeof appendMessage;
  displayName: typeof displayName;
  genderOf: typeof genderOf;
  modelOn: typeof modelOn;
  pick: typeof pick;
  sayFirst: typeof sayFirst;
  scheduleReply: typeof scheduleReply;
  touchStreak: typeof touchStreak;
  worldEventNote: typeof worldEventNote;
  writeBase: typeof writeBase;
  writeWithModel: typeof writeWithModel;
}

type GameActions = Pick<AppState, 'beginDate' | 'leaveDate' | 'pickDateChoice' | 'retryDateRound' | 'saveDateTheme' | 'deleteDateTheme' | 'beginThemeDate' | 'finishDate' | 'sendDatePhoto' | 'finishQuiz' | 'saveQuiz' | 'deleteQuiz' | 'finishWorldQuiz' | 'saveFrame' | 'deleteFrame' | 'playTruthOrDare'>;

/** The slice, made once with the store's chat helpers: its actions plus the date runner other store code calls. */
export function createGames(deps: GameDeps) {
  const { intimacy: INTIMACY, addMoment, appendMessage, displayName, genderOf, modelOn, pick, sayFirst, scheduleReply, touchStreak, worldEventNote, writeBase, writeWithModel } = deps;

  /** A date the model plays round by round (`LiveDate`). It is paid for when its first round arrives. */
  function startLiveDate(set: Setter, get: Getter, characterId: string, placeId: string, theme: { title: string; rounds: DateRound[] } | undefined, plan: Omit<LiveDate, 'key' | 'paid' | 'rounds' | 'picks'>) {
    set(() => ({ activeDate: { characterId, placeId, theme, live: { ...plan, key: uid('live'), paid: false, rounds: [], picks: [] } } }));
    askDateRound(set, get);
  }

  /** Dates with a round on its way, so a tap and a retry never ask twice. */
  const dateAsking = new Set<string>();

  /** The next round of the date, knowing what the user chose so far. Busy: the screen offers to try again. */
  function askDateRound(set: Setter, get: Getter) {
    const active = get().activeDate;
    const live = active?.live;
    if (!active || !live || live.rounds.length >= live.total || live.picks.length < live.rounds.length || dateAsking.has(live.key)) return;
    const base = writeBase(active.characterId, true);
    if (!base) return;
    const patch = (next: Partial<LiveDate>) =>
      set((s) => (s.activeDate?.live?.key === live.key ? { activeDate: { ...s.activeDate, live: { ...s.activeDate.live, ...next } } } : s));
    dateAsking.add(live.key);
    patch({ busy: undefined });
    const soFar = live.rounds.map((round, i) => {
      const choice = round.choices[live.picks[i]];
      return { line: round.line, picked: choice.text, reply: choice.reply };
    });
    const { title, scene, mood, total, happening } = live;
    void writeWithModel({ ...base, kind: 'dateRound', date: { title, scene, mood, total, happening }, soFar }).then((round) => {
      dateAsking.delete(live.key);
      const now = get().activeDate?.live;
      if (now?.key !== live.key) return;
      if (!round) return patch({ busy: true });
      if (!now.paid && !get().spendShells(now.cost, 'date', active.characterId)) return set(() => ({ activeDate: null }));
      patch({ paid: true, rounds: [...now.rounds, round] });
    });
  }

  const actions = (set: RawSetter, get: Getter): GameActions => ({
    beginDate: (characterId, placeId) => {
      const place = datePlaceById(placeId);
      const bond = get().relationships[characterId];
      if (!place || !bond || bond.level < place.levelRequired) return 'locked';
      const character = get().characters.find((c) => c.id === characterId);
      if (modelOn(get) && character) {
        get().expireFreeShells();
        if (get().wallet.shells < place.cost) return 'noShells';
        const shown = localized('datePlaces', DATE_PLACES).find((p) => p.id === placeId) ?? place;
        const name = shortName(displayName(character, bond));
        startLiveDate(set, get, characterId, placeId, undefined, {
          title: i18n.t(`dating.places.${place.titleKey}`),
          scene: fillVoice(shown.rounds[0].line, { name }, character.gender),
          mood: moodAt(bond.level),
          total: place.rounds.length,
          cost: place.cost,
          happening: worldEventNote(character),
        });
        return 'ok';
      }
      if (!get().spendShells(place.cost, 'date', characterId)) return 'noShells';
      set({ activeDate: { characterId, placeId } });
      return 'ok';
    },

    leaveDate: () => set({ activeDate: null }),

    pickDateChoice: (index) => {
      set((s) => {
        const live = s.activeDate?.live;
        if (!live || live.picks.length >= live.rounds.length) return s;
        return { activeDate: { ...s.activeDate!, live: { ...live, picks: [...live.picks, index] } } };
      });
      askDateRound(set, get);
    },

    retryDateRound: () => askDateRound(set, get),

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
      const friend = get().characters.find((c) => c.id === characterId);
      if (modelOn(get) && friend) {
        get().expireFreeShells();
        if (get().wallet.shells < themeCost(theme.rounds)) return 'noShells';
        startLiveDate(set, get, characterId, theme.id, { title: theme.title, rounds: [] }, {
          title: cleanTitle(theme.title),
          scene: cleanScene(theme.scene),
          mood: theme.mood,
          total: theme.rounds,
          cost: themeCost(theme.rounds),
          happening: worldEventNote(friend),
        });
        return 'ok';
      }
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
      const max = active.live ? active.live.total * 3 : maxHearts(place);
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
      addMoment(set, characterId, 'dating', { title }, record.id);
      const conversationId = get().addFriend(characterId);
      const story = active.live ? active.live.rounds.flatMap((r, i) => (r.choices[active.live!.picks[i]] ? [`${r.line} They chose: ${r.choices[active.live!.picks[i]].text}`] : [])) : [];
      sayFirst(set, get, conversationId, afterDateLine(title, record.ending, genderOf(get(), characterId)), dateDoneCue(title, record.ending, story));
      return record;
    },

    sendDatePhoto: (dateId, toCharacterId, caption) => {
      const state = get();
      const record = state.dates.find((d) => d.id === dateId);
      const partner = record && state.characters.find((c) => c.id === record.characterId);
      const friend = state.characters.find((c) => c.id === toCharacterId);
      const conversation = state.conversations.find((c) => c.characterId === toCharacterId);
      // Only to someone else the user already chats with, never to the date itself or a blocked friend.
      if (!record || !partner || !friend || !conversation || toCharacterId === record.characterId || state.blockedIds.includes(toCharacterId)) return 'empty';
      // Their answer is one model reply, so it costs what a picture message costs (docs/cost-ledger.md).
      if (!chargeMessage(get, shellCosts.textMessage, 'photo', conversation.id)) return 'noShells';
      countMessage(set, get);
      const partnerName = displayName(partner, state.relationships[partner.id]);
      appendMessage(set, get, conversation.id, {
        id: uid('m'),
        conversationId: conversation.id,
        author: 'me',
        kind: 'image',
        dateId,
        text: caption,
        // How later replies and the memory pass read it ("[Image message: ...]"); the picture never leaves the phone.
        photoNote: `A polaroid from my date with ${partnerName} ("${caption}"): ${record.hearts} of ${record.maxHearts} hearts, a ${record.ending} ending`,
        createdAt: new Date().toISOString(),
      });
      touchStreak(set, get, toCharacterId);
      const sameWorld = !!partner.series && partner.series === friend.series;
      scheduleReply(set, get, conversation.id, {
        lines: [datePhotoReply(friend.gender)],
        gain: INTIMACY.text,
        cue: datePhotoCue(partnerName, caption, record.ending, sameWorld),
      });
      return 'sent';
    },

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
        lines: [quizReply(matches, total)],
        gain: INTIMACY.quizMatch * matches + INTIMACY.quizMatch,
        cue: quizDoneCue(title, matches, total),
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
        sayFirst(set, get, conversationId, text, worldQuizCue(info.series, score, total, won));
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
  });

  return { actions };
}
