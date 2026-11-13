import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { PressableScale, Txt } from '@/components/ui';
import { monthCells, startOfMonth, weekCells, weekdayNames } from '@/lib/calendar';
import { dateFromKey, dayKey } from '@/mock';
import { colors, fonts, isDark, radius, space, systemGround } from '@/theme';

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

/** The week grows into the month (and back) as one move; Reduce Motion skips it. */
const GROW = LinearTransition.duration(260);

/**
 * "Your days" as the owner's reference (2026-11-13, an iOS calendar): the month and year with ‹ ›
 * on one line, the weekday letters, then the week as tall capsules, each day's dots on top and its
 * number below, the picked day's number in a filled circle and today's in the brand colour. Tapping
 * the month opens the whole month in the same capsules (and folds it back); ‹ › step a week, or a
 * month while it is open. Dots (HIG Color: shape as well as colour): a filled dot in the friend's
 * colour for a day you talked, a ring for a plan or a wake-up (grey once it has passed).
 */
export function PlanCalendar({ value, onChange, today, marked, talked, talkColor, title, onAdd, style }: PlanCalendarProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  /** The day the closed view's week is built round; the arrows move it a week at a time. */
  const [anchor, setAnchor] = useState(value);
  const [month, setMonth] = useState(() => startOfMonth(dateFromKey(value)));

  // Picking a day elsewhere (the plan sheet, a moment) brings its week and month in.
  useEffect(() => {
    setAnchor(value);
    const target = startOfMonth(dateFromKey(value));
    setMonth((m) => (m.getTime() === target.getTime() ? m : target));
  }, [value]);

  const cells = useMemo(() => (open ? monthCells(month) : weekCells(dateFromKey(anchor))), [open, month, anchor]);
  const weekdays = useMemo(() => weekdayNames(i18n.language, 'narrow'), [i18n.language]);
  const shown = open ? month : startOfMonth(dateFromKey(anchor));

  const step = (delta: number) => {
    if (open) return setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
    const d = dateFromKey(anchor);
    setAnchor(dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta * 7)));
  };
  const toggle = () => {
    // Opening shows the month of the week on screen; closing goes back to the picked day's week.
    if (!open) setMonth(startOfMonth(dateFromKey(anchor)));
    else setAnchor(value);
    setOpen((v) => !v);
  };

  return (
    <View style={[styles.root, style]}>
      {title ? (
        <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
          {title}
        </Text>
      ) : null}
      <View style={styles.card}>
        <View style={styles.head}>
          <PressableScale
            style={styles.toggle}
            scaleTo={0.97}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            accessibilityLabel={`${shown.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })}, ${t(open ? 'us.calendarLess' : 'us.calendarMore')}`}
            onPress={toggle}>
            <Txt style={styles.month} lines={1} maxFontSizeMultiplier={1.3}>
              {shown.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })}
            </Txt>
            <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={systemGround.secondaryLabel} />
          </PressableScale>
          <PressableScale style={styles.nav} scaleTo={0.88} accessibilityLabel={t('diary.prevMonth')} onPress={() => step(-1)}>
            <Ionicons name="chevron-back" size={18} color={systemGround.label} />
          </PressableScale>
          <PressableScale style={styles.nav} scaleTo={0.88} accessibilityLabel={t('diary.nextMonth')} onPress={() => step(1)}>
            <Ionicons name="chevron-forward" size={18} color={systemGround.label} />
          </PressableScale>
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

        <Animated.View layout={GROW} style={styles.grid}>
          {cells.map(({ key, inMonth }) => {
            const selected = inMonth && key === value;
            const isToday = key === today;
            const plan = inMonth && marked.has(key);
            const spoke = inMonth && !!talked?.has(key);
            return (
              <PressableScale
                key={key}
                style={styles.cell}
                scaleTo={0.92}
                disabled={!inMonth}
                accessibilityLabel={dateFromKey(key).toLocaleDateString(i18n.language, { weekday: 'long', month: 'long', day: 'numeric' })}
                accessibilityState={{ selected, disabled: !inMonth }}
                onPress={() => onChange(key)}>
                <View style={[styles.capsule, !inMonth && styles.capsuleOut]}>
                  {/* The dot row keeps its height when empty, so every number sits on one line. */}
                  <View style={styles.dots}>
                    {spoke ? <View style={[styles.dot, { backgroundColor: talkColor ?? systemGround.secondaryLabel }]} /> : null}
                    {plan ? <View style={[styles.dot, key < today ? styles.dotPast : styles.dotPlan]} /> : null}
                  </View>
                  <View style={[styles.num, selected && styles.numOn]}>
                    <Txt
                      style={[styles.numText, isToday && !selected && styles.numToday, selected && styles.numTextOn]}
                      color={!inMonth ? colors.textFaint : undefined}
                      maxFontSizeMultiplier={1.2}>
                      {dateFromKey(key).getDate()}
                    </Txt>
                  </View>
                </View>
              </PressableScale>
            );
          })}
        </Animated.View>
      </View>
    </View>
  );
}

const NUM = 28;

const styles = StyleSheet.create({
  root: { marginHorizontal: 14, marginTop: 26 },
  title: { marginHorizontal: 6, marginBottom: 10, fontFamily: fonts.serif, fontSize: 24, lineHeight: 30, letterSpacing: -0.3, color: systemGround.label },
  // The reference's white card on the grouped ground.
  card: {
    paddingTop: 4,
    paddingBottom: 10,
    paddingHorizontal: 8,
    borderRadius: 26,
    borderCurve: 'continuous',
    backgroundColor: systemGround.card,
    ...(isDark ? { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.08)' } : null),
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: 10, paddingRight: 2 },
  toggle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  month: { flexShrink: 1, fontSize: 18, lineHeight: 23, fontWeight: '600', letterSpacing: -0.4, color: systemGround.label, textTransform: 'capitalize' },
  // A round grey button each, 44 pt to tap, as the reference's ‹ ›.
  nav: { width: 36, height: 36, margin: 4, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: systemGround.fill },
  add: { width: 32, height: 32, marginLeft: space.xs, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryFill },
  row: { flexDirection: 'row', marginTop: 2, marginBottom: 4 },
  weekday: { fontSize: 13, lineHeight: 16, fontWeight: '500', color: systemGround.secondaryLabel, textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 6 },
  // A hair under a seventh: seven exact sevenths can round past the row and drop Sunday to the next line (seen on the A51).
  cell: { width: '14.28%', alignItems: 'center' },
  capsule: {
    width: '82%',
    height: 54,
    paddingTop: 7,
    paddingBottom: 3,
    borderRadius: 18,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: systemGround.fill,
  },
  capsuleOut: { backgroundColor: 'transparent' },
  dots: { height: 7, flexDirection: 'row', alignItems: 'center', gap: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotPlan: { borderWidth: 1.5, borderColor: colors.primary },
  dotPast: { borderWidth: 1.5, borderColor: colors.textFaint },
  num: { width: NUM, height: NUM, borderRadius: NUM / 2, alignItems: 'center', justifyContent: 'center' },
  numOn: { backgroundColor: colors.primaryFill },
  numText: { fontSize: 15, lineHeight: 19, color: systemGround.label, fontVariant: ['tabular-nums'] },
  numToday: { color: colors.brandText, fontWeight: '700' },
  numTextOn: { color: colors.textOnPrimary, fontWeight: '700' },
});
