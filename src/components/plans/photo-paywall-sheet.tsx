import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, Sheet, Txt } from '@/components/ui';
import { PLANS, TRIAL } from '@/economy/plans';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';

import { planTime } from './copy';

/**
 * A free or Basic user taps "Take a photo": pictures come with Pro only (backend-plan §15.10),
 * so this is the Pro offer with pictures first. Starting the trial lets them shoot at once.
 */
export function PhotoPaywallSheet({
  visible,
  onClose,
  onStarted,
}: {
  visible: boolean;
  onClose: () => void;
  /** The trial is on: the caller takes the picture. */
  onStarted: () => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const trialUsed = useAppStore((s) => !!s.wallet.trialUsed);
  const subscribe = useAppStore((s) => s.subscribe);

  const start = () => {
    if (trialUsed) {
      // No free days left on this account: the plans, with Pro yearly picked.
      onClose();
      router.push('/store/shell?tab=plans&plan=proAnnual');
      return;
    }
    // Real builds open the store's purchase sheet with the free-trial offer.
    subscribe(TRIAL.plan, true);
    onStarted();
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.head}>
        <View style={styles.art}>
          <Ionicons name="camera-outline" size={30} color={colors.primary} />
        </View>
        <Txt variant="h2" center>
          {t('photoBooth.proTitle')}
        </Txt>
      </View>

      <View style={styles.perks}>
        {[
          t('plans.photosMonth', { count: PLANS.proAnnual.photos }),
          t('plans.callsPerk', { time: planTime(t, PLANS.proAnnual.callSeconds) }),
          t('plans.shellsMonth', { amount: PLANS.proAnnual.shells.toLocaleString('en-US') }),
        ].map((perk) => (
          <View key={perk} style={styles.perk}>
            <Ionicons name="checkmark" size={17} color={colors.text} />
            <Txt variant="body" style={styles.flex}>
              {perk}
            </Txt>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button
          label={
            trialUsed
              ? t('plans.get', { plan: t('plans.name.proAnnual'), price: PLANS.proAnnual.price })
              : t('plans.startTrial', { count: TRIAL.days })
          }
          size="lg"
          full
          onPress={start}
        />
        <Txt variant="caption" color={colors.textMuted} center>
          {trialUsed ? t('plans.billed.proAnnual') : t('plans.trialCaptionSettings', { price: PLANS[TRIAL.plan].price })}
        </Txt>
        <Button label={t('plans.notNow')} variant="ghost" full onPress={onClose} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { alignItems: 'center', gap: space.md, marginTop: space.xs },
  art: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perks: { gap: space.sm + 2, marginTop: space.lg },
  perk: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  actions: { gap: space.sm, marginTop: space.lg },
});
