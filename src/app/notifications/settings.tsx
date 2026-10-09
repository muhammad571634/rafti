import { Ionicons } from '@expo/vector-icons';
import { Fragment, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { LockPreview } from '@/components/notifications/lock-preview';
import { Button, Header, PressableScale, Screen, Toggle, Txt } from '@/components/ui';
import { usePushPermission } from '@/hooks/use-push-permission';
import { pickSeeded } from '@/lib/seeded';
import { dayKey, morningGreetings } from '@/mock';
import { requestPushPermission } from '@/notifications/sync';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';
import type { AppSettings } from '@/types';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type SwitchKey = { [K in keyof AppSettings]-?: AppSettings[K] extends boolean ? K : never }[keyof AppSettings];

/** Every switch on the screen, grouped as in the approved prototype; `hint` rows carry one line under the title. */
const GROUPS: { title: string; rows: { key: SwitchKey; icon: IconName; hint?: boolean }[] }[] = [
  {
    title: 'reachOut',
    rows: [
      { key: 'morningGreeting', icon: 'sunny-outline', hint: true },
      { key: 'eveningGreeting', icon: 'moon-outline', hint: true },
      { key: 'morningCall', icon: 'call-outline', hint: true },
      { key: 'nightCall', icon: 'call-outline', hint: true },
      { key: 'notifyPlans', icon: 'calendar-outline', hint: true },
      { key: 'notifyDiary', icon: 'book-outline', hint: true },
      { key: 'notifyAway', icon: 'time-outline', hint: true },
    ],
  },
  {
    title: 'rafti',
    rows: [
      { key: 'notifyGifts', icon: 'gift-outline' },
      { key: 'notifyOffers', icon: 'pricetag-outline' },
    ],
  },
];

/** Tapping a quiet-hours time steps through these. */
const QUIET_FROM = ['21:00', '22:00', '23:00', '00:00'];
const QUIET_TO = ['06:00', '07:00', '08:00', '09:00', '10:00'];
const nextOf = (list: string[], value: string) => list[(list.indexOf(value) + 1) % list.length];

/**
 * Notifications → settings (docs/push-plan.md): a live lock-screen preview, a switch per
 * kind of push, quiet hours. When the phone blocks notifications, a card on top leads to
 * the phone's settings and the switches rest. On web and Android Expo Go the switches
 * still steer what characters do inside the app.
 */
export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const settings = useAppStore((s) => s.settings);
  const setSetting = useAppStore((s) => s.setSetting);
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const conversations = useAppStore((s) => s.conversations);
  const { status, refresh } = usePushPermission();

  const blocked = status === 'denied' || status === 'undetermined';

  // The push that would really come first tomorrow: the closest friend who writes first,
  // with the same seeded line the planner uses.
  const preview = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const writer = characters
      .filter((c) => relationships[c.id]?.messagesFirst && conversations.some((x) => x.characterId === c.id))
      .sort((a, b) => relationships[b.id].intimacy - relationships[a.id].intimacy)[0];
    const line = writer ? pickSeeded(morningGreetings, `${dayKey(tomorrow)}:morning:${writer.id}`) : '';
    return { writer, line };
  }, [characters, relationships, conversations]);

  const turnOn = async () => {
    if (status === 'undetermined') await requestPushPermission();
    else await Linking.openSettings();
    refresh();
  };

  const row = (key: SwitchKey, icon: IconName, hint?: boolean) => (
    <View style={[styles.row, blocked && styles.resting]}>
      <View style={styles.tile}>
        <Ionicons name={icon} size={19} color={colors.text} />
      </View>
      <View style={styles.flex}>
        <Txt variant="bodyStrong">{t(`notifications.${key}`)}</Txt>
        {hint ? (
          <Txt variant="small" color={colors.textSecondary}>
            {t(`notifications.hint.${key}`)}
          </Txt>
        ) : null}
      </View>
      <Toggle
        value={settings[key]}
        disabled={blocked}
        onChange={(v) => setSetting(key, v)}
        accessibilityLabel={t(`notifications.${key}`)}
      />
    </View>
  );

  return (
    <Screen background={colors.bgPlain}>
      <Header title={t('notifications.settingsTitle')} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {blocked ? (
          <View style={styles.off}>
            <View style={styles.tile}>
              <Ionicons name="lock-closed-outline" size={19} color={colors.text} />
            </View>
            <Txt variant="bodyStrong" style={styles.flex}>
              {t('notifications.off')}
            </Txt>
            <Button
              label={status === 'undetermined' ? t('notifications.turnOn') : t('notifications.openSettings')}
              size="sm"
              onPress={() => void turnOn()}
            />
          </View>
        ) : null}

        <LockPreview
          at={settings.morningCallTime}
          character={preview.writer}
          name={preview.writer ? displayName(preview.writer, relationships[preview.writer.id]) : 'Rafti'}
          line={settings.notificationPreview && preview.line ? preview.line : t('push.hidden')}
        />
        {row('notificationPreview', 'eye-outline')}

        {GROUPS.map((group) => (
          <Fragment key={group.title}>
            <Txt variant="h3" style={styles.section}>
              {t(`notifications.section.${group.title}`)}
            </Txt>
            {group.rows.map(({ key, icon, hint }) => (
              <Fragment key={key}>{row(key, icon, hint)}</Fragment>
            ))}
          </Fragment>
        ))}

        <Txt variant="h3" style={styles.section}>
          {t('notifications.quietHours')}
        </Txt>
        {row('quietHours', 'notifications-off-outline')}
        {settings.quietHours ? (
          <>
            <View style={[styles.hours, blocked && styles.resting]}>
              <TimeButton
                value={settings.quietFrom}
                disabled={blocked}
                label={t('notifications.quietFrom')}
                onPress={() => setSetting('quietFrom', nextOf(QUIET_FROM, settings.quietFrom))}
              />
              <TimeButton
                value={settings.quietTo}
                disabled={blocked}
                label={t('notifications.quietTo')}
                onPress={() => setSetting('quietTo', nextOf(QUIET_TO, settings.quietTo))}
              />
            </View>
            <Txt variant="small" color={colors.textSecondary} style={styles.note}>
              {t('notifications.quietNote')}
            </Txt>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

/** One end of quiet hours: a label over the time; a tap steps to the next choice. */
function TimeButton({
  value,
  label,
  disabled,
  onPress,
}: {
  value: string;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      style={styles.time}
      scaleTo={0.96}
      dimOnPress={false}
      disabled={disabled}
      onPress={onPress}
      accessibilityLabel={`${label} ${value}`}>
      <Txt variant="caption" color={colors.textSecondary} style={styles.bold}>
        {label}
      </Txt>
      <Txt variant="title" style={styles.tabular}>
        {value}
      </Txt>
    </PressableScale>
  );
}

const TILE = 36;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: '600' },
  scroll: { paddingBottom: space.huge },
  section: { marginTop: space.xl, marginBottom: space.xs, marginHorizontal: space.lg },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.xs,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: 11,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  off: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginHorizontal: space.lg,
    marginTop: space.sm,
    padding: space.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  resting: { opacity: 0.4 },
  hours: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.sm },
  time: {
    flex: 1,
    height: 60,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  tabular: { fontVariant: ['tabular-nums'] },
  note: { marginHorizontal: space.lg, marginTop: space.sm + 2 },
});
