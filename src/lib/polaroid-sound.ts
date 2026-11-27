import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';

import { hourVolume } from '@/lib/night-hour';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SHUTTER_ASSET = require('../../assets/sounds/polaroid-shutter.wav');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SPARKLE_ASSET = require('../../assets/sounds/polaroid-sparkle.wav');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const HEART_ASSET = require('../../assets/sounds/heart-chime.wav');

export interface PolaroidSound {
  /** Crisp mechanical camera shutter click + soft motorized roller whir. */
  shutter: () => void;
  /** Soft crystalline shimmer when chemical development finishes. */
  sparkle: () => void;
  /** Warm ascending bell chime when hearts fill on a Date. */
  heart: () => void;
  /** Releases all native players on unmount. */
  dispose: () => void;
}

/**
 * Tactile audio engine for Photo Booth & Date Polaroids + Liquid Jelly Heart.
 * Respects quiet night hours (`hourVolume`) and stays a safe no-op on web.
 */
export function createPolaroidSound(): PolaroidSound {
  if (Platform.OS === 'web') {
    return { shutter: () => {}, sparkle: () => {}, heart: () => {}, dispose: () => {} };
  }

  let shutterPlayer: AudioPlayer | null = null;
  let sparklePlayer: AudioPlayer | null = null;
  let heartPlayer: AudioPlayer | null = null;
  let disposed = false;

  try {
    shutterPlayer = createAudioPlayer(SHUTTER_ASSET);
    sparklePlayer = createAudioPlayer(SPARKLE_ASSET);
    heartPlayer = createAudioPlayer(HEART_ASSET);
  } catch {
    // Audio unavailable; haptics and visuals still play cleanly.
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
      // Ignore transient audio focus errors.
    }
  };

  return {
    shutter: () => playOne(shutterPlayer, 0.72),
    sparkle: () => playOne(sparklePlayer, 0.56),
    heart: () => playOne(heartPlayer, 0.64),
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const p of [shutterPlayer, sparklePlayer, heartPlayer]) {
        if (!p) continue;
        try {
          p.remove();
        } catch {
          // Safe cleanup.
        }
      }
      shutterPlayer = null;
      sparklePlayer = null;
      heartPlayer = null;
    },
  };
}
