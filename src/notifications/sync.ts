import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import i18n from '@/i18n';

import { planPushes, type PlannedPush, type PlanState, type PushChannel } from './plan';

/**
 * Hands the planner's list to the OS (docs/push-plan.md). The app owns everything while
 * it is open, so pushes live only while it is away: `clearPushes` on the way in,
 * `syncPushes` on the way out. Web has no local notifications; every call is a no-op there.
 */

const supported = Platform.OS === 'ios' || Platform.OS === 'android';
/** iOS keeps at most 64 pending notifications per app; stay under it. */
const MAX_PENDING = 60;

const CHANNELS: Record<PushChannel, { name: string; importance: Notifications.AndroidImportance }> = {
  messages: { name: 'push.channels.messages', importance: Notifications.AndroidImportance.HIGH },
  calls: { name: 'push.channels.calls', importance: Notifications.AndroidImportance.MAX },
  reminders: { name: 'push.channels.reminders', importance: Notifications.AndroidImportance.HIGH },
  gifts: { name: 'push.channels.gifts', importance: Notifications.AndroidImportance.DEFAULT },
};

/** What a push carries back to the app when it is tapped or seen. */
export interface PushData {
  id: string;
  kind: PlannedPush['kind'];
  route: string;
  characterId?: string;
  line?: string;
  writesToChat?: boolean;
  at: string;
}

let configured = false;

/** Once per launch: how pushes behave while the app is open, and the Android channels. */
export async function configurePushes() {
  if (!supported || configured) return;
  configured = true;
  // Anything due while the app is open is already happening inside it; stay quiet.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: false,
      shouldShowList: true,
    }),
  });
  if (Platform.OS === 'android') {
    await Promise.all(
      (Object.keys(CHANNELS) as PushChannel[]).map((id) =>
        Notifications.setNotificationChannelAsync(id, {
          name: i18n.t(CHANNELS[id].name),
          importance: CHANNELS[id].importance,
          vibrationPattern: [0, 250, 200, 250],
        }),
      ),
    );
  }
}

export async function pushesAllowed() {
  if (!supported) return false;
  const { granted, ios } = await Notifications.getPermissionsAsync();
  return granted || ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

/**
 * For people who said yes in the app before the system prompt existed (onboarded on an
 * older build): ask once, only if the system never asked.
 */
export async function askIfNeverAsked(saidYesInApp: boolean) {
  if (!supported || !saidYesInApp) return;
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  if (status === Notifications.PermissionStatus.UNDETERMINED && canAskAgain) await requestPushPermission();
}

/** The system prompt. Call it only after the user said yes in the app (two-step ask). */
export async function requestPushPermission() {
  if (!supported) return false;
  await configurePushes();
  const { granted } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return granted;
}

export async function clearPushes() {
  if (!supported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Re-plans from the current state and replaces every pending push. */
export async function syncPushes(state: PlanState, now = new Date()) {
  if (!supported || !(await pushesAllowed())) return;
  await configurePushes();
  await Notifications.cancelAllScheduledNotificationsAsync();

  const preview = state.settings.notificationPreview;
  const plan = planPushes(state, now).slice(0, MAX_PENDING);
  await Promise.all(
    plan.map((push) => {
      const data: PushData = {
        id: push.id,
        kind: push.kind,
        route: push.route,
        characterId: push.characterId,
        line: push.line,
        writesToChat: push.writesToChat,
        at: push.at.toISOString(),
      };
      return Notifications.scheduleNotificationAsync({
        identifier: push.id,
        content: {
          title: push.title ?? 'Rafti',
          body: bodyFor(push, preview),
          data: data as unknown as Record<string, unknown>,
          sound: 'default',
          interruptionLevel: push.timeSensitive ? 'timeSensitive' : 'active',
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: push.at, channelId: push.channel },
      });
    }),
  );
}

/** The lock screen shows what they said only when the user turned previews on. */
function bodyFor(push: PlannedPush, preview: boolean) {
  if (push.textKey) return i18n.t(push.textKey);
  if (!preview || !push.line) return i18n.t('push.hidden');
  return push.line;
}

/** Pushes still in the tray: lines that were only sent as a push get written into the chat. */
export async function deliveredPushes(): Promise<PushData[]> {
  if (!supported) return [];
  const presented = await Notifications.getPresentedNotificationsAsync();
  return presented.map((n) => n.request.content.data as unknown as PushData).filter((d) => !!d?.id);
}
