import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { PressableScale, Txt } from '@/components/ui';
import { monthCells, startOfMonth, weekdayNames } from '@/lib/calendar';
import { dateFromKey } from '@/mock';
import { colors, radius, space } from '@/theme';

export interface PlanCalendarProps {
  /** Selected day key */
  value: string;
  onChange: (key: string) => void;
  today: string;
  /** Days with plans */
  marked: ReadonlySet<string>;
  onAdd: () => void;
}

/**
 * The month of plans with one friend. A dot marks a day with plans (grey once it
 * has passed); a tap picks the day whose plans are listed underneath.
 */
export function PlanCalendar({ value, onChange, today, marked, onAdd }: PlanCalendarProps) {
  const { t, i18n } = useTranslation();
  const [month, setMonth] = useState(() => startOfMonth(dateFromKey(value)));

  // Picking a day outside the month on screen (e.g. from the plan sheet) brings its month in.
  useEffect(() => {
    const target = startOfMonth(dateFromKey(value));
    setMonth((m) => (m.getTime() === target.getTime() ? m : target));
  }, [value]);

  const cells = useMemo(() => monthCells(month), [month]);
  const weekdays = useMemo(() => weekdayNames(i18n.language), [i18n.language]);
  const shift = (delta: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Txt variant="title" style={styles.month}>
          {month.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })}
        </Txt>
        <PressableScale style={styles.nav} scaleTo={0.88} accessibilityLabel={t('diary.prevMonth')} onPress={() => shift(-1)}>
          <Ionicons name="chevron-back" size={16} color={colors.text} />
        </PressableScale>
        <PressableScale style={styles.nav} scaleTo={0.88} accessibilityLabel={t('diary.nextMonth')} onPress={() => shift(1)}>
          <Ionicons name="chevron-forward" size={16} color={colors.text} />
        </PressableScale>
        <PressableScale style={[styles.nav, styles.add]} scaleTo={0.88} accessibilityLabel={t('us.add')} onPress={onAdd}>
          <Ionicons name="add" size={20} color={colors.textOnPrimary} />
        </PressableScale>
      </View>

      <View style={styles.row}>
        {weekdays.map((d, i) => (
          <Txt key={i} variant="caption" color={colors.brandText} center style={styles.cell}>
            {d}
          </Txt>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map(({ key, inMonth }) => {
          const selected = inMonth && key === value;
          const isToday = key === today;
          const has = inMonth && marked.has(key);
          return (
            <PressableScale
              key={key}
              style={[styles.cell, styles.dayCell]}
              scaleTo={0.9}
              disabled={!inMonth}
              accessibilityLabel={dateFromKey(key).toLocaleDateString(i18n.language, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
              accessibilityState={{ selected, disabled: !inMonth }}
              onPress={() => onChange(key)}>
              <View style={[styles.day, selected && styles.daySelected]}>
                <Txt
                  variant={selected || isToday ? 'bodyStrong' : 'body'}
                  color={
                    selected ? colors.textOnPrimary : !inMonth ? colors.textFaint : isToday ? colors.brandText : colors.text
                  }>
                  {dateFromKey(key).getDate()}
                </Txt>
              </View>
              <View style={[styles.dot, has && (key < today ? styles.dotPast : styles.dotOn)]} />
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Straight on the canvas: no card, border or fill around the month.
  card: {
    marginHorizontal: space.sm,
    marginTop: space.xl,
    paddingHorizontal: space.sm,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.xs, marginBottom: space.sm },
  month: { flex: 1 },
  nav: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  add: { backgroundColor: colors.primary, marginLeft: space.xs },
  row: { flexDirection: 'row', marginBottom: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%` },
  dayCell: { alignItems: 'center', justifyContent: 'center', height: 44 },
  day: { width: 34, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: colors.primary },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent' },
  dotOn: { backgroundColor: colors.primary },
  dotPast: { backgroundColor: colors.textFaint },
});
