import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlanPicker } from '@/components/plans/plan-picker';
import {
  Anim,
  Button,
  Header,
  Icon3D,
  IconButton,
  ListRow,
  PressableScale,
  Screen,
  SectionLabel,
  Segmented,
  Sheet,
  ShellIcon,
  Txt,
} from '@/components/ui';
import { TRIAL } from '@/economy/plans';
import { shellCosts, shellPacks, STARTER_PACK } from '@/mock';
import { memberActive, useAppStore } from '@/store/use-app-store';
import { colors, palette, radius, space } from '@/theme';
import type { PlanId, ShellPack } from '@/types';

type Success = { kind: 'pack'; amount: number } | { kind: 'plan'; plan: PlanId; trial: boolean };
type Tab = 'plans' | 'shells';

const PLAN_IDS: readonly string[] = ['basic', 'quarterly', 'annual', 'pro'];

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

/**
 * The store: Plans (minutes for calls and voice replies, unlimited chat) and Shells
 * (packs for pay-as-you-go chat). `?tab=shells` opens on packs, `?plan=pro` picks a plan.
 */
export default function StoreScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string; plan?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'shells' ? 'shells' : 'plans');
  const initialPlan = PLAN_IDS.includes(params.plan ?? '') ? (params.plan as PlanId) : undefined;
  const [success, setSuccess] = useState<Success | null>(null);
  const [restored, setRestored] = useState(false);

  // Real builds ask StoreKit / Play Billing and the server; the mock has nothing to bring back.
  const restore = () => setRestored(true);

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
      <Segmented
        options={[
          { value: 'plans', label: t('plans.tabPlans') },
          { value: 'shells', label: t('plans.tabShells') },
        ]}
        value={tab}
        onChange={setTab}
        style={styles.tabs}
      />

      {tab === 'plans' ? (
        <PlanPicker
          initialPlan={initialPlan}
          onRestore={restore}
          onBought={({ plan, trial }) => setSuccess({ kind: 'plan', plan, trial })}
        />
      ) : (
        <ShellsTab onBought={(amount) => setSuccess({ kind: 'pack', amount })} onRestore={restore} />
      )}

      <Sheet visible={!!success} onClose={() => setSuccess(null)} center>
        <View style={styles.success}>
          <Anim name="confetti" size={200} loop={false} style={styles.confetti} />
          {success?.kind === 'plan' ? (
            <>
              <Icon3D name="crown" size={84} />
              <Txt variant="h3" center>
                {success.trial
                  ? t('plans.trialStarted', { plan: t(`plans.name.${success.plan}`), count: TRIAL.days })
                  : t('plans.welcome', { plan: t(`plans.name.${success.plan}`) })}
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

      <Sheet visible={restored} onClose={() => setRestored(false)} center>
        <View style={styles.success}>
          <Txt variant="title" center>
            {t('plans.restored')}
          </Txt>
          <Button label={t('common.done')} onPress={() => setRestored(false)} full />
        </View>
      </Sheet>
    </Screen>
  );
}

function ShellsTab({ onBought, onRestore }: { onBought: (amount: number) => void; onRestore: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const wallet = useAppStore((s) => s.wallet);
  const addShells = useAppStore((s) => s.addShells);

  const offers = useMemo(() => buildOffers(shellPacks), []);
  // Before the first purchase a small starter pack leads, on its own (see STARTER_PACK).
  const starter: PackOffer | null = wallet.boughtShells
    ? null
    : {
        pack: STARTER_PACK,
        total: STARTER_PACK.shells,
        saving: 0,
        per100: (STARTER_PACK.amount / STARTER_PACK.shells) * 100,
        bestValue: false,
        stack: 1,
      };
  const popularId = (shellPacks.find((p) => p.popular) ?? shellPacks[0]).id;
  const [selectedId, setSelectedId] = useState(() => (wallet.boughtShells ? popularId : STARTER_PACK.id));

  const isMember = memberActive(wallet);
  const all = starter ? [starter, ...offers] : offers;
  const selected = all.find((o) => o.pack.id === selectedId) ?? offers.find((o) => o.pack.id === popularId) ?? offers[0];

  const buy = (offer: PackOffer) => {
    // Real builds hand off to StoreKit / Play Billing and credit after the server checks the receipt.
    addShells(offer.total);
    if (offer.pack.id === STARTER_PACK.id) setSelectedId(popularId);
    onBought(offer.total);
  };

  return (
    <>
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
          {starter ? (
            <PackCard
              offer={starter}
              starter
              selected={selected.pack.id === STARTER_PACK.id}
              onSelect={() => setSelectedId(STARTER_PACK.id)}
            />
          ) : null}
          {offers.map((offer) => (
            <PackCard
              key={offer.pack.id}
              offer={offer}
              selected={offer.pack.id === selected.pack.id}
              onSelect={() => setSelectedId(offer.pack.id)}
            />
          ))}
        </View>

        <SectionLabel tone="title" title={t('store.costs')} />
        <CostRow
          label={t('store.costTextMessage')}
          meta={isMember ? t('common.free') : t('chat.shellCost', { count: shellCosts.textMessage })}
        />
        <CostRow label={t('store.costListen')} meta={t('store.withPlan')} />
        <CostRow label={t('store.costCall')} meta={t('store.withPlan')} />
        <CostRow label={t('store.costSecretNote')} meta={t('chat.shellCost', { count: shellCosts.secretNote })} />
        <CostRow label={t('store.costPhotoBooth')} meta={t('chat.shellCost', { count: shellCosts.photoBooth })} />
        <CostRow
          label={t('store.costVoiceClone')}
          meta={t('chat.shellCost', { count: shellCosts.characterVoiceClone })}
        />

        <Button label={t('store.restore')} variant="ghost" full style={styles.restore} onPress={onRestore} />
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
    </>
  );
}

function PackCard({
  offer,
  selected,
  onSelect,
  starter = false,
}: {
  offer: PackOffer;
  selected: boolean;
  onSelect: () => void;
  /** The one-time starter pack: its own tag and line, no savings maths. */
  starter?: boolean;
}) {
  const { t } = useTranslation();
  const { pack, total, saving, per100, bestValue, stack } = offer;

  const tag = starter
    ? { label: t('store.starter'), style: styles.tagPrimary, color: colors.textOnPrimary }
    : bestValue
    ? { label: t('store.bestValue', { percent: saving }), style: styles.tagInk, color: colors.textOnPrimary }
    : pack.popular
      ? { label: t('store.popular'), style: styles.tagPrimary, color: colors.textOnPrimary }
      : saving > 0
        ? { label: t('store.save', { percent: saving }), style: styles.tagSoft, color: colors.textSecondary }
        : null;

  const detail = starter ? t('store.starterDetail') : pack.bonus > 0 ? null : t('store.topUp');
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

function CostRow({ label, meta }: { label: string; meta: string }) {
  return <ListRow title={label} meta={meta} style={styles.costRow} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { marginHorizontal: space.lg, marginTop: space.xxs },
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
