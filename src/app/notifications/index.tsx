import { Fragment, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { LockPreview } from '@/components/notifications/lock-preview';
import {
  Button,
  ClayIcon,
  Divider,
  Header,
  ListRow,
  PressableScale,
  Screen,
  SectionLabel,
  Toggle,
  Txt,
  type ClayIconName,
} from '@/components/ui';
import { usePushPermission } from '@/hooks/use-push-permission';
import { pickSeeded } from '@/lib/seeded';
import { dayKey, morningGreetings } from '@/mock';
import { requestPushPermission } from '@/notifications/sync';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';
import type { AppSettings } from '@/types';

const ROW_ICON = 34;
const ROW_INSET = space.lg + ROW_ICON + space.md;

type SwitchKey = { [K in keyof AppSettings]-?: AppSettings[K] extends boolean ? K : never }[keyof AppSettings];

/** Every switch on the screen, grouped as in the approved prototype. */
const GROUPS: { title: string; rows: { key: SwitchKey; icon: ClayIconName }[] }[] = [
  {
    title: 'reachOut',
    rows: [
      { key: 'morningGreeting', icon: 'sun' },
      { key: 'eveningGreeting', icon: 'bedtime' },
      { key: 'morningCall', icon: 'calls' },
      { key: 'nightCall', icon: 'calls' },
      { key: 'notifyPlans', icon: 'planner' },
      { key: 'notifyDiary', icon: 'diary' },
      { key: 'notifyAway', icon: 'wave' },
    ],
  },
  {
    title: 'rafti',
    rows: [
      { key: 'notifyGifts', icon: 'gift' },
      { key: 'notifyOffers', icon: 'store' },
    ],
  },
];

/** Tapping a quiet-hours time steps through these. */
const QUIET_FROM = ['21:00', '22:00', '23:00', '00:00'];
const QUIET_TO = ['06:00', '07:00', '08:00', '09:00', '10:00'];
const nextOf = (list: string[], value: string) => list[(list.indexOf(value) + 1) % list.length];

/**
 * Profile → Notifications (docs/push-plan.md): a live lock-screen preview, a switch per
 * kind of push, quiet hours. When the phone blocks notifications, a card on top leads to
 * the phone's settings and the switches rest. On web and Android Expo Go the switches
 * still steer what characters do inside the app.
 */
export default function NotificationsScreen() {
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
    return { tomorrow, writer, line };
  }, [characters, relationships, conversations]);

  const turnOn = async () => {
    if (status === 'undetermined') await requestPushPermission();
    else await Linking.openSettings();
    refresh();
  };

  const row = (key: SwitchKey, icon: ClayIconName) => (
    <ListRow
      title={t(`notifications.${key}`)}
      left={<ClayIcon name={icon} size={ROW_ICON} />}
      style={blocked && styles.resting}
      right={
        <Toggle
          value={settings[key]}
          disabled={blocked}
          onChange={(v) => setSetting(key, v)}
          accessibilityLabel={t(`notifications.${key}`)}
        />
      }
    />
  );

  return (
    <Screen background={colors.bgPlain}>
      <Header title={t('notifications.title')} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {blocked ? (
          <View style={styles.off}>
            <ClayIcon name="lock" size={34} tile={false} />
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
          date={preview.tomorrow}
          character={preview.writer}
          name={preview.writer ? displayName(preview.writer, relationships[preview.writer.id]) : 'Rafti'}
          line={settings.notificationPreview && preview.line ? preview.line : t('push.hidden')}
        />
        {row('notificationPreview', 'lock')}

        {GROUPS.map((group) => (
          <Fragment key={group.title}>
            <SectionLabel title={t(`notifications.section.${group.title}`)} />
            {group.rows.map(({ key, icon }, index) => (
              <View key={key}>
                {index > 0 ? <Divider inset={ROW_INSET} /> : null}
                {row(key, icon)}
              </View>
            ))}
          </Fragment>
        ))}

        <SectionLabel title={t('notifications.quietHours')} />
        {row('quietHours', 'nightSky')}
        {settings.quietHours ? (
          <View style={[styles.hours, blocked && styles.resting]}>
            <TimePill
              value={settings.quietFrom}
              disabled={blocked}
              label={t('notifications.quietFrom')}
              onPress={() => setSetting('quietFrom', nextOf(QUIET_FROM, settings.quietFrom))}
            />
            <Txt variant="bodyStrong" color={colors.textFaint}>
              →
            </Txt>
            <TimePill
              value={settings.quietTo}
              disabled={blocked}
              label={t('notifications.quietTo')}
              onPress={() => setSetting('quietTo', nextOf(QUIET_TO, settings.quietTo))}
            />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function TimePill({
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
      style={styles.pill}
      scaleTo={0.94}
      disabled={disabled}
      onPress={onPress}
      accessibilityLabel={`${label} ${value}`}>
      <Txt variant="bodyStrong" style={styles.time}>
        {value}
      </Txt>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: space.huge },
  flex: { flex: 1 },
  off: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginHorizontal: space.lg,
    marginTop: space.sm,
    padding: space.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.primarySofter,
  },
  resting: { opacity: 0.4 },
  hours: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingLeft: ROW_INSET,
    paddingRight: space.lg,
    paddingVertical: space.sm,
  },
  pill: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  time: { fontVariant: ['tabular-nums'] },
});
