/**
 * Reply versions, edits, rewinds and branches in the app store: ↻ keeps what they said as a version
 * and asks for another, an edit of your last text redoes their answer, a rewind keeps what came after
 * as a branch (0z286) and a branch can be swapped back in. Split out of `use-app-store.ts` (0z357,
 * app audit P1-6); the persisted shape is unchanged. The chat helpers it calls come in as `deps`.
 */
import type { AppState, answerText, cancelReplies, chatGender, omitKey, scheduleReply, wakeFor, withMessages } from './use-app-store';
import type { Getter, RawSetter } from './slice-types';
import { uid } from './ids';
import { dropBranchLines, loadBranchLines, saveBranchLines } from '@/lib/branch-files';
import { addBranch, branchRecord, cutAfter, swapIn, worthBranching } from '@/lib/branches';
import type { SteerKind } from '@/lib/chat-steer';
import { MAX_REPLY_VERSIONS, isSteer, lastExchange } from '@/lib/chat-turns';
import { shellCosts } from '@/mock';
import { mockSteerLines } from '@/mock/steer';
import { chargeMessage, countMessage } from '@/store/wallet';

export interface BranchDeps {
  answerText: typeof answerText;
  cancelReplies: typeof cancelReplies;
  chatGender: typeof chatGender;
  omitKey: typeof omitKey;
  scheduleReply: typeof scheduleReply;
  wakeFor: typeof wakeFor;
  withMessages: typeof withMessages;
}

type BranchActions = Pick<AppState, 'regenerateReply' | 'markNextUsed' | 'showReplyVersion' | 'editLastMessage' | 'rewindTo' | 'switchBranch' | 'deleteBranch'>;

/** The slice, made once with the store's chat helpers. */
export function createBranches(deps: BranchDeps) {
  const { answerText, cancelReplies, chatGender, omitKey, scheduleReply, wakeFor, withMessages } = deps;

  const actions = (set: RawSetter, get: Getter): BranchActions => ({
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
      let steer = isSteer(anchor) ? mockSteerLines(anchor.card as SteerKind, anchor.skip, `${anchor.id}:${next.length}`, chatGender(get(), conversationId)) : undefined;
      for (let tries = 1; steer && avoid.includes(steer[0]) && tries < 5; tries++) {
        steer = mockSteerLines(anchor.card as SteerKind, anchor.skip, `${anchor.id}:${next.length}:${tries}`, chatGender(get(), conversationId));
      }
      scheduleReply(set, get, conversationId, {
        lines: steer,
        gain: 0,
        avoid,
        off,
        steer: isSteer(anchor) ? { kind: anchor.card as SteerKind, skip: anchor.skip, to: anchor.skipTo } : undefined,
      });
      return 'sent';
    },

    markNextUsed: (conversationId, messageId) =>
      set((s) => {
        const list = s.messages[conversationId];
        if (!list?.some((m) => m.id === messageId && m.next && !m.nextUsed)) return {};
        return { messages: { ...s.messages, [conversationId]: list.map((m) => (m.id === messageId ? { ...m, nextUsed: true } : m)) } };
      }),

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
      // What came after is kept as a branch (0z286), its lines saved apart; the record shows at once.
      const cut = cutAfter(get().messages[conversationId] ?? [], messageId);
      const branch = cut && worthBranching(cut.tail) ? branchRecord(uid('br'), conversationId, messageId, cut.tail, new Date()) : null;
      set((s) => {
        const current = s.messages[conversationId] ?? [];
        const keep = current.findIndex((m) => m.id === messageId);
        const added = branch ? addBranch(s.branches, branch) : null;
        if (added) for (const old of added.dropped) void dropBranchLines(old.id);
        return {
          ...withMessages(s, conversationId, current.slice(0, keep + 1)),
          replyVersions: omitKey(s.replyVersions, conversationId),
          ...(added ? { branches: added.branches } : {}),
        };
      });
      // Not saved (storage full): the record goes too, so the list never offers what cannot come back.
      if (branch && cut) {
        void saveBranchLines(branch.id, cut.tail).then((saved) => {
          if (!saved) set((s) => ({ branches: s.branches.filter((b) => b.id !== branch.id) }));
        });
      }
    },

    switchBranch: async (conversationId, branchId) => {
      const branch = get().branches.find((b) => b.id === branchId && b.conversationId === conversationId);
      if (!branch) return 'missing';
      const lines = await loadBranchLines(branchId);
      if (!lines) {
        set((s) => ({ branches: s.branches.filter((b) => b.id !== branchId) }));
        return 'missing';
      }
      cancelReplies(set, conversationId);
      const swapped = swapIn(get().messages[conversationId] ?? [], branch.atMessageId, lines);
      if (!swapped) return 'gone';
      // Where the chat is now is kept first; if that cannot be saved, nothing changes.
      const here = worthBranching(swapped.current) ? branchRecord(uid('br'), conversationId, branch.atMessageId, swapped.current, new Date()) : null;
      if (here && !(await saveBranchLines(here.id, swapped.current))) return 'failed';
      let applied = false;
      set((s) => {
        // The chat may have been deleted while saving the branch file.
        if (!s.conversations.some((c) => c.id === conversationId)) return {};
        applied = true;
        const rest = s.branches.filter((b) => b.id !== branchId);
        const added = here ? addBranch(rest, here) : { branches: rest, dropped: [] };
        for (const old of added.dropped) void dropBranchLines(old.id);
        return {
          ...withMessages(s, conversationId, swapped.messages),
          replyVersions: omitKey(s.replyVersions, conversationId),
          branches: added.branches,
        };
      });
      if (!applied) {
        if (here) void dropBranchLines(here.id, false);
        return 'gone';
      }
      // Its lines are the chat's now; their voice notes stay with them.
      void dropBranchLines(branchId, false);
      return 'ok';
    },

    deleteBranch: (branchId) => {
      if (!get().branches.some((b) => b.id === branchId)) return;
      set((s) => ({ branches: s.branches.filter((b) => b.id !== branchId) }));
      void dropBranchLines(branchId);
    },
  });

  return { actions };
}
