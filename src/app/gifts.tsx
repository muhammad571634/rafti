import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { TILES } from '@/assets/brand/registry';
import { LuckyWheel } from '@/components/lucky-wheel';
import { Anim, Button, Card, Header, Screen, ShellBadge, ShellIcon, Sheet, Txt } from '@/components/ui';
import {
  AD_REWARD,
  DAILY_CHECK_IN,
  FREE_SPINS_PER_DAY,
  MAX_ADS_PER_DAY,
  WHEEL_SEGMENTS,
  todayKey,
} from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { colors, gradients, palette, radius, space } from '@/theme';

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
    <Screen background={gradients.home}>
      <Header title={t('gifts.title')} right={<ShellBadge count={shells} style={styles.balance} />} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Card style={styles.card}>
          <View style={styles.cardHead}>
            <Txt variant="h3">{t('gifts.dailyCheckIn')}</Txt>
            <Txt variant="caption" color={colors.textMuted}>
              {t('gifts.checkInHint')}
            </Txt>
          </View>

          <View style={styles.days}>
            {DAILY_CHECK_IN.map((amount, index) => {
              const day = index + 1;
              const claimed = day <= daily.checkInDay;
              const isToday = checkedInToday && day === daily.checkInDay;
              const last = index === DAILY_CHECK_IN.length - 1;

              return (
                <View
                  key={day}
                  style={[styles.day, last && styles.dayBig, claimed && styles.dayClaimed, isToday && styles.dayToday]}>
                  <Txt variant="tiny" color={isToday ? colors.primary : colors.textSecondary}>
                    {isToday ? t('common.today') : t('gifts.day', { count: day })}
                  </Txt>
                  {claimed ? (
                    <Ionicons name="checkmark-circle" size={22} color={isToday ? colors.primary : colors.success} />
                  ) : (
                    <ShellIcon size={last ? 30 : 22} />
                  )}
                  <Txt variant="tiny" color={claimed ? colors.textFaint : palette.shellText}>
                    +{amount}
                  </Txt>
                </View>
              );
            })}
          </View>
        </Card>

        <Card style={[styles.card, styles.wheelCard]}>
          <View style={styles.wheelHead}>
            <Image source={TILES.gifts} style={styles.wheelArt} />
            <View style={styles.flex}>
              <Txt variant="h3">{t('gifts.wheel')}</Txt>
              <Txt variant="caption" color={colors.textMuted}>
                {freeSpinLeft ? t('gifts.freeSpin') : adsLeft ? t('gifts.adSpin') : t('gifts.noSpins')}
              </Txt>
            </View>
          </View>

          <LuckyWheel
            size={264}
            disabled={!canSpin}
            onSpin={() => spinWheel()?.index ?? null}
            onStop={(index) => setReward(WHEEL_SEGMENTS[index])}
          />
        </Card>

        <Card style={styles.card}>
          <View style={styles.adRow}>
            <Anim name="giftBox" size={56} />
            <View style={styles.flex}>
              <Txt variant="title">{t('gifts.watchAd')}</Txt>
              <Txt variant="small" color={colors.textMuted}>
                {adsLeft ? t('gifts.watchAdReward', { count: AD_REWARD, left: adsLeft }) : t('gifts.adsDone')}
              </Txt>
            </View>
            <Button
              label={t('gifts.watch')}
              size="sm"
              onPress={playAd}
              loading={watching}
              disabled={!adsLeft}
            />
          </View>
        </Card>
      </ScrollView>

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
  flex: { flex: 1 },
  balance: { marginRight: space.sm },
  scroll: { padding: space.lg, gap: space.lg, paddingBottom: space.huge },
  card: { gap: space.md },
  cardHead: { gap: 2 },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'space-between' },
  day: {
    width: '22.5%',
    height: 78,
    borderRadius: radius.md,
    backgroundColor: palette.shellSoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  dayBig: { width: '48%', backgroundColor: '#FFF0C8' },
  dayClaimed: { backgroundColor: colors.surfaceAlt },
  dayToday: { borderColor: colors.primary, backgroundColor: colors.primarySofter },
  wheelCard: { alignItems: 'center' },
  wheelHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, alignSelf: 'stretch' },
  wheelArt: { width: 58, height: 58 },
  adRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  success: { alignItems: 'center', gap: space.md },
  confetti: { position: 'absolute', top: -60 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
