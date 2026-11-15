import type { PersistStorage, StateStorage, StorageValue } from 'zustand/middleware';

/** How long a change waits before the save: the store changes many times a second while a reply streams in. */
export const SAVE_DELAY_MS = 600;

export type ThrottledStorage<S> = PersistStorage<S> & {
  /** Writes the waiting value now (the app is going to the background, where it may be killed). */
  flush: () => Promise<void>;
};

/**
 * A JSON storage for zustand's persist that writes at most once per `delay`. zustand calls
 * `setItem` on every `set()`, and each call serialised the whole saved store on the JS thread;
 * here only the newest value is kept and serialised once when the timer fires. The newest
 * value always lands: at most `delay` later, or at once on `flush()`.
 */
export function throttledJSONStorage<S>(
  storage: StateStorage,
  delay = SAVE_DELAY_MS,
  timers: { set: typeof setTimeout; clear: typeof clearTimeout } = { set: setTimeout, clear: clearTimeout },
): ThrottledStorage<S> {
  let waiting: { name: string; value: StorageValue<S> } | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = async () => {
    if (timer !== undefined) timers.clear(timer);
    timer = undefined;
    if (!waiting) return;
    const { name, value } = waiting;
    waiting = null;
    await storage.setItem(name, JSON.stringify(value));
  };

  return {
    getItem: async (name) => {
      const raw = await storage.getItem(name);
      return raw ? (JSON.parse(raw) as StorageValue<S>) : null;
    },
    setItem: (name, value) => {
      waiting = { name, value };
      if (timer === undefined) timer = timers.set(() => void flush(), delay);
    },
    removeItem: (name) => {
      // A cleared store must not come back with a write that was still waiting.
      if (timer !== undefined) timers.clear(timer);
      timer = undefined;
      waiting = null;
      return storage.removeItem(name);
    },
    flush,
  };
}
