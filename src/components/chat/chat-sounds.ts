import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useIsFocused } from 'expo-router';
import { useEffect, useRef } from 'react';

import { hourVolume } from '@/lib/night-hour';
import { useAppStore } from '@/store/use-app-store';
import type { Message } from '@/types';

/**
 * The two small sounds of an open chat (design audit Step 3.5, 8.2.5): a light pop as your line
 * leaves and a lower one as theirs lands, both from one real mouth-pop recording ("Mouth Plops.wav"
 * by CapsLok, CC0 1.0, freesound.org/s/181907, fitted by earshot's `fit/pop/mouth_plop`, pitched to
 * D6 and E5; measured: 0.22 s, peak -1 dBFS, RMS -18.7 dBFS). Quiet, behind the same switch as the
 * message sound (Notifications → Message sound), never more than one per moment.
 */
const VOLUME = 0.35;
/** A reply in several bubbles is one sound: the rest after a receive. */
const RECEIVE_REST_MS = 1_500;

const players: Partial<Record<'send' | 'receive', AudioPlayer>> = {};
let lastReceive = 0;

function play(kind: 'send' | 'receive') {
  if (!useAppStore.getState().settings.messageSound) return;
  try {
    const player = (players[kind] ??= createAudioPlayer(
      kind === 'send' ? require('@/assets/sounds/send.wav') : require('@/assets/sounds/receive.wav'),
    ));
    // Half as loud after midnight (audit §8.2.4).
    player.volume = hourVolume(VOLUME);
    void player.seekTo(0).then(() => player.play());
  } catch {
    // No sound here (web, or the player could not load): the chat works the same without it.
  }
}

/** Your line left: a light pop. */
export function playSend() {
  play('send');
}

/** Their line landed in the chat you are reading: a lower pop, once per reply. */
export function playReceive() {
  const now = Date.now();
  if (now - lastReceive < RECEIVE_REST_MS) return;
  lastReceive = now;
  play('receive');
}

/** A line that landed longer ago than this (a rewind showing an older one, a version) makes no sound. */
const FRESH_MS = 10_000;

/** Plays `playReceive` when their new line lands while this chat is the screen on top. */
export function useReceiveSound(messages: readonly Message[] | undefined) {
  const focused = useIsFocused();
  const newest = messages?.at(-1);
  const seen = useRef<string | null>(null);
  useEffect(() => {
    const id = newest?.id ?? '';
    // The chat opening on its history is not a new line.
    if (seen.current === null || id === seen.current) {
      seen.current = id;
      return;
    }
    seen.current = id;
    if (!focused || !newest || newest.author !== 'them' || newest.kind === 'system' || newest.card) return;
    if (Date.now() - Date.parse(newest.createdAt) > FRESH_MS) return;
    playReceive();
    // A new newest line only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newest?.id]);
}
