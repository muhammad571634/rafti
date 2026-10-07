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
  type ClayIconName,
} from '@/components/ui';
import { SUPPORTED_LOCALES, setLocale } from '@/i18n';
import { shortDate } from '@/lib/format';
import { inviteCodeFor } from '@/lib/invite';
import { profileCompletion } from '@/lib/profile';
import { INVITE_REWARD } from '@/mock';
import { sendTestPushes } from '@/notifications/sync';
import { memberActive, useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';
import type { AppSettings } from '@/types';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const ROW_ICON = 34;
const ROW_INSET = space.lg + ROW_ICON + space.md;

/** The on/off settings; call times and the caller live in the chat's Daily calls sheet. */
type SwitchKey = { [K in keyof AppSettings]-?: AppSettings[K] extends boolean ? K : never }[keyof AppSettings];

/** Who reaches out and when: clay icons, like the places they lead to (docs/icons-3d.md). */
const REACH_OUT: { key: SwitchKey; icon: ClayIconName }[] = [
  { key: 'morningGreeting', icon: 'sun' },
  { key: 'eveningGreeting', icon: 'bedtime' },
  { key: 'morningCall', icon: 'calls' },
  { key: 'nightCall', icon: 'calls' },
];

/**
 * Who you are (photo, name, how full the profile is, invite code), then grouped
 * settings: account, how characters reach out, chat, about; delete at the very end.
 */
export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const user = useAppStore((s) => s.user);
  const wallet = useAppStore((s) => s.wallet);
  const settings = useAppStore((s) => s.settings);
  const setSetting = useAppStore((s) => s.setSetting);
  const deleteAccount = useAppStore((s) => s.deleteAccount);
  const blockedIds = useAppStore((s) => s.blockedIds);
  const characters = useAppStore((s) => s.characters);
  const unblockCharacter = useAppStore((s) => s.unblockCharacter);
  const blocked = characters.filter((c) => blockedIds.includes(c.id));

  const [languageOpen, setLanguageOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [copied, setCopied] = useState(false);
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
  const member = memberActive(wallet);
  const icon = (name: IoniconName) => <IconTile icon={name} size={ROW_ICON} />;

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
          <ShellBadge count={wallet.shells} showAdd onPress={() => router.push('/store/shell')} />
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

        <SectionLabel title={t('profile.sectionAccount')} />
        <ListRow
          title={t('profile.membership')}
          left={icon('diamond-outline')}
          meta={
            member && wallet.memberUntil && wallet.memberPlan
              ? `${t(`store.plans.${wallet.memberPlan}`)} · ${shortDate(wallet.memberUntil)}`
              : t('profile.notMember')
          }
          chevron
          onPress={() => router.push('/store/shell')}
        />
        <Divider inset={ROW_INSET} />
        <ListRow
          title={t('profile.freeGifts')}
          left={icon('gift-outline')}
          chevron
          onPress={() => router.push('/gifts')}
        />
        {canPickLanguage ? (
          <>
            <Divider inset={ROW_INSET} />
            <ListRow
              title={t('profile.language')}
              left={icon('language-outline')}
              meta={currentLocale}
              chevron
              onPress={() => setLanguageOpen(true)}
            />
          </>
        ) : null}

        <SectionLabel title={t('profile.greetings')} />
        {REACH_OUT.map(({ key, icon: iconName }, index) => (
          <View key={key}>
            {index > 0 ? <Divider inset={ROW_INSET} /> : null}
            {toggle(key, t(`profile.${key}`), <ClayIcon name={iconName} size={ROW_ICON} />)}
          </View>
        ))}

        <SectionLabel title={t('profile.sectionChat')} />
        {toggle('chatAnimation', t('profile.chatAnimation'), icon('sparkles-outline'))}

        {/* Development builds only: fire the planned pushes now, a few seconds apart. */}
        {__DEV__ ? (
          <>
            <SectionLabel title={t('profile.sectionDev')} />
            <ListRow
              title={t('profile.testPushes')}
              left={icon('notifications-outline')}
              meta={testResult}
              onPress={() => void testPushes()}
            />
          </>
        ) : null}

        <SectionLabel title={t('profile.sectionAbout')} />
        {blocked.length > 0 ? (
          <>
            <ListRow
              title={t('safety.blocked')}
              left={icon('ban-outline')}
              meta={String(blocked.length)}
              chevron
              onPress={() => setBlockedOpen(true)}
            />
            <Divider inset={ROW_INSET} />
          </>
        ) : null}
        <ListRow
          title={t('safety.support')}
          left={icon('mail-outline')}
          chevron
          onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
        />
        <Divider inset={ROW_INSET} />
        <ListRow title={t('profile.account')} left={icon('person-circle-outline')} />
        <Divider inset={ROW_INSET} />
        <ListRow title={t('profile.privacy')} left={icon('shield-checkmark-outline')} />
        <Divider inset={ROW_INSET} />
        <ListRow title={t('profile.terms')} left={icon('document-text-outline')} />
        <Divider inset={ROW_INSET} />
        <ListRow
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
  card: {
    marginHorizontal: space.lg,
    marginTop: space.lg,
    padding: space.lg,
    gap: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  invite: { flexDirection: 'row', alignItems: 'center', marginTop: space.md },
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
