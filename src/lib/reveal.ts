import { useEffect, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

/**
 * A friend's new line shows word by word as it arrives, the way Character.AI streams a reply
 * (seen on the phone 2026-10-27, flows.md D108). Only lines delivered while the chat is open
 * reveal; history and Reduce Motion show the whole line at once. The words are cut by
 * `cutSegments` (`src/lib/reply-engine/narration.ts`) so narration keeps its italics.
 */

/** About as fast as a quick reader; a long line still finishes within `MAX_MS`. */
const WORD_MS = 55;
const MAX_MS = 2200;

/** A line that lands while the chat is closed is history by the time it is opened. */
const FRESH_MS = 8000;

/** Lines still revealing, with how many words are already on screen. */
const progress = new Map<string, number>();
/** When each line arrived. */
const arrived = new Map<string, number>();
/** Shows a revealing line whole at once (the user stopped the reply). */
const finishers = new Map<string, () => void>();

/** Milliseconds between two words of a line with `words` words. */
const revealStep = (words: number) => Math.min(WORD_MS, MAX_MS / Math.max(1, words));

/** Marks a line that just arrived: its bubble starts with one word. */
export function markFresh(id: string) {
  progress.set(id, 1);
  arrived.set(id, Date.now());
}

/** Every revealing line shows whole now. */
export function finishReveals() {
  progress.clear();
  arrived.clear();
  for (const finish of finishers.values()) finish();
}

/** Words already shown of a line still revealing, or undefined once it is history. */
function startAt(id: string) {
  const at = arrived.get(id);
  if (at == null || Date.now() - at > FRESH_MS) {
    progress.delete(id);
    arrived.delete(id);
    return undefined;
  }
  return progress.get(id);
}

/** How many of the line's `total` words to show now: all of them unless it just arrived. */
export function useReveal(id: string, total: number) {
  const still = useReducedMotion();
  const [shown, setShown] = useState(() => (still ? total : Math.min(total, startAt(id) ?? total)));
  const done = shown >= total;

  useEffect(() => {
    if (done) {
      progress.delete(id);
      arrived.delete(id);
      return;
    }
    finishers.set(id, () => setShown(total));
    const timer = setInterval(() => {
      setShown((n) => {
        const next = Math.min(total, n + 1);
        // A row the list re-mounts carries on from here instead of starting over.
        if (next < total) progress.set(id, next);
        return next;
      });
    }, revealStep(total));
    return () => {
      clearInterval(timer);
      finishers.delete(id);
    };
  }, [id, total, done]);

  return shown;
}
