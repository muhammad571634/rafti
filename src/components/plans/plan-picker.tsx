import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { MODULE_GLYPH, PressableScale, SFIcon, ShellIcon, Txt } from '@/components/ui';
import { planStatus, PLANS, TRIAL } from '@/economy/plans';
import { useAppStore } from '@/store/use-app-store';
import { aurora, colors, moduleFills, space } from '@/theme';
import type { PlanId } from '@/types';

import { perMonth, savingVsMonthly, storeName } from './copy';
import {
  BUY_BAR_SPACE,
  CARD_SHADOW,
  GroupLabel,
  IconTile,
  ProGradient,
  Radio,
  STORE,
  StoreBuyBar,
} from './store-look';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** Prices last, Pro yearly first: it carries the free days. */
const PLAN_ROWS: PlanId[] = ['proAnnual', 'pro', 'basic'];
const COLUMN = 64;
const GUTTER = 16;

const count = new Intl.NumberFormat('en-US');

export interface PlanBought {
  plan: PlanId;
  trial: boolean;
}

/** "3 h" or "45 min": short enough for a tile or a table cell. */
function shortTime(t: TFunction, seconds: number) {
  if (seconds >= 3600) return t('plans.hoursShort', { count: Math.round(seconds / 360) / 10 });
  return t('plans.minutes', { count: Math.round(seconds / 60) });
}

/** A comparison cell: a value, `true` for a check, `false` for a lock. */
type Cell = string | boolean;

interface CompareRow {
  key: string;
  fill: string;
  glyph: { ios: SFSymbol; icon: IoniconName } | 'shell';
  basic: Cell;
  pro: Cell;
}

/**
 * The Plans tab (canvas "Store: Plans and Shells", owner's order 2026-10-22): what Pro gives
 * comes first, as a bright Pro card and a Basic / Pro table where Basic's gaps show as locks;
 * the prices come last, just above the buy button. Every figure is from `src/economy/plans.ts`,
 * and the table only shows real differences (both plans run the same model, so it says nothing
 * about the model).
 */
export function PlanPicker({
  header,
  initialPlan,
  onBought,
  onRestore,
}: {
  /** The store's title and tabs, scrolled with the content. */
  header: React.ReactNode;
  initialPlan?: PlanId;
  onBought: (bought: PlanBought) => void;
  onRestore: () => void;
}) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const wallet = useAppStore((s) => s.wallet);
  const subscribe = useAppStore((s) => s.subscribe);

  const current = planStatus(wallet.subscription, Date.now());
  const [selected, setSelected] = useState<PlanId>(
    initialPlan ?? (current && !current.trial ? current.plan : TRIAL.plan),
  );

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

  const pro = PLANS.proAnnual;
  const basic = PLANS.basic;
  const time = (seconds: number): Cell => (seconds > 0 ? shortTime(t, seconds) : false);

  const tiles: { key: string; value: string; label: string; glyph: CompareRow['glyph'] }[] = [
    { key: 'calls', value: shortTime(t, pro.callSeconds), label: t('plans.compare.calls'), glyph: { ios: 'phone.fill', icon: 'call' } },
    { key: 'voice', value: shortTime(t, pro.voiceSeconds), label: t('plans.compare.voice'), glyph: { ios: 'waveform', icon: 'pulse' } },
    { key: 'photos', value: String(pro.photos), label: t('plans.compare.photos'), glyph: { ios: 'camera.fill', icon: 'camera' } },
    { key: 'shells', value: count.format(pro.shells), label: t('plans.compare.shells'), glyph: 'shell' },
  ];

  const rows: CompareRow[] = [
    { key: 'shells', fill: '#FF9500', glyph: 'shell', basic: count.format(basic.shells), pro: count.format(pro.shells) },
    { key: 'calls', fill: moduleFills.calls, glyph: MODULE_GLYPH.calls, basic: time(basic.callSeconds), pro: time(pro.callSeconds) },
    { key: 'voice', fill: '#FF2D55', glyph: { ios: 'waveform', icon: 'pulse' }, basic: time(basic.voiceSeconds), pro: time(pro.voiceSeconds) },
    {
      key: 'photos',
      fill: moduleFills.photo,
      glyph: MODULE_GLYPH.photo,
      basic: basic.photos > 0 ? String(basic.photos) : false,
      pro: String(pro.photos),
    },
    { key: 'bedtime', fill: moduleFills.sleep, glyph: MODULE_GLYPH.sleep, basic: false, pro: true },
    { key: 'characters', fill: '#AF52DE', glyph: { ios: 'sparkles', icon: 'sparkles' }, basic: false, pro: true },
    { key: 'memory', fill: '#8E8E93', glyph: { ios: 'bookmark.fill', icon: 'bookmark' }, basic: true, pro: true },
  ];

  // Two tiles a row inside the Pro card: the screen less both gutters, the card's padding and the gap.
  const tileWidth = (width - GUTTER * 4 - space.sm) / 2;

  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: BUY_BAR_SPACE }}>
        {header}

        <ProGradient style={styles.proCard}>
          <View style={styles.proGlow} pointerEvents="none" />
          <View style={styles.proHead}>
            <View style={styles.crown}>
              <SFIcon ios="crown.fill" icon="diamond" size={21} color="#FFFFFF" />
            </View>
            <Txt style={styles.proTitle} accessibilityRole="header">
              {t('plans.name.pro')}
            </Txt>
            {trialOffer ? (
              <View style={styles.freePill}>
                <Txt style={styles.freePillText}>{t('plans.freeDays', { count: TRIAL.days })}</Txt>
              </View>
            ) : null}
          </View>
          <View style={styles.tiles}>
            {tiles.map((tile) => (
              <View key={tile.key} style={[styles.proTile, { width: tileWidth }]} accessible accessibilityLabel={`${tile.value} ${tile.label}`}>
                <Txt style={styles.proTileValue} lines={1}>
                  {tile.value}
                </Txt>
                <View style={styles.proTileLabel}>
                  <Glyph glyph={tile.glyph} size={14} />
                  <Txt style={styles.proTileText} lines={1}>
                    {tile.label}
                  </Txt>
                </View>
              </View>
            ))}
          </View>
        </ProGradient>

        <View style={styles.card}>
          <View style={styles.tableHead}>
            <View style={styles.flex} />
            <Txt style={styles.basicHead}>{t('plans.name.basic')}</Txt>
            <View style={styles.column}>
              <ProGradient style={styles.proHeadPill}>
                <Txt style={styles.proHeadText}>{t('plans.name.pro')}</Txt>
              </ProGradient>
            </View>
          </View>
          {rows.map((row, i) => (
            <View key={row.key} style={[styles.tableRow, i < rows.length - 1 && styles.line]}>
              <View style={styles.tableTitle}>
                <IconTile fill={row.fill} size={28}>
                  <Glyph glyph={row.glyph} size={16} />
                </IconTile>
                <Txt style={styles.rowTitle} lines={2}>
                  {t(`plans.compare.${row.key}`)}
                </Txt>
              </View>
              <CellView cell={row.basic} plan={t('plans.name.basic')} />
              <CellView cell={row.pro} plan={t('plans.name.pro')} pro />
            </View>
          ))}
        </View>

        <GroupLabel>{t('plans.choose')}</GroupLabel>
        <View style={styles.card} accessibilityRole="radiogroup">
          {PLAN_ROWS.map((id, i) => {
            const on = id === selected;
            const sub =
              id === 'proAnnual'
                ? t('plans.perMonthSave', { price: perMonth(id), percent: savingVsMonthly(id, 'pro') })
                : id === 'pro'
                  ? t('plans.proLine')
                  : t('plans.chatOnly');
            const badge = id === TRIAL.plan && trialOffer ? t('plans.freeDays', { count: TRIAL.days }) : null;
            return (
              <PressableScale
                key={id}
                onPress={() => setSelected(id)}
                scaleTo={0.985}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                aria-checked={on}
                accessibilityLabel={`${t(`plans.row.${id}`)}, ${PLANS[id].price} ${t(`plans.per.${id}`)}, ${sub}`}
                style={styles.planRow}>
                <Radio on={on} fill={id === 'basic' ? 'grey' : 'pro'} />
                <View style={styles.planBody}>
                  <View style={styles.planName}>
                    <Txt style={styles.planNameText}>{t(`plans.row.${id}`)}</Txt>
                    {badge ? (
                      <View style={styles.badge}>
                        <Txt style={styles.badgeText}>{badge}</Txt>
                      </View>
                    ) : null}
                  </View>
                  <Txt style={styles.muted13}>{sub}</Txt>
                </View>
                <View style={styles.price}>
                  <Txt style={styles.priceText}>{PLANS[id].price}</Txt>
                  <Txt style={styles.muted13}>{t(`plans.per.${id}`)}</Txt>
                </View>
                {i < PLAN_ROWS.length - 1 ? <View style={styles.planLine} /> : null}
              </PressableScale>
            );
          })}
        </View>

        <Txt style={styles.renew}>{t('plans.renewNote', { store: storeName(t) })}</Txt>
        <View style={styles.links}>
          <TextLink label={t('plans.restore')} onPress={onRestore} />
          {/* Terms and Privacy open the hosted pages once they are live (same as Profile). */}
          <TextLink label={t('plans.terms')} />
          <TextLink label={t('plans.privacy')} />
        </View>
      </ScrollView>

      <StoreBuyBar label={cta.label} caption={cta.caption} disabled={isCurrent} onPress={buy} />
    </>
  );
}

/** A white glyph: an SF Symbol (Ionicons off iPhone), or the shell drawn as a white silhouette. */
function Glyph({ glyph, size }: { glyph: CompareRow['glyph']; size: number }) {
  if (glyph === 'shell') return <ShellIcon size={size} tintColor="#FFFFFF" />;
  return <SFIcon ios={glyph.ios} icon={glyph.icon} size={size} color="#FFFFFF" />;
}

function CellView({ cell, plan, pro = false }: { cell: Cell; plan: string; pro?: boolean }) {
  const { t } = useTranslation();
  const ink = pro ? STORE.proInk : aurora.textMuted;
  return (
    <View style={[styles.column, styles.cell, pro && styles.proColumn]}>
      {typeof cell === 'string' ? (
        <Txt style={[styles.cellText, { color: ink }, pro && styles.cellPro]} lines={1}>
          {cell}
        </Txt>
      ) : cell ? (
        <View accessible accessibilityLabel={t('plans.included', { plan })}>
          <Ionicons name="checkmark" size={19} color={ink} />
        </View>
      ) : (
        <View accessible accessibilityLabel={t('plans.notIncluded', { plan })}>
          <Ionicons name="lock-closed" size={15} color={STORE.faint} />
        </View>
      )}
    </View>
  );
}

function TextLink({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.96} hitSlop={8} accessibilityRole="link" style={styles.link}>
      <Txt style={styles.linkText}>{label}</Txt>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  proCard: {
    marginTop: 20,
    marginHorizontal: GUTTER,
    padding: GUTTER,
    paddingTop: 18,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#5B3FD9',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 14 },
  },
  // A soft light in the top corner, as on the canvas.
  proGlow: {
    position: 'absolute',
    right: -40,
    top: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  proHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  crown: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  proTitle: { flex: 1, fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: 0.2, color: '#FFFFFF' },
  freePill: { height: 26, paddingHorizontal: 10, borderRadius: 13, justifyContent: 'center', backgroundColor: '#FFFFFF' },
  freePillText: { fontSize: 13, fontWeight: '800', color: '#5B3FD9' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: 14 },
  proTile: { paddingVertical: 10, paddingHorizontal: 12, gap: 2, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.16)' },
  proTileValue: { fontSize: 24, lineHeight: 28, fontWeight: '800', color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  proTileLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  proTileText: { flexShrink: 1, fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.88)' },
  card: {
    marginHorizontal: GUTTER,
    marginTop: 22,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: aurora.card,
    ...CARD_SHADOW,
  },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GUTTER,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: aurora.separator,
  },
  basicHead: { width: COLUMN, textAlign: 'center', fontSize: 13, fontWeight: '700', color: aurora.textMuted },
  column: { width: COLUMN, alignItems: 'center', justifyContent: 'center' },
  proHeadPill: { height: 22, paddingHorizontal: 10, borderRadius: 11, justifyContent: 'center' },
  proHeadText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  tableRow: { flexDirection: 'row', alignItems: 'stretch', paddingLeft: GUTTER, paddingRight: GUTTER, minHeight: 48 },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: aurora.separator },
  tableTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  rowTitle: { flex: 1, fontSize: 16, letterSpacing: -0.3, color: colors.text },
  cell: { alignSelf: 'stretch' },
  proColumn: { backgroundColor: STORE.proColumn },
  cellText: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  cellPro: { fontWeight: '800' },
  planRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 14, paddingRight: GUTTER },
  planBody: { flex: 1, minWidth: 0, gap: 2, paddingVertical: 12 },
  planName: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  planNameText: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.4, color: colors.text },
  badge: { height: 22, paddingHorizontal: 8, borderRadius: 11, justifyContent: 'center', backgroundColor: STORE.peachSoft },
  badgeText: { fontSize: 12, fontWeight: '700', color: STORE.peachInk },
  muted13: { fontSize: 13, color: aurora.textMuted },
  price: { alignItems: 'flex-end', gap: 1 },
  priceText: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, color: colors.text, fontVariant: ['tabular-nums'] },
  planLine: {
    position: 'absolute',
    left: 50,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: aurora.separator,
  },
  renew: { marginTop: 14, marginHorizontal: space.lg * 2, fontSize: 13, lineHeight: 18, color: aurora.textMuted },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: 10, marginHorizontal: space.xl },
  link: { paddingVertical: 12, paddingHorizontal: 10 },
  linkText: { fontSize: 15, fontWeight: '600', color: colors.text },
});
