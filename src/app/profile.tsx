import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { SUPPORT_EMAIL } from '@/ai/safety';
import { CompletionMeter } from '@/components/profile/completion-meter';
import {
  Button,
  CharacterAvatar,
  ClayIcon,
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
import { inviteCodeFor } from '@/lib/invite';
import { profileCompletion } from '@/lib/profile';
import { INVITE_REWARD } from '@/mock';
import { sendTestPushes } from '@/notifications/sync';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';
import type { AppSettings } from '@/types';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const ROW_ICON = 34;
const ROW_INSET = space.lg + ROW_ICON + space.md;

/** The on/off settings; call times and the caller live in the chat's Daily calls sheet. */
type SwitchKey = { [K in keyof AppSettings]-?: AppSettings[K] extends boolean ? K : never }[keyof AppSettings];

/**
 * Who you are (photo, name, how full the profile is, invite code), then grouped
 * settings: account (with Notifications), chat, about; delete at the very end.
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
  const blockedIds = useAppStore((s) => s.blockedIds);
  const characters = useAppStore((s) => s.characters);
  const unblockCharacter = useAppStore((s) => s.unblockCharacter);
  const blocked = characters.filter((c) => blockedIds.includes(c.id));

  const [languageOpen, setLanguageOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { status: pushStatus } = usePushPermission();
  const blockedPushes = pushStatus === 'denied' || pushStatus === 'undetermined';
  /** Dev only: what the last "Test pushes" press did. */
  const [testResult, setTestResult] = useState<string | undefined>();

  const testPushes = async () => {
    const count = await sendTestPushes(useAppStore.getState());
    setTestResult(count > 0 ? t('profile.testPushesSent', { count }) : t('profile.testPushesUnavailable'));
  };

  const code = inviteCodeFor(user);
  const percent = profileCompletion(user);
  // One language for now: the picker shows up once there is a second one.
  const canPickLanguage = SUPPORTED_LOCALES.length > 1;

  const copyCode = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const confirmDelete = () => {
    setDeleteOpen(false);
    deleteAccount();
    if (router.canDismiss()) router.dismissAll();
    router.replace('/onboarding');
  };

  const currentLocale = SUPPORTED_LOCALES.find((l) => l.code === i18n.language)?.label ?? i18n.language;
  const plan = planStatus(wallet.subscription, Date.now());
  // Line icons sit bare on the canvas, like the clay art: no grey tile behind them.
  const icon = (name: IoniconName) => (
    <IconTile icon={name} size={ROW_ICON} background="transparent" glyphSize={24} />
  );

  const toggle = (key: SwitchKey, label: string, left: React.ReactNode) => (
    <ListRow
      size="large"
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
            <Txt variant="title">{t('profile.editProfile')}</Txt>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </View>
          <CompletionMeter percent={percent} />
        </PressableScale>

        <View style={[styles.card, styles.invite]}>
          <View style={styles.flex}>
            <Txt variant="caption" color={colors.textMuted}>
              {t('profile.inviteCode')}
            </Txt>
            <Txt variant="figure" selectable>
              {code}
            </Txt>
          </View>
          <PressableScale
            scaleTo={0.88}
            hitSlop={8}
            onPress={() => void copyCode()}
            accessibilityLabel={copied ? t('profile.copied') : t('gifts.copyCode')}
            style={styles.copy}>
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={colors.text} />
          </PressableScale>
          {/* The rules, the weekly progress and "Have a code?" live on Free gifts. */}
          <PressableScale
            scaleTo={0.94}
            onPress={() => router.push('/gifts')}
            accessibilityLabel={t('profile.freeGifts')}
            style={styles.reward}>
            <Txt variant="chip" color={colors.brandText}>
              +{INVITE_REWARD}
            </Txt>
            <Ionicons name="chevron-forward" size={14} color={colors.brandText} />
          </PressableScale>
        </View>

        <SectionLabel tone="title" title={t('profile.sectionAccount')} />
        <ListRow
          size="large"
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
        <ListRow
          size="large"
          title={t('profile.freeGifts')}
          left={icon('gift-outline')}
          chevron
          onPress={() => router.push('/gifts')}
        />
        {/* Who reaches out, previews and quiet hours live on their own screen. */}
        <ListRow
          size="large"
          title={t('notifications.title')}
          left={<ClayIcon name="alarm" size={ROW_ICON} tile={false} />}
          meta={pushStatus === 'granted' ? t('notifications.on') : blockedPushes ? t('notifications.offShort') : undefined}
          chevron
          onPress={() => router.push('/notifications')}
        />
        {canPickLanguage ? (
          <>
                <ListRow
                  size="large"
              title={t('profile.language')}
              left={icon('language-outline')}
              meta={currentLocale}
              chevron
              onPress={() => setLanguageOpen(true)}
            />
          </>
        ) : null}

        <SectionLabel tone="title" title={t('profile.sectionChat')} />
        {toggle('chatAnimation', t('profile.chatAnimation'), icon('sparkles-outline'))}

        {/* Development builds only: fire the planned pushes now, a few seconds apart. */}
        {__DEV__ ? (
          <>
            <SectionLabel tone="title" title={t('profile.sectionDev')} />
            <ListRow
              size="large"
              title={t('profile.testPushes')}
              left={icon('notifications-outline')}
              meta={testResult}
              onPress={() => void testPushes()}
            />
            {/* Ends the plan at once, to see the free screens again. */}
            {plan ? (
              <ListRow size="large" title={t('profile.endPlan')} left={icon('close-circle-outline')} onPress={endPlan} />
            ) : null}
          </>
        ) : null}

        <SectionLabel tone="title" title={t('profile.sectionAbout')} />
        {blocked.length > 0 ? (
          <>
            <ListRow
              size="large"
              title={t('safety.blocked')}
              left={icon('ban-outline')}
              meta={String(blocked.length)}
              chevron
              onPress={() => setBlockedOpen(true)}
            />
              </>
        ) : null}
        <ListRow
          size="large"
          title={t('safety.support')}
          left={icon('mail-outline')}
          chevron
          onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
        />
        <ListRow size="large" title={t('profile.account')} left={icon('person-circle-outline')} />
        <ListRow size="large" title={t('profile.privacy')} left={icon('shield-checkmark-outline')} />
        <ListRow size="large" title={t('profile.terms')} left={icon('document-text-outline')} />
        <ListRow
          size="large"
          title={t('profile.about')}
          left={icon('information-circle-outline')}
          meta={t('profile.version', { version: Constants.expoConfig?.version ?? '1.0.0' })}
        />

        <PressableScale scaleTo={0.96} onPress={() => setDeleteOpen(true)} style={styles.delete}>
          <Txt variant="smallStrong" color={colors.textMuted}>
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
  // Plain blocks on the canvas: no card fill, border or shadow.
  card: {
    paddingHorizontal: space.lg,
    paddingTop: space.xl,
    gap: space.md,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  invite: { flexDirection: 'row', alignItems: 'center' },
  copy: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  reward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: space.sm,
    paddingLeft: space.md,
    paddingRight: space.sm,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  delete: { alignSelf: 'center', marginTop: space.xxl, padding: space.md },
  deleteBody: { marginBottom: space.xl },
  deleteActions: { gap: space.sm },
  // The sheet card pads its content; rows bring their own gutter.
  sheetList: { marginHorizontal: -space.xl },
});
