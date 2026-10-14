import { Platform } from 'react-native';

import i18n from '@/i18n';
import { ALARM_SOUND_NAMES } from '@/lib/alarm-sounds';
import { ringsWithin } from '@/lib/alarms';
import { CHAIN_LINES } from '@/lib/morning-chain';
import type { Alarm, Character, WakeSession } from '@/types';

import { allowAndroidAlarms, androidAlarmsSupported, scheduleAndroidRings, type AndroidRing } from './alarm-android';
import { notificationsModule } from './native';
import { pushesAllowed, requestPushPermission, type PushData } from './sync';

/**
 * Wake-up alarms handed to the OS. They live apart from the planned pushes: an `alarm:` id,
 * never cleared when the app opens, and re-synced after every change. In an Android build the
 * rings are real alarms (`alarm-android.ts`: exact, full screen, our melody); on iOS they are
 * time-sensitive notifications with the melody (AlarmKit needs an iOS build, later). Expo Go on
 * Android has no notifications at all; there the app rings only while open (`AlarmRuntime`).
 */
export const ALARM_PREFIX = 'alarm:';
export const ALARM_CHANNEL = 'alarms';

let channelReady = false;

async function alarmChannel() {
  const N = notificationsModule();
  if (!N || channelReady || Platform.OS !== 'android') return;
  channelReady = true;
  await N.setNotificationChannelAsync(ALARM_CHANNEL, {
    name: i18n.t('push.channels.alarms'),
    importance: N.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 300, 500, 300, 500],
    bypassDnd: true,
  });
}

/** How many alarm rings are pending, so the planner leaves room under iOS's 64. */
export async function pendingAlarmCount() {
  const N = notificationsModule();
  if (!N) return 0;
  const pending = await N.getAllScheduledNotificationsAsync();
  return pending.filter((n) => n.identifier.startsWith(ALARM_PREFIX)).length;
}

/** Asks for notifications once, when the first alarm is saved. False where they cannot run. */
export async function allowAlarms() {
  if (!notificationsModule()) return false;
  const allowed = (await pushesAllowed()) || (await requestPushPermission());
  if (allowed) await allowAndroidAlarms();
  return allowed;
}

/**
 * Replaces every pending alarm ring with the current list (on: the next 7 days of rings), plus
 * the open morning's snooze ring and the friend's "Up yet?" check-in.
 */
export async function syncAlarms(alarms: Alarm[], characters: Character[], wake: WakeSession | null = null, now = new Date()) {
  const N = notificationsModule();
  if (!N || !(await pushesAllowed())) return;
  await alarmChannel();
  const pending = await N.getAllScheduledNotificationsAsync();
  await Promise.all(
    pending
      .filter((n) => n.identifier.startsWith(ALARM_PREFIX))
      .map((n) => N.cancelScheduledNotificationAsync(n.identifier)),
  );

  const rings: AndroidRing[] = alarms
    .filter((alarm) => alarm.enabled)
    .flatMap((alarm) => ringsWithin(alarm, now).map((at) => ({ alarm, at })))
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, 20)
    .map(({ alarm, at }) => {
      const friend = characters.find((c) => c.id === alarm.characterId);
      return {
        id: `${ALARM_PREFIX}${alarm.id}:${at.getTime()}`,
        at,
        title: alarm.label || friend?.name || i18n.t('alarms.defaultLabel'),
        body: friend ? i18n.t('alarms.wakeLine') : i18n.t('alarms.ringing'),
        sound: alarm.sound,
        route: `/alarms/ring?id=${alarm.id}&at=${encodeURIComponent(at.toISOString())}`,
      };
    });

  const friend = wake && characters.find((c) => c.id === wake.characterId);
  const snoozeAt = wake?.state === 'snoozed' ? wake.snoozeUntil : undefined;
  if (wake && snoozeAt && Date.parse(snoozeAt) > now.getTime()) {
    rings.push({
      id: `${ALARM_PREFIX}snooze`,
      at: new Date(snoozeAt),
      title: friend?.name ?? i18n.t('alarms.defaultLabel'),
      body: friend ? wake.question : i18n.t('alarms.ringing'),
      sound: alarms.find((a) => a.id === wake.alarmId)?.sound ?? 'morningTide',
      route: '/alarms/ring',
    });
  }

  if (androidAlarmsSupported()) await scheduleAndroidRings(rings);
  else {
    await Promise.all(
      rings.map((ring) => {
        const data: PushData = { id: ring.id, kind: 'alarm', route: ring.route, at: ring.at.toISOString() };
        return N.scheduleNotificationAsync({
          identifier: ring.id,
          content: {
            title: ring.title,
            body: ring.body,
            data: data as unknown as Record<string, unknown>,
            // iOS plays our melody (bundled by the expo-notifications plugin) once, up to 30 s.
            sound: Platform.OS === 'ios' ? `${ALARM_SOUND_NAMES[ring.sound]}.wav` : 'default',
            interruptionLevel: 'timeSensitive',
          },
          trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: ring.at, channelId: ALARM_CHANNEL },
        });
      }),
    );
  }

  // The "Up yet?" check-in is a plain message, not a ring.
  const checkInAt = wake?.checkInAt;
  if (!wake || !checkInAt || Date.parse(checkInAt) <= now.getTime()) return;
  const id = `${ALARM_PREFIX}checkin`;
  const route = wake.conversationId ? `/chat/${wake.conversationId}` : '/';
  await N.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: friend?.name ?? 'Rafti',
      body: CHAIN_LINES.checkIn,
      data: { id, kind: 'alarm', route, characterId: friend?.id, at: checkInAt } as unknown as Record<string, unknown>,
      sound: 'default',
      interruptionLevel: 'timeSensitive',
    },
    trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: new Date(checkInAt), channelId: ALARM_CHANNEL },
  });
}
