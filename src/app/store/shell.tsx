import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { PlanPicker } from '@/components/plans/plan-picker';
import {
  BUY_BAR_SPACE,
  CARD_SHADOW,
  GroupLabel,
  IconTile,
  ProPill,
  Radio,
  STORE,
  StoreBuyBar,
} from '@/components/plans/store-look';
import {
  Anim,
  AuroraGlass,
  Button,
  Icon3D,
  LargeTitle,
  moduleTile,
  PressableScale,
  Screen,
  Segmented,
  SFIcon,
  Sheet,
  ShellIcon,
  Txt,
} from '@/components/ui';
import { TRIAL } from '@/economy/plans';
import { haptic } from '@/lib/haptics';
import { shellCosts, shellPacks, STARTER_PACK } from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { aurora, colors, moduleFills, palette, space, systemColors } from '@/theme';
import type { PlanId, ShellPack } from '@/types';

type Success = { kind: 'pack'; amount: number } | { kind: 'plan'; plan: PlanId; trial: boolean };
type Tab = 'plans' | 'shells';
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const PLAN_IDS: readonly string[] = ['basic', 'pro', 'proAnnual'];

/** One pack with the value maths the picker shows: totals, savings, price per 100. */
interface PackOffer {
  pack: ShellPack;
  total: number;
  /** Percent saved per shell against the smallest pack. */
  saving: number;
  per100: number;
  bestValue: boolean;
  /** 1–3 shells drawn on the row: bigger packs look bigger. */
  stack: number;
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/**
 * Honest value framing: every price stays visible. The biggest pack anchors the list,
 * the popular one is pre-selected, and each row says what it saves per shell.
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
 * The store on the aurora (canvas "Store: Plans and Shells", 2026-10-22): Plans (what Pro gives
 * first, prices last) and Shells (packs for pay-as-you-go chat), one buy button pinned at the
 * bottom. `?tab=shells` opens on packs, `?plan=pro` picks a plan.
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

  const header = (
    <>
      <View style={styles.bar}>
        <PressableScale scaleTo={0.9} accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => router.back()}>
          <AuroraGlass style={styles.round}>
            <Ionicons name="chevron-back" size={22} color={colors.text} style={styles.backIcon} />
          </AuroraGlass>
        </PressableScale>
        <PressableScale scaleTo={0.9} accessibilityRole="button" accessibilityLabel={t('ledger.open')} onPress={() => router.push('/store/ledger')}>
          <AuroraGlass style={styles.round}>
            <SFIcon ios="clock.arrow.circlepath" icon="time-outline" size={20} color={colors.text} />
          </AuroraGlass>
        </PressableScale>
      </View>
      <LargeTitle>{t('store.title')}</LargeTitle>
      <Segmented
        tone="aurora"
        options={[
          { value: 'plans', label: t('plans.tabPlans') },
          { value: 'shells', label: t('plans.tabShells') },
        ]}
        value={tab}
        onChange={setTab}
        style={styles.tabs}
      />
    </>
  );

  return (
    <Screen background="aurora">
      {tab === 'plans' ? (
        <PlanPicker
          header={header}
          initialPlan={initialPlan}
          onRestore={restore}
          onBought={({ plan, trial }) => setSuccess({ kind: 'plan', plan, trial })}
        />
      ) : (
        <ShellsTab header={header} onBought={(amount) => setSuccess({ kind: 'pack', amount })} onRestore={restore} />
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

/** What things cost: shells for a number, a "Pro" mark for what comes only with Pro. */
const COSTS: { key: string; fill: string; ios: SFSymbol; icon: IoniconName; shells: number | null }[] = [
  { key: 'costTextMessage', fill: moduleFills.store, ios: 'bubble.left.fill', icon: 'chatbubble', shells: shellCosts.textMessage },
  { key: 'costSecretNote', ...moduleTile('note'), shells: shellCosts.secretNote },
  { key: 'costVoiceClone', fill: systemColors.indigo, ios: 'mic.fill', icon: 'mic', shells: shellCosts.characterVoiceClone },
  { key: 'costListen', fill: systemColors.pink, ios: 'waveform', icon: 'pulse', shells: null },
  { key: 'costCall', ...moduleTile('calls'), shells: null },
  { key: 'costPhotoBooth', ...moduleTile('photo'), shells: null },
];

function ShellsTab({
  header,
  onBought,
  onRestore,
}: {
  header: React.ReactNode;
  onBought: (amount: number) => void;
  onRestore: () => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();

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

  const all = starter ? [starter, ...offers] : offers;
  const selected = all.find((o) => o.pack.id === selectedId) ?? offers.find((o) => o.pack.id === popularId) ?? offers[0];

  const buy = (offer: PackOffer) => {
    // Real builds hand off to StoreKit / Play Billing and credit after the server checks the receipt.
    addShells(offer.total);
    haptic.success();
    if (offer.pack.id === STARTER_PACK.id) setSelectedId(popularId);
    onBought(offer.total);
  };

  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: BUY_BAR_SPACE }}>
        {header}

        <View style={styles.balance}>
          <ShellIcon size={44} />
          <View style={styles.balanceAmount}>
            <Txt style={styles.balanceValue}>{wallet.shells.toLocaleString('en-US')}</Txt>
            <Txt style={styles.balanceUnit}>{t('store.shellsUnit')}</Txt>
          </View>
          <PressableScale scaleTo={0.94} accessibilityRole="button" onPress={() => router.push('/gifts')} style={styles.freePill}>
            <Ionicons name="gift-outline" size={16} color={STORE.peachInk} />
            <Txt style={styles.freeText}>{t('common.free')}</Txt>
          </PressableScale>
        </View>

        <GroupLabel>{t('store.choose')}</GroupLabel>
        <View style={styles.card} accessibilityRole="radiogroup">
          {all.map((offer, i) => (
            <PackRow
              key={offer.pack.id}
              offer={offer}
              starter={offer.pack.id === STARTER_PACK.id}
              selected={offer.pack.id === selected.pack.id}
              last={i === all.length - 1}
              onSelect={() => setSelectedId(offer.pack.id)}
            />
          ))}
        </View>

        <GroupLabel>{t('store.costs')}</GroupLabel>
        <View style={styles.card}>
          {COSTS.map((cost, i) => (
            <View key={cost.key} style={[styles.costRow, i < COSTS.length - 1 && styles.costLine]}>
              <IconTile fill={cost.fill}>
                <SFIcon ios={cost.ios} icon={cost.icon} size={17} color={colors.white} />
              </IconTile>
              <Txt style={styles.costTitle} lines={1}>
                {t(`store.${cost.key}`)}
              </Txt>
              {cost.shells === null ? (
                <ProPill />
              ) : (
                <View style={styles.costShells} accessible accessibilityLabel={t('chat.shellCost', { count: cost.shells })}>
                  <Txt style={styles.costValue}>{cost.shells}</Txt>
                  <ShellIcon size={16} />
                </View>
              )}
            </View>
          ))}
        </View>

        <PressableScale onPress={onRestore} scaleTo={0.96} hitSlop={8} accessibilityRole="link" style={styles.restore}>
          <Txt style={styles.restoreText}>{t('store.restore')}</Txt>
        </PressableScale>
      </ScrollView>

      <StoreBuyBar
        label={t('store.buy', { amount: selected.total.toLocaleString('en-US'), price: selected.pack.price })}
        caption={t(Platform.OS === 'ios' ? 'store.paidApple' : 'store.paidGoogle')}
        onPress={() => buy(selected)}
      />
    </>
  );
}

function PackRow({
  offer,
  selected,
  last,
  onSelect,
  starter = false,
}: {
  offer: PackOffer;
  selected: boolean;
  last: boolean;
  onSelect: () => void;
  /** The one-time starter pack: its own tag, no savings maths. */
  starter?: boolean;
}) {
  const { t } = useTranslation();
  const { pack, total, saving, per100, bestValue, stack } = offer;

  const tag = starter
    ? { label: t('store.starter'), bg: STORE.peachSoft, ink: STORE.peachInk }
    : bestValue
      ? { label: t('store.bestValue', { percent: saving }), bg: STORE.inkTag, ink: STORE.inkTagText }
      : pack.popular
        ? {
            label: saving > 0 ? `${t('store.popular')} · ${t('store.saveLower', { percent: saving })}` : t('store.popular'),
            bg: STORE.peachSoft,
            ink: STORE.peachInk,
          }
        : saving > 0
          ? { label: t('store.save', { percent: saving }), bg: STORE.greyTag, ink: aurora.textMuted }
          : null;

  const detail =
    pack.bonus > 0
      ? `${pack.shells.toLocaleString('en-US')} + ${t('store.bonusFree', { count: pack.bonus })}`
      : t('store.shellsUnit');

  return (
    <PressableScale
      onPress={onSelect}
      scaleTo={0.985}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      // react-native-web reads the ARIA prop; native reads accessibilityState.
      aria-checked={selected}
      accessibilityLabel={`${t('store.shellCount', { amount: total.toLocaleString('en-US') })}, ${pack.price}${tag ? `, ${tag.label}` : ''}`}
      style={styles.packRow}>
      <Radio on={selected} />
      <ShellStack count={stack} />
      <View style={styles.packBody}>
        <View style={styles.packAmount}>
          <Txt style={styles.packTotal}>{total.toLocaleString('en-US')}</Txt>
          <Txt style={styles.muted13} lines={1}>
            {detail}
          </Txt>
        </View>
        {tag ? (
          <View style={[styles.tag, { backgroundColor: tag.bg }]}>
            <Txt style={[styles.tagText, { color: tag.ink }]} lines={1}>
              {tag.label}
            </Txt>
          </View>
        ) : null}
      </View>
      <View style={styles.price}>
        <Txt style={styles.priceText}>{pack.price}</Txt>
        <Txt style={styles.muted13}>{t('store.per100', { price: usd.format(per100) })}</Txt>
      </View>
      {last ? null : <View style={styles.packLine} />}
    </PressableScale>
  );
}

/** The currency mark, stacked 1–3 deep. */
function ShellStack({ count }: { count: number }) {
  const layout = STACKS[count] ?? STACKS[1];
  return (
    <View style={styles.stack} importantForAccessibility="no-hide-descendants">
      {layout.map((pos, i) => (
        <ShellIcon key={i} size={28} style={[styles.stackShell, pos]} />
      ))}
    </View>
  );
}

const STACKS: Record<number, { left: number; top: number }[]> = {
  1: [{ left: 9, top: 6 }],
  2: [
    { left: 3, top: 9 },
    { left: 15, top: 3 },
  ],
  3: [
    { left: 0, top: 11 },
    { left: 9, top: 2 },
    { left: 18, top: 11 },
  ],
};

const styles = StyleSheet.create({
  bar: {
    height: 44,
    paddingHorizontal: space.lg,
    paddingTop: space.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  backIcon: { marginLeft: -2 },
  tabs: { marginHorizontal: space.lg, marginTop: 12 },
  balance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: space.lg,
    marginTop: 22,
    padding: space.lg,
    borderRadius: 20,
    backgroundColor: aurora.card,
    ...CARD_SHADOW,
  },
  balanceAmount: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  balanceValue: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: 0.2, color: colors.text, fontVariant: ['tabular-nums'] },
  balanceUnit: { fontSize: 15, color: aurora.textMuted },
  freePill: {
    height: 36,
    paddingLeft: 12,
    paddingRight: 14,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: STORE.peachSoft,
  },
  freeText: { fontSize: 15, fontWeight: '700', color: STORE.peachInk },
  card: {
    marginHorizontal: space.lg,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: aurora.card,
    ...CARD_SHADOW,
  },
  packRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 14, paddingRight: space.lg },
  stack: { width: 46, height: 40 },
  stackShell: { position: 'absolute' },
  packBody: { flex: 1, minWidth: 0, gap: 3, paddingVertical: 12 },
  packAmount: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  packTotal: { fontSize: 20, lineHeight: 24, fontWeight: '700', letterSpacing: -0.2, color: colors.text, fontVariant: ['tabular-nums'] },
  muted13: { flexShrink: 1, fontSize: 13, color: aurora.textMuted, fontVariant: ['tabular-nums'] },
  tag: { alignSelf: 'flex-start', height: 20, paddingHorizontal: 7, borderRadius: 10, justifyContent: 'center' },
  tagText: { fontSize: 12, fontWeight: '700' },
  price: { alignItems: 'flex-end', gap: 1 },
  priceText: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, color: colors.text, fontVariant: ['tabular-nums'] },
  packLine: {
    position: 'absolute',
    left: 50,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: aurora.separator,
  },
  costRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.lg },
  costLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: aurora.separator },
  costTitle: { flex: 1, fontSize: 17, letterSpacing: -0.4, color: colors.text },
  costShells: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  costValue: { fontSize: 17, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  restore: { alignSelf: 'center', marginTop: 10, paddingVertical: 12, paddingHorizontal: 10 },
  restoreText: { fontSize: 15, fontWeight: '600', color: colors.text },
  success: { alignItems: 'center', gap: space.md },
  confetti: { position: 'absolute', top: -50 },
});
