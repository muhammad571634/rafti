import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { dayKey, todayKey } from '@/mock';
import { useAppStore, type CallSlot } from '@/store/use-app-store';

/** How long after opening the app a good-morning / good-night call starts ringing. */
const CALL_DELAY_MS = 6000;
/** Breathing room between closing the daily-reward card and the phone ringing. */
const AFTER_REWARD_MS = 1500;

type PendingCall = { callFrom: string; slot?: CallSlot };

/**
 * The reference app's hook: characters act first. On launch and whenever the app
 * returns to the foreground we collect the daily login reward, let characters send
 * greetings and plan reminders, and — once per morning / night — ring you.
 */
export function useCharacterInitiative() {
  const router = useRouter();
  const hydrated = useAppStore((s) => s.hydrated);
  // Nobody calls or writes first while the user is still on the first-launch flow.
  const onboarded = useAppStore((s) => !!s.user.onboardedAt);
  const incoming = useAppStore((s) => s.incomingCall);
  const dailyReward = useAppStore((s) => s.dailyReward);
  const shownCall = useRef<string | null>(null);
  // A call that came due while the daily-reward card was still open.
  const pending = useRef<PendingCall | null>(null);

  useEffect(() => {
    if (!hydrated || !onboarded) return;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const run = () => {
      const store = useAppStore.getState();
      store.claimDailyLogin();
      // The first day belongs to the friend the user just met: nobody else calls yet.
      const firstDay = !!store.user.onboardedAt && dayKey(store.user.onboardedAt) === todayKey();
      if (firstDay) return;
      const { callFrom, slot } = store.runDailyInitiative();
      if (!callFrom) return;

      clearTimeout(timer);
      timer = setTimeout(() => {
        const latest = useAppStore.getState();
        if (latest.dailyReward) pending.current = { callFrom, slot };
        else latest.ring(callFrom, slot);
      }, CALL_DELAY_MS);
    };

    run();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });

    return () => {
      sub.remove();
      clearTimeout(timer);
    };
  }, [hydrated, onboarded]);

  // Never ring over the reward card: wait for it to close, then call.
  useEffect(() => {
    if (dailyReward || !pending.current) return;
    const { callFrom, slot } = pending.current;
    pending.current = null;
    const timer = setTimeout(() => useAppStore.getState().ring(callFrom, slot), AFTER_REWARD_MS);
    return () => clearTimeout(timer);
  }, [dailyReward]);

  useEffect(() => {
    if (!incoming) {
      shownCall.current = null;
      return;
    }
    if (shownCall.current === incoming.characterId) return;
    shownCall.current = incoming.characterId;
    router.push(`/call/incoming/${incoming.characterId}`);
  }, [incoming, router]);
}
