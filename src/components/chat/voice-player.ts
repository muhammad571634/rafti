import { createAudioPlayer, setAudioModeAsync, type AudioMode, type AudioPlayer } from 'expo-audio';

import { rmsLevel } from '@/lib/call-level';
import { noteUri } from '@/lib/voice-files';

/** Sound that plays with the mute switch on, as a voice message should, and no microphone. */
export const PLAYBACK_MODE = { allowsRecording: false, playsInSilentMode: true } as const;

/** A call's own audio session while it is open (mic allowed, speaker or earpiece); else plain playback. */
let callAudio: Partial<AudioMode> | null = null;
/** The mode every play and record step returns to: the call's while one is open. */
export const audioMode = (): Partial<AudioMode> => callAudio ?? PLAYBACK_MODE;
/** Opens (a mode) or closes (null) a call's audio session; Speaker switches the route by calling it again. */
export function setCallAudio(mode: Partial<AudioMode> | null) {
  callAudio = mode;
  return setAudioModeAsync(audioMode()).catch(() => {});
}

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

async function startUriPlayer(
  uri: string,
  mine: number,
  done: () => void,
  options: { from?: number; onProgress?: (at: number) => void } = {},
): Promise<boolean> {
  await setAudioModeAsync(audioMode()).catch(() => {});
  if (mine !== turn) return true;
  let player: AudioPlayer;
  try {
    player = createAudioPlayer(uri, { updateInterval: 80 });
  } catch {
    done();
    return false;
  }
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

/**
 * Plays a kept note; `done` runs when it ends or is stopped. False when its file is not on this phone.
 * `from` starts it part way (0-1, a scrub on a still note); `onProgress` hears how far it is (0-1).
 */
export async function playNote(name: string, done: () => void, options: { from?: number; onProgress?: (at: number) => void } = {}): Promise<boolean> {
  stopNote();
  const mine = turn;
  const uri = await noteUri(name);
  if (!uri) return false;
  return startUriPlayer(uri, mine, done, options);
}

/**
 * Plays a local audio URI directly (e.g., an unsent voice note in review mode before sending).
 * Shares the same single-player session so recording or another play stops it cleanly.
 */
export async function playUri(uri: string, done: () => void, options: { from?: number; onProgress?: (at: number) => void } = {}): Promise<boolean> {
  stopNote();
  const mine = turn;
  if (!uri) return false;
  return startUriPlayer(uri, mine, done, options);
}

/** Moves the playing note to `at` (0-1 of its length); nothing when none plays. */
export function seekNote(at: number) {
  const player = current?.player;
  if (!player || !(player.duration > 0)) return;
  void player.seekTo(Math.max(0, Math.min(1, at)) * player.duration);
}

/**
 * Plays a file once (a call's spoken line) and resolves when it ends, is stopped, cannot play, or
 * runs past `maxMs` (a file that never says it finished). `onLevel` hears its loudness (0-1) as it plays,
 * where the phone can sample it.
 */
export async function playOnce(uri: string, maxMs: number, onLevel?: (level: number) => void): Promise<void> {
  stopNote();
  const mine = turn;
  await setAudioModeAsync(audioMode()).catch(() => {});
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
    // The loudness for a call's rings; a phone that cannot sample it just plays.
    if (onLevel) {
      try {
        if (player.isAudioSamplingSupported) {
          player.setAudioSamplingEnabled(true);
          player.addListener('audioSampleUpdate', (sample) => {
            if (current?.player === player) onLevel(rmsLevel(sample.channels[0]?.frames ?? []));
          });
        }
      } catch {}
    }
    player.play();
  });
}
