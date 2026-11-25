/**
 * Personas, scenes, lorebooks and streams in the app store: who the user plays, the scenes a chat can
 * run, the lore a friend knows, and the streams where two friends talk on their own. Split out of
 * `use-app-store.ts` (0z354, app audit P1-6); the persisted shape is unchanged. The chat helpers it
 * calls come in as `deps`, so this file imports nothing from the store at runtime.
 */
import type { AppState, appendMessage, cancelReplies, keepOwnDay, momentRequest, openingFor, sceneFor, themText, writeFirst } from './use-app-store';
import type { Getter, RawSetter, Setter } from './slice-types';
import { uid } from './ids';
import { accessToken } from '@/ai/account';
import type { StreamLineRequest } from '@/ai/content-prompts';
import { sceneOpenCue } from '@/ai/moment-prompt';
import { ownDayOf } from '@/ai/own-day';
import { apiBase, serverStreamLine } from '@/ai/server';
import { perkLimit } from '@/economy/perks';
import { STREAM_SHELLS, takeFreeRound } from '@/economy/streams';
import { shortName } from '@/lib/format';
import { isWrittenMoment } from '@/lib/friend-moments';
import { LORE_ABOUT_MAX, LORE_NAME_MAX, LORE_ROLE_MAX, LORE_TEXT_MAX, checkLoreEntry, checkLorebook, parseKeywords } from '@/lib/lorebook';
import { PERSONA_ABOUT_MAX, PERSONA_NAME_MAX, PROFILE_PERSONA, checkPersona } from '@/lib/personas';
import { SCENE_OPENING_MAX, SCENE_ROLE_MAX, SCENE_SETTING_MAX, SCENE_TITLE_MAX, activeScene, checkScene, mockSceneOpening } from '@/lib/scenes';
import { STREAMS_KEPT, STREAM_TOPIC_MAX, checkStream, isPlaying, nextSpeaker, nextTarget } from '@/lib/streams';
import { chatClock } from '@/lib/together';
import { todayKey } from '@/mock';
import { mockStreamLine } from '@/mock/streams';
import type { LoreEntry, Lorebook, Persona, Scene, Stream } from '@/types';

export interface StoryDeps {
  appendMessage: typeof appendMessage;
  cancelReplies: typeof cancelReplies;
  keepOwnDay: typeof keepOwnDay;
  momentRequest: typeof momentRequest;
  openingFor: typeof openingFor;
  sceneFor: typeof sceneFor;
  themText: typeof themText;
  writeFirst: typeof writeFirst;
}

type StoryActions = Pick<
  AppState,
  | 'savePersona' | 'deletePersona' | 'setDefaultPersona' | 'setChatPersona' | 'saveScene' | 'deleteScene' | 'startScene'
  | 'continueMoment' | 'endScene' | 'saveLorebook' | 'deleteLorebook' | 'setLoreLink' | 'saveLoreEntry' | 'deleteLoreEntry'
  | 'startStream' | 'keepStreaming' | 'pauseStream' | 'resumeStream' | 'deleteStream'
>;

/** The slice, made once with the store's chat helpers: its actions plus the stream runner launch resumes. */
export function createStories(deps: StoryDeps) {
  const { appendMessage, cancelReplies, keepOwnDay, momentRequest, openingFor, sceneFor, themText, writeFirst } = deps;

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
        clock: chatClock(),
        ownDay: ownDayOf(state.relationships[speaker]?.ownDay, todayKey()),
      };
      const started = Date.now();
      const ask = (again: boolean) =>
        void accessToken()
          .then((token) => serverStreamLine(request, token))
          .then((said) => {
            if (!live()) return;
            if (said?.day.length) keepOwnDay(set, speaker, said.day);
            const line = said?.line;
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

  const actions = (set: RawSetter, get: Getter): StoryActions => ({
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
      const scene = conversation && sceneFor(get(), conversation.characterId, sceneId);
      if (!conversation || !scene) return;
      // A reply still on its way belongs to the chat before the scene.
      cancelReplies(set, conversationId);
      const now = Date.now();
      const running = activeScene(scene, new Date(now));
      set((s) => ({
        conversations: s.conversations.map((c) => (c.id === conversationId ? { ...c, scene: running } : c)),
      }));
      appendMessage(
        set,
        get,
        conversationId,
        { id: uid('m'), conversationId, author: 'them', kind: 'system', card: 'scene', text: scene.title, setting: scene.setting, sceneId: scene.id, createdAt: new Date(now).toISOString() },
        { quiet: true },
      );
      const given = scene.opening?.trim();
      // Their first line is already theirs or the user's: a moment they wrote opens with its own
      // line, and a scene the user wrote with the line the user gave it.
      if (given && (isWrittenMoment(scene) || !scene.official)) {
        appendMessage(set, get, conversationId, { id: uid('m'), conversationId, author: 'them', kind: 'text', text: given, createdAt: new Date(now + 1).toISOString() }, { countUnread: false });
        return;
      }
      // Otherwise they write it now (`sceneOpenCue`); the stock line plays only with the model off.
      // Dropped when the scene was ended or swapped meanwhile. Busy for good in a chat where nothing
      // has been said yet: their own greeting, so a chat begun from a moment is never left empty.
      writeFirst(
        set,
        get,
        conversationId,
        given || mockSceneOpening(scene),
        undefined,
        momentRequest(get, conversationId, sceneOpenCue(scene), new Date(now)),
        'nothing',
        () => {
          const state = get();
          const chat = state.conversations.find((c) => c.id === conversationId);
          const character = chat && state.characters.find((c) => c.id === chat.characterId);
          if (!chat || !character || (state.messages[conversationId] ?? []).some((m) => m.kind !== 'system')) return;
          appendMessage(set, get, conversationId, themText(conversationId, openingFor(state, character, conversationId)), { countUnread: true });
        },
        0,
        () => get().conversations.find((c) => c.id === conversationId)?.scene?.startedAt === running.startedAt,
      );
    },

    continueMoment: (characterId, sceneId) => {
      const state = get();
      if (state.blockedIds.includes(characterId) || !state.characters.some((c) => c.id === characterId) || !sceneFor(state, characterId, sceneId)) return null;
      const known = state.conversations.find((c) => c.characterId === characterId);
      // Already playing in their chat: continuing it is opening it, not starting it over.
      if (known?.scene?.sceneId === sceneId) return known.id;
      // New here: the scene opens the chat instead of their greeting.
      const conversationId = known?.id ?? get().addFriend(characterId, { quiet: true });
      get().startScene(conversationId, sceneId);
      return conversationId;
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
  });

  return { actions, streamEpoch, runStream };
}
