import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';

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
  /** Days you talked with this friend: a dot in their colour. */
  talked?: ReadonlySet<string>;
  /** The friend's colour for the talked dot (their disc's colour), else a neutral grey. */
  talkColor?: string;
  /** The section's serif title ("Your days"); without it the month leads the row. */
  title?: string;
  /** A peach "+" beside the month; Us moved it to its header, so it is optional. */
  onAdd?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * "Your days" in the Ink look (owner, 2026-11-13, from the canvas frame "6 · Us"), laid out like the
 * month view of Apple's Calendar: weekday letters, plain numbers, the picked day in a filled circle,
 * today's number in the brand colour, dots under a day (HIG: one meaning per colour, and the dots
 * repeat what the day's list says in words): a filled dot in this friend's colour for a day you
 * talked, a peach ring for a plan (grey once it has passed). The whole month, folded to the picked
 * day's week by tapping the month; a tap picks the day whose plans are listed underneath.
 */
export function PlanCalendar({ value, onChange, today, marked, talked, talkColor, title, onAdd, style }: PlanCalendarProps) {
  const { t, i18n } = useTranslation();
  // The whole month by default, as on the canvas; the month name folds it to one week.
  const [open, setOpen] = useState(true);
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
      {title ? (
        <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
          {title}
        </Text>
      ) : null}
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
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.brandText} />
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
          const plan = inMonth && marked.has(key);
          const spoke = inMonth && !!talked?.has(key);
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
              <View collapsable={false} style={[styles.day, selected && styles.daySelected]}>
                <Txt
                  style={[styles.dayText, isToday && !selected && styles.dayToday, selected && styles.dayTextSelected]}
                  color={!inMonth ? colors.textFaint : undefined}
                  maxFontSizeMultiplier={1.2}>
                  {dateFromKey(key).getDate()}
                </Txt>
              </View>
              {/* The dot row keeps its height when empty, so the numbers line up across the week. */}
              <View style={styles.dots}>
                {spoke ? <View style={[styles.dot, { backgroundColor: talkColor ?? colors.textFaint }]} /> : null}
                {plan ? <View style={[styles.dot, key < today ? styles.dotPast : styles.dotPlan]} /> : null}
              </View>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const DAY = 38;

const styles = StyleSheet.create({
  // No card: the section sits on the ground like the discs above it (the canvas).
  root: { marginHorizontal: 20, marginTop: 26 },
  title: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 30, letterSpacing: -0.3, color: systemGround.label },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: 2, marginBottom: 6 },
  toggle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 44 },
  month: { flexShrink: 1, fontSize: 15, lineHeight: 20, fontWeight: '600', color: colors.brandText, textTransform: 'capitalize' },
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
  row: { flexDirection: 'row', marginBottom: 4 },
  weekday: { fontSize: 12, lineHeight: 16, fontWeight: '600', color: systemGround.secondaryLabel, textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 2 },
  cell: { width: `${100 / 7}%` },
  dayCell: { alignItems: 'center', minHeight: 52, paddingTop: 2 },
  day: { width: DAY, height: DAY, borderRadius: DAY / 2, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: colors.primaryFill },
  dayText: { fontSize: 17, lineHeight: 22, color: systemGround.label, fontVariant: ['tabular-nums'] },
  dayToday: { color: colors.brandText, fontWeight: '700' },
  dayTextSelected: { color: colors.textOnPrimary, fontWeight: '700' },
  dots: { height: 8, flexDirection: 'row', alignItems: 'center', gap: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  // A plan is a ring, a talked day a filled dot: shape tells them apart, not colour alone (HIG Color).
  dotPlan: { borderWidth: 1.5, borderColor: colors.primary },
  dotPast: { borderWidth: 1.5, borderColor: colors.textFaint },
});
