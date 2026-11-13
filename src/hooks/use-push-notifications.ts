import type { NotificationResponse } from 'expo-notifications';
import { useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import i18n from '@/i18n';
import { markOpenedFromNotification } from '@/lib/away-clock';

import { syncAlarms } from '@/notifications/alarms';
import { nextPushLog, sentToday } from '@/notifications/budget';
import { clearLiveBanners } from '@/notifications/incoming';
import { notificationsModule } from '@/notifications/native';
import {
  askIfNeverAsked,
  configurePushes,
  deliveredPushes,
  IDEA_ACTION,
  REPLY_ACTION,
  serially,
  syncPushes,
  WRITTEN_ACTION,
  type PushData,
} from '@/notifications/sync';
import { errorText, HEALTH_LIST_MAX, healthLine, type PushHealth } from '@/notifications/health';
import { toOutbox } from '@/notifications/outbox';
import { counts } from '@/notifications/plan';
import { type AppState as Store, useAppStore } from '@/store/use-app-store';
import type { IdeaIntent } from '@/types';

/** The app settles first; opening it is not the moment to wait on the model. */
const WRITE_AHEAD_DELAY_MS = 20_000;
/** A hand-over still running after this is reported as stuck, with the step it reached. */
const SYNC_STUCK_MS = 8_000;
/** A change that matters is handed over once things have settled… */
const CHANGE_SETTLE_MS = 5_000;
/** …and at most this often while chatting, since a new message changes what can go out. */
const CHANGE_MIN_GAP_MS = 60_000;
/** With nothing changing, the plan is still handed over again this often while the app is open. */
const HEARTBEAT_MS = 10 * 60_000;

/** The parts of the state the planner reads (the day's push log is its own output, so it is left out). */
const plannerInput = (s: Store) => [
  s.settings,
  s.schedules,
  s.care,
  s.threads,
  s.conversations,
  s.relationships,
  s.characters,
  s.pushLines,
  s.wallet.subscription,
  s.wallet.free,
  s.user,
  s.blockedIds,
  s.diary,
  s.daily.greetedSlots,
  s.daily.calledSlots,
  s.daily.lifeSent,
  s.daily.worldNewsSent,
  s.daily.spinsUsed,
  s.daily.lastLoginDay,
];
const plannerChanged = (next: Store, prev: Store) => {
  const a = plannerInput(next);
  const b = plannerInput(prev);
  return a.some((value, i) => value !== b[i]);
};

/**
 * Pushes follow the app's life (docs/push-plan.md). Since 0z189 they are handed to the OS while the
 * app is open: on coming back and after every change the planner reads (settled, at most once a
 * minute), and once more on the way out, best effort (Android freezes a backgrounded app before its
 * broadcasts come back, `src/notifications/sync.ts`). Coming back lands every line that went out
 * while away into its chat with its own time (`src/notifications/outbox.ts`); a push that comes due
 * while the app is open stays hidden and its line lands at that moment (`runTimers`). A tapped push
 * opens where it points. With the model on, the lines are written ahead while it can be reached
 * (`src/notifications/written.ts`).
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
    // Plans and hands the pushes to the OS, one hand-over at a time (`serially`); what the OS holds
    // becomes the outbox and the day's log, and the record says how it went (`PushHealth`).
    let lastSync = 0;
    const replan = (event: PushHealth['event']) =>
      serially(async () => {
        const now = new Date();
        lastSync = now.getTime();
        const store = useAppStore.getState();
        // The step it reached: a hand-over that never ends says where it stopped.
        let reached = 'start';
        const stuck = setTimeout(() => {
          console.warn(`[push] ${event} stuck at ${reached}`);
          useAppStore.getState().setPushHealth({ at: now.toISOString(), event, planned: 0, scheduled: 0, error: `stuck at ${reached}` });
        }, SYNC_STUCK_MS);
        try {
          const result = await syncPushes(store, now, (name) => (reached = name));
          clearTimeout(stuck);
          // Only what is still to come: what came due meanwhile was landed by `runTimers` or waits in the old outbox.
          const due = useAppStore.getState().pushOutbox.filter((item) => Date.parse(item.at) <= Date.now());
          store.setPushOutbox([...due, ...toOutbox(result?.scheduled ?? [])]);
          if (result) store.setPushLog(nextPushLog(useAppStore.getState().daily.pushLog, result.scheduled.filter(counts), now));
          const health: PushHealth = {
            at: now.toISOString(),
            event,
            planned: result?.plan.length ?? 0,
            scheduled: result?.scheduled.length ?? 0,
            ...(result ? {} : { off: true }),
            ...(result?.error ? { error: result.error } : {}),
            next: (result?.scheduled ?? []).slice(0, HEALTH_LIST_MAX).map(healthLine),
          };
          if (health.error) console.warn(`[push] ${event}: ${health.scheduled}/${health.planned} scheduled, ${health.error}`);
          store.setPushHealth(health);
        } catch (error) {
          clearTimeout(stuck);
          // Nothing reached the OS: the record and the device log say why; the next change tries again.
          console.warn(`[push] ${event} failed at ${reached}: ${errorText(error)}`);
          store.setPushHealth({ at: now.toISOString(), event, planned: 0, scheduled: 0, error: errorText(error) });
        }
      });
    // New lines change what can go out, so the plan is handed over again.
    const writeAhead = async () => {
      const wrote = await useAppStore.getState().writePushLines().catch(() => 0);
      if (wrote) await replan('write');
    };
    const comeBack = () =>
      serially(async () => {
        let reached = 'start';
        const at = new Date().toISOString();
        const stuck = setTimeout(() => {
          console.warn(`[push] back stuck at ${reached}`);
          useAppStore.getState().setPushHealth({ at, event: 'back', planned: 0, scheduled: 0, error: `stuck at ${reached}` });
        }, SYNC_STUCK_MS);
        try {
          await welcomeBack((name) => (reached = name));
        } catch (error) {
          console.warn(`[push] back failed at ${reached}: ${errorText(error)}`);
          useAppStore.getState().setPushHealth({ at, event: 'back', planned: 0, scheduled: 0, error: errorText(error) });
        } finally {
          clearTimeout(stuck);
        }
      }).then(() => replan('back'));
    const welcomeBack = async (step: (name: string) => void) => {
      // The chat left on screen is read now, and the banners of what came while away go.
      const { activeConversationId, markRead } = useAppStore.getState();
      if (activeConversationId) markRead(activeConversationId);
      void clearLiveBanners().catch(() => {});
      // What went out while away lands in its chats; what is still to come stays with the OS.
      step('land');
      useAppStore.getState().landDuePushes();
      clearTimeout(writing);
      writing = setTimeout(() => void writeAhead(), WRITE_AHEAD_DELAY_MS);
      step('delivered');
      (await deliveredPushes()).forEach(land);
      // The log keeps what already went out; the hand-over after this adds what is planned.
      const store = useAppStore.getState();
      store.setPushLog(sentToday(store.daily.pushLog, new Date()));
      // Repeating alarms are handed over a week at a time; every open tops them up. Not awaited: a slow
      // alarm hand-over (seen on the A51) must not hold the pushes back.
      const { alarms, characters, wake } = useAppStore.getState();
      void syncAlarms(alarms, characters, wake).catch((error) => console.warn(`[push] alarms failed: ${errorText(error)}`));
    };
    // Best effort on the way out (the app may be frozen before it ends): the plan handed over while
    // open stays either way. It still matters for the half-hour unread nudge, timed from leaving.
    const leave = async () => {
      clearTimeout(writing);
      clearTimeout(changed);
      await replan('leave');
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
    // A change the planner reads (a plan, a setting, a new message, a written line) is handed over
    // while the app is open, once things settle and at most once a minute.
    let changed: ReturnType<typeof setTimeout> | undefined;
    const planChanged = useAppStore.subscribe((next, prev) => {
      if (AppState.currentState !== 'active' || !plannerChanged(next, prev)) return;
      clearTimeout(changed);
      const wait = Math.max(CHANGE_SETTLE_MS, lastSync + CHANGE_MIN_GAP_MS - Date.now());
      changed = setTimeout(() => void replan('change'), wait);
    });
    // A long stay in the app keeps the plan fresh too, and a hand-over the OS was slow to finish gets another go.
    const heartbeat = setInterval(() => {
      if (AppState.currentState === 'active' && Date.now() - lastSync >= HEARTBEAT_MS) void replan('change');
    }, HEARTBEAT_MS);
    const onLanguage = async () => {
      const store = useAppStore.getState();
      await syncAlarms(store.alarms, store.characters, store.wake).catch(() => {});
      await replan('language');
    };
    i18n.on?.('languageChanged', onLanguage);
    const state = AppState.addEventListener('change', (next) => {
      if (next === 'active') void comeBack();
      else if (next === 'background') void leave();
    });
    return () => {
      clearTimeout(writing);
      clearTimeout(changed);
      clearInterval(heartbeat);
      i18n.off?.('languageChanged', onLanguage);
      alarmsChanged();
      planChanged();
      tapped.remove();
      state.remove();
    };
  }, [hydrated, onboarded, router]);
}
