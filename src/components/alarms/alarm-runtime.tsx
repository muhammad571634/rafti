import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { ALARM_SOUND_FILES } from '@/lib/alarm-sounds';
import { silenceAndroidRings } from '@/notifications/alarm-android';
import { useAppStore } from '@/store/use-app-store';

import { showOverLockScreen } from '../../../modules/alarm-screen';

const TICK_MS = 5_000;

/**
 * Wake-up alarms while the app is open (also on the web and in Expo Go, where there are no
 * notifications): a clock that rings due alarms, ends snoozes and sends the sleepy check-in,
 * and the melody, which loops for as long as the alarm rings (on the ring screen and in the
 * friend's chat, until a real reply). With the app closed, the OS rings (`alarm-android.ts`)
 * and opens the app; this clock then finds the due alarm and the app's melody takes over.
 */
export function AlarmRuntime() {
  const router = useRouter();
  const segments = useSegments();
  const hydrated = useAppStore((s) => s.hydrated);
  const onboarded = useAppStore((s) => !!s.user.onboardedAt);
  const onRing = segments[0] === 'alarms' && segments[1] === 'ring';
  const inChat = segments[0] === 'chat';

  useEffect(() => {
    if (!hydrated || !onboarded) return;
    const tick = () => {
      if (useAppStore.getState().wakeTick() === 'ring' && !onRing) router.push('/alarms/ring');
      // Android opens the app over the lock screen for an alarm; nothing rings, so lock it again.
      if (useAppStore.getState().wake?.state !== 'ringing') showOverLockScreen(false);
      // Only one melody: the notification's loop stops once the open app rings (or nothing does).
      if (AppState.currentState === 'active') void silenceAndroidRings();
    };
    tick();
    const timer = setInterval(tick, TICK_MS);
    const state = AppState.addEventListener('change', (next) => next === 'active' && tick());
    return () => {
      clearInterval(timer);
      state.remove();
    };
  }, [hydrated, onboarded, onRing, router]);

  // The ring screen comes back if the user leaves it while it still rings (not for the chat).
  const ringing = useAppStore((s) => s.wake?.state === 'ringing');
  useEffect(() => {
    if (hydrated && onboarded && ringing && !onRing && !inChat) router.push('/alarms/ring');
  }, [hydrated, onboarded, ringing, onRing, inChat, router]);

  return ringing ? <Melody /> : null;
}

function Melody() {
  const sound = useAppStore((s) => s.alarms.find((a) => a.id === s.wake?.alarmId)?.sound ?? 'morningTide');
  const player = useAudioPlayer(ALARM_SOUND_FILES[sound]);

  useEffect(() => {
    // Rings with the silent switch on and keeps going when the screen locks.
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true }).catch(() => {});
    player.loop = true;
    player.volume = 1;
    player.play();
    return () => {
      try {
        player.pause();
      } catch {
        // Already released with the component.
      }
    };
  }, [player]);

  return null;
}
