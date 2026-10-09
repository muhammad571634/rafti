import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { BrandArt, Button, ShellIcon, Sheet, Txt } from '@/components/ui';
import { DAILY_CHECK_IN, isSurpriseDay } from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';

/**
 * The day's check-in shells, as a bottom sheet on Today only (never over a chat or
 * another tab). The shells are already credited when the app opens; the sheet shows
 * the week: days done, today in an ink frame, the days still to come.
 */
export function DailyRewardSheet() {
  const { t } = useTranslation();
  const reward = useAppStore((s) => s.dailyReward);
  const dismiss = useAppStore((s) => s.dismissDailyReward);
  const today = reward?.day ?? 1;

  return (
    <Sheet visible={!!reward} onClose={dismiss}>
      <View style={styles.head}>
        <BrandArt name="reward" width={64} height={64} radius={18} contentFit="cover" bob />
        <View style={styles.flex}>
          <Txt variant="h3">{t('dailyReward.title')}</Txt>
          <View style={styles.pill}>
            <Txt variant="chip" color={colors.textSecondary}>
              {t('dailyReward.day', { day: today })}
            </Txt>
          </View>
        </View>
      </View>

      <View style={styles.week} accessibilityRole="list">
        {DAILY_CHECK_IN.map((base, index) => {
          const day = index + 1;
          const done = day < today;
          const now = day === today;
          const amount = now && reward ? reward.amount : base;
          return (
            <View key={day} style={[styles.cell, now && styles.cellNow]} accessibilityRole="text">
              <Txt variant="tiny" color={colors.textSecondary}>
                {t('dailyReward.dayShort', { day })}
              </Txt>
              {done ? (
                <Ionicons name="checkmark" size={16} color={colors.text} />
              ) : (
                <Txt variant="smallStrong">
                  +{amount}
                  {isSurpriseDay(day) && !now ? '+' : ''}
                </Txt>
              )}
            </View>
          );
        })}
      </View>

      <Txt variant="body" color={colors.textSecondary} style={styles.copy}>
        {t('dailyReward.rule')}
      </Txt>

      <Button
        label={t('dailyReward.collectAmount', { count: reward?.amount ?? 0 })}
        right={<ShellIcon size={24} />}
        size="lg"
        full
        onPress={dismiss}
        style={styles.cta}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: space.xs },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md + 2 },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm + 2,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  week: { flexDirection: 'row', gap: 6, marginTop: space.lg },
  cell: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.surfaceAlt,
  },
  cellNow: { backgroundColor: colors.surface, borderColor: colors.text },
  copy: { marginTop: space.lg },
  cta: { marginTop: space.lg },
});
