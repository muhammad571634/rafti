import type { NotificationResponse } from 'expo-notifications';
import { useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import i18n from '@/i18n';
import { markOpenedFromNotification } from '@/lib/away-clock';

import { syncAlarms } from '@/notifications/alarms';
import { nextPushLog, sentToday } from '@/notifications/budget';
import { notificationsModule } from '@/notifications/native';
import {
  askIfNeverAsked,
  clearPushes,
  configurePushes,
  deliveredPushes,
  IDEA_ACTION,
  REPLY_ACTION,
  syncPushes,
  WRITTEN_ACTION,
  type PushData,
} from '@/notifications/sync';
import { toOutbox } from '@/notifications/outbox';
import { counts } from '@/notifications/plan';
import { useAppStore } from '@/store/use-app-store';
import type { IdeaIntent } from '@/types';

/** The app settles first; opening it is not the moment to wait on the model. */
const WRITE_AHEAD_DELAY_MS = 20_000;

/**
 * Pushes follow the app's life (docs/push-plan.md): leaving the app plans the next
 * two days and the comeback ladder; coming back clears them and lands every line that went
 * out into its chat with the time it went (`src/notifications/outbox.ts`), and a tapped push
 * opens where it points. With the model on, the lines are written ahead while it can be
 * reached (`src/notifications/written.ts`).
 */
export function usePushNotifications() {
  const router = useRouter();
  const hydrated = useAppStore((s) => s.hydrated);
  const onboarded = useAppStore((s) => !!s.user.onboardedAt);

  useEffect(() => {
    const N = notificationsModule();
    if (!N || !hydrated || !onboarded) return;
    let writing: ReturnType<typeof setTimeout> | undefined;

    // A push from a plan made before the outbox: it says itself whether it lands.
    const land = (data: PushData) => {
      if (data.writesToChat && data.characterId && data.line) {
        useAppStore.getState().receivePushLine({ id: data.id, characterId: data.characterId, text: data.line, at: data.at });
      }
    };
    const open = (response: NotificationResponse | null) => {
      const data = response?.notification.request.content.data as unknown as PushData | undefined;
      if (!data?.id) return;
      // The tap leads somewhere, so Today's welcome back stays quiet this time.
      markOpenedFromNotification();
      useAppStore.getState().landDuePushes();
      land(data);
      // A reply idea's button ("I ate!") or a reply typed on the lock screen: the answer goes into
      // their chat, then the chat opens. Without shells for a typed one, it waits in the field.
      const action = response?.actionIdentifier ?? '';
      const store = useAppStore.getState();
      if (action.startsWith(IDEA_ACTION) && data.reach && data.characterId && data.line) {
        const intent = action.slice(IDEA_ACTION.length) as IdeaIntent;
        store.answerFromPush({ characterId: data.characterId, line: data.line, reach: data.reach, intent });
      }
      // A reply the model wrote for this push, from their chat.
      const written = action.startsWith(WRITTEN_ACTION) ? data.ideas?.[Number(action.slice(WRITTEN_ACTION.length))] : undefined;
      if (written && data.reach && data.characterId && data.line) {
        const sent = store.answerFromPush({ characterId: data.characterId, line: data.line, reach: data.reach, idea: written, ideas: data.ideas });
        // A line that cannot go free and no shells: it waits in the field, like a typed one.
        if (sent === 'noShells') {
          router.push({ pathname: data.route as never, params: { draft: written.text } } as Href);
          return;
        }
      }
      const typed = response?.userText?.trim();
      if (action === REPLY_ACTION && typed && data.characterId) {
        const sent = store.answerFromPush({ characterId: data.characterId, line: data.line, reach: data.reach, text: typed });
        if (sent === 'noShells') {
          router.push({ pathname: data.route as never, params: { draft: typed } } as Href);
          return;
        }
      }
      router.push(data.route as Href);
    };
    const replan = async () => {
      const now = new Date();
      const store = useAppStore.getState();
      const plan = await syncPushes(store, now);
      store.setPushOutbox(toOutbox(plan ?? []));
      if (plan) store.setPushLog(nextPushLog(store.daily.pushLog, plan.filter(counts), now));
    };
    // New lines change what can go out, so a plan already handed over is made again.
    const writeAhead = async () => {
      const wrote = await useAppStore.getState().writePushLines();
      if (wrote && AppState.currentState !== 'active') await replan();
    };
    const comeBack = async () => {
      useAppStore.getState().landDuePushes();
      // What was still to come is cancelled below.
      useAppStore.getState().setPushOutbox([]);
      clearTimeout(writing);
      writing = setTimeout(() => void writeAhead(), WRITE_AHEAD_DELAY_MS);
      (await deliveredPushes()).forEach(land);
      await clearPushes();
      // What was still to come was just cancelled: the log keeps only what already went out.
      const store = useAppStore.getState();
      store.setPushLog(sentToday(store.daily.pushLog, new Date()));
      // Repeating alarms are handed over a week at a time; every open tops them up.
      const { alarms, characters, wake } = useAppStore.getState();
      await syncAlarms(alarms, characters, wake);
    };
    // The counted pushes go into the log, so today's budget holds across every re-plan.
    const leave = async () => {
      clearTimeout(writing);
      await replan();
      await writeAhead();
    };

    const { settings } = useAppStore.getState();
    void configurePushes()
      .then(comeBack)
      .then(() => askIfNeverAsked(settings.morningGreeting || settings.eveningGreeting));
    // A tap that launched the app from closed.
    open(N.getLastNotificationResponse());
    N.clearLastNotificationResponse();

    const tapped = N.addNotificationResponseReceivedListener(open);
    // Any change to the alarms (add, edit, switch, delete) goes to the OS at once.
    const alarmsChanged = useAppStore.subscribe((next, prev) => {
      if (next.alarms !== prev.alarms || next.wake !== prev.wake) void syncAlarms(next.alarms, next.characters, next.wake);
    });
    const onLanguage = async () => {
      const store = useAppStore.getState();
      await syncAlarms(store.alarms, store.characters, store.wake);
      await replan();
    };
    i18n.on?.('languageChanged', onLanguage);
    const state = AppState.addEventListener('change', (next) => {
      if (next === 'active') void comeBack();
      else if (next === 'background') void leave();
    });
    return () => {
      clearTimeout(writing);
      i18n.off?.('languageChanged', onLanguage);
      alarmsChanged();
      tapped.remove();
      state.remove();
    };
  }, [hydrated, onboarded, router]);
}
