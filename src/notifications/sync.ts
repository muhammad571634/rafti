import { Platform } from 'react-native';

import i18n from '@/i18n';

import { notificationsModule } from './native';
import { planPushes, type PlannedPush, type PlanState, type PushChannel } from './plan';

/**
 * Hands the planner's list to the OS (docs/push-plan.md). The app owns everything while
 * it is open, so pushes live only while it is away: `clearPushes` on the way in,
 * `syncPushes` on the way out. Where notifications are not available (web, Android
 * Expo Go) every call is a no-op and the app works as before.
 */

/** iOS keeps at most 64 pending notifications per app; stay under it. */
const MAX_PENDING = 60;
/** Test pushes (`sendTestPushes`) carry this id prefix; planning leaves them alone. */
const TEST_PREFIX = 'test:';
const TEST_FIRST_MS = 5_000;
const TEST_STEP_MS = 8_000;
const TEST_MAX = 10;

const CHANNELS: Record<PushChannel, { name: string; importance: 'HIGH' | 'MAX' | 'DEFAULT' }> = {
  messages: { name: 'push.channels.messages', importance: 'HIGH' },
  calls: { name: 'push.channels.calls', importance: 'MAX' },
  reminders: { name: 'push.channels.reminders', importance: 'HIGH' },
  gifts: { name: 'push.channels.gifts', importance: 'DEFAULT' },
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
  /** A test push from the dev button: shown even while the app is open. */
  test?: boolean;
}

let configured = false;

/** Once per launch: how pushes behave while the app is open, and the Android channels. */
export async function configurePushes() {
  const N = notificationsModule();
  if (!N || configured) return;
  configured = true;
  // Anything due while the app is open is already happening inside it; stay quiet.
  // Test pushes are the exception: they exist to be seen.
  N.setNotificationHandler({
    handleNotification: async (notification) => {
      const test = (notification.request.content.data as unknown as PushData | undefined)?.test === true;
      return { shouldPlaySound: test, shouldSetBadge: false, shouldShowBanner: test, shouldShowList: true };
    },
  });
  if (Platform.OS === 'android') {
    await Promise.all(
      (Object.keys(CHANNELS) as PushChannel[]).map((id) =>
        N.setNotificationChannelAsync(id, {
          name: i18n.t(CHANNELS[id].name),
          importance: N.AndroidImportance[CHANNELS[id].importance],
          vibrationPattern: [0, 250, 200, 250],
        }),
      ),
    );
  }
}

export async function pushesAllowed() {
  const N = notificationsModule();
  if (!N) return false;
  const { granted, ios } = await N.getPermissionsAsync();
  return granted || ios?.status === N.IosAuthorizationStatus.PROVISIONAL;
}

/**
 * For people who said yes in the app before the system prompt existed (onboarded on an
 * older build): ask once, only if the system never asked.
 */
export async function askIfNeverAsked(saidYesInApp: boolean) {
  const N = notificationsModule();
  if (!N || !saidYesInApp) return;
  const { status, canAskAgain } = await N.getPermissionsAsync();
  if (status === N.PermissionStatus.UNDETERMINED && canAskAgain) await requestPushPermission();
}

/** The system prompt. Call it only after the user said yes in the app (two-step ask). */
export async function requestPushPermission() {
  const N = notificationsModule();
  if (!N) return false;
  await configurePushes();
  const { granted } = await N.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return granted;
}

/** Cancels every planned push; test pushes keep going. */
export async function clearPushes() {
  const N = notificationsModule();
  if (!N) return;
  const pending = await N.getAllScheduledNotificationsAsync();
  await Promise.all(
    pending
      .filter((n) => !n.identifier.startsWith(TEST_PREFIX))
      .map((n) => N.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/** Re-plans from the current state and replaces every pending push. */
export async function syncPushes(state: PlanState, now = new Date()) {
  if (!(await pushesAllowed())) return;
  await configurePushes();
  await clearPushes();
  const plan = planPushes(state, now).slice(0, MAX_PENDING);
  await Promise.all(plan.map((push) => schedule(push, push.id, push.at, state.settings.notificationPreview)));
}

/**
 * Dev button: the pushes the planner would send, one of each kind, a few seconds apart
 * and with their text shown, so a phone can be checked without waiting for 08:00.
 * Returns how many were scheduled; 0 when notifications are unavailable or not allowed.
 */
export async function sendTestPushes(state: PlanState, now = new Date()): Promise<number> {
  const N = notificationsModule();
  if (!N) return 0;
  if (!(await pushesAllowed()) && !(await requestPushPermission())) return 0;
  await configurePushes();

  const seen = new Set<string>();
  const sample = planPushes(state, now)
    .filter((push) => !seen.has(push.kind) && seen.add(push.kind))
    .slice(0, TEST_MAX);
  await Promise.all(
    sample.map((push, i) =>
      schedule(push, `${TEST_PREFIX}${push.id}`, new Date(now.getTime() + TEST_FIRST_MS + i * TEST_STEP_MS), true, true),
    ),
  );
  return sample.length;
}

function schedule(push: PlannedPush, identifier: string, at: Date, preview: boolean, test = false) {
  const N = notificationsModule()!;
  const data: PushData = {
    id: push.id,
    kind: push.kind,
    route: push.route,
    characterId: push.characterId,
    line: push.line,
    writesToChat: push.writesToChat,
    at: at.toISOString(),
    test: test || undefined,
  };
  return N.scheduleNotificationAsync({
    identifier,
    content: {
      title: push.title ?? 'Rafti',
      body: bodyFor(push, preview),
      data: data as unknown as Record<string, unknown>,
      sound: 'default',
      interruptionLevel: push.timeSensitive ? 'timeSensitive' : 'active',
    },
    trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: at, channelId: push.channel },
  });
}

/** The lock screen shows what they said only when the user turned previews on. */
function bodyFor(push: PlannedPush, preview: boolean) {
  if (push.textKey) return i18n.t(push.textKey);
  if (!preview || !push.line) return i18n.t('push.hidden');
  return push.line;
}

/** Pushes still in the tray: lines that were only sent as a push get written into the chat. */
export async function deliveredPushes(): Promise<PushData[]> {
  const N = notificationsModule();
  if (!N) return [];
  const presented = await N.getPresentedNotificationsAsync();
  return presented.map((n) => n.request.content.data as unknown as PushData).filter((d) => !!d?.id);
}
