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
