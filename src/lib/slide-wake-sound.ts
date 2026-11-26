import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';

import { hourVolume } from '@/lib/night-hour';
import { sharedScrubberSound } from '@/lib/scrubber-sound';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ALARM_UNLOCK_ASSET = require('../../assets/sounds/slide-unlock.wav');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CALL_PICKUP_ASSET = require('../../assets/sounds/call-pickup.wav');

const UNLOCK_VOLUME = 0.65;

export interface SlideWakeSound {
  /** Soft progressive micro-tick while sliding across the track. */
  tick: () => void;
  /** Distinct magnetic lock-catch click at 84%. */
  magnet: () => void;
  /** Warm sunrise chord (alarm) or crystalline pickup triad (call) on unlock. */
  unlock: () => void;
  /** Releases the unlock player on unmount. */
  dispose: () => void;
}

/**
 * Tactile sound pair for the Elastic Liquid Glass Slide control.
 * Reuses the pooled watch-crown scrubber clicks for ticks/magnetic catch and plays
 * a warm dedicated unlock chime on completion, scaled by quiet night hours.
 */
export function createSlideWakeSound(variant: 'alarm' | 'call'): SlideWakeSound {
  if (Platform.OS === 'web') {
    return { tick: () => {}, magnet: () => {}, unlock: () => {}, dispose: () => {} };
  }

  let unlockPlayer: AudioPlayer | null = null;
  let disposed = false;

  try {
    unlockPlayer = createAudioPlayer(variant === 'alarm' ? ALARM_UNLOCK_ASSET : CALL_PICKUP_ASSET);
    unlockPlayer.volume = hourVolume(UNLOCK_VOLUME);
  } catch {
    // Audio unavailable; haptics and visual bloom still drive feedback.
  }

  return {
    tick() {
      if (!disposed) sharedScrubberSound().tick();
    },
    magnet() {
      if (!disposed) sharedScrubberSound().settle();
    },
    unlock() {
      if (disposed || !unlockPlayer) return;
      try {
        unlockPlayer.volume = hourVolume(UNLOCK_VOLUME);
        void unlockPlayer
          .seekTo(0)
          .then(() => {
            if (!disposed) unlockPlayer?.play();
          })
          .catch(() => {});
      } catch {
        // Ignore transient audio focus errors.
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (unlockPlayer) {
        try {
          unlockPlayer.remove();
        } catch {
          // Safe cleanup.
        }
        unlockPlayer = null;
      }
    },
  };
}
