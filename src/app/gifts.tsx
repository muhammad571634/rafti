import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { LuckyWheel } from '@/components/lucky-wheel';
import { Anim, Button, Header, IconTile, ListRow, Screen, SectionLabel, ShellBadge, ShellIcon, Sheet, Txt } from '@/components/ui';
import {
  AD_REWARD,
  DAILY_CHECK_IN,
  DAILY_CHECK_IN_TOP,
  FREE_SPINS_PER_DAY,
  MAX_ADS_PER_DAY,
  WHEEL_SEGMENTS,
  todayKey,
} from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { colors, palette, radius, space } from '@/theme';

/** How long the stand-in "ad" plays before paying out. */
const AD_MS = 1800;

/**
 * Free shells, three ways — the reference's daily login, roulette wheel and
 * rewarded videos. Every limit lives in the store so it survives a restart.
 */
export default function GiftsScreen() {
  const { t } = useTranslation();

  const shells = useAppStore((s) => s.wallet.shells);
  const daily = useAppStore((s) => s.daily);
  const spinWheel = useAppStore((s) => s.spinWheel);
  const watchAd = useAppStore((s) => s.watchAd);

  const [reward, setReward] = useState<number | null>(null);
  const [watching, setWatching] = useState(false);

  const today = todayKey();
  const checkedInToday = daily.lastLoginDay === today;
  const spinsUsed = daily.spinDay === today ? daily.spinsUsed : 0;
  const adsWatched = daily.adsDay === today ? daily.adsWatched : 0;
  const adsLeft = Math.max(0, MAX_ADS_PER_DAY - adsWatched);
  const freeSpinLeft = spinsUsed < FREE_SPINS_PER_DAY;
  const canSpin = freeSpinLeft || adsLeft > 0;

  const playAd = () => {
    if (!adsLeft || watching) return;
    setWatching(true);
    // Real builds show an AdMob rewarded video and credit in its reward callback.
    setTimeout(() => {
      setWatching(false);
      const amount = watchAd();
      if (amount) setReward(amount);
    }, AD_MS);
  };

  return (
    <Screen background={colors.bgPlain}>
      <Header title={t('gifts.title')} right={<ShellBadge count={shells} style={styles.balance} />} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <SectionLabel
          title={t('gifts.checkInLabel', { day: Math.max(1, daily.checkInDay), total: DAILY_CHECK_IN.length })}
        />
        <View style={styles.days}>
          {DAILY_CHECK_IN.map((amount, index) => {
            const day = index + 1;
            const claimed = day <= daily.checkInDay;
            const isToday = checkedInToday && day === daily.checkInDay;
            const last = index === DAILY_CHECK_IN.length - 1;
            // The surprise day shows its floor ("80+") until it is rolled.
            const shown = last
              ? isToday
                ? String(daily.checkInAmount ?? amount)
                : t('common.atLeast', { count: amount })
              : String(amount);
            const worth =
              last && !isToday ? t('common.range', { min: amount, max: DAILY_CHECK_IN_TOP }) : `+${shown}`;

            return (
              <View
                key={day}
                style={styles.day}
                accessible
                accessibilityLabel={`${isToday ? t('common.today') : t('gifts.day', { count: day })}, ${worth}`}>
                <View style={[styles.dayDot, claimed && styles.dayClaimed, last && !claimed && styles.dayBig]}>
                  {claimed ? (
                    <Ionicons name="checkmark" size={16} color={colors.textOnPrimary} />
                  ) : (
                    <Txt variant="smallStrong" color={last ? colors.primary : colors.text}>
                      {day}
                    </Txt>
                  )}
                </View>
                <Txt
                  variant="caption"
                  color={last && !claimed ? colors.primary : colors.textMuted}>
                  {shown}
                </Txt>
              </View>
            );
          })}
        </View>
        <Txt variant="caption" color={colors.textMuted} style={styles.hint}>
          {t('gifts.checkInHint')}
        </Txt>

        <SectionLabel
          title={`${t('gifts.wheel')} · ${
            freeSpinLeft ? t('gifts.freeSpin') : adsLeft ? t('gifts.adSpin') : t('gifts.noSpins')
          }`}
        />
        <View style={styles.wheel}>
          <LuckyWheel
            size={264}
            disabled={!canSpin}
            onSpin={() => spinWheel()?.index ?? null}
            onStop={(index) => setReward(WHEEL_SEGMENTS[index])}
          />
        </View>
      </ScrollView>

      {/* A row, not a pressable: the Watch button beside it is the only control. */}
      <View style={styles.adBar}>
        <ListRow
          title={t('gifts.watchAd')}
          subtitle={adsLeft ? t('gifts.watchAdReward', { count: AD_REWARD, left: adsLeft }) : t('gifts.adsDone')}
          left={<IconTile icon="play-outline" />}
          right={
            <Button
              label={t('gifts.watch')}
              size="sm"
              variant="secondary"
              onPress={playAd}
              loading={watching}
              disabled={!adsLeft}
            />
          }
        />
      </View>

      <Sheet visible={reward != null} onClose={() => setReward(null)} center>
        <View style={styles.success}>
          <Anim name="confetti" size={220} loop={false} style={styles.confetti} />
          <Anim name="giftBox" size={120} loop={false} />
          <Txt variant="h3" center>
            {t('gifts.won', { count: reward ?? 0 })}
          </Txt>
          <View style={styles.rewardRow}>
            <ShellIcon size={26} />
            <Txt variant="display" color={palette.shellText}>
              +{reward ?? 0}
            </Txt>
          </View>
          <Button label={t('common.done')} onPress={() => setReward(null)} full />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  balance: { marginRight: space.sm },
  scroll: { paddingBottom: space.xl },
  days: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingTop: space.xs },
  day: { alignItems: 'center', gap: space.xs },
  dayDot: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayClaimed: { backgroundColor: colors.text, borderColor: colors.text },
  dayBig: { borderColor: colors.primary },
  hint: { paddingHorizontal: space.lg, marginTop: space.md },
  wheel: { alignItems: 'center', paddingTop: space.sm },
  adBar: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, paddingBottom: space.md },
  success: { alignItems: 'center', gap: space.md },
  confetti: { position: 'absolute', top: -60 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
