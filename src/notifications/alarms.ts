import { Platform } from 'react-native';

import i18n from '@/i18n';
import { ringsWithin } from '@/lib/alarms';
import { CHAIN_LINES } from '@/lib/morning-chain';
import type { Alarm, Character, WakeSession } from '@/types';

import { notificationsModule } from './native';
import { pushesAllowed, requestPushPermission, type PushData } from './sync';

/**
 * Wake-up alarms as local notifications (stage 1). They live apart from the planned pushes:
 * an `alarm:` id, never cleared when the app opens, and re-synced after every change. Stage 2
 * swaps this for a real alarm (AlarmKit on iOS 26+, an exact alarm with a full-screen ring on
 * Android) in a development build; Expo Go on Android has no notifications at all.
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
  return (await pushesAllowed()) || requestPushPermission();
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

  const jobs = alarms
    .filter((alarm) => alarm.enabled)
    .flatMap((alarm) => ringsWithin(alarm, now).map((at) => ({ alarm, at })))
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, 20);

  await Promise.all(
    jobs.map(({ alarm, at }) => {
      const friend = characters.find((c) => c.id === alarm.characterId);
      const data: PushData = {
        id: `${ALARM_PREFIX}${alarm.id}:${at.getTime()}`,
        kind: 'alarm',
        route: `/alarms/ring?id=${alarm.id}&at=${encodeURIComponent(at.toISOString())}`,
        characterId: friend?.id,
        at: at.toISOString(),
      };
      return N.scheduleNotificationAsync({
        identifier: data.id,
        content: {
          title: alarm.label || friend?.name || i18n.t('alarms.defaultLabel'),
          body: friend ? i18n.t('alarms.wakeLine') : i18n.t('alarms.ringing'),
          data: data as unknown as Record<string, unknown>,
          sound: 'default',
          interruptionLevel: 'timeSensitive',
        },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: at, channelId: ALARM_CHANNEL },
      });
    }),
  );

  if (!wake) return;
  const friend = characters.find((c) => c.id === wake.characterId);
  const extra: { id: string; at?: string; route: string; title: string; body: string }[] = [
    {
      id: `${ALARM_PREFIX}snooze`,
      at: wake.state === 'snoozed' ? wake.snoozeUntil : undefined,
      route: '/alarms/ring',
      title: friend?.name ?? i18n.t('alarms.defaultLabel'),
      body: friend ? wake.question : i18n.t('alarms.ringing'),
    },
    {
      id: `${ALARM_PREFIX}checkin`,
      at: wake.checkInAt,
      route: wake.conversationId ? `/chat/${wake.conversationId}` : '/',
      title: friend?.name ?? 'Rafti',
      body: CHAIN_LINES.checkIn,
    },
  ];
  await Promise.all(
    extra
      .filter((e) => e.at && Date.parse(e.at) > now.getTime())
      .map((e) =>
        N.scheduleNotificationAsync({
          identifier: e.id,
          content: {
            title: e.title,
            body: e.body,
            data: { id: e.id, kind: 'alarm', route: e.route, characterId: friend?.id, at: e.at } as unknown as Record<string, unknown>,
            sound: 'default',
            interruptionLevel: 'timeSensitive',
          },
          trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: new Date(e.at!), channelId: ALARM_CHANNEL },
        }),
      ),
  );
}
