import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';

import { hourVolume } from '@/lib/night-hour';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const HEARTBEAT_ASSET = require('../../assets/sounds/heartbeat-lubdub.wav');

const HEARTBEAT_VOLUME = 0.62;

export interface HeartbeatSound {
  /** Plays a soft double-heartbeat ("lub-dub") scaled by quiet night hours. */
  play: () => void;
  /** Releases the native audio player on unmount. */
  dispose: () => void;
}

/**
 * Low-latency single-voice player for the warm double-heartbeat milestone sound.
 * Respects quiet after-midnight hours (`hourVolume`) and stays a safe no-op on web.
 */
export function createHeartbeatSound(): HeartbeatSound {
  if (Platform.OS === 'web') {
    return { play: () => {}, dispose: () => {} };
  }

  let player: AudioPlayer | null = null;
  let disposed = false;

  try {
    player = createAudioPlayer(HEARTBEAT_ASSET);
    player.volume = hourVolume(HEARTBEAT_VOLUME);
  } catch {
    // Audio unavailable in this runtime; haptics and visual ripples carry the beat.
  }

  return {
    play() {
      if (disposed || !player) return;
      try {
        player.volume = hourVolume(HEARTBEAT_VOLUME);
        void player
          .seekTo(0)
          .then(() => {
            if (!disposed) player?.play();
          })
          .catch(() => {});
      } catch {
        // Ignore transient audio focus errors.
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (player) {
        try {
          player.remove();
        } catch {
          // Safe cleanup.
        }
        player = null;
      }
    },
  };
}
