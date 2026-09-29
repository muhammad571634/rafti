import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { BrandArt, Button, ShellIcon, Sheet, Txt } from '@/components/ui';
import { DAILY_CHECK_IN } from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { colors, palette, radius, space } from '@/theme';

/** "Log in daily to unlock surprise shells" — shown once per day on first open. */
export function DailyRewardSheet() {
  const { t } = useTranslation();
  const reward = useAppStore((s) => s.dailyReward);
  const dismiss = useAppStore((s) => s.dismissDailyReward);

  return (
    <Sheet visible={!!reward} onClose={dismiss} center>
      <View style={styles.body}>
        <BrandArt name="reward" width={200} radius={radius.xl} bob />
        <Txt variant="h3" center>
          {t('dailyReward.title')}
        </Txt>
        <Txt variant="small" color={colors.textMuted} center>
          {t('dailyReward.body')}
        </Txt>

        <View style={styles.amount}>
          <ShellIcon size={30} />
          <Txt variant="display" color={palette.shellText}>
            +{reward?.amount ?? 0}
          </Txt>
        </View>

        <View style={styles.week}>
          {DAILY_CHECK_IN.map((_, index) => {
            const done = reward ? index < reward.day : false;
            return <View key={index} style={[styles.pip, done && styles.pipDone]} />;
          })}
        </View>
        <Txt variant="caption" color={colors.textFaint}>
          {t('dailyReward.day', { day: reward?.day ?? 1 })}
        </Txt>

        <Button label={t('dailyReward.collect')} onPress={dismiss} full style={styles.cta} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', gap: space.sm },
  amount: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs },
  week: { flexDirection: 'row', gap: 6, marginTop: space.sm },
  pip: { width: 22, height: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  pipDone: { backgroundColor: colors.primary },
  cta: { marginTop: space.md },
});
