/**
 * Back-to-back messages answered as one (backend-plan §12.8): people often say one thing in two to
 * four short texts. Each message used to get its own reply, so the second reply could answer the
 * first message again, and the model ran once per text. Now a message that wants the model's reply
 * waits: a short beat while the field is empty (they are probably done), longer while they type
 * again, never past `BATCH_MAX_MS` from the first one. Then one reply answers them all; the history
 * already holds every message. Shells are still paid per message when it is sent; the closeness each
 * message earns is added up and paid with the reply. "Typing…" shows when the reply starts, not
 * while it waits. A scripted reply (a plan saved, a crisis, a reply idea) answers at once and takes
 * the waiting batch with it (`take`).
 */

/** The field is empty after a send: they are probably done. */
export const BATCH_QUIET_MS = 1500;
/** They are typing again: give the next message time to arrive. */
export const BATCH_TYPING_MS = 3000;
/** The longest a reply waits after the first message of a batch. */
export const BATCH_MAX_MS = 8000;

/** How long a waiting batch waits from now. */
export function batchWait(firstAt: number, now: number, typing: boolean): number {
  return Math.max(0, Math.min(typing ? BATCH_TYPING_MS : BATCH_QUIET_MS, firstAt + BATCH_MAX_MS - now));
}

/** Timers, injected so the batcher runs on a fake clock in tests. */
export interface BatchClock {
  now(): number;
  set(run: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

const realClock: BatchClock = {
  now: () => Date.now(),
  set: (run, ms) => setTimeout(run, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export interface ReplyBatcher {
  /** A message that wants the model's reply: wait for more, then `send` once with the gain of them all. */
  queue(chatId: string, gain: number, send: (gain: number) => void): void;
  /** The composer has text (true) or is empty (false): a waiting batch waits longer or shorter. */
  composing(chatId: string, typing: boolean): void;
  /** Takes a waiting batch back unsent and returns its gain (0 when none waits). */
  take(chatId: string): number;
  /** Whether a reply is waiting in this chat. */
  waiting(chatId: string): boolean;
}

export function replyBatcher(clock: BatchClock = realClock): ReplyBatcher {
  const batches = new Map<string, { firstAt: number; gain: number; send: (gain: number) => void; handle: unknown }>();
  const typing = new Set<string>();

  const arm = (chatId: string) => {
    const batch = batches.get(chatId);
    if (!batch) return;
    clock.clear(batch.handle);
    batch.handle = clock.set(() => fire(chatId), batchWait(batch.firstAt, clock.now(), typing.has(chatId)));
  };

  const fire = (chatId: string) => {
    const batch = batches.get(chatId);
    if (!batch) return;
    if (typing.has(chatId) && clock.now() - batch.firstAt < BATCH_MAX_MS) return arm(chatId);
    batches.delete(chatId);
    batch.send(batch.gain);
  };

  return {
    queue(chatId, gain, send) {
      const batch = batches.get(chatId);
      if (batch) Object.assign(batch, { gain: batch.gain + gain, send });
      else batches.set(chatId, { firstAt: clock.now(), gain, send, handle: null });
      arm(chatId);
    },
    composing(chatId, isTyping) {
      if (isTyping === typing.has(chatId)) return;
      if (isTyping) typing.add(chatId);
      else typing.delete(chatId);
      arm(chatId);
    },
    take(chatId) {
      const batch = batches.get(chatId);
      if (!batch) return 0;
      clock.clear(batch.handle);
      batches.delete(chatId);
      return batch.gain;
    },
    waiting: (chatId) => batches.has(chatId),
  };
}
