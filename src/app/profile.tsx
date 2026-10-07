import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  Divider,
  Header,
  IconTile,
  ListRow,
  Screen,
  SectionLabel,
  ShellBadge,
  Sheet,
  Toggle,
  Txt,
  UserAvatar,
} from '@/components/ui';
import { SUPPORTED_LOCALES, setLocale } from '@/i18n';
import { shortDate } from '@/lib/format';
import { memberActive, useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';
import type { AppSettings } from '@/types';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const ROW_ICON = 34;
const ROW_INSET = space.lg + ROW_ICON + space.md;

/** The on/off settings; call times and the caller live in the chat's Daily calls sheet. */
type SwitchKey = { [K in keyof AppSettings]-?: AppSettings[K] extends boolean ? K : never }[keyof AppSettings];

const REACH_OUT: { key: SwitchKey; icon: IoniconName }[] = [
  { key: 'morningGreeting', icon: 'sunny-outline' },
  { key: 'eveningGreeting', icon: 'moon-outline' },
  { key: 'morningCall', icon: 'call-outline' },
  { key: 'nightCall', icon: 'call-outline' },
];

/** Grouped settings on the canvas: account, how characters reach out, chat, about. */
export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const user = useAppStore((s) => s.user);
  const wallet = useAppStore((s) => s.wallet);
  const settings = useAppStore((s) => s.settings);
  const setSetting = useAppStore((s) => s.setSetting);

  const [languageOpen, setLanguageOpen] = useState(false);

  const currentLocale = SUPPORTED_LOCALES.find((l) => l.code === i18n.language)?.label ?? i18n.language;
  const member = memberActive(wallet);
  const icon = (name: IoniconName) => <IconTile icon={name} size={ROW_ICON} />;

  const toggle = (key: SwitchKey, label: string, iconName: IoniconName) => (
    <ListRow
      title={label}
      left={icon(iconName)}
      right={<Toggle value={settings[key]} onChange={(v) => setSetting(key, v)} accessibilityLabel={label} />}
    />
  );

  return (
    <Screen background={colors.bgPlain}>
      <Header title={t('profile.title')} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.identity}>
          <UserAvatar user={user} size={56} />
          <View style={styles.flex}>
            <Txt variant="h3" lines={1}>
              {user.displayName}
            </Txt>
            <Txt variant="small" color={colors.textMuted} lines={1}>
              {user.handle}
            </Txt>
          </View>
          <ShellBadge count={wallet.shells} showAdd onPress={() => router.push('/store/shell')} />
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
          title={t('profile.language')}
          left={icon('language-outline')}
          meta={currentLocale}
          chevron
          onPress={() => setLanguageOpen(true)}
        />

        <SectionLabel title={t('profile.greetings')} />
        {REACH_OUT.map(({ key, icon: iconName }, index) => (
          <View key={key}>
            {index > 0 ? <Divider inset={ROW_INSET} /> : null}
            {toggle(key, t(`profile.${key}`), iconName)}
          </View>
        ))}

        <SectionLabel title={t('profile.sectionChat')} />
        {toggle('chatAnimation', t('profile.chatAnimation'), 'sparkles-outline')}

        <SectionLabel title={t('profile.sectionAbout')} />
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
      </ScrollView>

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
  // The sheet card pads its content; rows bring their own gutter.
  sheetList: { marginHorizontal: -space.xl },
});
