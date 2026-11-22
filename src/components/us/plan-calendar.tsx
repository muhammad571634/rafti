import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { InkText } from '@/components/ink';
import { PressableScale } from '@/components/ui';
import { monthCells, startOfMonth, weekCells, weekdayNames } from '@/lib/calendar';
import { dateFromKey, dayKey } from '@/mock';
import { colors, radius, space, systemColors } from '@/theme';
import { ink, inkPeachGlass, inkRadius } from '@/theme/ink';

export interface PlanCalendarProps {
  /** Selected day key */
  value: string;
  onChange: (key: string) => void;
  today: string;
  /** Days with plans or one-time wake-ups */
  marked: ReadonlySet<string>;
  /** Days you talked with this friend: a filled dot in their colour. */
  talked?: ReadonlySet<string>;
  /** The friend's colour for the talked dot, else a neutral grey. */
  talkColor?: string;
  /** The section's serif title ("Your days") drawn inside the card header. */
  title?: string;
  /** Optional peach "+" beside the month controls. */
  onAdd?: () => void;
  /** Optional inline footer rendered below a hairline inside the same card (selected day's plans). */
  footer?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** The week grows into the month (and back) as one move; Reduce Motion skips it. */
const GROW = LinearTransition.duration(260);

/**
 * Unified Week / Month & Plans card on Us (approved Ink+ prototype): starts as a quiet 1-row
 * week strip so the screen breathes, expands into the full month grid when the month pill is
 * tapped, keeps ‹ › stepping for both modes, and optionally hosts the picked day's plans inline
 * under a hairline separator inside the same calm Ink card.
 */
export function PlanCalendar({ value, onChange, today, marked, talked, talkColor, title, onAdd, footer, style }: PlanCalendarProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  /** The day the closed view's week is built round; the arrows move it a week at a time. */
  const [anchor, setAnchor] = useState(value);
  const [month, setMonth] = useState(() => startOfMonth(dateFromKey(value)));

  // Picking a day elsewhere (the plan sheet, a moment, a deep link) brings its week and month in.
  useEffect(() => {
    setAnchor(value);
    const target = startOfMonth(dateFromKey(value));
    setMonth((m) => (m.getTime() === target.getTime() ? m : target));
  }, [value]);

  const cells = useMemo(() => (open ? monthCells(month) : weekCells(dateFromKey(anchor))), [open, month, anchor]);
  const weekdays = useMemo(() => weekdayNames(i18n.language, 'narrow'), [i18n.language]);
  const shown = open ? month : startOfMonth(dateFromKey(anchor));
  const monthLabel = shown.toLocaleDateString(i18n.language, { month: 'short', year: 'numeric' });
  const monthLabelFull = shown.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' });

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
      <View style={styles.card}>
        <View style={styles.head}>
          {title ? (
            <InkText variant="cardSmall" accessibilityRole="header" lines={1} style={styles.title}>
              {title}
            </InkText>
          ) : null}

          <View style={[styles.controls, !title && styles.controlsSpread]}>
            <PressableScale
              style={styles.monthPill}
              scaleTo={0.95}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              accessibilityLabel={`${monthLabelFull}, ${t(open ? 'us.calendarLess' : 'us.calendarMore')}`}
              onPress={toggle}>
              <InkText variant="caption" color={ink.text} lines={1} style={styles.monthText}>
                {monthLabel}
              </InkText>
              <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={12} color={ink.text2} />
            </PressableScale>

            <View style={styles.arrows}>
              <PressableScale style={styles.nav} scaleTo={0.88} hitSlop={7} accessibilityLabel={t('diary.prevMonth')} onPress={() => step(-1)}>
                <Ionicons name="chevron-back" size={15} color={ink.text} />
              </PressableScale>
              <PressableScale style={styles.nav} scaleTo={0.88} hitSlop={7} accessibilityLabel={t('diary.nextMonth')} onPress={() => step(1)}>
                <Ionicons name="chevron-forward" size={15} color={ink.text} />
              </PressableScale>
              {onAdd ? (
                <PressableScale style={styles.add} scaleTo={0.88} hitSlop={6} accessibilityLabel={t('us.add')} onPress={onAdd}>
                  <Ionicons name="add" size={18} color={colors.textOnPrimary} />
                </PressableScale>
              ) : null}
            </View>
          </View>
        </View>

        <Animated.View layout={GROW}>
          {open ? (
            <View style={styles.monthWrap}>
              <View style={styles.weekdayRow}>
                {weekdays.map((d, i) => (
                  <InkText key={i} variant="caption" color={ink.text3} center style={[styles.cell, styles.weekday]}>
                    {d}
                  </InkText>
                ))}
              </View>
              <View style={styles.monthGrid}>
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
                      {/* Never flattened so Android preserves rounded corners when selected fill toggles. */}
                      <View collapsable={false} style={[styles.monthCircle, selected && styles.selectedFill]}>
                        {selected ? <LinearGradient colors={inkPeachGlass.ctaFill} style={StyleSheet.absoluteFill} pointerEvents="none" /> : null}
                        <InkText
                          variant={selected || isToday ? 'subStrong' : 'sub'}
                          color={!inMonth ? ink.text3 : selected ? inkPeachGlass.ctaText : isToday ? ink.accent : ink.text}
                          style={styles.tabular}>
                          {dateFromKey(key).getDate()}
                        </InkText>
                      </View>
                      <View style={styles.dots}>
                        {spoke ? <View style={[styles.dot, { backgroundColor: talkColor ?? ink.text2 }]} /> : null}
                        {plan ? <View style={[styles.dotPlan, key < today && styles.dotPast]} /> : null}
                      </View>
                    </PressableScale>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.weekRow}>
              {cells.map(({ key }, i) => {
                const selected = key === value;
                const isToday = key === today;
                const plan = marked.has(key);
                const spoke = !!talked?.has(key);
                return (
                  <PressableScale
                    key={key}
                    style={styles.weekCell}
                    scaleTo={0.93}
                    accessibilityLabel={dateFromKey(key).toLocaleDateString(i18n.language, { weekday: 'long', month: 'long', day: 'numeric' })}
                    accessibilityState={{ selected }}
                    onPress={() => onChange(key)}>
                    <View collapsable={false} style={[styles.weekPill, selected && styles.selectedFill]}>
                      {selected ? <LinearGradient colors={inkPeachGlass.ctaFill} style={StyleSheet.absoluteFill} pointerEvents="none" /> : null}
                      <InkText
                        variant="caption"
                        color={selected ? inkPeachGlass.text : ink.text3}
                        style={[styles.weekday, selected && styles.weekDayOn]}>
                        {weekdays[i % weekdays.length]}
                      </InkText>
                      <InkText
                        variant="subStrong"
                        color={selected ? inkPeachGlass.ctaText : isToday ? ink.accent : ink.text}
                        style={styles.tabular}>
                        {dateFromKey(key).getDate()}
                      </InkText>
                      <View style={styles.dots}>
                        {spoke ? <View style={[styles.dot, { backgroundColor: selected ? inkPeachGlass.ctaText : (talkColor ?? ink.text2) }]} /> : null}
                        {plan ? (
                          <View
                            style={[
                              styles.dotPlan,
                              selected ? styles.dotPlanOn : key < today ? styles.dotPast : undefined,
                            ]}
                          />
                        ) : null}
                      </View>
                    </View>
                  </PressableScale>
                );
              })}
            </View>
          )}
        </Animated.View>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginHorizontal: 14, marginTop: 16 },
  card: {
    borderRadius: inkRadius.card,
    borderCurve: 'continuous',
    backgroundColor: ink.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  title: { flex: 1, minWidth: 0 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  controlsSpread: { flex: 1, justifyContent: 'space-between' },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.raised,
  },
  monthText: { textTransform: 'capitalize' },
  arrows: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nav: {
    width: 30,
    height: 30,
    borderRadius: inkRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ink.raised,
  },
  add: {
    width: 30,
    height: 30,
    marginLeft: space.xs,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryFill,
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingBottom: 12,
    gap: 2,
  },
  weekCell: { flex: 1 },
  weekPill: {
    paddingVertical: 8,
    borderRadius: 16,
    borderCurve: 'continuous',
    overflow: 'hidden',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent',
  },
  weekDayOn: { opacity: 0.9 },
  monthWrap: { paddingHorizontal: 10, paddingBottom: 12 },
  weekdayRow: { flexDirection: 'row', marginBottom: 6 },
  weekday: { textTransform: 'uppercase' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 4 },
  // A hair under a seventh: seven exact sevenths can round past the row and drop Sunday (A51).
  cell: { width: '14.28%', alignItems: 'center' },
  monthCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  selectedFill: {
    borderWidth: 1,
    borderColor: inkPeachGlass.ctaRim,
  },
  tabular: { fontVariant: ['tabular-nums'] },
  dots: { height: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, marginTop: 1 },
  dot: { width: 5, height: 5, borderRadius: inkRadius.pill },
  dotPlan: { width: 5.5, height: 5.5, borderRadius: inkRadius.pill, borderWidth: 1.5, borderColor: systemColors.pink },
  dotPlanOn: { borderColor: inkPeachGlass.ctaText },
  dotPast: { borderColor: ink.text3 },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ink.edge,
  },
});
