/**
 * The one-to-one chat's actions in the app store: sending text, voice and photos, reading, pinning,
 * muting, deleting, reactions and ratings, stopping and retrying a reply, and Continue / time skip /
 * twist. The reply engine they hand off to (`scheduleReply`, `answerText` and the rest) stays in
 * `use-app-store.ts`, which every slice shares. Split out (0z358, app audit P1-6); the persisted shape
 * is unchanged. The chat helpers it calls come in as `deps`.
 */
import type { AppState, INTIMACY, pick, answerText, appendHelplineCard, appendMessage, cancelReplies, dayToDiary, dropChatBranches, omitKey, openingFor, previewFor, scheduleReply, startMessages, steerChat, touchStreak, wakeFor } from './use-app-store';
import type { createGroups } from './groups';
import { failedTurns, replyBatch } from './reply-state';
import type { Getter, RawSetter } from './slice-types';
import { uid } from './ids';
import { crisisReplies, detectCrisis } from '@/ai/safety';
import { VOICE_NO_WORDS } from '@/ai/voice-prompt';
import { lastExchange } from '@/lib/chat-turns';
import { plainText } from '@/lib/reply-engine';
import { isHappy, replyAround, withRating } from '@/lib/reply-rating';
import { finishReveals } from '@/lib/reveal';
import { groupReplies, shellCosts } from '@/mock';
import { chargeMessage, countMessage } from '@/store/wallet';

export interface ChatDeps {
  intimacy: typeof INTIMACY;
  groups: () => ReturnType<typeof createGroups>;
  pick: typeof pick;
  answerText: typeof answerText;
  appendHelplineCard: typeof appendHelplineCard;
  appendMessage: typeof appendMessage;
  cancelReplies: typeof cancelReplies;
  dayToDiary: typeof dayToDiary;
  dropChatBranches: typeof dropChatBranches;
  omitKey: typeof omitKey;
  openingFor: typeof openingFor;
  previewFor: typeof previewFor;
  scheduleReply: typeof scheduleReply;
  startMessages: typeof startMessages;
  steerChat: typeof steerChat;
  touchStreak: typeof touchStreak;
  wakeFor: typeof wakeFor;
}

type ChatActions = Pick<AppState, 'sendText' | 'sendVoice' | 'sendImage' | 'markRead' | 'markUnread' | 'setActiveConversation' | 'clearChat' | 'setChatPinned' | 'setChatMuted' | 'deleteChat' | 'reactToMessage' | 'rateReply' | 'deleteMessage' | 'stopReply' | 'setComposing' | 'retryReply' | 'retryGroupReply' | 'continueChat' | 'skipTime' | 'twist'>;

/** The slice, made once with the store's reply engine. */
export function createChat(deps: ChatDeps) {
  const { intimacy: INTIMACY, groups, pick, answerText, appendHelplineCard, appendMessage, cancelReplies, dayToDiary, dropChatBranches, omitKey, openingFor, previewFor, scheduleReply, startMessages, steerChat, touchStreak, wakeFor } = deps;

  const actions = (set: RawSetter, get: Getter): ChatActions => ({
    /* ── chat ─────────────────────────────────────────────────────────── */

    sendText: (conversationId, text, tone, replyTo) => {
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
        tone,
        ...(replyTo ? { replyTo } : {}),
        createdAt: new Date().toISOString(),
      });
      touchStreak(set, get, conversation.characterId);
      dayToDiary(set, get, conversationId, trimmed);

      // Typed texts wait a beat for the next one, so back-to-back messages get one reply.
      answerText(set, get, conversationId, trimmed, { wakeHere: !!wakeHere, gain: INTIMACY.text, batch: true });
      return 'sent';
    },

    sendVoice: (conversationId, durationSec, transcript, audioFile, language, levels) => {
      const conversation = get().conversations.find((c) => c.id === conversationId);
      if (!conversation) return 'empty';
      const heard = !!transcript && transcript !== VOICE_NO_WORDS;
      // A spoken answer to the alarm costs nothing either, as a typed one does.
      const wakeHere = heard ? wakeFor(get(), conversationId) : undefined;
      if (!wakeHere && !chargeMessage(get, shellCosts.voiceMessage, 'voice', conversationId)) return 'noShells';
      countMessage(set, get);

      appendMessage(set, get, conversationId, {
        id: uid('m'),
        conversationId,
        author: 'me',
        kind: 'voice',
        durationSec,
        transcript,
        transcriptLanguage: heard ? language : undefined,
        audioFile,
        ...(levels?.length ? { levels } : {}),
        createdAt: new Date().toISOString(),
      });
      touchStreak(set, get, conversation.characterId);
      if (heard) {
        dayToDiary(set, get, conversationId, transcript);
        answerText(set, get, conversationId, transcript, { wakeHere: !!wakeHere, gain: INTIMACY.voice, batch: true });
        return 'sent';
      }
      // A spoken crisis gets the same care as a typed one.
      const crisis = !!transcript && detectCrisis(transcript);
      if (crisis) appendHelplineCard(set, get, conversationId);
      scheduleReply(set, get, conversationId, {
        text: crisis ? pick(crisisReplies) : undefined,
        gain: INTIMACY.voice,
      });
      return 'sent';
    },

    sendImage: (conversationId, imageUri, aspect) => {
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
        ...(aspect ? { imageAspect: aspect } : {}),
        createdAt: new Date().toISOString(),
      });
      touchStreak(set, get, conversation.characterId);
      scheduleReply(set, get, conversationId, {
        lines: [
          pick([
            'Wait, you took this? Send more. Right now.',
            'Okay, this is going in my favourites folder.',
            'I am looking at this way longer than I should be.',
          ]),
        ],
        gain: INTIMACY.text,
        photo: true,
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
      if (get().groups.some((g) => g.id === conversationId)) groups().noticeGroupAiIfDue(set, get, conversationId);
    },

    clearChat: (conversationId) => {
      cancelReplies(set, conversationId);
      // A cleared chat starts over, as Character.AI's new chat does: one of their openings
      // (likely another one) and, under it, their starters.
      const conversation = get().conversations.find((c) => c.id === conversationId);
      const character = get().characters.find((c) => c.id === conversation?.characterId);
      const greeting = character ? openingFor(get(), character, `${conversationId}:${Date.now()}`) : '';
      const now = new Date().toISOString();
      dropChatBranches(set, get, conversationId);
      set((s) => ({
        replyVersions: omitKey(s.replyVersions, conversationId),
        messages: {
          ...s.messages,
          [conversationId]: character && greeting ? startMessages(s, character, conversationId, greeting, now) : [],
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
      dropChatBranches(set, get, conversationId);
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
            g.id === conversationId ? { ...g, lastMessagePreview: last ? groups().groupLinePreview(s, last) : '' } : g,
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
      const turns = groups().failedGroupTurns.get(groupId);
      groups().failedGroupTurns.delete(groupId);
      // After a restart the turns are gone; answering the same line again still fits.
      if (turns) groups().writeGroupTurns(set, get, groupId, turns);
      else groups().answerGroup(set, get, groupId, failed.text ?? '', (gender) => pick(groupReplies(gender)));
    },

    continueChat: (conversationId) => steerChat(set, get, conversationId, 'continue'),

    skipTime: (conversationId, skip, to) => steerChat(set, get, conversationId, 'skip', skip, to),
    twist: (conversationId, to) => steerChat(set, get, conversationId, 'twist', undefined, to),
  });

  return { actions };
}
