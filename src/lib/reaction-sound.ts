import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';

import type { React as ReactionName } from '@/ai/react';
import { hourVolume } from '@/lib/night-hour';
import { sharedScrubberSound } from '@/lib/scrubber-sound';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const REACTION_ASSETS: Record<ReactionName, number> = {
  love: require('../../assets/sounds/react-love.wav'),
  laugh: require('../../assets/sounds/react-laugh.wav'),
  wow: require('../../assets/sounds/react-wow.wav'),
  sad: require('../../assets/sounds/react-sad.wav'),
  hyped: require('../../assets/sounds/react-hyped.wav'),
  thumbs: require('../../assets/sounds/react-thumbs.wav'),
};

const BASE_VOLUME = 0.62;

export interface ReactionSound {
  /** Subtle ascending-feel micro-tick when scrubbing across the reaction dock. */
  hoverTick: () => void;
  /** Plays the unique tactile signature sound for `name` (respecting quiet hours). */
  play: (name: ReactionName) => void;
}

let shared: ReactionSound | null = null;

/**
 * Lazy singleton audio engine for chat reactions.
 * Allocates zero native players until the user opens the dock or a reaction lands;
 * each of the 6 reaction types loads lazily on first play and follows `hourVolume`.
 */
export function sharedReactionSound(): ReactionSound {
  if (shared) return shared;
  if (Platform.OS === 'web') {
    shared = { hoverTick: () => {}, play: () => {} };
    return shared;
  }

  const players: Partial<Record<ReactionName, AudioPlayer>> = {};

  shared = {
    hoverTick() {
      sharedScrubberSound().tick();
    },
    play(name: ReactionName) {
      try {
        let p = players[name];
        if (!p) {
          p = createAudioPlayer(REACTION_ASSETS[name]);
          players[name] = p;
        }
        p.volume = hourVolume(BASE_VOLUME);
        void p
          .seekTo(0)
          .then(() => {
            p?.play();
          })
          .catch(() => {});
      } catch {
        // Ignore transient audio focus errors; haptics and particle bursts still play.
      }
    },
  };
  return shared;
}
