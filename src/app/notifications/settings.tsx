import { Ionicons } from '@expo/vector-icons';
import { Fragment, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LockPreview } from '@/components/notifications/lock-preview';
import { canRing } from '@/economy/plans';
import { GlassBar, IconRow, InsetGroup, InsetRow, LargeTitle, PressableScale, Screen, Toggle, Txt, useScrolledPast } from '@/components/ui';
import { usePushPermission } from '@/hooks/use-push-permission';
import { pickSeeded } from '@/lib/seeded';
import { dayKey, morningGreetings } from '@/mock';
import { hourClock, pushDay } from '@/notifications/budget';
import { requestPushPermission } from '@/notifications/sync';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, moduleFills, space, systemColors } from '@/theme';
import type { AppSettings } from '@/types';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type SwitchKey = { [K in keyof AppSettings]-?: AppSettings[K] extends boolean ? K : never }[keyof AppSettings];

/** Every switch on the screen with its iOS system-colour icon; `hint` rows carry one line under the title. */
const GROUPS: { title: string; rows: { key: SwitchKey; icon: IconName; fill: string; hint?: boolean }[] }[] = [
  {
    title: 'reachOut',
    rows: [
      { key: 'morningGreeting', icon: 'sunny', fill: systemColors.yellow, hint: true },
      { key: 'eveningGreeting', icon: 'moon', fill: systemColors.indigo, hint: true },
      { key: 'weeklyRecap', icon: 'sparkles', fill: systemColors.pink, hint: true },
      { key: 'morningCall', icon: 'call', fill: moduleFills.calls, hint: true },
      { key: 'nightCall', icon: 'call', fill: systemColors.teal, hint: true },
      { key: 'notifyPlans', icon: 'calendar', fill: systemColors.red, hint: true },
      { key: 'notifyDiary', icon: 'book', fill: moduleFills.diary, hint: true },
      { key: 'notifyAway', icon: 'time', fill: systemColors.gray, hint: true },
    ],
  },
  {
    title: 'rafti',
    rows: [
      { key: 'notifyGifts', icon: 'gift', fill: moduleFills.gifts },
      { key: 'notifyOffers', icon: 'pricetag', fill: systemColors.purple },
    ],
  },
];

/** Tapping a quiet-hours time steps through these. */
const QUIET_FROM = ['21:00', '22:00', '23:00', '00:00'];
const QUIET_TO = ['06:00', '07:00', '08:00', '09:00', '10:00'];
const nextOf = (list: string[], value: string) => list[(list.indexOf(value) + 1) % list.length];

/**
 * Notifications → settings (docs/push-plan.md) as an iOS Settings page: a live lock-screen
 * preview, a switch per kind of push in inset groups, quiet hours. When the phone blocks
 * notifications, a row on top leads to the phone's settings and the switches rest. On web
 * and Android Expo Go the switches still steer what characters do inside the app.
 */
export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const settings = useAppStore((s) => s.settings);
  const setSetting = useAppStore((s) => s.setSetting);
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const conversations = useAppStore((s) => s.conversations);
  const subscription = useAppStore((s) => s.wallet.subscription);
  const wallet = useAppStore((s) => s.wallet);
  const messages = useAppStore((s) => s.messages);
  const care = useAppStore((s) => s.care);
  const daily = useAppStore((s) => s.daily);
  const { status, refresh } = usePushPermission();
  const { scrolled, onScroll } = useScrolledPast(40);

  // Without a plan or trial the daily call comes as a voice note, and the rows say so.
  const freeUser = !canRing(subscription, Date.now());
  const label = (key: SwitchKey) =>
    freeUser && key === 'morningCall'
      ? t('notifications.morningVoiceNote')
      : freeUser && key === 'nightCall'
        ? t('notifications.nightVoiceNote')
        : t(`notifications.${key}`);

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

  // Today's pushes against the day's budget and the sleep the planner keeps clear (`pushDay`).
  const today = useMemo(() => pushDay({ messages, care, wallet, daily }, new Date()), [messages, care, wallet, daily]);

  const turnOn = async () => {
    if (status === 'undetermined') await requestPushPermission();
    else await Linking.openSettings();
    refresh();
  };

  const row = (key: SwitchKey, icon: IconName, fill: string, opts: { hint?: boolean; last?: boolean } = {}) => (
    <IconRow
      key={key}
      icon={icon}
      fill={fill}
      title={label(key)}
      hint={opts.hint ? t(`notifications.hint.${key}`) : undefined}
      disabled={blocked}
      last={opts.last}
      right={
        <Toggle
          value={settings[key]}
          disabled={blocked}
          onChange={(v) => setSetting(key, v)}
          onColor={systemColors.green}
          accessibilityLabel={label(key)}
        />
      }
    />
  );

  return (
    <Screen background={colors.bg}>
      <GlassBar title={t('notifications.settingsTitle')} scrolled={scrolled} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}>
        <LargeTitle>{t('notifications.settingsTitle')}</LargeTitle>

        {blocked ? (
          <InsetGroup style={styles.groupTop}>
            <IconRow
              icon="notifications-off"
              fill={systemColors.red}
              title={t('notifications.off')}
              last
              right={
                <PressableScale scaleTo={0.94} onPress={() => void turnOn()} accessibilityRole="button" style={styles.turnOn}>
                  <Txt style={styles.turnOnText}>
                    {status === 'undetermined' ? t('notifications.turnOn') : t('notifications.openSettings')}
                  </Txt>
                </PressableScale>
              }
            />
          </InsetGroup>
        ) : null}

        <LockPreview
          at={settings.morningCallTime}
          character={preview.writer}
          name={preview.writer ? displayName(preview.writer, relationships[preview.writer.id]) : 'Sigmazam'}
          line={settings.notificationPreview && preview.line ? preview.line : t('push.hidden')}
        />
        <InsetGroup style={styles.groupTop}>{row('notificationPreview', 'eye', systemColors.blue, { last: true })}</InsetGroup>

        <Txt style={styles.sectionLabel}>{t('notifications.section.today')}</Txt>
        <InsetGroup>
          <IconRow
            icon="notifications"
            fill={systemColors.red}
            title={t('notifications.pushesToday')}
            meta={t('notifications.sentOf', { sent: today.sent, budget: today.budget })}
          />
          <IconRow
            icon="bed"
            fill={systemColors.teal}
            title={t('notifications.sleep')}
            meta={`${hourClock(today.sleep.from)} – ${hourClock(today.sleep.to)}`}
            last
          />
        </InsetGroup>

        {GROUPS.map((group) => (
          <Fragment key={group.title}>
            <Txt style={styles.sectionLabel}>{t(`notifications.section.${group.title}`)}</Txt>
            <InsetGroup>
              {group.rows.map(({ key, icon, fill, hint }, i) => row(key, icon, fill, { hint, last: i === group.rows.length - 1 }))}
            </InsetGroup>
          </Fragment>
        ))}

        <Txt style={styles.sectionLabel}>{t('notifications.quietHours')}</Txt>
        <InsetGroup>
          {row('quietHours', 'moon', systemColors.indigo, { last: !settings.quietHours })}
          {settings.quietHours ? (
            <>
              <InsetRow
                label={t('notifications.quietFrom')}
                meta={settings.quietFrom}
                onPress={blocked ? undefined : () => setSetting('quietFrom', nextOf(QUIET_FROM, settings.quietFrom))}
              />
              <InsetRow
                label={t('notifications.quietTo')}
                meta={settings.quietTo}
                last
                onPress={blocked ? undefined : () => setSetting('quietTo', nextOf(QUIET_TO, settings.quietTo))}
              />
            </>
          ) : null}
        </InsetGroup>
        {settings.quietHours ? <Txt style={styles.footer}>{t('notifications.quietNote')}</Txt> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  groupTop: { marginTop: space.md },
  sectionLabel: {
    marginTop: 22,
    marginBottom: 6,
    marginHorizontal: space.lg * 2,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  footer: { marginTop: space.sm, marginHorizontal: space.lg * 2, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  turnOn: { height: 30, paddingHorizontal: 14, borderRadius: 15, justifyContent: 'center', backgroundColor: systemColors.fill },
  turnOnText: { fontSize: 15, fontWeight: '600', color: colors.primary },
});
