import type { ChatBranch, Message } from '@/types';

/**
 * Branches (0z286; owner's yes on docs/polybuzz-core.md §5.4, PolyBuzz's "branch archive"): a rewind
 * no longer throws away what came after. The later lines are kept as a branch of the chat, and
 * switching to one puts it back while where the chat is now is kept as a branch in its turn: a long
 * story is never lost to a "what if". Level, shells and memories stay as they are, as with a rewind.
 *
 * The chat holds only each branch's short record (`ChatBranch`); its lines are saved apart
 * (`branch-files.ts`) and read only when switching, so the app's own save stays light. Pure here.
 */

/** Branches a chat keeps; past this the oldest goes, with its lines and voice notes. */
export const BRANCHES_PER_CHAT = 8;
/** The preview of a branch: its first line, this long at most. */
const PREVIEW_CHARS = 80;

const isLine = (m: Message) => m.kind !== 'system' && m.kind !== 'call' && !m.card;

/** The chat cut at a message: what stays, and the later lines a branch keeps. */
export function cutAfter(list: readonly Message[], messageId: string) {
  const at = list.findIndex((m) => m.id === messageId);
  if (at < 0) return null;
  return { kept: list.slice(0, at + 1), tail: list.slice(at + 1) };
}

/** Whether later lines are worth a branch: at least one real line, not only cards or system notes. */
export const worthBranching = (tail: readonly Message[]) => tail.some(isLine);

/** A branch's record for the list: its first line (theirs or the user's), how many lines, when it was cut. */
export function branchRecord(id: string, conversationId: string, atMessageId: string, tail: readonly Message[], now: Date): ChatBranch {
  const first = tail.find(isLine);
  const text = (first?.text || first?.transcript || '').replace(/\s+/g, ' ').trim();
  return {
    id,
    conversationId,
    atMessageId,
    createdAt: now.toISOString(),
    count: tail.filter(isLine).length,
    preview: Array.from(text).slice(0, PREVIEW_CHARS).join(''),
    ...(first ? { from: first.author } : {}),
  };
}

/** The branches after adding one: the newest first, the oldest of this chat past the cap dropped (returned to clean up). */
export function addBranch(all: readonly ChatBranch[], branch: ChatBranch) {
  const mine = all.filter((b) => b.conversationId === branch.conversationId);
  const others = all.filter((b) => b.conversationId !== branch.conversationId);
  const sorted = [branch, ...mine].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return { branches: [...others, ...sorted.slice(0, BRANCHES_PER_CHAT)], dropped: sorted.slice(BRANCHES_PER_CHAT) };
}

/** A chat's branches, newest first, and whether each can still be switched to (its point is still in the chat). */
export function branchesOf(all: readonly ChatBranch[], conversationId: string, list: readonly Message[]) {
  const ids = new Set(list.map((m) => m.id));
  return all
    .filter((b) => b.conversationId === conversationId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map((b) => ({ ...b, open: ids.has(b.atMessageId) }));
}

/**
 * Switching: the chat up to the branch's point, then the branch's lines; what came after the point
 * until now becomes the other side (a branch of its own when it is worth one). Null when the point is
 * gone (an earlier rewind cut it away).
 */
export function swapIn(list: readonly Message[], atMessageId: string, tail: readonly Message[]) {
  const cut = cutAfter(list, atMessageId);
  if (!cut) return null;
  return { messages: [...cut.kept, ...tail], current: cut.tail };
}

/** The voice notes a branch's lines hold, to delete with it. */
export const branchNotes = (tail: readonly Message[]) => tail.flatMap((m) => (m.audioFile ? [m.audioFile] : []));
