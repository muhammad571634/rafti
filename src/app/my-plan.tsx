import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import type { SFSymbol } from 'sf-symbols-typescript';

import { PaywallSheet } from '@/components/paywall-sheet';
import { planDate, planPrice, planTime, SUBSCRIPTIONS_URL, wholeMinutes } from '@/components/plans/copy';
import { CARD_SHADOW, GroupLabel, IconTile, ProGradient, ProPill, STORE } from '@/components/plans/store-look';
import { AuroraGlass, Button, PressableScale, Screen, SFIcon, Sheet, ShellIcon, Txt } from '@/components/ui';
import { PACK_DAYS, planStatus, PLANS, TOP_UPS, TRIAL, type MinutesKind } from '@/economy/plans';
import { todayKey } from '@/mock';
import { callsIncluded, minutesOf, useAppStore } from '@/store/use-app-store';
import { aurora, colors, isDark, space } from '@/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const RING = 84;
const RING_STROKE = 10;
const RING_R = (RING - RING_STROKE) / 2;
const RING_C = 2 * Math.PI * RING_R;
/** iOS system colours, as on the Store's table: calls green, voice replies pink. */
const CALLS = isDark ? '#30D158' : '#34C759';
const VOICE = isDark ? '#FF375F' : '#FF2D55';

/**
 * What the user is on and what is left, on the aurora in the Store's look (2026-10-22, coded at
 * the owner's word without a prototype): the plan as a card (Pro's gradient for Pro and the
 * trial), this period's call and voice minutes as Fitness-style rings, extra minutes for shells,
 * and the way to change or cancel. Free users see today's free shells and the way to Pro.
 */
export default function MyPlanScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const wallet = useAppStore((s) => s.wallet);
  const subscribe = useAppStore((s) => s.subscribe);
  const topUpMinutes = useAppStore((s) => s.topUpMinutes);
  const [paywall, setPaywall] = useState<number | null>(null);
  const [added, setAdded] = useState<MinutesKind | null>(null);
  const [restored, setRestored] = useState(false);

  const now = Date.now();
  const status = planStatus(wallet.subscription, now);
  const calls = minutesOf(wallet, 'call', now);
  const voice = minutesOf(wallet, 'voice', now);
  const freeToday = wallet.free && wallet.free.day === todayKey() ? wallet.free.amount : 0;
  // Pro and the trial carry minutes; Basic is chat only.
  const withCalls = callsIncluded(wallet, now);
  const pro = !!status && (status.trial || status.plan !== 'basic');

  const name = status
    ? status.trial
      ? t('plans.trialName', { plan: t(`plans.name.${status.plan}`) })
      : t(`plans.name.${status.plan}`)
    : t('plans.free');
  const line = !status
    ? t('plans.freeLine')
    : status.trial
      ? t('plans.trialEnds', { date: planDate(status.renewsAt), price: planPrice(t, TRIAL.plan) })
      : status.willRenew
        ? t('plans.renews', { date: planDate(status.renewsAt), price: planPrice(t, status.plan) })
        : t('plans.ends', { date: planDate(status.renewsAt) });

  const topUp = (kind: MinutesKind) => {
    if (topUpMinutes(kind) === 'noShells') return setPaywall(TOP_UPS[kind].shells);
    setAdded(kind);
  };

  const startTrial = () => {
    if (wallet.trialUsed) return router.push('/store/shell?tab=plans&plan=proAnnual');
    // Real builds open the store's purchase sheet with the free-trial offer.
    subscribe(TRIAL.plan, true);
  };

  const heroBody = (
    <>
      <View style={[styles.heroIcon, !pro && styles.heroIconPlain]}>
        <SFIcon ios="crown.fill" icon="diamond" size={22} color={pro ? '#FFFFFF' : colors.textSecondary} />
      </View>
      <View style={styles.flex}>
        <Txt style={[styles.heroName, !pro && styles.inkText]} lines={1} accessibilityRole="header">
          {name}
        </Txt>
        <Txt style={[styles.heroLine, !pro && styles.mutedText]}>{line}</Txt>
      </View>
    </>
  );

  const note = !status
    ? t('plans.freeNote')
    : status.trial
      ? t('plans.trialNote', {
          calls: planTime(t, PLANS[TRIAL.plan].callSeconds),
          voice: planTime(t, PLANS[TRIAL.plan].voiceSeconds),
          date: planDate(status.renewsAt),
        })
      : withCalls
        ? t('plans.resetNote', { date: planDate(calls.resetsAt ?? status.renewsAt) })
        : t('plans.shellsNote', {
            amount: PLANS[status.plan].shells.toLocaleString('en-US'),
            date: planDate(calls.resetsAt ?? status.renewsAt),
          });

  const links: { key: string; title: string; ios: SFSymbol; icon: IoniconName; fill: string; onPress: () => void }[] = [
    {
      key: 'all',
      title: t('plans.seeAll'),
      ios: 'crown.fill',
      icon: 'diamond',
      fill: '#AF52DE',
      onPress: () => router.push('/store/shell?tab=plans'),
    },
    ...(status
      ? [
          {
            key: 'manage',
            title: t('plans.manage'),
            ios: 'creditcard.fill' as SFSymbol,
            icon: 'card' as IoniconName,
            fill: '#007AFF',
            onPress: () => void Linking.openURL(SUBSCRIPTIONS_URL),
          },
        ]
      : []),
    // Real builds ask StoreKit / Play Billing and the server; the mock has nothing to bring back.
    {
      key: 'restore',
      title: t('plans.restore'),
      ios: 'arrow.clockwise',
      icon: 'refresh',
      fill: '#8E8E93',
      onPress: () => setRestored(true),
    },
  ];

  return (
    <Screen background="aurora">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}>
        <View style={styles.bar}>
          <PressableScale scaleTo={0.9} accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()}>
            <AuroraGlass style={styles.round}>
              <Ionicons name="chevron-back" size={22} color={colors.text} style={styles.backIcon} />
            </AuroraGlass>
          </PressableScale>
        </View>
        <Txt style={styles.largeTitle} accessibilityRole="header">
          {t('plans.myPlan')}
        </Txt>

        {pro ? <ProGradient style={[styles.hero, styles.heroPro]}>{heroBody}</ProGradient> : <View style={[styles.hero, styles.card]}>{heroBody}</View>}

        {status ? (
          <>
            <GroupLabel>{status.trial ? t('plans.yourTrial') : t('plans.thisMonth')}</GroupLabel>
            <View style={styles.card}>
              {withCalls ? (
                <View style={styles.rings}>
                  <MinutesRing
                    color={CALLS}
                    ios="phone.fill"
                    icon="call"
                    label={t('plans.callsRow')}
                    left={calls.plan}
                    total={calls.planTotal}
                    extra={calls.packs}
                  />
                  <MinutesRing
                    color={VOICE}
                    ios="waveform"
                    icon="pulse"
                    label={t('plans.voiceRow')}
                    left={voice.plan}
                    total={voice.planTotal}
                    extra={voice.packs}
                  />
                </View>
              ) : null}
              <View style={[styles.row, withCalls && styles.rowTopLine]}>
                <IconTile fill="#FF9500">
                  <SFIcon ios="bubble.left.fill" icon="chatbubble" size={17} color="#FFFFFF" />
                </IconTile>
                <Txt style={styles.rowTitle}>{t('plans.chatRow')}</Txt>
                <View style={styles.value}>
                  <Txt style={styles.valueText}>{wallet.shells.toLocaleString('en-US')}</Txt>
                  <ShellIcon size={16} />
                </View>
              </View>
            </View>
            <Txt style={styles.footnote}>{note}</Txt>
          </>
        ) : (
          <>
            <GroupLabel>{t('plans.today')}</GroupLabel>
            <View style={styles.card}>
              <View style={[styles.row, styles.rowLine]}>
                <IconTile fill="#FF9500">
                  <ShellIcon size={17} tintColor="#FFFFFF" />
                </IconTile>
                <Txt style={styles.rowTitle}>{t('plans.freeShells')}</Txt>
                <Txt style={styles.meta}>
                  {freeToday > 0 ? t('plans.freeShellsLeft', { count: freeToday }) : t('plans.freeShellsNone')}
                </Txt>
              </View>
              <View style={styles.row}>
                <IconTile fill="#34C759">
                  <SFIcon ios="phone.fill" icon="call" size={17} color="#FFFFFF" />
                </IconTile>
                <Txt style={styles.rowTitle}>{t('plans.callsAndVoice')}</Txt>
                <ProPill />
              </View>
            </View>
            <Txt style={styles.footnote}>{note}</Txt>
            <View style={styles.cta}>
              <PressableScale scaleTo={0.97} accessibilityRole="button" onPress={startTrial} style={styles.ctaButton}>
                <Txt style={styles.ctaText} lines={1}>
                  {wallet.trialUsed
                    ? t('plans.get', { plan: t('plans.name.proAnnual'), price: PLANS.proAnnual.price })
                    : t('plans.tryTrial', { count: TRIAL.days })}
                </Txt>
              </PressableScale>
              <Txt style={styles.ctaCaption}>
                {wallet.trialUsed ? t('plans.billed.proAnnual') : t('plans.trialCaption', { price: PLANS[TRIAL.plan].price })}
              </Txt>
            </View>
          </>
        )}

        {status && !status.trial && withCalls ? (
          <>
            <GroupLabel>{t('plans.needMore')}</GroupLabel>
            <View style={styles.card}>
              {(['call', 'voice'] as const).map((kind, i) => (
                <View key={kind} style={[styles.row, i === 0 && styles.rowLine]}>
                  <IconTile fill={kind === 'call' ? CALLS : VOICE}>
                    <SFIcon
                      ios={kind === 'call' ? 'phone.fill' : 'waveform'}
                      icon={kind === 'call' ? 'call' : 'pulse'}
                      size={17}
                      color="#FFFFFF"
                    />
                  </IconTile>
                  <Txt style={styles.rowTitle} lines={2}>
                    {t(kind === 'call' ? 'plans.topUpCalls' : 'plans.topUpVoice', { time: planTime(t, TOP_UPS[kind].seconds) })}
                  </Txt>
                  <PressableScale
                    scaleTo={0.94}
                    accessibilityRole="button"
                    accessibilityLabel={t('plans.shells', { count: TOP_UPS[kind].shells })}
                    onPress={() => topUp(kind)}
                    style={styles.buy}>
                    <Txt style={styles.buyText}>{TOP_UPS[kind].shells}</Txt>
                    <ShellIcon size={15} />
                  </PressableScale>
                </View>
              ))}
            </View>
            <Txt style={styles.footnote}>{t('plans.topUpNote', { count: PACK_DAYS })}</Txt>
          </>
        ) : null}

        <GroupLabel>{t('plans.planSection')}</GroupLabel>
        <View style={styles.card}>
          {links.map((link, i) => (
            <PressableScale key={link.key} scaleTo={0.985} accessibilityRole="button" onPress={link.onPress} style={[styles.row, i < links.length - 1 && styles.rowLine]}>
              <IconTile fill={link.fill}>
                <SFIcon ios={link.ios} icon={link.icon} size={17} color="#FFFFFF" />
              </IconTile>
              <Txt style={styles.rowTitle}>{link.title}</Txt>
              <Ionicons name="chevron-forward" size={15} color={STORE.faint} />
            </PressableScale>
          ))}
        </View>
      </ScrollView>

      <PaywallSheet need={paywall} onClose={() => setPaywall(null)} />

      <Sheet visible={!!added || restored} onClose={() => (setAdded(null), setRestored(false))} center>
        <View style={styles.done}>
          <Txt variant="title" center>
            {added
              ? t('plans.added', {
                  time: t(added === 'call' ? 'plans.topUpCalls' : 'plans.topUpVoice', {
                    time: planTime(t, TOP_UPS[added].seconds),
                  }),
                })
              : t('plans.restored')}
          </Txt>
          <Button label={t('common.done')} full onPress={() => (setAdded(null), setRestored(false))} />
        </View>
      </Sheet>
    </Screen>
  );
}

/** One kind of minutes as a Fitness-style ring: what is left of the plan's, and any extra bought. */
function MinutesRing({
  color,
  ios,
  icon,
  label,
  left,
  total,
  extra,
}: {
  color: string;
  ios: SFSymbol;
  icon: IoniconName;
  label: string;
  left: number;
  total: number;
  extra: number;
}) {
  const { t } = useTranslation();
  const share = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0;
  return (
    <View
      style={styles.ringCell}
      accessible
      accessibilityLabel={`${label}, ${t('plans.left', { left: wholeMinutes(left), total: wholeMinutes(total) })}`}>
      <View style={styles.ring}>
        <Svg width={RING} height={RING} style={styles.ringSvg}>
          <Circle cx={RING / 2} cy={RING / 2} r={RING_R} fill="none" stroke={color} strokeOpacity={0.18} strokeWidth={RING_STROKE} />
          {share > 0 ? (
            <Circle
              cx={RING / 2}
              cy={RING / 2}
              r={RING_R}
              fill="none"
              stroke={color}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={`${RING_C * share} ${RING_C}`}
            />
          ) : null}
        </Svg>
        <SFIcon ios={ios} icon={icon} size={22} color={color} />
      </View>
      <Txt style={styles.ringLabel}>{label}</Txt>
      <Txt style={styles.ringValue}>{t('plans.minutes', { count: wholeMinutes(left) })}</Txt>
      <Txt style={styles.ringTotal}>{t('plans.ofTotal', { total: wholeMinutes(total) })}</Txt>
      {extra > 0 ? <Txt style={styles.ringExtra}>{t('plans.extra', { time: planTime(t, extra) })}</Txt> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: { height: 44, paddingHorizontal: space.lg, paddingTop: space.xs, flexDirection: 'row', alignItems: 'center' },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  backIcon: { marginLeft: -2 },
  largeTitle: {
    marginTop: 6,
    marginHorizontal: space.lg,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: colors.text,
  },
  card: { marginHorizontal: space.lg, borderRadius: 20, overflow: 'hidden', backgroundColor: aurora.card, ...CARD_SHADOW },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 20, padding: space.lg },
  heroPro: {
    marginHorizontal: space.lg,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#5B3FD9',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 14 },
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  heroIconPlain: { backgroundColor: isDark ? 'rgba(118,118,128,0.24)' : 'rgba(118,118,128,0.12)' },
  heroName: { fontSize: 26, lineHeight: 32, fontWeight: '800', letterSpacing: 0.2, color: '#FFFFFF' },
  heroLine: { marginTop: 2, fontSize: 15, lineHeight: 20, color: 'rgba(255,255,255,0.88)' },
  inkText: { color: colors.text },
  mutedText: { color: aurora.textMuted },
  rings: { flexDirection: 'row', paddingVertical: 18, paddingHorizontal: space.sm },
  ringCell: { flex: 1, alignItems: 'center' },
  ring: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  // The arc starts at 12 o'clock, as Fitness draws it.
  ringSvg: { position: 'absolute', transform: [{ rotate: '-90deg' }] },
  ringLabel: { marginTop: 10, fontSize: 13, fontWeight: '600', color: aurora.textMuted },
  ringValue: { marginTop: 2, fontSize: 22, lineHeight: 26, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  ringTotal: { fontSize: 13, color: aurora.textMuted, fontVariant: ['tabular-nums'] },
  ringExtra: { marginTop: 4, fontSize: 13, fontWeight: '600', color: STORE.peachInk },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.lg },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: aurora.separator },
  rowTopLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: aurora.separator },
  rowTitle: { flex: 1, fontSize: 17, letterSpacing: -0.4, color: colors.text },
  meta: { fontSize: 15, color: aurora.textMuted },
  value: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  valueText: { fontSize: 17, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  buy: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: STORE.peachSoft,
  },
  buyText: { fontSize: 15, fontWeight: '700', color: STORE.peachInk, fontVariant: ['tabular-nums'] },
  footnote: { marginTop: 8, marginHorizontal: space.lg * 2, fontSize: 13, lineHeight: 18, color: aurora.textMuted },
  cta: { gap: space.sm, marginTop: 22, marginHorizontal: space.lg },
  ctaButton: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: STORE.cta },
  ctaText: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, color: STORE.ctaInk },
  ctaCaption: { fontSize: 13, textAlign: 'center', color: aurora.textMuted },
  done: { alignItems: 'center', gap: space.lg },
});
