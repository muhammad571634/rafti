import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { PressableScale, Txt } from '@/components/ui';
import { monthCells, startOfMonth, weekCells, weekdayNames } from '@/lib/calendar';
import { dateFromKey } from '@/mock';
import { colors, fonts, radius, space, systemGround } from '@/theme';

export interface PlanCalendarProps {
  /** Selected day key */
  value: string;
  onChange: (key: string) => void;
  today: string;
  /** Days with plans */
  marked: ReadonlySet<string>;
  /** A peach "+" beside the month; Us moved it to its header, so it is optional. */
  onAdd?: () => void;
  /** The card's look where it sits (Us puts it on the aurora). */
  style?: StyleProp<ViewStyle>;
}

/**
 * Plans with one friend, small until asked for: the week of the picked day, and the
 * whole month once the month name is tapped. A dot marks a day with plans (grey once
 * it has passed); a tap picks the day whose plans are listed underneath.
 */
export function PlanCalendar({ value, onChange, today, marked, onAdd, style }: PlanCalendarProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => startOfMonth(dateFromKey(value)));

  // Picking a day outside the month on screen (e.g. from the plan sheet) brings its month in.
  useEffect(() => {
    const target = startOfMonth(dateFromKey(value));
    setMonth((m) => (m.getTime() === target.getTime() ? m : target));
  }, [value]);

  const cells = useMemo(() => (open ? monthCells(month) : weekCells(dateFromKey(value))), [open, month, value]);
  const weekdays = useMemo(() => weekdayNames(i18n.language), [i18n.language]);
  const shift = (delta: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  // Closed, the label names the picked day's month; open, the month being browsed.
  const shownMonth = open ? month : startOfMonth(dateFromKey(value));

  return (
    <View style={[styles.root, style]}>
      <View style={styles.head}>
        <PressableScale
          style={styles.toggle}
          scaleTo={0.97}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={t(open ? 'us.calendarLess' : 'us.calendarMore')}
          onPress={() => setOpen((v) => !v)}>
          <Txt style={styles.month} maxFontSizeMultiplier={1.3}>
            {shownMonth.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })}
          </Txt>
          <Ionicons name={open ? 'chevron-up' : 'chevron-forward'} size={15} color={colors.brandText} />
        </PressableScale>
        {open ? (
          <>
            <PressableScale style={styles.nav} scaleTo={0.88} accessibilityLabel={t('diary.prevMonth')} onPress={() => shift(-1)}>
              <Ionicons name="chevron-back" size={18} color={systemGround.label} />
            </PressableScale>
            <PressableScale style={styles.nav} scaleTo={0.88} accessibilityLabel={t('diary.nextMonth')} onPress={() => shift(1)}>
              <Ionicons name="chevron-forward" size={18} color={systemGround.label} />
            </PressableScale>
          </>
        ) : null}
        {onAdd ? (
          <PressableScale style={styles.add} scaleTo={0.88} hitSlop={6} accessibilityLabel={t('us.add')} onPress={onAdd}>
            <Ionicons name="add" size={20} color={colors.textOnPrimary} />
          </PressableScale>
        ) : null}
      </View>

      <View style={styles.row}>
        {weekdays.map((d, i) => (
          <Txt key={i} center style={[styles.cell, styles.weekday]} maxFontSizeMultiplier={1.2}>
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
              {/* Each day a soft chip; the picked one apricot; a dot inside marks a day with plans. */}
              <View collapsable={false} style={[styles.day, !inMonth && styles.dayOut, selected && styles.daySelected]}>
                <Txt
                  style={[styles.dayText, isToday && !selected && styles.dayToday, selected && styles.dayTextSelected]}
                  color={!inMonth ? colors.textFaint : undefined}
                  maxFontSizeMultiplier={1.2}>
                  {dateFromKey(key).getDate()}
                </Txt>
                <View
                  style={[
                    styles.dot,
                    has && (key < today ? styles.dotPast : selected ? styles.dotOnSelected : styles.dotOn),
                  ]}
                />
              </View>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // The playful skin (four-tab prototype): a white card, its days as soft chips.
  root: {
    marginHorizontal: 14,
    marginTop: 14,
    paddingHorizontal: 10,
    paddingTop: space.xs,
    paddingBottom: 12,
    borderRadius: 26,
    backgroundColor: systemGround.card,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.xs, marginBottom: 4 },
  toggle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 44 },
  month: { flexShrink: 1, fontFamily: fonts.playful, fontSize: 17, lineHeight: 22, color: systemGround.label, textTransform: 'capitalize' },
  // No fill, so the box itself is the 44pt tap target.
  nav: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  add: {
    width: 32,
    height: 32,
    marginLeft: space.xs,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryFill,
  },
  row: { flexDirection: 'row', marginBottom: 6 },
  weekday: { fontSize: 11, lineHeight: 14, fontWeight: '700', color: colors.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 6 },
  cell: { width: `${100 / 7}%` },
  dayCell: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2.5 },
  day: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: systemGround.fill,
  },
  dayOut: { backgroundColor: 'transparent' },
  daySelected: { backgroundColor: colors.primaryFill },
  dayText: { fontFamily: fonts.playful, fontSize: 16, lineHeight: 20, color: systemGround.label, fontVariant: ['tabular-nums'] },
  dayToday: { color: colors.brandText },
  dayTextSelected: { color: colors.textOnPrimary },
  dot: { position: 'absolute', bottom: 5, width: 5, height: 5, borderRadius: 3, backgroundColor: 'transparent' },
  dotOn: { backgroundColor: colors.primary },
  dotOnSelected: { backgroundColor: colors.textOnPrimary },
  dotPast: { backgroundColor: colors.textFaint },
});
