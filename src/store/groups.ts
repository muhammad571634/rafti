/**
 * The group chat slice of the app store and its engine: making and running groups and group stories,
 * who speaks next, the members' typing and their written turns (B1.4, 0z344). Split out of
 * `use-app-store.ts` (0z353, app audit P1-6); the persisted shape is unchanged. The chat helpers it
 * calls come in as `deps`, so this file imports nothing from the store at runtime.
 */
import type { AppState, displayName, genderOf, keepOwnDay, lookAtPhotos, pick, previewFor, raiseAgeDoubt, rememberPhotos, themText, worldStoryOf } from './use-app-store';
import { replyingUntil } from './reply-state';
import type { Getter, RawSetter, Setter } from './slice-types';
import { uid } from './ids';
import i18n from '@/i18n';
import { accessToken } from '@/ai/account';
import { keptCallLines } from '@/ai/call-prompt';
import { type GroupPromptInput, groupHelloCue, groupJoinCue, groupReactCue } from '@/ai/group-reply';
import { ownDayOf } from '@/ai/own-day';
import { crisisReplies, detectCrisis } from '@/ai/safety';
import { apiBase, serverGroupReply } from '@/ai/server';
import { forgetPay, payFor } from '@/economy/pay-keys';
import { consumeMinutes } from '@/economy/plans';
import { localGroupStory, localized } from '@/i18n/content';
import { checkSkipTo, cleanSkipTo, gameAnswerCue, gameAskCue, groupContinueCue, groupInvokeCue, groupSkipCue, steerBlock, steerMarker } from '@/lib/chat-steer';
import { shortName } from '@/lib/format';
import { GROUP_MAX, GROUP_MIN, canAddMember, canRemoveMember, continueSpeakers, groupPreview, groupTitle, leastRecent, namedMembers, pickResponders } from '@/lib/group-chat';
import { beatOpenCue, countTurn, groupStoryById, memberMark, nextBeat, storyCue } from '@/lib/group-stories';
import { booksFor, lorePrompt, recentLines } from '@/lib/lorebook';
import { personaFor } from '@/lib/personas';
import { chatClock } from '@/lib/together';
import { groupComebacks, groupGoOn, groupHellos, groupJoinLines, groupPhotoLines, groupReactions, groupReplies, groupVoiceLines, shellCosts, todayKey } from '@/mock';
import { DARES_FOR_THEM, DARES_FOR_YOU, TRUTHS_FOR_THEM, TRUTHS_FOR_YOU } from '@/mock/games';
import { officialLorebooks } from '@/mock/lorebooks';
import { mockSteerLines } from '@/mock/steer';
import { announceIncoming } from '@/notifications/incoming';
import { applyCharge, countMessage, logSeconds, payLine } from '@/store/wallet';
import type { Character, CharacterGender, GroupChat, Message } from '@/types';
import { AppState as AppLife } from 'react-native';

export interface GroupDeps {
  aiNoticeMs: number;
  displayName: typeof displayName;
  genderOf: typeof genderOf;
  keepOwnDay: typeof keepOwnDay;
  lookAtPhotos: typeof lookAtPhotos;
  pick: typeof pick;
  previewFor: typeof previewFor;
  raiseAgeDoubt: typeof raiseAgeDoubt;
  rememberPhotos: typeof rememberPhotos;
  themText: typeof themText;
  worldStoryOf: typeof worldStoryOf;
}

type GroupActions = Pick<
  AppState,
  | 'createGroup' | 'startGroupStory' | 'nextGroupScene' | 'sendGroupText' | 'sendGroupVoice' | 'sendGroupImage' | 'continueGroup'
  | 'invokeGroupMember' | 'skipGroupTime' | 'playGroupTruthOrDare' | 'addGroupCall' | 'setGroupBackground' | 'renameGroup'
  | 'addGroupMember' | 'removeGroupMember' | 'setGroupMuted' | 'deleteGroup'
>;

/** The slice, made once with the store's chat helpers: its actions plus the engine parts other store code calls. */
export function createGroups(deps: GroupDeps) {
  const { aiNoticeMs: AI_NOTICE_MS, displayName, genderOf, keepOwnDay, lookAtPhotos, pick, previewFor, raiseAgeDoubt, rememberPhotos, themText, worldStoryOf } = deps;

  function memberName(state: AppState, characterId: string) {
    const character = state.characters.find((c) => c.id === characterId);
    return character ? shortName(displayName(character, state.relationships[characterId])) : '';
  }

  /** A character's gender, which `{g:female|male}` in their lines follows. */

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
    const unseen = message.author === 'them' && (get().activeConversationId !== groupId || AppLife.currentState !== 'active');
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
    const group = get().groups.find((g) => g.id === groupId);
    if (unseen && group) {
      announceIncoming(
        { conversationId: groupId, title: group.name ?? 'Sigmazam', body: preview, route: `/group/${groupId}`, characterId: message.characterId, createdAt: message.createdAt },
        get().settings,
        !!group.muted,
      );
    }
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
    const [first, picked] = pickResponders(group.memberIds, names, text, speakersIn(state, groupId), crisis ? 0 : turn);
    let second: string | undefined = picked;
    if (!first) return;
    if (crisis) {
      appendGroupMessage(
        set,
        get,
        groupId,
        { id: uid('m'), conversationId: groupId, author: 'them', kind: 'system', card: 'helpline', createdAt: new Date().toISOString() },
        { quiet: true },
      );
      writeGroupTurns(set, get, groupId, [{ characterId: first, plain: true, lines: [pick(crisisReplies)] }]);
      return;
    }
    // A story group: the scene counts the user's message, and someone always joins in (a scene is a
    // conversation among them, not a queue of answers).
    const playing = group.story && !group.story.done ? groupStoryById(group.story.id) : undefined;
    if (group.story && playing) {
      const counted = countTurn(group.story, playing).state;
      set((s) => ({ groups: s.groups.map((g) => (g.id === groupId ? { ...g, story: counted } : g)) }));
    }
    if (playing && !second) second = group.memberIds.find((id) => id !== first && !namedMembers(text, names).includes(id)) ?? group.memberIds.find((id) => id !== first);
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

  /**
   * A story group's scene opens (`src/lib/group-stories.ts`): the scene card (the first says who the
   * user is), then the scene's lead speaks and another member answers, before the user says a word.
   */
  function openStoryScene(set: Setter, get: Getter, groupId: string) {
    const group = get().groups.find((g) => g.id === groupId);
    const story = group?.story && !group.story.done ? groupStoryById(group.story.id) : undefined;
    if (!group?.story || !story) return;
    const words = localGroupStory(story);
    const beat = words.beats[group.story.beat];
    const setting = group.story.beat === 0 ? `${beat.setting}\n${words.userRole}` : beat.setting;
    appendGroupMessage(set, get, groupId, { id: uid('m'), conversationId: groupId, author: 'them', kind: 'system', card: 'scene', text: beat.title, setting, createdAt: new Date().toISOString() });
    const ids = group.memberIds;
    const lead = ids[story.beats[group.story.beat].lead] ?? ids[0];
    const second = ids.find((id) => id !== lead && !speakersIn(get(), groupId).slice(-1).includes(id)) ?? ids.find((id) => id !== lead);
    const others = groupTitle(ids.filter((id) => id !== lead).map((m) => memberName(get(), m)));
    writeGroupTurns(set, get, groupId, [
      { characterId: lead, lines: [pick(groupHellos)(others, genderOf(get(), lead))], cue: beatOpenCue(others), quiet: true },
      ...(second ? [{ characterId: second, lines: [pick(groupReactions)(memberName(get(), lead), genderOf(get(), second))], cue: groupReactCue(memberName(get(), lead)), quiet: true }] : []),
    ]);
  }

  /** The story's lines for a member's turn: the scene while it plays, one line of shared past once it ended (none after a crisis). */
  function storyCueFor(state: AppState, group: GroupChat): string[] {
    const story = group.story ? groupStoryById(group.story.id) : undefined;
    if (!group.story || !story) return [];
    const words = localGroupStory(story);
    const beat = words.beats[Math.min(group.story.beat, words.beats.length - 1)];
    return storyCue(story, group.story, { title: beat.title, setting: beat.setting, userRole: words.userRole });
  }

  interface GroupTurn {
    /** A crisis answer: the story steps aside. */
    plain?: boolean;
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
      // A story group: the story's lines first, then this turn's own (the server keeps eight).
      cue: [...(turn.plain ? [] : storyCueFor(state, group)), ...(turn.cue ?? [])],
      // The hour, and the member's own day as their one-to-one chat keeps it (0z145).
      clock: chatClock(),
      ownDay: ownDayOf(state.relationships[character.id]?.ownDay, todayKey()),
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
        const { photos, ...looking } = await lookAtPhotos(input.messages, input.cue);
        const reply = await accessToken()
          .then((token) => serverGroupReply({ ...input, ...looking }, token, payFor(groupId)))
          .catch(() => null);
        stopGroupTyping(set, groupId, turn.characterId);
        if (!reply) {
          if (!said.length && !turn.quiet) failGroupTurns(set, groupId, turns);
          return;
        }
        applyCharge(set, reply.charge);
        if (reply.crisis && !(get().messages[groupId] ?? []).slice(-3).some((m) => m.card === 'helpline')) {
          appendGroupMessage(set, get, groupId, { id: uid('m'), conversationId: groupId, author: 'them', kind: 'system', card: 'helpline', createdAt: new Date().toISOString() }, { quiet: true });
        }
        if (reply.minor) raiseAgeDoubt(set, get, groupId, true);
        rememberPhotos(set, groupId, photos, reply.photos);
        if (reply.day?.length) keepOwnDay(set, turn.characterId, reply.day);
        said.push(...reply.lines.map((line) => memberText(groupId, turn.characterId, line)));
        scheduleGroupReplies(set, get, groupId, [{ characterId: turn.characterId, lines: reply.lines }]);
        if (reply.crisis) break;
      }
      // Answered: later lines in the group (a hello, a join) are not this line's to count (0z260).
      if (said.length) forgetPay(groupId);
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

  const actions = (set: RawSetter, get: Getter): GroupActions => ({
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

    startGroupStory: (storyId) => {
      const story = groupStoryById(storyId);
      if (!story) return null;
      const playing = get().groups.find((g) => g.story?.id === storyId);
      if (playing) return playing.id;
      const words = localGroupStory(story);
      // The members, made once per story; no one-to-one chat (a profile's Message makes one later).
      const memberIds = story.members.map((m) => {
        const mark = memberMark(story.id, m.id);
        const known = get().characters.find((c) => c.fromTemplate === mark && !c.isOfficial);
        if (known) return known.id;
        const id = uid('c');
        const member: Character = {
          id,
          name: m.name,
          handle: '@stories',
          bio: m.bio,
          backstory: m.backstory,
          category: 'original',
          gender: m.gender,
          age: m.age,
          role: m.role,
          voicePreset: m.voice,
          speakingStyle: m.style,
          tags: m.tags,
          tagline: words.members.find((w) => w.id === m.id)?.who ?? m.who,
          series: words.name,
          accentIndex: m.accentIndex,
          voiceReady: true,
          isOfficial: false,
          visibility: 'private',
          greeting: '',
          fromTemplate: mark,
        };
        set((s) => ({ characters: [member, ...s.characters] }));
        return id;
      });
      const id = uid('grp');
      const now = new Date().toISOString();
      const group: GroupChat = { id, memberIds, name: words.name, createdAt: now, lastMessagePreview: '', lastMessageAt: now, unreadCount: 0, muted: false, story: { id: story.id, beat: 0, turns: 0 } };
      set((st) => ({ groups: [...st.groups, group], messages: { ...st.messages, [id]: [] } }));
      noticeGroupAiIfDue(set, get, id);
      openStoryScene(set, get, id);
      return id;
    },

    nextGroupScene: (groupId) => {
      const state = get();
      const group = state.groups.find((g) => g.id === groupId);
      const story = group?.story && !group.story.done ? groupStoryById(group.story.id) : undefined;
      if (!group?.story || !story) return 'empty';
      if (state.groupTyping[groupId]?.length) return 'empty';
      if (!payLine(get, shellCosts.textMessage, 'chat', groupId)) return 'noShells';
      countMessage(set, get);
      const next = nextBeat(group.story, story);
      set((s) => ({ groups: s.groups.map((g) => (g.id === groupId ? { ...g, story: next } : g)) }));
      if (next.done) {
        const name = localGroupStory(story).name;
        appendGroupMessage(set, get, groupId, { id: uid('m'), conversationId: groupId, author: 'them', kind: 'system', card: 'sceneEnd', text: name, createdAt: new Date().toISOString() }, { quiet: true });
        return 'sent';
      }
      openStoryScene(set, get, groupId);
      return 'sent';
    },

    sendGroupText: (groupId, text, replyTo) => {
      const trimmed = text.trim();
      if (!trimmed || !get().groups.some((g) => g.id === groupId)) return 'empty';
      if (!payLine(get, shellCosts.textMessage, 'chat', groupId)) return 'noShells';
      countMessage(set, get);
      noticeGroupAiIfDue(set, get, groupId);
      appendGroupMessage(set, get, groupId, {
        id: uid('m'),
        conversationId: groupId,
        author: 'me',
        kind: 'text',
        text: trimmed,
        ...(replyTo ? { replyTo } : {}),
        createdAt: new Date().toISOString(),
      });
      answerGroup(set, get, groupId, trimmed, (gender) => pick(groupReplies(gender)));
      return 'sent';
    },

    sendGroupVoice: (groupId, durationSec, transcript, audioFile, levels) => {
      if (!get().groups.some((g) => g.id === groupId)) return 'empty';
      if (!payLine(get, shellCosts.voiceMessage, 'voice', groupId)) return 'noShells';
      countMessage(set, get);
      noticeGroupAiIfDue(set, get, groupId);
      appendGroupMessage(set, get, groupId, {
        id: uid('m'),
        conversationId: groupId,
        author: 'me',
        kind: 'voice',
        durationSec,
        transcript,
        audioFile,
        ...(levels?.length ? { levels } : {}),
        createdAt: new Date().toISOString(),
      });
      answerGroup(set, get, groupId, transcript, (gender) => [pick(groupVoiceLines(gender))]);
      return 'sent';
    },

    sendGroupImage: (groupId, imageUri, aspect) => {
      if (!get().groups.some((g) => g.id === groupId)) return 'empty';
      if (!payLine(get, shellCosts.textMessage, 'photo', groupId)) return 'noShells';
      countMessage(set, get);
      noticeGroupAiIfDue(set, get, groupId);
      appendGroupMessage(set, get, groupId, {
        id: uid('m'),
        conversationId: groupId,
        author: 'me',
        kind: 'image',
        imageUri,
        ...(aspect ? { imageAspect: aspect } : {}),
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
      if (!payLine(get, shellCosts.textMessage, 'chat', groupId)) return 'noShells';
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

    invokeGroupMember: (groupId, characterId) => {
      const state = get();
      const group = state.groups.find((g) => g.id === groupId);
      if (!group?.memberIds.includes(characterId) || state.groupTyping[groupId]?.length) return 'empty';
      // Nothing to answer before the first line, and not after a crisis (the one-to-one rules).
      const last = state.messages[groupId]?.at(-1);
      if (!last || last.card === 'helpline') return 'empty';
      if (!payLine(get, shellCosts.textMessage, 'chat', groupId)) return 'noShells';
      countMessage(set, get);
      const lastSpeaker = speakersIn(state, groupId).findLast((id) => id !== characterId);
      writeGroupTurns(set, get, groupId, [
        {
          characterId,
          lines: pick(groupReplies(genderOf(state, characterId))),
          cue: groupInvokeCue(lastSpeaker ? memberName(state, lastSpeaker) : 'the group'),
        },
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
      if (!payLine(get, shellCosts.textMessage, 'chat', groupId)) return 'noShells';
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

    addGroupCall: (groupId, startedAt, durationSec, lines) => {
      if (durationSec <= 0 || !get().groups.some((g) => g.id === groupId)) return;
      // A call row has no speaker per line, so a member's line carries their name, as the chat shows it.
      const named = (lines ?? []).map((line) =>
        line.author === 'them' && line.characterId ? { ...line, text: `${memberName(get(), line.characterId) || 'Someone'}: ${line.text}` } : line,
      );
      const kept = keptCallLines(named);
      appendGroupMessage(set, get, groupId, {
        id: uid('m'),
        conversationId: groupId,
        author: 'me',
        kind: 'call',
        durationSec,
        missed: false,
        ...(kept.length ? { callLines: kept } : {}),
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
  });

  return { actions, memberName, groupLinePreview, speakersIn, appendGroupMessage, noticeGroupAiIfDue, answerGroup, groupInput, failedGroupTurns, writeGroupTurns };
}
