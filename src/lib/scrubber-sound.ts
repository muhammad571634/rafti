import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';

import { hourVolume } from '@/lib/night-hour';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const TICK_ASSET = require('../../assets/sounds/scrubber-tick.wav');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SETTLE_ASSET = require('../../assets/sounds/scrubber-settle.wav');

const POOL_SIZE = 3;
/** Prevents rapid flicks from stacking micro-clicks faster than the ear reads them cleanly. */
const MIN_TICK_GAP_MS = 24;
const TICK_VOLUME = 0.56;
const SETTLE_VOLUME = 0.48;

export interface ScrubberSound {
  /** Short tactile detent tick as the finger crosses a step. */
  tick: () => void;
  /** Slightly warmer magnetic landing click when releasing onto a step. */
  settle: () => void;
  /** Releases all native audio players when the screen unmounts. */
  dispose: () => void;
}

/**
 * Low-latency pooled tactile click engine for precision scrubbers.
 * Uses a 3-voice round-robin pool so fast sweeps across detents never clip or stutter,
 * respects quiet after-midnight volume (`hourVolume`), and follows the phone's silent switch.
 */
export function createScrubberSound(): ScrubberSound {
  if (Platform.OS === 'web') {
    return { tick: () => {}, settle: () => {}, dispose: () => {} };
  }

  let tickPool: AudioPlayer[] = [];
  let settlePlayer: AudioPlayer | null = null;
  let cursor = 0;
  let lastTickAt = 0;
  let disposed = false;

  try {
    tickPool = Array.from({ length: POOL_SIZE }, () => {
      const p = createAudioPlayer(TICK_ASSET);
      p.volume = hourVolume(TICK_VOLUME);
      return p;
    });
    settlePlayer = createAudioPlayer(SETTLE_ASSET);
    settlePlayer.volume = hourVolume(SETTLE_VOLUME);
  } catch {
    // Audio unavailable in this runtime; haptics and visual swell still drive feedback.
  }

  const playOne = (player: AudioPlayer | null, baseVolume: number) => {
    if (disposed || !player) return;
    try {
      player.volume = hourVolume(baseVolume);
      void player
        .seekTo(0)
        .then(() => {
          if (!disposed) player.play();
        })
        .catch(() => {});
    } catch {
      // Ignore transient audio focus errors while scrubbing.
    }
  };

  return {
    tick() {
      if (disposed || tickPool.length === 0) return;
      const now = Date.now();
      if (now - lastTickAt < MIN_TICK_GAP_MS) return;
      lastTickAt = now;
      const player = tickPool[cursor % tickPool.length];
      cursor += 1;
      playOne(player, TICK_VOLUME);
    },
    settle() {
      playOne(settlePlayer, SETTLE_VOLUME);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const p of tickPool) {
        try {
          p.remove();
        } catch {
          // Safe cleanup.
        }
      }
      tickPool = [];
      if (settlePlayer) {
        try {
          settlePlayer.remove();
        } catch {
          // Safe cleanup.
        }
        settlePlayer = null;
      }
    },
  };
}
