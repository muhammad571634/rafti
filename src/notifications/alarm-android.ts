import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import i18n from '@/i18n';
import { ALARM_SOUND_NAMES } from '@/lib/alarm-sounds';
import { WAKE_WINDOW_MIN } from '@/lib/morning-chain';
import type { AlarmSound } from '@/types';

import { createAlarmChannel } from '../../modules/alarm-screen';

type NotifyKit = typeof import('react-native-notify-kit');

/** One ring handed to Android: the alarm's own id prefix keeps it apart from planned pushes. */
export type AndroidRing = { id: string; at: Date; title: string; body: string; sound: AlarmSound; route: string };

const RING_PREFIX = 'alarm:';

let kit: NotifyKit | null | undefined;

/**
 * The real alarm on Android (development and store builds): an exact AlarmManager alarm (the
 * clock icon in the status bar), a full-screen ring that opens the app over the lock screen, and
 * our own melody looping until the app takes over. Null on iOS, the web and Expo Go.
 */
function notifyKit(): NotifyKit | null {
  if (kit !== undefined) return kit;
  kit = null;
  if (Platform.OS !== 'android' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return kit;
  try {
    // Deferred: the native module only exists in a development or store build.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const loaded = require('react-native-notify-kit') as NotifyKit;
    // Notify Kit warns without a background handler; the app itself handles the ring once open.
    loaded.default.onBackgroundEvent(async () => {});
    kit = loaded;
  } catch {
    kit = null;
  }
  return kit;
}

export const androidAlarmsSupported = () => !!notifyKit();

const readyChannels = new Set<AlarmSound>();

/**
 * One channel per melody: Android fixes a channel's sound when it is created. Our module makes
 * it ring on the alarm stream, so silent mode does not mute it; Notify Kit is the fallback.
 */
async function ringChannel(N: NotifyKit, sound: AlarmSound) {
  const id = `ring_${ALARM_SOUND_NAMES[sound]}`;
  if (readyChannels.has(sound)) return id;
  const name = i18n.t('push.channels.alarms');
  if (!createAlarmChannel(id, name, ALARM_SOUND_NAMES[sound])) {
    await N.default.createChannel({
      id,
      name,
      importance: N.AndroidImportance.HIGH,
      sound: ALARM_SOUND_NAMES[sound],
      vibration: true,
      vibrationPattern: [300, 500, 300, 500],
      bypassDnd: true,
      visibility: N.AndroidVisibility.PUBLIC,
    });
  }
  readyChannels.add(sound);
  return id;
}

/**
 * Asks for what a real alarm needs beyond notifications: exact alarms (Android 12+ may switch
 * them off). Opens the system page once when they are off. False where this does not apply.
 */
export async function allowAndroidAlarms() {
  const N = notifyKit();
  if (!N) return false;
  const settings = await N.default.getNotificationSettings();
  if (settings.android.alarm !== N.AndroidNotificationSetting.ENABLED) await N.default.openAlarmPermissionSettings();
  return true;
}

/** Replaces every pending ring with this list. */
export async function scheduleAndroidRings(rings: AndroidRing[]) {
  const N = notifyKit();
  if (!N) return;
  const pending = await N.default.getTriggerNotificationIds();
  await N.default.cancelTriggerNotifications(pending.filter((id) => id.startsWith(RING_PREFIX)));

  const exact = (await N.default.getNotificationSettings()).android.alarm === N.AndroidNotificationSetting.ENABLED;
  for (const ring of rings) {
    if (ring.at.getTime() <= Date.now()) continue;
    const channelId = await ringChannel(N, ring.sound);
    await N.default.createTriggerNotification(
      {
        id: ring.id,
        title: ring.title,
        body: ring.body,
        data: { route: ring.route },
        android: {
          channelId,
          category: N.AndroidCategory.ALARM,
          importance: N.AndroidImportance.HIGH,
          visibility: N.AndroidVisibility.PUBLIC,
          sound: ALARM_SOUND_NAMES[ring.sound],
          loopSound: true,
          ongoing: true,
          autoCancel: false,
          lightUpScreen: true,
          // The melody stops by itself if nobody comes, as the in-app ring gives up.
          timeoutAfter: WAKE_WINDOW_MIN * 60_000,
          pressAction: { id: 'default', launchActivity: 'default' },
          fullScreenAction: { id: 'default', launchActivity: 'default' },
        },
      },
      {
        type: N.TriggerType.TIMESTAMP,
        timestamp: ring.at.getTime(),
        // An alarm clock is exact even in Doze; without the permission Android rings it a little late.
        alarmManager: { type: exact ? N.AlarmType.SET_ALARM_CLOCK : N.AlarmType.SET_AND_ALLOW_WHILE_IDLE },
      },
    );
  }
}

/** Ends the notification's looping melody: the open app plays it now, or the ring is over. */
export async function silenceAndroidRings() {
  const N = notifyKit();
  if (!N) return;
  const shown = await N.default.getDisplayedNotifications();
  const ids = shown.map((n) => n.id ?? n.notification.id).filter((id): id is string => !!id?.startsWith(RING_PREFIX));
  if (ids.length) await N.default.cancelDisplayedNotifications(ids);
}
