import type { NotificationResponse } from 'expo-notifications';
import { useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { syncAlarms } from '@/notifications/alarms';
import { notificationsModule } from '@/notifications/native';
import {
  askIfNeverAsked,
  clearPushes,
  configurePushes,
  deliveredPushes,
  IDEA_ACTION,
  syncPushes,
  type PushData,
} from '@/notifications/sync';
import { useAppStore } from '@/store/use-app-store';
import type { IdeaIntent } from '@/types';

/**
 * Pushes follow the app's life (docs/push-plan.md): leaving the app plans the next
 * two days and the comeback ladder; coming back clears them, writes any line that
 * only arrived as a push into its chat, and a tapped push opens where it points.
 */
export function usePushNotifications() {
  const router = useRouter();
  const hydrated = useAppStore((s) => s.hydrated);
  const onboarded = useAppStore((s) => !!s.user.onboardedAt);

  useEffect(() => {
    const N = notificationsModule();
    if (!N || !hydrated || !onboarded) return;

    const land = (data: PushData) => {
      if (data.writesToChat && data.characterId && data.line) {
        useAppStore.getState().receivePushLine({ id: data.id, characterId: data.characterId, text: data.line, at: data.at });
      }
    };
    const open = (response: NotificationResponse | null) => {
      const data = response?.notification.request.content.data as unknown as PushData | undefined;
      if (!data?.id) return;
      land(data);
      // A reply idea's button ("I ate!"): the answer goes into their chat, then the chat opens.
      const action = response?.actionIdentifier ?? '';
      if (action.startsWith(IDEA_ACTION) && data.reach && data.characterId && data.line) {
        const intent = action.slice(IDEA_ACTION.length) as IdeaIntent;
        useAppStore.getState().answerFromPush({ characterId: data.characterId, line: data.line, reach: data.reach, intent });
      }
      router.push(data.route as Href);
    };
    const comeBack = async () => {
      (await deliveredPushes()).forEach(land);
      await clearPushes();
      // Repeating alarms are handed over a week at a time; every open tops them up.
      const { alarms, characters, wake } = useAppStore.getState();
      await syncAlarms(alarms, characters, wake);
    };
    const leave = () => void syncPushes(useAppStore.getState());

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
    const state = AppState.addEventListener('change', (next) => {
      if (next === 'active') void comeBack();
      else if (next === 'background') leave();
    });
    return () => {
      alarmsChanged();
      tapped.remove();
      state.remove();
    };
  }, [hydrated, onboarded, router]);
}
