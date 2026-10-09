import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { SUPPORT_EMAIL } from '@/ai/safety';
import {
  Button,
  CharacterAvatar,
  Divider,
  Header,
  IconTile,
  ListRow,
  PressableScale,
  Screen,
  SectionLabel,
  ShellBadge,
  Sheet,
  Toggle,
  Txt,
  UserAvatar,
} from '@/components/ui';
import { usePushPermission } from '@/hooks/use-push-permission';
import { SUPPORTED_LOCALES, setLocale } from '@/i18n';
import { planStatus } from '@/economy/plans';
import { profileCompletion } from '@/lib/profile';
import { INVITE_REWARD } from '@/mock';
import { sendTestPushes } from '@/notifications/sync';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';
import type { AppSettings } from '@/types';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const ROW_ICON = 36;

/** The on/off settings; call times and the caller live in the chat's Daily calls sheet. */
type SwitchKey = { [K in keyof AppSettings]-?: AppSettings[K] extends boolean ? K : never }[keyof AppSettings];

/**
 * Who you are (photo, name, how full the profile is), then grouped settings: account
 * (plan, gifts with the invite offer, notifications, chat animations), about; delete
 * at the very end. Calm-cards style (docs/design-style.md).
 */
export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const user = useAppStore((s) => s.user);
  const wallet = useAppStore((s) => s.wallet);
  const settings = useAppStore((s) => s.settings);
  const setSetting = useAppStore((s) => s.setSetting);
  const deleteAccount = useAppStore((s) => s.deleteAccount);
  const endPlan = useAppStore((s) => s.endPlan);
  const loadDemoData = useAppStore((s) => s.loadDemoData);
  const blockedIds = useAppStore((s) => s.blockedIds);
  const characters = useAppStore((s) => s.characters);
  const unblockCharacter = useAppStore((s) => s.unblockCharacter);
  const blocked = characters.filter((c) => blockedIds.includes(c.id));

  const [languageOpen, setLanguageOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const { status: pushStatus } = usePushPermission();
  const blockedPushes = pushStatus === 'denied' || pushStatus === 'undetermined';
  /** Dev only: what the last "Test pushes" press did. */
  const [testResult, setTestResult] = useState<string | undefined>();

  const testPushes = async () => {
    const count = await sendTestPushes(useAppStore.getState());
    setTestResult(count > 0 ? t('profile.testPushesSent', { count }) : t('profile.testPushesUnavailable'));
  };

  const percent = profileCompletion(user);
  // One language for now: the picker shows up once there is a second one.
  const canPickLanguage = SUPPORTED_LOCALES.length > 1;

  const confirmDelete = () => {
    setDeleteOpen(false);
    deleteAccount();
    if (router.canDismiss()) router.dismissAll();
    router.replace('/onboarding');
  };

  const currentLocale = SUPPORTED_LOCALES.find((l) => l.code === i18n.language)?.label ?? i18n.language;
  const plan = planStatus(wallet.subscription, Date.now());
  // A line icon in a grey tile, the calm-cards row (docs/design-style.md).
  const icon = (name: IoniconName) => <IconTile icon={name} size={ROW_ICON} radius={11} glyphSize={19} />;

  const toggle = (key: SwitchKey, label: string, left: React.ReactNode) => (
    <ListRow
      title={label}
      left={left}
      right={<Toggle value={settings[key]} onChange={(v) => setSetting(key, v)} accessibilityLabel={label} />}
    />
  );

  return (
    <Screen background={colors.bgPlain}>
      <Header title={t('profile.title')} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.identity}>
          <PressableScale scaleTo={0.95} onPress={() => router.push('/edit-profile')}>
            <UserAvatar user={user} size={64} />
          </PressableScale>
          <View style={styles.flex}>
            <Txt variant="h2" lines={1}>
              {user.displayName}
            </Txt>
            <Txt variant="small" color={colors.textMuted} lines={1}>
              {user.handle}
            </Txt>
          </View>
          <ShellBadge count={wallet.shells} showAdd onPress={() => router.push('/store/shell?tab=shells')} />
        </View>

        <PressableScale
          scaleTo={0.98}
          onPress={() => router.push('/edit-profile')}
          accessibilityLabel={t('profile.editProfile')}
          style={styles.card}>
          <View style={styles.cardTop}>
            <Txt variant="title" style={styles.flex}>
              {t('profile.editProfile')}
            </Txt>
            <Txt variant="bodyStrong">{percent}%</Txt>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${percent}%` }]} />
          </View>
          {percent < 100 ? (
            <Txt variant="small" color={colors.textSecondary}>
              {t('profile.completeHint')}
            </Txt>
          ) : null}
        </PressableScale>

        <SectionLabel tone="section" title={t('profile.sectionAccount')} />
        <ListRow
          title={t('profile.myPlan')}
          left={icon('diamond-outline')}
          meta={
            plan
              ? plan.trial
                ? t('plans.trialName', { plan: t(`plans.name.${plan.plan}`) })
                : t(`plans.name.${plan.plan}`)
              : t('plans.free')
          }
          chevron
          onPress={() => router.push('/my-plan')}
        />
        {/* The invite code, its rules and "Have a code?" live on Free gifts. */}
        <ListRow
          title={t('profile.freeGifts')}
          left={icon('gift-outline')}
          right={
            <View style={styles.offer}>
              <Txt variant="chip" color={colors.brandText}>
                {t('profile.inviteOffer', { count: INVITE_REWARD })}
              </Txt>
            </View>
          }
          chevron
          onPress={() => router.push('/gifts')}
        />
        {/* Who reaches out, previews and quiet hours live on their own screen. */}
        <ListRow
          title={t('notifications.title')}
          left={icon('notifications-outline')}
          meta={pushStatus === 'granted' ? t('notifications.on') : blockedPushes ? t('notifications.offShort') : undefined}
          chevron
          onPress={() => router.push('/notifications')}
        />
        {canPickLanguage ? (
          <ListRow
            title={t('profile.language')}
            left={icon('language-outline')}
            meta={currentLocale}
            chevron
            onPress={() => setLanguageOpen(true)}
          />
        ) : null}
        {toggle('chatAnimation', t('profile.chatAnimation'), icon('sparkles-outline'))}

        {/* Development builds only. */}
        {__DEV__ ? (
          <>
            <SectionLabel tone="section" title={t('profile.sectionDev')} />
            {/* Fires the planned pushes now, a few seconds apart. */}
            <ListRow
              title={t('profile.testPushes')}
              left={icon('paper-plane-outline')}
              meta={testResult}
              onPress={() => void testPushes()}
            />
            {/* A new install starts empty; this fills chats, bonds and diary pages to test full screens. */}
            <ListRow title={t('profile.loadDemo')} left={icon('albums-outline')} onPress={loadDemoData} />
            {/* Ends the plan at once, to see the free screens again. */}
            {plan ? (
              <ListRow title={t('profile.endPlan')} left={icon('close-circle-outline')} onPress={endPlan} />
            ) : null}
          </>
        ) : null}

        <SectionLabel tone="section" title={t('profile.sectionAbout')} />
        {blocked.length > 0 ? (
          <ListRow
            title={t('safety.blocked')}
            meta={String(blocked.length)}
            chevron
            onPress={() => setBlockedOpen(true)}
          />
        ) : null}
        <ListRow
          title={t('safety.support')}
          chevron
          onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
        />
        <ListRow title={t('profile.account')} chevron />
        <ListRow title={t('profile.privacy')} chevron />
        <ListRow title={t('profile.terms')} chevron />
        <ListRow title={t('profile.versionRow')} meta={Constants.expoConfig?.version ?? '1.0.0'} />

        <PressableScale scaleTo={0.96} onPress={() => setDeleteOpen(true)} style={styles.delete}>
          <Txt variant="bodyStrong" color={colors.textSecondary}>
            {t('profile.deleteAccount')}
          </Txt>
        </PressableScale>
      </ScrollView>

      <Sheet visible={deleteOpen} onClose={() => setDeleteOpen(false)} title={t('profile.deleteTitle')} center>
        <Txt variant="body" color={colors.textSecondary} center style={styles.deleteBody}>
          {t('profile.deleteBody')}
        </Txt>
        <View style={styles.deleteActions}>
          <Button label={t('profile.deleteConfirm')} variant="danger" size="lg" full onPress={confirmDelete} />
          <Button label={t('profile.cancel')} variant="ghost" size="lg" full onPress={() => setDeleteOpen(false)} />
        </View>
      </Sheet>

      <Sheet visible={blockedOpen} onClose={() => setBlockedOpen(false)} title={t('safety.blocked')}>
        <View style={styles.sheetList}>
          {blocked.map((character, index) => (
            <View key={character.id}>
              {index > 0 ? <Divider inset={space.lg} /> : null}
              <ListRow
                title={character.name}
                left={<CharacterAvatar character={character} size={ROW_ICON} />}
                right={
                  <Button
                    label={t('safety.unblock')}
                    size="sm"
                    variant="secondary"
                    onPress={() => {
                      unblockCharacter(character.id);
                      if (blocked.length === 1) setBlockedOpen(false);
                    }}
                  />
                }
              />
            </View>
          ))}
        </View>
      </Sheet>

      <Sheet visible={languageOpen} onClose={() => setLanguageOpen(false)} title={t('profile.language')}>
        <View style={styles.sheetList}>
          {SUPPORTED_LOCALES.map((locale, index) => (
            <View key={locale.code}>
              {index > 0 ? <Divider inset={space.lg} /> : null}
              <ListRow
                title={locale.label}
                right={
                  i18n.language === locale.code ? <Ionicons name="checkmark" size={20} color={colors.text} /> : null
                }
                onPress={async () => {
                  await setLocale(locale.code);
                  setLanguageOpen(false);
                }}
              />
            </View>
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: space.huge },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  // The one card on the screen: how full the profile is.
  card: {
    marginHorizontal: space.lg,
    marginTop: space.xl,
    padding: space.lg,
    gap: space.md,
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.text },
  offer: {
    paddingHorizontal: space.sm + 1,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.primarySofter,
  },
  delete: { alignSelf: 'flex-start', marginTop: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  deleteBody: { marginBottom: space.xl },
  deleteActions: { gap: space.sm },
  // The sheet card pads its content; rows bring their own gutter.
  sheetList: { marginHorizontal: -space.xl },
});
