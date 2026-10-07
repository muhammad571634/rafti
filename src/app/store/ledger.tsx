import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionList, StyleSheet, View } from 'react-native';

import { CharacterAvatar, EmptyState, Header, Icon3D, Screen, ShellIcon, Txt } from '@/components/ui';
import { clockTime, shortName } from '@/lib/format';
import { dayKey, todayKey } from '@/mock';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';
import type { Character, LedgerEntry, LedgerReason } from '@/types';

/** Paid-per-message lines that fold into one row per friend and day. */
const FOLDED: LedgerReason[] = ['chat', 'voice', 'photo'];

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
 * Every shell in and out, newest first. Consecutive messages to one friend on one
 * day read as one line ("Chat with Kai · 12 messages -12") instead of a wall of
 * -1s, and expired free shells are named for what they are.
 */
export default function LedgerScreen() {
  const { t, i18n } = useTranslation();
  const ledger = useAppStore((s) => s.ledger);
  const characters = useAppStore((s) => s.characters);
  const free = useAppStore((s) => s.wallet.free);
  const expireFreeShells = useAppStore((s) => s.expireFreeShells);

  // A screen left open past midnight should show the expiry line.
  useFocusEffect(useCallback(() => expireFreeShells(), [expireFreeShells]));

  const byId = useMemo(() => new Map(characters.map((c) => [c.id, c])), [characters]);
  const sections = useMemo(() => groupByDay(fold(ledger)), [ledger]);
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

  return (
    <Screen background={colors.bgPlain}>
      <Header title={t('ledger.title')} center />

      <SectionList
        sections={sections}
        keyExtractor={(row) => row.key}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.rule}>
            <Icon3D name="shell" size={36} />
            <View style={styles.flex}>
              <Txt variant="bodyStrong">
                {freeToday > 0 ? t('ledger.freeLeft', { count: freeToday }) : t('ledger.freeNone')}
              </Txt>
              <Txt variant="small" color={colors.textSecondary}>
                {t('ledger.rule')}
              </Txt>
            </View>
          </View>
        }
        ListEmptyComponent={<EmptyState title={t('ledger.empty')} hint={t('ledger.emptyHint')} compact />}
        ListFooterComponent={
          sections.length ? (
            <Txt variant="caption" color={colors.textMuted} center style={styles.footer}>
              {t('ledger.footer')}
            </Txt>
          ) : null
        }
        renderSectionHeader={({ section }) => (
          <Txt variant="smallStrong" color={colors.textMuted} style={styles.day}>
            {dayTitle(section.key)}
          </Txt>
        )}
        renderItem={({ item: row, index, section }) => {
          const character = row.characterId ? byId.get(row.characterId) : undefined;
          const credit = row.amount > 0;
          const first = index === 0;
          const last = index === section.data.length - 1;
          return (
            <View style={[styles.row, first && styles.rowFirst, last && styles.rowLast, !first && styles.rowLine]}>
              <View style={styles.lead}>
                {character ? (
                  <CharacterAvatar character={character} size={36} />
                ) : (
                  <View style={[styles.glyph, row.reason === 'expired' && styles.glyphMuted]}>
                    <Ionicons name={GLYPH[row.reason]} size={18} color={colors.textSecondary} />
                  </View>
                )}
              </View>
              <View style={styles.flex}>
                <Txt variant="bodyStrong" lines={1}>
                  {title(row, character)}
                </Txt>
                <Txt variant="caption" color={colors.textMuted}>
                  {row.count > 1
                    ? `${t('ledger.messages', { count: row.count })} · ${clockTime(row.at)}`
                    : clockTime(row.at)}
                </Txt>
              </View>
              <View style={styles.amount}>
                <Txt variant="bodyStrong" color={credit ? colors.brandText : colors.text}>
                  {credit ? `+${row.amount}` : `${row.amount}`}
                </Txt>
                <ShellIcon size={16} />
              </View>
            </View>
          );
        }}
      />
    </Screen>
  );
}

const GLYPH: Record<LedgerReason, React.ComponentProps<typeof Ionicons>['name']> = {
  welcome: 'sparkles-outline',
  daily: 'calendar-outline',
  expired: 'moon-outline',
  ad: 'play-circle-outline',
  spin: 'gift-outline',
  purchase: 'bag-handle-outline',
  chat: 'chatbubble-outline',
  voice: 'mic-outline',
  photo: 'image-outline',
  note: 'mail-outline',
  date: 'cafe-outline',
  photoBooth: 'camera-outline',
  voiceClone: 'mic-circle-outline',
  other: 'ellipse-outline',
};

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
  list: { paddingHorizontal: space.lg, paddingBottom: space.huge },
  rule: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'center',
    padding: space.lg,
    marginTop: space.sm,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySofter,
  },
  day: { marginTop: space.xl, marginBottom: space.sm, marginLeft: space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  rowFirst: { borderTopWidth: 1, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  rowLast: { borderBottomWidth: 1, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  lead: { width: 36, alignItems: 'center' },
  glyph: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphMuted: { opacity: 0.7 },
  amount: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  footer: { marginTop: space.xl },
});
