/**
 * Calls in the app store: the daily ring, accepting and declining, the model's lines in one-to-one
 * and group calls, a crisis line taken to the chat, and the call log. Split out of `use-app-store.ts`
 * (0z356, app audit P1-6); the persisted shape is unchanged. The chat helpers it calls come in as
 * `deps`, so this file imports nothing from the store at runtime.
 */
import type { AppState, INTIMACY, addMoment, appendHelplineCard, appendMessage, clock, genderOf, keepOwnDay, pick, queueMemoryPass, sayFirst, worldStoryOf } from './use-app-store';
import type { createGroups } from './groups';
import type { Getter, RawSetter } from './slice-types';
import { uid } from './ids';
import { accessToken } from '@/ai/account';
import { callCue, callMessages, keptCallLines } from '@/ai/call-prompt';
import { groupCallCue, groupCallMessages, groupCallResponders } from '@/ai/group-call';
import { missedCallCue } from '@/ai/moment-prompt';
import { ownDayOf } from '@/ai/own-day';
import { apiBase, serverGroupReply, serverReply } from '@/ai/server';
import { spokenCue } from '@/ai/voice-prompt';
import { consumeMinutes } from '@/economy/plans';
import { booksFor, lorePrompt, recentLines } from '@/lib/lorebook';
import { personaFor } from '@/lib/personas';
import { plainText, replyPrefs, speechOnly } from '@/lib/reply-engine';
import { chatClock, togetherWith } from '@/lib/together';
import { missedCallLines, todayKey } from '@/mock';
import { officialLorebooks } from '@/mock/lorebooks';
import { logSeconds, memoryAccess, minutesOf } from '@/store/wallet';

export interface CallDeps {
  intimacy: typeof INTIMACY;
  staleRingMs: number;
  addMoment: typeof addMoment;
  appendHelplineCard: typeof appendHelplineCard;
  appendMessage: typeof appendMessage;
  clock: typeof clock;
  genderOf: typeof genderOf;
  keepOwnDay: typeof keepOwnDay;
  pick: typeof pick;
  queueMemoryPass: typeof queueMemoryPass;
  sayFirst: typeof sayFirst;
  worldStoryOf: typeof worldStoryOf;
  groups: () => ReturnType<typeof createGroups>;
}

type CallActions = Pick<AppState, 'ring' | 'acceptCall' | 'declineCall' | 'deleteCall' | 'clearCalls' | 'callReply' | 'helplineToChat' | 'groupCallReply' | 'groupHelplineToChat' | 'addCall'>;

/** The slice, made once with the store's chat helpers. */
export function createCalls(deps: CallDeps) {
  const { intimacy: INTIMACY, staleRingMs: STALE_RING_MS, groups, addMoment, appendHelplineCard, appendMessage, clock, genderOf, keepOwnDay, pick, queueMemoryPass, sayFirst, worldStoryOf } = deps;

  const actions = (set: RawSetter, get: Getter): CallActions => ({
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
        sayFirst(set, get, conversationId, pick(missedCallLines(genderOf(get(), call.characterId))), missedCallCue());
      }, 1500);
    },

    deleteCall: (id) => set((s) => ({ calls: s.calls.filter((c) => c.id !== id) })),
    clearCalls: () => set({ calls: [] }),

    callReply: async (characterId, said, placedBy) => {
      const state = get();
      const character = state.characters.find((c) => c.id === characterId);
      const bond = state.relationships[characterId];
      if (!character || !bond || !state.settings.realAi || !apiBase()) return { lines: null, crisis: false };
      const conversation = state.conversations.find((c) => c.characterId === characterId);
      const chat = conversation ? (state.messages[conversation.id] ?? []).filter((m) => !m.pending) : [];
      // The call so far reads as the newest turns, after the chat it grew out of.
      const messages = [...chat, ...callMessages(said, conversation?.id ?? '', new Date().toISOString())];
      const memories = memoryAccess(state.memories, state.wallet, characterId).open;
      const input = {
        mode: 'call' as const,
        character,
        user: state.user,
        relationship: bond,
        // Spoken, not written: the chat's story or long style would ask for narration a call cannot say.
        prefs: { ...replyPrefs(bond), style: 'talk' as const, length: 'short' as const },
        persona: conversation ? personaFor(conversation.id, state) : undefined,
        scene: conversation?.scene,
        lore: { ...lorePrompt(booksFor(character, state.lorebooks, officialLorebooks), recentLines(messages), character.id), story: worldStoryOf(state, character) },
        pinned: memories.filter((m) => m.pinned),
        facts: memories.filter((m) => !m.pinned),
        summary: conversation?.summary,
        messages,
        threads: state.threads.filter((t) => t.characterId === characterId),
        clock: chatClock(),
        together: togetherWith(state, characterId, todayKey()),
        ownDay: ownDayOf(bond.ownDay, todayKey()),
        cue: [...callCue(placedBy, said), ...(spokenCue(messages) ?? [])],
      };
      const reply = await accessToken()
        .then((token) => serverReply(input, token))
        .catch(() => null);
      if (!reply) return { lines: null, crisis: false };
      if (reply.day?.length) keepOwnDay(set, characterId, reply.day);
      // Captions say only what is spoken, as a voice will: narration has no place on a call. Each
      // line keeps its words as the server wrote them and their signature, for the voice.
      // `crisis` is the server's check; the reply is already the safe one.
      const spoken = reply.lines
        .map((line, i) => ({ text: speechOnly(line), line, sig: reply.voice?.[i] }))
        .filter((l) => l.text);
      return { lines: spoken.length ? spoken : null, crisis: reply.crisis };
    },

    helplineToChat: (characterId) => appendHelplineCard(set, get, get().addFriend(characterId)),

    groupCallReply: async (groupId, said, { onTurn, alive } = {}) => {
      const state = get();
      const group = state.groups.find((g) => g.id === groupId);
      if (!group || !state.settings.realAi || !apiBase()) return { turns: null, crisis: false };
      const names = Object.fromEntries(
        group.memberIds.map((id) => [id, groups().memberName(state, id)] as const).filter(([, name]) => !!name),
      );
      const { responders, crisis: heard } = groupCallResponders(group.memberIds, names, said, groups().speakersIn(state, groupId));
      const opening = !said.some((line) => line.author === 'me');
      const at = new Date().toISOString();
      const turns: { characterId: string; lines: string[] }[] = [];
      let crisis = heard;
      for (const characterId of responders) {
        // Hung up or talked over: nobody else is asked (a model call nobody would see).
        if (alive && !alive()) break;
        // The next member hears what the one before just said.
        const sofar = [...said, ...turns.flatMap((t) => t.lines.map((text) => ({ author: 'them' as const, text, characterId: t.characterId })))];
        const first = turns[0] ? names[turns[0].characterId] : undefined;
        const chat = groups().groupInput(get(), group, { characterId, lines: [], cue: groupCallCue({ opening, first }) }, []);
        if (!chat) break;
        // The call after the chat, added as is: `groups().groupInput`'s de-duplication would drop the user's
        // spoken lines against any of their earlier messages without text.
        const input = { ...chat, messages: [...chat.messages, ...groupCallMessages(sofar, groupId, at)] };
        const reply = await accessToken()
          .then((token) => serverGroupReply(input, token))
          .catch(() => null);
        if (!reply) break;
        crisis ||= reply.crisis;
        if (reply.day?.length) keepOwnDay(set, characterId, reply.day);
        // Spoken words only; a line that was all narration keeps its plain words rather than vanish.
        const lines = reply.lines.map((line) => speechOnly(line) || plainText(line)).filter(Boolean);
        if (lines.length) {
          turns.push({ characterId, lines });
          onTurn?.({ characterId, lines });
        }
        if (crisis) break;
      }
      return { turns: turns.length ? turns : null, crisis };
    },

    groupHelplineToChat: (groupId) => {
      if (!get().groups.some((g) => g.id === groupId)) return;
      if ((get().messages[groupId] ?? []).slice(-3).some((m) => m.card === 'helpline')) return;
      groups().appendGroupMessage(set, get, groupId, { id: uid('m'), conversationId: groupId, author: 'them', kind: 'system', card: 'helpline', createdAt: new Date().toISOString() }, { quiet: true });
    },

    addCall: (record, lines) => {
      const callId = uid('call');
      set((s) => ({ calls: [{ ...record, id: callId }, ...s.calls] }));
      const kept = lines?.length ? keptCallLines(lines) : [];

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
          ...(kept.length ? { callLines: kept } : {}),
          createdAt: record.startedAt,
        },
        { countUnread: record.missed },
      );
      // What was said on the call goes to memory like a chat does.
      if (kept.length) queueMemoryPass(set, get, conversationId);

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
        addMoment(set, record.characterId, 'call', { duration: clock(record.durationSec) }, callId);
      }
    },

    /* ── modules ──────────────────────────────────────────────────────── */
  });

  return { actions };
}
