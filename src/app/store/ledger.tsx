import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import type { Ionicons } from '@expo/vector-icons';
import type { SFSymbol } from 'sf-symbols-typescript';

import { planDate, wholeMinutes } from '@/components/plans/copy';
import {
  CharacterAvatar,
  EmptyState,
  GlassBar,
  LargeTitle,
  moduleTile,
  Screen,
  SFIcon,
  ShellIcon,
  SystemSegmented,
  Txt,
  useScrolledPast,
} from '@/components/ui';
import { callClock, clockTime, shortName } from '@/lib/format';
import { dayKey, todayKey } from '@/mock';
import { minutesOf, useAppStore } from '@/store/use-app-store';
import { colors, isDark, moduleFills, space } from '@/theme';
import type { Character, LedgerEntry, LedgerReason } from '@/types';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** Paid-per-message lines that fold into one row per friend and day. */
const FOLDED: LedgerReason[] = ['chat', 'voice', 'photo'];

const LEAD = 36;
/** Money in reads green, as in Wallet; dark text-safe shades of systemGreen. */
const CREDIT = isDark ? '#30D158' : '#248A3D';
const CALLS = isDark ? '#30D158' : '#34C759';
const RING = 52;
const RING_STROKE = 7;
const RING_R = (RING - RING_STROKE) / 2;
const RING_C = 2 * Math.PI * RING_R;

interface Row {
  key: string;
  reason: LedgerReason;
  amount: number;
  /** How many entries this row stands for */
  count: number;
  at: string;
  characterId?: string;
}

/**
 * Every shell in and out, newest first, in the iOS look on the grouped ground (a long list, so
 * no aurora; 2026-10-22, coded at the owner's word): a large title, Shells / Call time, a card
 * with what is left, then one inset group per day. Consecutive messages to one friend on one
 * day read as one line ("Chat with Kai · 12 messages -12") instead of a wall of -1s, and
 * expired free shells are named for what they are.
 */
export default function LedgerScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { scrolled, onScroll } = useScrolledPast(40);
  const ledger = useAppStore((s) => s.ledger);
  const characters = useAppStore((s) => s.characters);
  const free = useAppStore((s) => s.wallet.free);
  const wallet = useAppStore((s) => s.wallet);
  const calls = minutesOf(wallet, 'call');
  const [tab, setTab] = useState<'shells' | 'seconds'>('shells');
  const expireFreeShells = useAppStore((s) => s.expireFreeShells);

  // A screen left open past midnight should show the expiry line.
  useFocusEffect(useCallback(() => expireFreeShells(), [expireFreeShells]));

  const byId = useMemo(() => new Map(characters.map((c) => [c.id, c])), [characters]);
  const sections = useMemo(
    () => groupByDay(fold(ledger.filter((e) => (e.unit ?? 'shells') === tab))),
    [ledger, tab],
  );
  const freeToday = free && free.day === todayKey() ? free.amount : 0;

  const dayTitle = (key: string) => {
    if (key === todayKey()) return t('ledger.today');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (key === dayKey(yesterday)) return t('ledger.yesterday');
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(i18n.language, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const title = (row: Row, character?: Character) => {
    const name = character ? shortName(character.name) : t('ledger.reason.someone');
    return t(`ledger.reason.${row.reason}`, { name });
  };

  const share = calls.planTotal > 0 ? Math.max(0, Math.min(1, calls.plan / calls.planTotal)) : 0;

  return (
    <Screen background={colors.bg}>
      <GlassBar title={t('ledger.title')} scrolled={scrolled} />
      <SectionList
        sections={sections}
        keyExtractor={(row) => row.key}
        stickySectionHeadersEnabled={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}
        ListHeaderComponent={
          <>
            <LargeTitle>{t('ledger.title')}</LargeTitle>
            <SystemSegmented
              options={[
                { value: 'shells', label: t('ledger.tabShells') },
                { value: 'seconds', label: t('ledger.tabCalls') },
              ]}
              value={tab}
              onChange={(v: 'shells' | 'seconds') => setTab(v)}
              style={styles.tabs}
            />
            {tab === 'shells' ? (
              <View style={styles.summary}>
                <ShellIcon size={44} />
                <View style={styles.flex}>
                  <Txt style={styles.summaryTitle}>
                    {freeToday > 0 ? t('ledger.freeLeft', { count: freeToday }) : t('ledger.freeNone')}
                  </Txt>
                  <Txt style={styles.summaryNote}>{t('ledger.rule')}</Txt>
                </View>
              </View>
            ) : calls.planTotal > 0 ? (
              <View style={styles.summary}>
                <View style={styles.ring} accessible accessibilityLabel={t('plans.left', { left: wholeMinutes(calls.plan), total: wholeMinutes(calls.planTotal) })}>
                  <Svg width={RING} height={RING} style={styles.ringSvg}>
                    <Circle cx={RING / 2} cy={RING / 2} r={RING_R} fill="none" stroke={CALLS} strokeOpacity={0.18} strokeWidth={RING_STROKE} />
                    {share > 0 ? (
                      <Circle
                        cx={RING / 2}
                        cy={RING / 2}
                        r={RING_R}
                        fill="none"
                        stroke={CALLS}
                        strokeWidth={RING_STROKE}
                        strokeLinecap="round"
                        strokeDasharray={`${RING_C * share} ${RING_C}`}
                      />
                    ) : null}
                  </Svg>
                  <SFIcon ios="phone.fill" icon="call" size={18} color={CALLS} />
                </View>
                <View style={styles.flex}>
                  <Txt style={styles.summaryTitle}>
                    {t('plans.left', { left: wholeMinutes(calls.plan), total: wholeMinutes(calls.planTotal) })}
                  </Txt>
                  {calls.resetsAt ? <Txt style={styles.summaryNote}>{t('ledger.resets', { date: planDate(calls.resetsAt) })}</Txt> : null}
                </View>
              </View>
            ) : (
              <View style={styles.summary}>
                <ReasonTile reason="call" />
                <View style={styles.flex}>
                  <Txt style={styles.summaryTitle}>{t('ledger.callLeft', { time: callClock(calls.total) })}</Txt>
                  <Txt style={styles.summaryNote}>{t('ledger.callRule')}</Txt>
                </View>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <EmptyState
            title={tab === 'shells' ? t('ledger.empty') : t('ledger.emptyCalls')}
            // The hint is about shells; the call tab keeps just its title.
            hint={tab === 'shells' ? t('ledger.emptyHint') : undefined}
            compact
          />
        }
        ListFooterComponent={sections.length ? <Txt style={styles.footer}>{t('ledger.footer')}</Txt> : undefined}
        renderSectionHeader={({ section }) => (
          <Txt style={styles.day} accessibilityRole="header">
            {dayTitle(section.key)}
          </Txt>
        )}
        renderItem={({ item: row, index, section }) => {
          const character = row.characterId ? byId.get(row.characterId) : undefined;
          const credit = row.amount > 0;
          const first = index === 0;
          const last = index === section.data.length - 1;
          return (
            <View style={[styles.row, first && styles.rowFirst, last && styles.rowLast]}>
              {character ? <CharacterAvatar character={character} size={LEAD} /> : <ReasonTile reason={row.reason} />}
              <View style={styles.body}>
                <Txt style={styles.rowTitle} lines={1}>
                  {title(row, character)}
                </Txt>
                <Txt style={styles.rowMeta}>
                  {row.count > 1 ? `${t('ledger.messages', { count: row.count })} · ${clockTime(row.at)}` : clockTime(row.at)}
                </Txt>
              </View>
              <View style={styles.amount}>
                <Txt style={[styles.amountText, credit && { color: CREDIT }]}>
                  {tab === 'seconds'
                    ? `${credit ? '+' : '-'}${callClock(Math.abs(row.amount))}`
                    : credit
                      ? `+${row.amount}`
                      : `${row.amount}`}
                </Txt>
                {tab === 'shells' ? <ShellIcon size={16} /> : null}
              </View>
              {last ? null : <View style={styles.line} />}
            </View>
          );
        }}
      />
    </Screen>
  );
}

/**
 * What each line is about, as a Settings-style tile: a white glyph on an iOS system colour. A line
 * about a module wears that module's colour and glyph (`moduleTile`), as on Today.
 */
const REASON: Record<LedgerReason, { fill: string; ios: SFSymbol; icon: IoniconName }> = {
  welcome: { fill: moduleFills.store, ios: 'sparkles', icon: 'sparkles' },
  plan: { fill: '#AF52DE', ios: 'crown.fill', icon: 'diamond' },
  daily: { fill: '#FF3B30', ios: 'calendar', icon: 'calendar' },
  expired: { fill: '#8E8E93', ios: 'moon.fill', icon: 'moon' },
  ad: { fill: '#5856D6', ios: 'play.fill', icon: 'play' },
  spin: moduleTile('gifts'),
  purchase: moduleTile('store'),
  chat: { fill: moduleFills.store, ios: 'bubble.left.fill', icon: 'chatbubble' },
  voice: { fill: '#FF2D55', ios: 'waveform', icon: 'pulse' },
  photo: { fill: moduleFills.photo, ios: 'photo.fill', icon: 'image' },
  note: moduleTile('note'),
  board: moduleTile('board'),
  invite: { fill: '#34C759', ios: 'person.badge.plus', icon: 'person-add' },
  share: { fill: '#007AFF', ios: 'square.and.arrow.up', icon: 'share' },
  date: moduleTile('date'),
  photoBooth: moduleTile('photo'),
  voiceClone: { fill: '#5856D6', ios: 'mic.fill', icon: 'mic' },
  trial: moduleTile('calls'),
  membership: { fill: '#AF52DE', ios: 'phone.fill', icon: 'call' },
  call: moduleTile('calls'),
  topUp: { fill: '#34C759', ios: 'plus', icon: 'add' },
  radio: moduleTile('radio'),
  other: { fill: '#8E8E93', ios: 'ellipsis', icon: 'ellipsis-horizontal' },
};

function ReasonTile({ reason }: { reason: LedgerReason }) {
  const look = REASON[reason];
  return (
    <View style={[styles.tile, { backgroundColor: look.fill }]}>
      <SFIcon ios={look.ios} icon={look.icon} size={18} color="#FFFFFF" />
    </View>
  );
}

/** Newest first; runs of the same paid message to the same friend on one day merge. */
function fold(ledger: LedgerEntry[]): Row[] {
  const rows: Row[] = [];
  for (const e of ledger) {
    const prev = rows[rows.length - 1];
    if (
      prev &&
      FOLDED.includes(e.reason) &&
      prev.reason === e.reason &&
      prev.characterId === e.characterId &&
      dayKey(prev.at) === dayKey(e.at)
    ) {
      prev.amount += e.amount;
      prev.count += 1;
      continue;
    }
    rows.push({ key: e.id, reason: e.reason, amount: e.amount, count: 1, at: e.at, characterId: e.characterId });
  }
  return rows;
}

function groupByDay(rows: Row[]) {
  const sections: { key: string; data: Row[] }[] = [];
  for (const row of rows) {
    const key = dayKey(row.at);
    const last = sections[sections.length - 1];
    if (last && last.key === key) last.data.push(row);
    else sections.push({ key, data: [row] });
  }
  return sections;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { marginTop: 12, marginHorizontal: space.lg },
  // One card on top: what is left today (shells) or this period (calls).
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 22,
    marginHorizontal: space.lg,
    padding: space.lg,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  summaryTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.4, color: colors.text, fontVariant: ['tabular-nums'] },
  summaryNote: { marginTop: 2, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  ring: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  // The arc starts at 12 o'clock, as Fitness draws it.
  ringSvg: { position: 'absolute', transform: [{ rotate: '-90deg' }] },
  day: {
    marginTop: 22,
    marginBottom: 6,
    marginHorizontal: space.lg * 2,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: space.lg,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
  },
  rowFirst: { borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  rowLast: { borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  line: {
    position: 'absolute',
    left: 14 + LEAD + 12,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderStrong,
  },
  tile: { width: LEAD, height: LEAD, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0, gap: 2, paddingVertical: 10 },
  rowTitle: { fontSize: 17, lineHeight: 22, letterSpacing: -0.4, color: colors.text },
  rowMeta: { fontSize: 13, color: colors.textSecondary },
  amount: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  amountText: { fontSize: 17, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  footer: { marginTop: 22, textAlign: 'center', fontSize: 13, color: colors.textSecondary },
});
