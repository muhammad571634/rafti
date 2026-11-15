import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { noteUri } from '@/lib/voice-files';

/** Sound that plays with the mute switch on, as a voice message should, and no microphone. */
export const PLAYBACK_MODE = { allowsRecording: false, playsInSilentMode: true } as const;

let current: { player: AudioPlayer; done: () => void } | null = null;
/** A newer press wins over a play still looking for its file. */
let turn = 0;

/** One voice message plays at a time; recording stops it too, so it cannot be heard by the mic. */
export function stopNote() {
  turn += 1;
  const playing = current;
  current = null;
  if (!playing) return;
  playing.player.release();
  playing.done();
}

/**
 * Plays a kept note; `done` runs when it ends or is stopped. False when its file is not on this phone.
 * `from` starts it part way (0-1, a scrub on a still note); `onProgress` hears how far it is (0-1).
 */
export async function playNote(name: string, done: () => void, options: { from?: number; onProgress?: (at: number) => void } = {}): Promise<boolean> {
  stopNote();
  const mine = turn;
  const uri = await noteUri(name);
  if (!uri) return false;
  await setAudioModeAsync(PLAYBACK_MODE).catch(() => {});
  if (mine !== turn) return true;
  const player = createAudioPlayer(uri, { updateInterval: 100 });
  current = { player, done };
  let started = false;
  player.addListener('playbackStatusUpdate', (status) => {
    if (current?.player !== player) return;
    if (status.didJustFinish) return stopNote();
    // The length is known once it loaded: a scrub's start point waits for it.
    if (!started && status.isLoaded && status.duration > 0) {
      started = true;
      if (options.from && options.from > 0) void player.seekTo(options.from * status.duration);
    }
    if (status.duration > 0) options.onProgress?.(Math.min(1, status.currentTime / status.duration));
  });
  player.play();
  return true;
}

/** Moves the playing note to `at` (0-1 of its length); nothing when none plays. */
export function seekNote(at: number) {
  const player = current?.player;
  if (!player || !(player.duration > 0)) return;
  void player.seekTo(Math.max(0, Math.min(1, at)) * player.duration);
}

/**
 * Plays a file once (a call's spoken line) and resolves when it ends, is stopped, cannot play, or
 * runs past `maxMs` (a file that never says it finished).
 */
export async function playOnce(uri: string, maxMs: number): Promise<void> {
  stopNote();
  const mine = turn;
  await setAudioModeAsync(PLAYBACK_MODE).catch(() => {});
  if (mine !== turn) return;
  await new Promise<void>((resolve) => {
    let player: AudioPlayer;
    try {
      player = createAudioPlayer(uri);
    } catch {
      return resolve();
    }
    const guard = setTimeout(() => {
      if (current?.player === player) stopNote();
    }, maxMs);
    current = {
      player,
      done: () => {
        clearTimeout(guard);
        resolve();
      },
    };
    player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish && current?.player === player) stopNote();
    });
    player.play();
  });
}
