import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ClayIcon, Divider, Icon3D, PressableScale, Sheet, ShellBadge, Txt } from '@/components/ui';
import { TRIAL } from '@/economy/plans';
import {
  AD_REWARD,
  FREE_SPINS_PER_DAY,
  MAX_ADS_PER_DAY,
  shellPacks,
  STARTER_PACK,
  todayKey,
  WHEEL_SEGMENTS,
} from '@/mock';
import { memberActive, useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';

const ROW_ICON = 36;
const cheapestPack = shellPacks.reduce((a, b) => (b.amount < a.amount ? b : a));

/**
 * Shown when an action needs more shells than the wallet holds. Three equal ways on,
 * none pushed over the others: a free ad (or the day's spin), a shell pack, or Basic
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
  const daily = useAppStore((s) => s.daily);
  const watchAd = useAppStore((s) => s.watchAd);
  const [earned, setEarned] = useState(0);

  const today = todayKey();
  const adsLeft = Math.max(0, MAX_ADS_PER_DAY - (daily.adsDay === today ? daily.adsWatched : 0));
  const spinLeft = (daily.spinDay === today ? daily.spinsUsed : 0) < FREE_SPINS_PER_DAY;

  const close = () => {
    setEarned(0);
    onClose();
  };

  const go = (route: Href) => {
    close();
    router.push(route);
  };

  const ad = () => {
    // Real builds credit this from the rewarded-ad SDK callback.
    const amount = watchAd();
    if (!amount) return;
    setEarned((n) => n + amount);
    // Enough to send what was typed: back to the chat.
    if (need != null && wallet.shells + amount >= need) setTimeout(close, 700);
  };

  // The free way: an ad while any are left today, else the day's spin.
  const free =
    adsLeft > 0
      ? {
          lead: <ClayIcon name="play" size={ROW_ICON} tile={false} />,
          title: t('paywall.watchAd'),
          meta: t('paywall.watchAdMeta', { count: AD_REWARD, left: adsLeft }),
          onPress: ad,
        }
      : spinLeft
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
    // Members already chat without shells; the plan row is for everyone else.
    member
      ? null
      : {
          lead: <Icon3D name="crown" size={ROW_ICON} />,
          title: wallet.trialUsed ? t('paywall.getBasic') : t('plans.tryTrial', { count: TRIAL.days }),
          meta: t('paywall.planMeta'),
          onPress: () => go('/store/shell?tab=plans&plan=basic'),
        },
  ].filter((row) => row != null);

  return (
    <Sheet visible={need != null} onClose={close}>
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

      {earned > 0 ? (
        <Txt variant="smallStrong" color={colors.brandText} center style={styles.note}>
          {t('paywall.earned', { count: earned })}
        </Txt>
      ) : (
        <Txt variant="small" color={colors.textSecondary} center style={styles.note}>
          {t('paywall.comeBack')}
        </Txt>
      )}
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
