import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, PressableScale, Txt } from '@/components/ui';
import { FAIR_USE_PER_DAY, planStatus, PLANS, TRIAL } from '@/economy/plans';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';
import type { PlanId } from '@/types';

import { perMonth, planPrice, planTime, savingVsMonthly, storeName } from './copy';

type BasicPeriod = 'basic' | 'quarterly' | 'annual';
const PERIODS: BasicPeriod[] = ['basic', 'quarterly', 'annual'];

export interface PlanBought {
  plan: PlanId;
  trial: boolean;
}

/**
 * The Plans tab of the store: Basic with its three billing periods, and Pro. Every
 * plan keeps the same chats, memories and bonds; plans differ only in minutes.
 */
export function PlanPicker({
  initialPlan,
  onBought,
  onRestore,
}: {
  initialPlan?: PlanId;
  onBought: (bought: PlanBought) => void;
  onRestore: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const wallet = useAppStore((s) => s.wallet);
  const subscribe = useAppStore((s) => s.subscribe);

  const current = planStatus(wallet.subscription, Date.now());
  const start = initialPlan ?? current?.plan ?? 'basic';
  const [tier, setTier] = useState<'basic' | 'pro'>(start === 'pro' ? 'pro' : 'basic');
  const [period, setPeriod] = useState<BasicPeriod>(start === 'pro' ? 'basic' : start);
  const selected: PlanId = tier === 'pro' ? 'pro' : period;

  // The store's free days go to new subscribers only, once per account.
  const trialOffer = !wallet.trialUsed && !current;
  const isCurrent = !!current && !current.trial && current.plan === selected;
  const withTrial = trialOffer && selected === 'basic';

  const cta = isCurrent
    ? { label: t('plans.current'), caption: t(`plans.billed.${selected}`) }
    : withTrial
      ? {
          label: t('plans.startTrial', { count: TRIAL.days }),
          caption: t('plans.trialCaption', { price: PLANS.basic.price }),
        }
      : {
          label: t('plans.get', { plan: t(`plans.name.${selected}`), price: PLANS[selected].price }),
          caption: t(`plans.billed.${selected}`),
        };

  const buy = () => {
    // Real builds open StoreKit / Play Billing here; the server confirms the receipt.
    subscribe(selected, withTrial);
    onBought({ plan: selected, trial: withTrial });
  };

  const basicPrice =
    period === 'basic'
      ? planPrice(t, period)
      : `${planPrice(t, period)} · ${t('plans.perMonth', { price: perMonth(period) })}`;

  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.intro}>
          <Txt variant="h2">{t('plans.headline')}</Txt>
          <Txt variant="body" color={colors.textSecondary}>
            {t('plans.sub')}
          </Txt>
        </View>

        <PlanCard
          selected={tier === 'basic'}
          onPress={() => setTier('basic')}
          name={t('plans.name.basic')}
          // The free days come with monthly Basic only.
          badge={
            trialOffer && period === 'basic'
              ? { label: t('plans.freeDays', { count: TRIAL.days }), shell: true }
              : undefined
          }
          price={basicPrice}
          perks={[
            t('plans.unlimitedChatMark'),
            t(`plans.calls.${period}`, { time: planTime(t, PLANS[period].callSeconds) }),
            t(`plans.voice.${period}`, { time: planTime(t, PLANS[period].voiceSeconds) }),
            t('plans.remembers'),
          ]}
        />

        {tier === 'basic' ? (
          <View style={styles.periods} accessibilityRole="radiogroup">
            {PERIODS.map((id) => {
              const on = period === id;
              const sub =
                id === 'basic'
                  ? PLANS.basic.price
                  : id === 'quarterly'
                    ? t('plans.perMonth', { price: perMonth(id) })
                    : t('plans.periodSave', { percent: savingVsMonthly(id) });
              return (
                <PressableScale
                  key={id}
                  onPress={() => setPeriod(id)}
                  scaleTo={0.97}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  aria-checked={on}
                  style={[styles.period, on && styles.periodOn]}>
                  <Txt variant="smallStrong" center>
                    {t(`plans.period.${id}`)}
                  </Txt>
                  <Txt variant="caption" color={colors.textSecondary} center>
                    {sub}
                  </Txt>
                </PressableScale>
              );
            })}
          </View>
        ) : null}

        <PlanCard
          selected={tier === 'pro'}
          onPress={() => setTier('pro')}
          name={t('plans.name.pro')}
          badge={{ label: t('plans.mostTime') }}
          price={planPrice(t, 'pro')}
          perks={[
            t('plans.everythingBasic'),
            t('plans.calls.pro', { time: planTime(t, PLANS.pro.callSeconds) }),
            t('plans.voice.pro', { time: planTime(t, PLANS.pro.voiceSeconds) }),
            t('plans.deepestMemory'),
          ]}
        />

        <Txt variant="small" color={colors.textSecondary} style={styles.fine}>
          {t('plans.finePrint', { count: FAIR_USE_PER_DAY, store: storeName(t) })}
        </Txt>
        <View style={styles.links}>
          <TextLink label={t('plans.restore')} onPress={onRestore} />
          {/* Terms and Privacy open the hosted pages once they are live (same as Profile). */}
          <TextLink label={t('plans.terms')} />
          <TextLink label={t('plans.privacy')} />
        </View>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        <Button label={cta.label} size="lg" full disabled={isCurrent} onPress={buy} />
        <Txt variant="caption" color={colors.textMuted} center>
          {cta.caption}
        </Txt>
      </View>
    </>
  );
}

function PlanCard({
  selected,
  onPress,
  name,
  badge,
  price,
  perks,
}: {
  selected: boolean;
  onPress: () => void;
  name: string;
  /** `shell`: the warm offer tint (free days); otherwise a quiet grey tag. */
  badge?: { label: string; shell?: boolean };
  price: string;
  perks: string[];
}) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.985}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      style={[styles.card, selected && styles.cardOn]}>
      <View style={styles.cardHead}>
        <Txt variant="h3" style={styles.flex}>
          {name}
        </Txt>
        {badge ? (
          <View style={[styles.badge, badge.shell ? styles.badgeOffer : styles.badgeQuiet]}>
            <Txt variant="chip" color={badge.shell ? colors.brandText : colors.text}>
              {badge.label}
            </Txt>
          </View>
        ) : null}
      </View>
      <Txt variant="body" color={colors.textSecondary}>
        {price}
      </Txt>
      <View style={styles.perks}>
        {perks.map((perk) => (
          <View key={perk} style={styles.perk}>
            <Ionicons name="checkmark" size={16} color={colors.text} />
            <Txt variant="body" style={styles.flex}>
              {perk}
            </Txt>
          </View>
        ))}
      </View>
    </PressableScale>
  );
}

function TextLink({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.96} hitSlop={8} accessibilityRole="link">
      <Txt variant="smallStrong">{label}</Txt>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.lg, gap: space.md },
  intro: { gap: space.xs, marginBottom: space.xs },
  card: {
    padding: space.lg,
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    // Same outer size selected or not: the thicker border eats into the padding.
    margin: 1,
  },
  cardOn: { borderWidth: 2, borderColor: colors.text, margin: 0 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.xxs },
  badge: { paddingHorizontal: space.sm + 2, paddingVertical: 3, borderRadius: radius.pill, borderWidth: 1 },
  badgeOffer: { backgroundColor: colors.primarySofter, borderColor: colors.primarySoft },
  badgeQuiet: { backgroundColor: colors.surfaceAlt, borderColor: colors.surfaceAlt },
  perks: { gap: space.sm - 1, marginTop: space.md },
  perk: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  periods: { flexDirection: 'row', gap: space.sm },
  period: {
    flex: 1,
    minHeight: 52,
    paddingVertical: space.xs + 2,
    paddingHorizontal: space.xs,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  periodOn: { backgroundColor: colors.surface, borderColor: colors.text },
  fine: { marginTop: space.xs },
  links: { flexDirection: 'row', justifyContent: 'center', gap: space.lg, paddingVertical: space.xs },
  bar: {
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
