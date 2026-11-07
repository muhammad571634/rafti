import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, StyleSheet, View, type ViewInstance } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { CoinDropReward, type Point, wobbleAt } from '@/components/coin-drop';
import { PeekingMascot } from '@/components/peeking-mascot';
import { Button, ShellIcon, Sheet, Txt } from '@/components/ui';
import { DAILY_CHECK_IN, isSurpriseDay } from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { colors, palette, radius, space } from '@/theme';

/**
 * The day's check-in shells, as a bottom sheet on Today only (never over a chat or another tab),
 * back since 2026-11-07. The shells are credited when the app opens; the sheet shows the week (days
 * done, today in an ink frame, the days still to come) and the wallet. Collect pops today's shells
 * out of today's cell as a glossy coin and the user pours it into the wallet (Coin Drop Reward):
 * until it lands the wallet keeps the balance from before, then it wobbles, shows the new one and
 * the sheet closes. On a build without Skia, Collect just closes the sheet. The mascot peeks over
 * the sheet's top edge.
 */
export function DailyRewardSheet() {
  const { t } = useTranslation();
  const reward = useAppStore((s) => s.dailyReward);
  const dismiss = useAppStore((s) => s.dismissDailyReward);
  const shells = useAppStore((s) => s.wallet.shells);
  const today = reward?.day ?? 1;

  const [pour, setPour] = useState<{ amount: number; from: Point; wallet: Point & { left: number } } | null>(null);
  const [landed, setLanded] = useState(false);
  const wobble = useSharedValue(1);
  const todayCell = useRef<ViewInstance>(null);
  const walletBox = useRef<ViewInstance>(null);
  const shellMark = useRef<ViewInstance>(null);
  const walletStyle = useAnimatedStyle(() => {
    const w = wobbleAt(wobble.get());
    return { transform: [{ scaleX: 1 + 0.1 * w }, { scaleY: 1 - 0.08 * w }] };
  });

  // Credited already: before the drop lands the wallet shows what it held before today's shells.
  const amount = reward?.amount ?? 0;
  const shown = Math.max(0, landed || !reward ? shells : shells - amount);

  const close = () => {
    setPour(null);
    setLanded(false);
    dismiss();
  };

  const collect = () => {
    if (!CoinDropReward || !reward) return close();
    if (pour) return;
    todayCell.current?.measureInWindow((dx, dy, dw, dh) => {
      walletBox.current?.measureInWindow((wx) => {
        shellMark.current?.measureInWindow((sx, sy, sw, sh) => {
          setPour({ amount, from: { x: dx + dw / 2, y: dy + dh / 2 }, wallet: { x: sx + sw / 2, y: sy + sh / 2, left: wx } });
        });
      });
    });
  };

  return (
    <Sheet visible={!!reward} onClose={close} dismissable={!pour}>
      <PeekingMascot />
      <View style={styles.head}>
        <Txt variant="h3" style={styles.flex}>
          {t('dailyReward.title')}
        </Txt>
        <Animated.View ref={walletBox} style={[styles.wallet, walletStyle]} accessible accessibilityLabel={t('plans.shells', { count: shown })}>
          <View ref={shellMark}>
            <ShellIcon size={18} />
          </View>
          <Txt style={styles.walletText}>{shown.toLocaleString('en-US')}</Txt>
        </Animated.View>
      </View>

      <View style={styles.week} accessibilityRole="list">
        {DAILY_CHECK_IN.map((base, index) => {
          const day = index + 1;
          const done = day < today;
          const now = day === today;
          const cellAmount = now && reward ? reward.amount : base;
          return (
            <View
              key={day}
              ref={now ? todayCell : undefined}
              style={[styles.cell, now && styles.cellNow]}
              accessibilityRole="text">
              <Txt variant="tiny" color={colors.textSecondary}>
                {t('dailyReward.dayShort', { day })}
              </Txt>
              {done || (now && landed) ? (
                <Ionicons name="checkmark" size={16} color={colors.text} />
              ) : (
                <Txt variant="smallStrong" style={now && pour ? styles.gone : undefined}>
                  +{cellAmount}
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
        label={t('dailyReward.collectAmount', { count: amount })}
        right={<ShellIcon size={24} />}
        size="lg"
        full
        disabled={!!pour}
        onPress={collect}
        style={styles.cta}
      />

      {CoinDropReward && pour ? (
        // Its own layer over the sheet, so the coin can leave the card and the toast can stand above it.
        <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => undefined}>
          <GestureHandlerRootView style={styles.flex}>
            <CoinDropReward
              amount={pour.amount}
              from={pour.from}
              wallet={pour.wallet}
              wobble={wobble}
              onAbsorb={() => setLanded(true)}
              onDone={close}
            />
          </GestureHandlerRootView>
        </Modal>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  wallet: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 10,
    paddingRight: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  walletText: { fontSize: 15, fontWeight: '600', color: palette.shellText, fontVariant: ['tabular-nums'] },
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
  // Today's amount has left its cell as the coin.
  gone: { opacity: 0 },
  copy: { marginTop: space.lg },
  cta: { marginTop: space.lg },
});
