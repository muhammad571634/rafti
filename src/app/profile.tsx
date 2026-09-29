import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ShellBadge, Card, Header, PressableScale, Screen, Sheet, Toggle, Txt, UserAvatar } from '@/components/ui';
import { SUPPORTED_LOCALES, setLocale } from '@/i18n';
import { shortDate } from '@/lib/format';
import { memberActive, useAppStore } from '@/store/use-app-store';
import { colors, palette, space } from '@/theme';
import type { AppSettings } from '@/types';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const REACH_OUT: { key: keyof AppSettings; icon: IoniconName }[] = [
  { key: 'morningGreeting', icon: 'sunny' },
  { key: 'eveningGreeting', icon: 'moon' },
  { key: 'morningCall', icon: 'call' },
  { key: 'nightCall', icon: 'call-outline' },
];

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

  return (
    <Screen>
      <Header title={t('profile.title')} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Card style={styles.identity}>
          <UserAvatar user={user} size={64} />
          <View style={styles.flex}>
            <Txt variant="h3">{user.displayName}</Txt>
            <Txt variant="small" color={colors.textFaint}>
              {user.handle}
            </Txt>
          </View>
          <ShellBadge count={wallet.shells} showAdd onPress={() => router.push('/store/shell')} />
        </Card>

        <Card padded={false}>
          <Row
            icon="diamond"
            label={t('profile.membership')}
            value={
              member && wallet.memberUntil && wallet.memberPlan
                ? `${t(`store.plans.${wallet.memberPlan}`)} · ${shortDate(wallet.memberUntil)}`
                : t('profile.notMember')
            }
            onPress={() => router.push('/store/shell')}
          />
          <Divider />
          <Row
            icon="language"
            label={t('profile.language')}
            value={currentLocale}
            onPress={() => setLanguageOpen(true)}
          />
        </Card>

        <Txt variant="smallStrong" color={colors.textMuted} style={styles.sectionLabel}>
          {t('profile.greetings')}
        </Txt>
        <Card padded={false}>
          {REACH_OUT.map(({ key, icon }, index) => (
            <View key={key}>
              {index > 0 ? <Divider /> : null}
              <ToggleRow
                icon={icon}
                label={t(`profile.${key}`)}
                value={settings[key]}
                onChange={(v) => setSetting(key, v)}
              />
            </View>
          ))}
          <Divider />
          <ToggleRow
            icon="sparkles"
            label={t('profile.chatAnimation')}
            value={settings.chatAnimation}
            onChange={(v) => setSetting('chatAnimation', v)}
          />
        </Card>

        <Card padded={false}>
          <Row icon="person-circle" label={t('profile.account')} />
          <Divider />
          <Row icon="shield-checkmark" label={t('profile.privacy')} />
          <Divider />
          <Row icon="document-text" label={t('profile.terms')} />
          <Divider />
          <Row
            icon="information-circle"
            label={t('profile.about')}
            value={t('profile.version', { version: Constants.expoConfig?.version ?? '1.0.0' })}
          />
        </Card>
      </ScrollView>

      <Sheet visible={languageOpen} onClose={() => setLanguageOpen(false)} title={t('profile.language')}>
        {SUPPORTED_LOCALES.map((locale) => (
          <PressableScale
            key={locale.code}
            style={styles.localeRow}
            onPress={async () => {
              await setLocale(locale.code);
              setLanguageOpen(false);
            }}>
            <Txt variant="body" style={styles.flex}>
              {locale.label}
            </Txt>
            {i18n.language === locale.code ? <Ionicons name="checkmark" size={19} color={colors.primary} /> : null}
          </PressableScale>
        ))}
      </Sheet>
    </Screen>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
}: {
  icon: IoniconName;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <PressableScale style={styles.row} onPress={onPress} disabled={!onPress} dimOnPress={false} scaleTo={0.995}>
      <Ionicons name={icon} size={19} color={palette.apricot400} />
      <Txt variant="body" style={styles.flex}>
        {label}
      </Txt>
      {value ? (
        <Txt variant="small" color={colors.textMuted}>
          {value}
        </Txt>
      ) : null}
      {onPress ? <Ionicons name="chevron-forward" size={17} color={colors.textFaint} /> : null}
    </PressableScale>
  );
}

function ToggleRow({
  icon,
  label,
  value,
  onChange,
}: {
  icon: IoniconName;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={19} color={palette.apricot400} />
      <Txt variant="body" style={styles.flex}>
        {label}
      </Txt>
      <Toggle value={value} onChange={onChange} />
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: space.lg, gap: space.lg, paddingBottom: space.huge },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  sectionLabel: { marginBottom: -space.sm, marginLeft: space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    minHeight: 52,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginLeft: space.lg + 19 + space.md,
  },
  localeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md },
});
