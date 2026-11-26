import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';

import { hourVolume } from '@/lib/night-hour';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const WAX_CREAK_ASSET: number = require('../../assets/sounds/wax-creak.wav');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const WAX_SNAP_ASSET: number = require('../../assets/sounds/wax-snap.wav');

const CREAK_VOLUME = 0.44;
const SNAP_VOLUME = 0.72;
const CREAK_MIN_GAP_MS = 60;

export interface WaxSealSound {
  /** Plays a short brittle wax stress creak while the user presses the seal (`intensity` in 0..1). */
  creak: (intensity?: number) => void;
  /** Plays the crisp brittle wax snap + linen unfold + warm reveal chime when the seal breaks. */
  snap: () => void;
}

let shared: WaxSealSound | null = null;

/**
 * Lazy singleton audio engine for Secret Note wax seal breaking.
 * Zero native audio players are allocated until the user actually interacts with a wax seal;
 * volumes follow `hourVolume` so late-night letters stay gentle.
 */
export function sharedWaxSealSound(): WaxSealSound {
  if (shared) return shared;
  if (Platform.OS === 'web') {
    shared = { creak: () => {}, snap: () => {} };
    return shared;
  }

  let creakPlayer: AudioPlayer | null = null;
  let snapPlayer: AudioPlayer | null = null;
  let lastCreakAt = 0;

  shared = {
    creak(intensity = 0.5) {
      const now = Date.now();
      if (now - lastCreakAt < CREAK_MIN_GAP_MS) return;
      lastCreakAt = now;
      try {
        if (!creakPlayer) creakPlayer = createAudioPlayer(WAX_CREAK_ASSET);
        const clamped = Math.max(0, Math.min(1, intensity));
        creakPlayer.volume = hourVolume(CREAK_VOLUME * (0.65 + 0.55 * clamped));
        void creakPlayer
          .seekTo(0)
          .then(() => {
            creakPlayer?.play();
          })
          .catch(() => {});
      } catch {
        // Ignore transient audio focus glitches; visual cracks and haptics still play.
      }
    },
    snap() {
      try {
        if (!snapPlayer) snapPlayer = createAudioPlayer(WAX_SNAP_ASSET);
        snapPlayer.volume = hourVolume(SNAP_VOLUME);
        void snapPlayer
          .seekTo(0)
          .then(() => {
            snapPlayer?.play();
          })
          .catch(() => {});
      } catch {
        // Ignore transient audio focus glitches.
      }
    },
  };

  return shared;
}
