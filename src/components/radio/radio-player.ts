import { create } from 'zustand';

/**
 * What Radio is playing: one clip or one background sound at a time, shared by the list and
 * the player screen. Not saved. Real builds play the file with expo-audio; the mock runs the clock.
 */
interface RadioPlayer {
  kind: 'clip' | 'sound' | null;
  id: string | null;
  /** Seconds in the item. */
  total: number;
  elapsed: number;
  playing: boolean;
  /** Starts `id` from the top (or pauses it when it is the one playing). */
  toggle: (kind: 'clip' | 'sound', id: string, total: number) => void;
  /** Starts `id` from the top, whatever was playing. */
  play: (kind: 'clip' | 'sound', id: string, total: number) => void;
  stop: () => void;
}

let clock: ReturnType<typeof setInterval> | null = null;

function stopClock() {
  if (clock) clearInterval(clock);
  clock = null;
}

function startClock() {
  stopClock();
  clock = setInterval(() => {
    const { elapsed, total, playing } = useRadioPlayer.getState();
    if (!playing) return;
    if (elapsed + 1 >= total) {
      stopClock();
      useRadioPlayer.setState({ elapsed: total, playing: false });
      return;
    }
    useRadioPlayer.setState({ elapsed: elapsed + 1 });
  }, 1000);
}

export const useRadioPlayer = create<RadioPlayer>()((set, get) => ({
  kind: null,
  id: null,
  total: 0,
  elapsed: 0,
  playing: false,
  play: (kind, id, total) => {
    set({ kind, id, total, elapsed: 0, playing: true });
    startClock();
  },
  toggle: (kind, id, total) => {
    const s = get();
    if (s.id !== id) return get().play(kind, id, total);
    if (s.playing) {
      stopClock();
      set({ playing: false });
      return;
    }
    // A finished item plays again from the top.
    set({ playing: true, elapsed: s.elapsed >= s.total ? 0 : s.elapsed });
    startClock();
  },
  stop: () => {
    stopClock();
    set({ kind: null, id: null, total: 0, elapsed: 0, playing: false });
  },
}));
