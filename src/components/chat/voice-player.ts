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

/** Plays a kept note; `done` runs when it ends or is stopped. False when its file is not on this phone. */
export async function playNote(name: string, done: () => void): Promise<boolean> {
  stopNote();
  const mine = turn;
  const uri = await noteUri(name);
  if (!uri) return false;
  await setAudioModeAsync(PLAYBACK_MODE).catch(() => {});
  if (mine !== turn) return true;
  const player = createAudioPlayer(uri);
  current = { player, done };
  player.addListener('playbackStatusUpdate', (status) => {
    if (status.didJustFinish && current?.player === player) stopNote();
  });
  player.play();
  return true;
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
