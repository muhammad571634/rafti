import { Image } from 'expo-image';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { SparkleIcon } from 'phosphor-react-native/src/icons/Sparkle';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { BRAND } from '@/assets/brand/registry';
import { Button, ShellIcon, Txt } from '@/components/ui';
import { useDayKey } from '@/hooks/use-day-key';
import { DAILY_CHECK_IN, DAILY_CHECK_IN_TOP, isSurpriseDay } from '@/mock';
import { checkInStatus, useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';

const THUMB = 52;
const CELL = 44;
/** rafti-reward.jpg is 720×657; this square (source pixels) frames the otter and its shell. */
const REWARD_ART = { width: 720, height: 657 };
const REWARD_CROP = { x: 170, y: 70, size: 420 };

type CellState = 'claimed' | 'today' | 'later';

/**
 * The 7-day check-in ladder, right on Today. It reads the same daily state as the
 * daily popup. The app claims on launch and on return to the foreground, so the
 * Claim button shows only while today's gift is still waiting: chiefly when the day
 * rolls over with the app open. Claiming here also opens the popup.
 */
export function DailyGiftCard() {
  const { t } = useTranslation();
  const daily = useAppStore((s) => s.daily);
  const claim = useAppStore((s) => s.claimDailyLogin);

  const today = useDayKey();
  const { day, claimed } = checkInStatus(daily, today);
  const total = DAILY_CHECK_IN.length;
  const todayFloor = DAILY_CHECK_IN[day - 1];
  const claimedAmount = daily.checkInAmount ?? todayFloor;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <RewardThumb />
        <Txt variant="title" accessibilityRole="header" style={styles.grow}>
          {t('home.gift.title')}
        </Txt>
        <Txt variant="smallStrong" color={colors.textMuted} style={styles.tabular}>
          {t('home.gift.progress', { day, total })}
        </Txt>
      </View>

      <View style={styles.ladder}>
        {DAILY_CHECK_IN.map((floor, index) => {
          const cellDay = index + 1;
          const state: CellState =
            cellDay < day || (claimed && cellDay === day) ? 'claimed' : cellDay === day ? 'today' : 'later';
          // A collected day shows what it paid; the rest show what they will pay.
          const paid = cellDay === day ? claimedAmount : floor;
          const surprise = isSurpriseDay(cellDay);
          const offer = t('home.gift.plus', { count: floor });
          const worth = surprise ? t('common.range', { min: floor, max: DAILY_CHECK_IN_TOP }) : String(floor);

          return (
            <View
              key={cellDay}
              style={[styles.cell, state === 'claimed' && styles.cellClaimed, state === 'today' && styles.cellToday]}
              accessible
              accessibilityLabel={
                state === 'claimed'
                  ? t('home.gift.cellClaimed', { day: cellDay, count: paid })
                  : state === 'today'
                    ? t('home.gift.cellToday', { day: cellDay, amount: worth })
                    : t('home.gift.cellLater', { day: cellDay, amount: worth })
              }>
              {state === 'claimed' ? (
                <>
                  <CheckIcon size={14} color={colors.bondText} weight="bold" />
                  <Txt variant="tiny" color={colors.bondText}>
                    {paid}
                  </Txt>
                </>
              ) : surprise ? (
                // The surprise day shows a sparkle and its floor, not a fixed offer.
                <>
                  <SparkleIcon size={14} color={state === 'today' ? colors.primary : colors.textMuted} />
                  <Txt variant="tiny" color={state === 'today' ? colors.primary : colors.textMuted}>
                    {t('common.atLeast', { count: floor })}
                  </Txt>
                </>
              ) : (
                <Txt variant="chip" color={state === 'today' ? colors.primary : colors.textSecondary}>
                  {offer}
                </Txt>
              )}
            </View>
          );
        })}
      </View>

      {claimed ? (
        <View style={styles.done}>
          <CheckIcon size={14} color={colors.bondText} weight="bold" />
          <Txt variant="small" color={colors.textSecondary}>
            {t('home.gift.claimed', { count: claimedAmount })}
          </Txt>
        </View>
      ) : (
        <Button
          label={isSurpriseDay(day) ? t('home.gift.claimSurprise') : t('home.gift.claim', { count: todayFloor })}
          size="lg"
          full
          left={<ShellIcon size={20} tintColor={colors.textOnPrimary} />}
          onPress={claim}
        />
      )}
    </View>
  );
}

/** Rafti holding the glowing shell, cropped square from the reward art. */
function RewardThumb() {
  const scale = THUMB / REWARD_CROP.size;
  return (
    <View style={styles.thumb}>
      <Image
        source={BRAND.reward}
        contentFit="fill"
        style={{
          position: 'absolute',
          width: REWARD_ART.width * scale,
          height: REWARD_ART.height * scale,
          left: -REWARD_CROP.x * scale,
          top: -REWARD_CROP.y * scale,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: space.lg,
    marginTop: space.lg,
    padding: space.lg,
    gap: space.md + 2,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  grow: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.paper,
  },
  ladder: { flexDirection: 'row', gap: space.xs + 2 },
  cell: {
    flex: 1,
    height: CELL,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxs,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  cellClaimed: { backgroundColor: colors.bondSoft },
  cellToday: { backgroundColor: colors.primarySofter, borderWidth: 1.5, borderColor: colors.primary },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs + 2,
    minHeight: 24,
  },
});
