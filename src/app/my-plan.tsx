import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { PaywallSheet } from '@/components/paywall-sheet';
import { planDate, planPrice, planTime, SUBSCRIPTIONS_URL, wholeMinutes } from '@/components/plans/copy';
import { Button, Header, Icon3D, ListRow, Screen, Sheet, ShellBadge, Txt } from '@/components/ui';
import { PACK_DAYS, planStatus, PLANS, TOP_UPS, TRIAL, type MinutesKind } from '@/economy/plans';
import { todayKey } from '@/mock';
import { minutesOf, useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';

const ROW_ICON = 36;

/**
 * What the user is on and what is left: minutes for calls and voice replies this
 * period, extra minutes for shells, and the way to change or cancel the plan.
 * Free users see today's free shells and what Basic adds.
 */
export default function MyPlanScreen() {
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

  const name = status
    ? status.trial
      ? t('plans.trialName', { plan: t(`plans.name.${status.plan}`) })
      : t(`plans.name.${status.plan}`)
    : t('plans.free');
  const line = !status
    ? t('plans.freeLine')
    : status.trial
      ? t('plans.trialEnds', { date: planDate(status.renewsAt), price: planPrice(t, 'basic') })
      : status.willRenew
        ? t('plans.renews', { date: planDate(status.renewsAt), price: planPrice(t, status.plan) })
        : t('plans.ends', { date: planDate(status.renewsAt) });
  const usageTitle = !status
    ? ''
    : status.trial
      ? t('plans.yourTrial')
      : status.plan === 'quarterly'
        ? t('plans.thisQuarter')
        : t('plans.thisMonth');

  const topUp = (kind: MinutesKind) => {
    if (topUpMinutes(kind) === 'noShells') return setPaywall(TOP_UPS[kind].shells);
    setAdded(kind);
  };

  const startTrial = () => {
    if (wallet.trialUsed) return router.push('/store/shell?tab=plans&plan=basic');
    // Real builds open the store's purchase sheet with the free-trial offer.
    subscribe('basic', true);
  };

  return (
    <Screen background={colors.bgPlain}>
      <Header title={t('plans.myPlan')} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.head}>
          <Icon3D name="crown" size={56} />
          <View style={styles.flex}>
            <Txt variant="h2">{name}</Txt>
            <Txt variant="body" color={colors.textSecondary}>
              {line}
            </Txt>
          </View>
        </View>

        {status ? (
          <View style={styles.section}>
            <Txt variant="h3">{usageTitle}</Txt>
            <Meter icon="call-outline" label={t('plans.callsRow')} left={calls.plan} total={calls.planTotal} extra={calls.packs} />
            <Meter icon="mic-outline" label={t('plans.voiceRow')} left={voice.plan} total={voice.planTotal} extra={voice.packs} />
            <View style={styles.rowHead}>
              <Glyph icon="chatbubble-outline" />
              <Txt variant="title" style={styles.flex}>
                {t('plans.chatRow')}
              </Txt>
              <Txt variant="bodyStrong">{t('plans.unlimited')}</Txt>
            </View>
            <Txt variant="small" color={colors.textSecondary}>
              {status.trial
                ? t('plans.trialNote', {
                    calls: planTime(t, PLANS.basic.callSeconds),
                    voice: planTime(t, PLANS.basic.voiceSeconds),
                    date: planDate(status.renewsAt),
                  })
                : t('plans.resetNote', { date: planDate(calls.resetsAt ?? status.renewsAt) })}
            </Txt>
          </View>
        ) : null}

        {status && !status.trial ? (
          <View style={styles.sectionTight}>
            <View style={styles.titleRow}>
              <Txt variant="h3" style={styles.flex}>
                {t('plans.needMore')}
              </Txt>
              <ShellBadge count={wallet.shells} />
            </View>
            {(['call', 'voice'] as const).map((kind) => (
              <View key={kind} style={styles.topUp}>
                <Txt variant="bodyStrong" style={styles.flex}>
                  {t(kind === 'call' ? 'plans.topUpCalls' : 'plans.topUpVoice', {
                    time: planTime(t, TOP_UPS[kind].seconds),
                  })}
                </Txt>
                <Button
                  label={t('plans.shells', { count: TOP_UPS[kind].shells })}
                  variant="secondary"
                  size="sm"
                  onPress={() => topUp(kind)}
                />
              </View>
            ))}
            <Txt variant="small" color={colors.textSecondary}>
              {t('plans.topUpNote', { count: PACK_DAYS })}
            </Txt>
          </View>
        ) : null}

        {!status ? (
          <View style={styles.section}>
            <Txt variant="h3">{t('plans.today')}</Txt>
            <View style={styles.rowHead}>
              <Icon3D name="shell" size={ROW_ICON} />
              <Txt variant="title" style={styles.flex}>
                {t('plans.freeShells')}
              </Txt>
              <Txt variant="bodyStrong">
                {freeToday > 0 ? t('plans.freeShellsLeft', { count: freeToday }) : t('plans.freeShellsNone')}
              </Txt>
            </View>
            <View style={styles.rowHead}>
              <Glyph icon="lock-closed-outline" />
              <Txt variant="title" style={styles.flex}>
                {t('plans.callsAndVoice')}
              </Txt>
              <Txt variant="bodyStrong">{t('plans.withBasic')}</Txt>
            </View>
            <Txt variant="small" color={colors.textSecondary}>
              {t('plans.freeNote')}
            </Txt>
            <View style={styles.cta}>
              <Button
                label={
                  wallet.trialUsed
                    ? t('plans.get', { plan: t('plans.name.basic'), price: PLANS.basic.price })
                    : t('plans.tryTrial', { count: TRIAL.days })
                }
                size="lg"
                full
                onPress={startTrial}
              />
              <Txt variant="caption" color={colors.textMuted} center>
                {wallet.trialUsed ? t('plans.billed.basic') : t('plans.trialCaption', { price: PLANS.basic.price })}
              </Txt>
            </View>
          </View>
        ) : null}

        <View>
          <Txt variant="h3" style={styles.planTitle}>
            {t('plans.planSection')}
          </Txt>
          <ListRow
            title={t('plans.seeAll')}
            chevron
            style={styles.link}
            onPress={() => router.push('/store/shell?tab=plans')}
          />
          {status ? (
            <ListRow
              title={t('plans.manage')}
              chevron
              style={styles.link}
              onPress={() => void Linking.openURL(SUBSCRIPTIONS_URL)}
            />
          ) : null}
          {/* Real builds ask StoreKit / Play Billing and the server; the mock has nothing to bring back. */}
          <ListRow title={t('plans.restore')} chevron style={styles.link} onPress={() => setRestored(true)} />
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

/** One kind of minutes: what is left of the plan's, a bar, and any extra bought. */
function Meter({
  icon,
  label,
  left,
  total,
  extra,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  left: number;
  total: number;
  extra: number;
}) {
  const { t } = useTranslation();
  const share = total > 0 ? Math.min(1, left / total) : 0;
  return (
    <View style={styles.meter}>
      <View style={styles.rowHead}>
        <Glyph icon={icon} />
        <Txt variant="title" style={styles.flex}>
          {label}
        </Txt>
        <Txt variant="bodyStrong" style={styles.figure}>
          {t('plans.left', { left: wholeMinutes(left), total: wholeMinutes(total) })}
        </Txt>
      </View>
      <View style={styles.track}>
        <View style={[styles.bar, { width: `${Math.round(share * 100)}%` }]} />
      </View>
      {extra > 0 ? (
        <Txt variant="caption" color={colors.textSecondary} style={styles.extra}>
          {t('plans.extra', { time: planTime(t, extra) })}
        </Txt>
      ) : null}
    </View>
  );
}

function Glyph({ icon }: { icon: React.ComponentProps<typeof Ionicons>['name'] }) {
  return (
    <View style={styles.glyph}>
      <Ionicons name={icon} size={19} color={colors.text} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.xxxl, gap: space.xxl },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md + 2 },
  section: { gap: space.lg },
  sectionTight: { gap: space.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.xs },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  meter: { gap: space.sm },
  figure: { fontVariant: ['tabular-nums'] },
  glyph: {
    width: ROW_ICON,
    height: ROW_ICON,
    borderRadius: radius.sm + 1,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    height: 8,
    marginLeft: ROW_ICON + space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  bar: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.text },
  extra: { marginLeft: ROW_ICON + space.md },
  topUp: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56 },
  cta: { gap: space.sm, marginTop: space.xs },
  planTitle: { marginBottom: space.xs },
  link: { paddingHorizontal: 0 },
  done: { alignItems: 'center', gap: space.lg },
});
