import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Anim,
  Button,
  Card,
  Header,
  Icon3D,
  IconButton,
  ListRow,
  PressableScale,
  Screen,
  SectionLabel,
  Sheet,
  ShellIcon,
  Txt,
} from '@/components/ui';
import { shortDate } from '@/lib/format';
import { membershipPlans, shellCosts, shellPacks } from '@/mock';
import { memberActive, useAppStore } from '@/store/use-app-store';
import { colors, palette, radius, space } from '@/theme';
import type { MemberPlan, ShellPack } from '@/types';

type Success = { kind: 'pack'; amount: number } | { kind: 'plan'; plan: MemberPlan };

/** One pack with the value maths the picker shows: totals, savings, price per 100. */
interface PackOffer {
  pack: ShellPack;
  total: number;
  /** Percent saved per shell against the smallest pack. */
  saving: number;
  per100: number;
  bestValue: boolean;
  /** 1–3 shells drawn on the card: bigger packs look bigger. */
  stack: number;
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/**
 * Honest value framing: every price stays visible. The biggest pack anchors the list,
 * the popular one is pre-selected, and each card says what it saves per shell.
 */
function buildOffers(packs: ShellPack[]): PackOffer[] {
  const rate = (p: ShellPack) => p.amount / (p.shells + p.bonus);
  const baseRate = Math.max(...packs.map(rate));
  const bestRate = Math.min(...packs.map(rate));
  const sorted = [...packs].sort((a, b) => b.shells + b.bonus - (a.shells + a.bonus));

  return sorted.map((pack, index) => ({
    pack,
    total: pack.shells + pack.bonus,
    saving: Math.round((1 - rate(pack) / baseRate) * 100),
    per100: rate(pack) * 100,
    bestValue: rate(pack) === bestRate && sorted.length > 1,
    stack: index === 0 ? 3 : index === sorted.length - 1 ? 1 : 2,
  }));
}

export default function ShellStoreScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const wallet = useAppStore((s) => s.wallet);
  const addShells = useAppStore((s) => s.addShells);
  const subscribe = useAppStore((s) => s.subscribe);

  const offers = useMemo(() => buildOffers(shellPacks), []);
  const [selectedId, setSelectedId] = useState(
    () => (shellPacks.find((p) => p.popular) ?? shellPacks[0]).id,
  );
  const [success, setSuccess] = useState<Success | null>(null);

  const isMember = memberActive(wallet);
  const selected = offers.find((o) => o.pack.id === selectedId) ?? offers[0];

  const buy = (offer: PackOffer) => {
    // Real builds hand off to StoreKit / Play Billing and credit after the server checks the receipt.
    addShells(offer.total);
    setSuccess({ kind: 'pack', amount: offer.total });
  };

  const join = (plan: MemberPlan) => {
    subscribe(plan);
    setSuccess({ kind: 'plan', plan });
  };

  return (
    <Screen background={colors.bgPlain}>
      <Header
        title={t('store.title')}
        right={
          <IconButton
            icon="receipt-outline"
            size={21}
            accessibilityLabel={t('ledger.open')}
            onPress={() => router.push('/store/ledger')}
          />
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.balance}>
          <Icon3D name="shell" size={40} />
          <View style={styles.flex}>
            <Txt variant="display">{wallet.shells}</Txt>
            <Txt variant="small" color={colors.textMuted}>
              {isMember
                ? t('store.balanceMember')
                : t('store.balanceHint', { count: Math.floor(wallet.shells / shellCosts.textMessage) })}
            </Txt>
          </View>
          <Button
            label={t('common.free')}
            size="sm"
            variant="secondary"
            left={<Ionicons name="gift-outline" size={15} color={colors.text} />}
            onPress={() => router.push('/gifts')}
          />
        </View>

        <SectionLabel tone="title" title={t('store.choose')} style={styles.chooseLabel} />
        <View style={styles.packs} accessibilityRole="radiogroup">
          {offers.map((offer) => (
            <PackCard
              key={offer.pack.id}
              offer={offer}
              selected={offer.pack.id === selected.pack.id}
              onSelect={() => setSelectedId(offer.pack.id)}
            />
          ))}
        </View>

        <SectionLabel
          tone="title"
          title={t('store.membership')}
          right={
            isMember && wallet.memberUntil ? (
              <Txt variant="caption" color={colors.bondText}>
                {t('store.memberUntil', { date: shortDate(wallet.memberUntil) })}
              </Txt>
            ) : null
          }
        />
        <View style={styles.plans}>
          {membershipPlans.map((plan) => {
            const active = isMember && wallet.memberPlan === plan.id;
            return (
              <Card key={plan.id} variant="outlined" style={[styles.plan, plan.highlight && styles.planHighlight]}>
                <View style={styles.planHead}>
                  <Txt variant="title" style={styles.flex}>
                    {t(`store.plans.${plan.id}`)}
                  </Txt>
                  <Txt variant="bodyStrong">{plan.price}</Txt>
                  <Txt variant="caption" color={colors.textMuted}>
                    {t(`store.periods.${plan.id}`)}
                  </Txt>
                </View>
                {plan.perks.map((perk) => (
                  <View key={perk} style={styles.perk}>
                    <Ionicons name="checkmark" size={15} color={colors.textSecondary} />
                    <Txt variant="small" color={colors.textSecondary}>
                      {t(`store.perks.${perk}`)}
                    </Txt>
                  </View>
                ))}
                <Button
                  label={active ? t('store.active') : t('store.subscribe')}
                  variant="secondary"
                  size="sm"
                  disabled={active}
                  onPress={() => join(plan.id)}
                  style={styles.planButton}
                />
              </Card>
            );
          })}
        </View>

        <SectionLabel tone="title" title={t('store.costs')} />
        <CostRow label={t('store.costTextMessage')} value={isMember ? 0 : shellCosts.textMessage} />
        <CostRow label={t('store.costListen')} value={shellCosts.voiceReply} />
        <CostRow label={t('store.costCall')} value={shellCosts.callPerMinute} />
        <CostRow label={t('store.costSecretNote')} value={shellCosts.secretNote} />
        <CostRow label={t('store.costPhotoBooth')} value={shellCosts.photoBooth} />
        <CostRow label={t('store.costVoiceClone')} value={shellCosts.characterVoiceClone} />

        <Button label={t('store.restore')} variant="ghost" full style={styles.restore} />
      </ScrollView>

      <View style={[styles.buyBar, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        <Button
          label={t('store.buy', { amount: selected.total.toLocaleString('en-US'), price: selected.pack.price })}
          size="lg"
          full
          onPress={() => buy(selected)}
        />
        <Txt variant="caption" color={colors.textMuted} center>
          {t(Platform.OS === 'ios' ? 'store.paidApple' : 'store.paidGoogle')}
        </Txt>
      </View>

      <Sheet visible={!!success} onClose={() => setSuccess(null)} center>
        <View style={styles.success}>
          <Anim name="confetti" size={200} loop={false} style={styles.confetti} />
          {success?.kind === 'plan' ? (
            <>
              <Icon3D name="crown" size={84} />
              <Txt variant="h3" center>
                {t('store.welcomeMember', { plan: t(`store.plans.${success.plan}`) })}
              </Txt>
            </>
          ) : (
            <>
              <Icon3D name="shell" size={84} />
              <Txt variant="display" color={palette.shellText} center>
                {t('store.purchased', { count: success?.kind === 'pack' ? success.amount : 0 })}
              </Txt>
            </>
          )}
          <Button label={t('common.done')} onPress={() => setSuccess(null)} full />
        </View>
      </Sheet>
    </Screen>
  );
}

function PackCard({ offer, selected, onSelect }: { offer: PackOffer; selected: boolean; onSelect: () => void }) {
  const { t } = useTranslation();
  const { pack, total, saving, per100, bestValue, stack } = offer;

  const tag = bestValue
    ? { label: t('store.bestValue', { percent: saving }), style: styles.tagInk, color: colors.textOnPrimary }
    : pack.popular
      ? { label: t('store.popular'), style: styles.tagPrimary, color: colors.textOnPrimary }
      : saving > 0
        ? { label: t('store.save', { percent: saving }), style: styles.tagSoft, color: colors.textSecondary }
        : null;

  const detail = pack.bonus > 0 ? null : t('store.topUp');
  const popularSaving = pack.popular && !bestValue && saving > 0 ? ` · ${t('store.saveLower', { percent: saving })}` : '';

  return (
    <PressableScale
      onPress={onSelect}
      scaleTo={0.985}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      // react-native-web reads the ARIA prop; native reads accessibilityState.
      aria-checked={selected}
      accessibilityLabel={`${t('store.shellCount', { amount: total.toLocaleString('en-US') })}, ${pack.price}${tag ? `, ${tag.label}` : ''}`}
      style={[styles.pack, tag && styles.packTagged, selected && styles.packSelected]}>
      {tag ? (
        <View style={[styles.tag, tag.style]}>
          <Txt variant="tiny" color={tag.color}>
            {tag.label}
          </Txt>
        </View>
      ) : null}

      <ShellStack count={stack} selected={selected} />

      <View style={styles.flex}>
        <View style={styles.amount}>
          <Txt variant="figure">{total.toLocaleString('en-US')}</Txt>
          <Txt variant="small" color={colors.textMuted}>
            {t('store.shellsUnit')}
          </Txt>
        </View>
        <Txt variant="caption" color={colors.textMuted} lines={1}>
          {detail ?? (
            <>
              {pack.shells.toLocaleString('en-US')} +{' '}
              <Txt variant="caption" color={colors.bondText}>
                {t('store.bonusFree', { count: pack.bonus })}
              </Txt>
              {popularSaving}
            </>
          )}
        </Txt>
      </View>

      <View style={styles.price}>
        <Txt variant="bodyStrong">{pack.price}</Txt>
        <Txt variant="caption" color={colors.textMuted}>
          {t('store.per100', { price: usd.format(per100) })}
        </Txt>
      </View>
    </PressableScale>
  );
}

/** The currency mark, stacked 1–3 deep; the selected pack wears an apricot check. */
function ShellStack({ count, selected }: { count: number; selected: boolean }) {
  const layout = STACKS[count] ?? STACKS[1];
  return (
    <View style={styles.stack}>
      {layout.map((pos, i) => (
        <ShellIcon key={i} size={32} style={[styles.stackShell, pos]} />
      ))}
      {selected ? (
        <View style={styles.check}>
          <Ionicons name="checkmark" size={11} color={colors.textOnPrimary} />
        </View>
      ) : null}
    </View>
  );
}

const STACKS: Record<number, { left: number; top: number }[]> = {
  1: [{ left: 9, top: 6 }],
  2: [
    { left: 3, top: 9 },
    { left: 14, top: 3 },
  ],
  3: [
    { left: 0, top: 11 },
    { left: 9, top: 2 },
    { left: 18, top: 11 },
  ],
};

function CostRow({ label, value }: { label: string; value: number }) {
  const { t } = useTranslation();
  return (
    <ListRow
      title={label}
      meta={value === 0 ? t('common.free') : t('chat.shellCost', { count: value })}
      style={styles.costRow}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: space.xl },
  balance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  chooseLabel: { paddingBottom: space.lg },
  packs: { paddingHorizontal: space.lg, gap: space.md },
  pack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md + 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  // A tagged card leaves room for the tag that sits on its top edge.
  packTagged: { marginTop: space.sm },
  packSelected: { borderWidth: 2, borderColor: colors.primary, padding: space.md },
  tag: {
    position: 'absolute',
    top: -10,
    left: space.md,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  tagInk: { backgroundColor: colors.text },
  tagPrimary: { backgroundColor: colors.primary },
  tagSoft: { backgroundColor: colors.surfaceAlt },
  stack: { width: 52, height: 46 },
  stackShell: { position: 'absolute' },
  check: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amount: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs },
  price: { alignItems: 'flex-end' },
  plans: { paddingHorizontal: space.lg, gap: space.md },
  plan: { gap: space.sm },
  planHighlight: { borderWidth: 1.5, borderColor: colors.text },
  planHead: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs },
  perk: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  planButton: { marginTop: space.xs },
  costRow: { minHeight: 48 },
  restore: { marginHorizontal: space.lg, marginTop: space.xl, alignSelf: 'auto' },
  buyBar: {
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  success: { alignItems: 'center', gap: space.md },
  confetti: { position: 'absolute', top: -50 },
});
