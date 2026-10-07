import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, Divider, Icon3D, ListRow, Sheet, ShellBadge, Txt } from '@/components/ui';
import { AD_REWARD, FREE_SPINS_PER_DAY, MAX_ADS_PER_DAY, todayKey, WHEEL_SEGMENTS } from '@/mock';
import { memberActive, useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';

const ROW_ICON = 36;

/**
 * Shown when an action needs more shells than the wallet holds. Free shells come
 * first and are earned right here, so the user never has to leave the chat; the
 * typed message stays in the composer. Buying and Membership follow.
 */
export function PaywallSheet({
  need,
  onClose,
  chat = false,
}: {
  /** Shells required; `null` hides the sheet. */
  need: number | null;
  onClose: () => void;
  /** Chat copy explains the per-message price. */
  chat?: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const shells = useAppStore((s) => s.wallet.shells);
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

  const go = (route: '/store/shell' | '/gifts') => {
    close();
    router.push(route);
  };

  const ad = () => {
    // Real builds credit this from the rewarded-ad SDK callback.
    const amount = watchAd();
    if (!amount) return;
    setEarned((n) => n + amount);
    // Enough to send what was typed: back to the chat.
    if (need != null && shells + amount >= need) setTimeout(close, 700);
  };

  return (
    <Sheet visible={need != null} onClose={close}>
      <View style={styles.head}>
        <Icon3D name="shell" size={52} />
        <View style={styles.flex}>
          <Txt variant="h3">{t('paywall.title')}</Txt>
          <ShellBadge count={shells} style={styles.balance} />
        </View>
      </View>

      <Txt variant="body" color={colors.textSecondary} style={styles.copy}>
        {chat ? t('paywall.chatBody') : t('paywall.body', { count: need ?? 0 })}
      </Txt>

      {adsLeft > 0 || spinLeft ? (
        <>
          <Txt variant="smallStrong" color={colors.textMuted} style={styles.label}>
            {t('paywall.freeNow')}
          </Txt>
          <View style={styles.free}>
            {adsLeft > 0 ? (
              <ListRow
                left={<Lead icon="play" />}
                title={t('paywall.watchAd')}
                meta={t('paywall.watchAdMeta', { count: AD_REWARD, left: adsLeft })}
                chevron
                onPress={ad}
              />
            ) : null}
            {adsLeft > 0 && spinLeft ? <Divider inset={space.lg + ROW_ICON + space.md} /> : null}
            {spinLeft ? (
              <ListRow
                left={<Lead icon="gift" />}
                title={t('paywall.spin')}
                meta={t('paywall.spinMeta', { count: Math.max(...WHEEL_SEGMENTS) })}
                chevron
                onPress={() => go('/gifts')}
              />
            ) : null}
          </View>
          {earned > 0 ? (
            <Txt variant="smallStrong" color={colors.brandText} center style={styles.earned}>
              {t('paywall.earned', { count: earned })}
            </Txt>
          ) : null}
        </>
      ) : null}

      <View style={styles.actions}>
        <Button label={t('paywall.topUp')} size="lg" onPress={() => go('/store/shell')} full />
        {chat && !member ? (
          <Button label={t('paywall.member')} variant="ghost" onPress={() => go('/store/shell')} full />
        ) : null}
      </View>
    </Sheet>
  );
}

function Lead({ icon }: { icon: 'play' | 'gift' }) {
  return (
    <View style={styles.lead}>
      <Ionicons name={icon} size={17} color={colors.brandText} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  balance: { alignSelf: 'flex-start', marginTop: space.xs },
  copy: { marginTop: space.lg },
  label: { marginTop: space.xl, marginBottom: space.sm },
  free: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  lead: {
    width: ROW_ICON,
    height: ROW_ICON,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  earned: { marginTop: space.md },
  actions: { gap: space.sm, marginTop: space.xl },
});
