import * as Notifications from 'expo-notifications';
import { useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import {
  askIfNeverAsked,
  clearPushes,
  configurePushes,
  deliveredPushes,
  syncPushes,
  type PushData,
} from '@/notifications/sync';
import { useAppStore } from '@/store/use-app-store';

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
    if (Platform.OS === 'web' || !hydrated || !onboarded) return;

    const land = (data: PushData) => {
      if (data.writesToChat && data.characterId && data.line) {
        useAppStore.getState().receivePushLine({ id: data.id, characterId: data.characterId, text: data.line, at: data.at });
      }
    };
    const open = (response: Notifications.NotificationResponse | null) => {
      const data = response?.notification.request.content.data as unknown as PushData | undefined;
      if (!data?.id) return;
      land(data);
      router.push(data.route as Href);
    };
    const comeBack = async () => {
      (await deliveredPushes()).forEach(land);
      await clearPushes();
    };
    const leave = () => void syncPushes(useAppStore.getState());

    const { settings } = useAppStore.getState();
    void configurePushes()
      .then(comeBack)
      .then(() => askIfNeverAsked(settings.morningGreeting || settings.eveningGreeting));
    // A tap that launched the app from closed.
    open(Notifications.getLastNotificationResponse());
    Notifications.clearLastNotificationResponse();

    const tapped = Notifications.addNotificationResponseReceivedListener(open);
    const state = AppState.addEventListener('change', (next) => {
      if (next === 'active') void comeBack();
      else if (next === 'background') leave();
    });
    return () => {
      tapped.remove();
      state.remove();
    };
  }, [hydrated, onboarded, router]);
}
