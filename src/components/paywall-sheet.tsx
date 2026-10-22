import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ClayIcon, Divider, Icon3D, PressableScale, Sheet, ShellBadge, Txt } from '@/components/ui';
import { TRIAL } from '@/economy/plans';
import {
  FREE_SPINS_PER_DAY,
  shellPacks,
  STARTER_PACK,
  todayKey,
  WHEEL_SEGMENTS,
} from '@/mock';
import { callsIncluded, memberActive, useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';

const ROW_ICON = 36;
const cheapestPack = shellPacks.reduce((a, b) => (b.amount < a.amount ? b : a));

/**
 * Shown when an action needs more shells than the wallet holds. Three equal ways on,
 * none pushed over the others: the day's free spin, a shell pack, or Basic
 * (free for 3 days when the account has not had the trial). The typed message stays
 * in the composer.
 */
export function PaywallSheet({
  need,
  onClose,
  chat = false,
}: {
  /** Shells required; `null` hides the sheet. */
  need: number | null;
  onClose: () => void;
  /** Chat copy: the message is kept. */
  chat?: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const wallet = useAppStore((s) => s.wallet);
  const member = useAppStore((s) => memberActive(s.wallet));
  const proMember = useAppStore((s) => callsIncluded(s.wallet));
  const daily = useAppStore((s) => s.daily);

  const today = todayKey();
  const spinLeft = (daily.spinDay === today ? daily.spinsUsed : 0) < FREE_SPINS_PER_DAY;

  const go = (route: Href) => {
    onClose();
    router.push(route);
  };

  // The free way: the day's spin while it is left. No ads (owner, 2026-10-22).
  const free = spinLeft
    ? {
        lead: <ClayIcon name="gift" size={ROW_ICON} tile={false} />,
        title: t('paywall.spin'),
        meta: t('paywall.spinMeta', { count: Math.max(...WHEEL_SEGMENTS) }),
        onPress: () => go('/gifts'),
      }
    : null;

  const rows = [
    free,
    {
      lead: <Icon3D name="shell" size={ROW_ICON} />,
      title: t('paywall.getShells'),
      meta: wallet.boughtShells
        ? t('paywall.getShellsMeta', { price: cheapestPack.price })
        : t('paywall.getShellsStarter', { price: STARTER_PACK.price, count: STARTER_PACK.shells }),
      onPress: () => go('/store/shell?tab=shells'),
    },
    // A plan brings shells every month: the Pro trial first, then Basic; Basic users see Pro.
    proMember
      ? null
      : {
          lead: <Icon3D name="crown" size={ROW_ICON} />,
          title: member
            ? t('paywall.getPro')
            : wallet.trialUsed
              ? t('paywall.getBasic')
              : t('plans.tryTrial', { count: TRIAL.days }),
          meta: member ? t('paywall.proMeta') : t('paywall.planMeta'),
          onPress: () =>
            go(member || !wallet.trialUsed ? '/store/shell?tab=plans&plan=proAnnual' : '/store/shell?tab=plans&plan=basic'),
        },
  ].filter((row) => row != null);

  return (
    <Sheet visible={need != null} onClose={onClose}>
      <View style={styles.head}>
        <Icon3D name="shell" size={52} />
        <View style={styles.flex}>
          <Txt variant="h3">{t('paywall.title')}</Txt>
          <ShellBadge count={wallet.shells} style={styles.balance} />
        </View>
      </View>

      <Txt variant="body" color={colors.textSecondary} style={styles.copy}>
        {chat ? t('paywall.chatBody') : t('paywall.body', { count: need ?? 0 })}
      </Txt>

      <View style={styles.ways}>
        {rows.map((row, index) => (
          <View key={row.title}>
            {index > 0 ? <Divider inset={space.lg + ROW_ICON + space.md} /> : null}
            <PressableScale scaleTo={1} accessibilityLabel={row.title} onPress={row.onPress} style={styles.way}>
              {row.lead}
              <View style={styles.flex}>
                <Txt variant="bodyStrong">{row.title}</Txt>
                <Txt variant="small" color={colors.textSecondary}>
                  {row.meta}
                </Txt>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </PressableScale>
          </View>
        ))}
      </View>

      <Txt variant="small" color={colors.textSecondary} center style={styles.note}>
        {t('paywall.comeBack')}
      </Txt>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  balance: { alignSelf: 'flex-start', marginTop: space.xs },
  copy: { marginTop: space.lg },
  ways: {
    marginTop: space.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  way: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 64,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
  },
  note: { marginTop: space.lg },
});
