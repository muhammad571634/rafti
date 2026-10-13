import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, PressableScale, Txt } from '@/components/ui';
import { planStatus, PLANS, TRIAL } from '@/economy/plans';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';
import type { PlanId } from '@/types';

import { perMonth, planPrice, planTime, savingVsMonthly, storeName } from './copy';

type ProPeriod = 'pro' | 'proAnnual';
const PRO_PERIODS: ProPeriod[] = ['pro', 'proAnnual'];

const count = new Intl.NumberFormat('en-US');

export interface PlanBought {
  plan: PlanId;
  trial: boolean;
}

/**
 * The Plans tab of the store (credit model, backend-plan §15.10): Basic is chat only;
 * Pro, monthly or yearly with the same allowance, adds calls, voice and pictures.
 * Pro yearly is picked first and carries the free days.
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
  const start = initialPlan ?? (current && !current.trial ? current.plan : 'proAnnual');
  const [tier, setTier] = useState<'basic' | 'pro'>(start === 'basic' ? 'basic' : 'pro');
  const [period, setPeriod] = useState<ProPeriod>(start === 'pro' ? 'pro' : 'proAnnual');
  const selected: PlanId = tier === 'basic' ? 'basic' : period;

  // The store's free days go to new subscribers only, once per account, on Pro yearly.
  const trialOffer = !wallet.trialUsed && !current;
  const isCurrent = !!current && !current.trial && current.plan === selected;
  const withTrial = trialOffer && selected === TRIAL.plan;

  const cta = isCurrent
    ? { label: t('plans.current'), caption: t(`plans.billed.${selected}`) }
    : withTrial
      ? {
          label: t('plans.startTrial', { count: TRIAL.days }),
          caption: t('plans.trialCaption', { price: PLANS[TRIAL.plan].price }),
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

  const proPrice =
    period === 'pro'
      ? planPrice(t, 'pro')
      : `${planPrice(t, 'proAnnual')} · ${t('plans.perMonth', { price: perMonth('proAnnual') })}`;
  const pro = PLANS[period];

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
          price={planPrice(t, 'basic')}
          perks={[
            t('plans.shellsMonth', { amount: count.format(PLANS.basic.shells) }),
            t('plans.remembers'),
            t('plans.chatOnly'),
          ]}
        />

        <PlanCard
          selected={tier === 'pro'}
          onPress={() => setTier('pro')}
          name={t('plans.name.pro')}
          badge={{ label: t('plans.bestValue'), shell: true }}
          price={proPrice}
          perks={[
            t('plans.shellsMonth', { amount: count.format(pro.shells) }),
            t('plans.remembers'),
            t(`plans.calls.${period}`, { time: planTime(t, pro.callSeconds) }),
            t(`plans.voice.${period}`, { time: planTime(t, pro.voiceSeconds) }),
            t('plans.photosMonth', { count: pro.photos }),
            t('plans.bedtime'),
            t('plans.newCharacters'),
          ]}
        />

        {tier === 'pro' ? (
          <View style={styles.periods} accessibilityRole="radiogroup">
            {PRO_PERIODS.map((id) => {
              const on = period === id;
              const sub =
                id === 'pro'
                  ? PLANS.pro.price
                  : t('plans.perMonthSave', { price: perMonth(id), percent: savingVsMonthly(id, 'pro') });
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

        <Txt variant="small" color={colors.textSecondary} style={styles.fine}>
          {t('plans.finePrint', { store: storeName(t) })}
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
