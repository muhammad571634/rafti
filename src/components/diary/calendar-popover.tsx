import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button, PressableScale, Txt } from '@/components/ui';
import { monthCells, startOfMonth, WEEK, weekdayNames } from '@/lib/calendar';
import { dateFromKey, dayKey } from '@/mock';
import { colors, radius, shadows, space } from '@/theme';

const PAD = space.lg;

export interface CalendarPopoverProps {
  visible: boolean;
  onClose: () => void;
  /** Selected day key */
  value: string;
  onChange: (key: string) => void;
  /** Day keys that get a dot (days with pages) */
  marked: ReadonlySet<string>;
  /** Distance from the top of the screen to the card */
  top: number;
  /** Which side of today can be picked: the diary looks back, plans look ahead. */
  allow?: 'past' | 'future';
}

/**
 * A month card that drops from the date pill. A tap only marks a day; Confirm
 * applies it, Cancel leaves the page as it was. Days with pages carry a dot, the
 * neighbouring months' days are greyed out and the future is out of reach.
 */
export function CalendarPopover({ visible, onClose, value, onChange, marked, top, allow = 'past' }: CalendarPopoverProps) {
  const { t, i18n } = useTranslation();
  const { width: screen } = useWindowDimensions();
  const today = dayKey();

  const [month, setMonth] = useState(() => startOfMonth(dateFromKey(value)));
  const [pending, setPending] = useState(value);

  // Each opening starts from the day on screen.
  useEffect(() => {
    if (!visible) return;
    setMonth(startOfMonth(dateFromKey(value)));
    setPending(value);
  }, [visible, value]);

  const cardWidth = Math.min(screen - space.xxl * 2, 360);
  const cell = Math.floor((cardWidth - PAD * 2) / WEEK);

  const cells = useMemo(() => monthCells(month), [month]);
  const weekdays = useMemo(() => weekdayNames(i18n.language), [i18n.language]);

  const thisMonth = startOfMonth(new Date()).getTime();
  const atCurrentMonth = month.getTime() >= thisMonth;
  const atFirstMonth = month.getTime() <= thisMonth;
  const shift = (delta: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  const confirm = () => {
    if (pending !== value) onChange(pending);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} />
      <View style={[styles.wrap, { top }]} pointerEvents="box-none">
        <Animated.View entering={FadeIn.duration(140)} style={[styles.card, { width: cardWidth }, shadows.modal]}>
          <View style={styles.head}>
            <Txt variant="title" style={styles.month}>
              {month.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })}
            </Txt>
            <PressableScale
              style={[styles.nav, allow === 'future' && atFirstMonth && styles.off]}
              scaleTo={0.88}
              disabled={allow === 'future' && atFirstMonth}
              accessibilityLabel={t('diary.prevMonth')}
              onPress={() => shift(-1)}>
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </PressableScale>
            <PressableScale
              style={[styles.nav, allow === 'past' && atCurrentMonth && styles.off]}
              scaleTo={0.88}
              disabled={allow === 'past' && atCurrentMonth}
              accessibilityLabel={t('diary.nextMonth')}
              onPress={() => shift(1)}>
              <Ionicons name="chevron-forward" size={18} color={colors.text} />
            </PressableScale>
          </View>

          <View style={styles.row}>
            {weekdays.map((d, i) => (
              <Txt key={i} variant="caption" color={colors.brandText} center style={{ width: cell }}>
                {d}
              </Txt>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map(({ key, inMonth }) => {
              const disabled = !inMonth || (allow === 'past' ? key > today : key < today);
              const selected = inMonth && key === pending;
              const isToday = key === today;
              return (
                <PressableScale
                  key={key}
                  style={[styles.cell, { width: cell, height: cell + 2 }]}
                  scaleTo={0.9}
                  disabled={disabled}
                  accessibilityLabel={dateFromKey(key).toLocaleDateString(i18n.language, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                  accessibilityState={{ selected, disabled }}
                  onPress={() => setPending(key)}>
                  <View style={[styles.day, selected && styles.daySelected]}>
                    <Txt
                      variant={selected || isToday ? 'bodyStrong' : 'body'}
                      color={
                        selected
                          ? colors.textOnPrimary
                          : disabled
                            ? colors.textFaint
                            : isToday
                              ? colors.brandText
                              : colors.text
                      }>
                      {dateFromKey(key).getDate()}
                    </Txt>
                  </View>
                  <View style={[styles.dot, inMonth && marked.has(key) && !selected && styles.dotOn]} />
                </PressableScale>
              );
            })}
          </View>

          <View style={styles.foot}>
            <PressableScale scaleTo={0.94} hitSlop={8} style={styles.cancel} onPress={onClose}>
              <Txt variant="bodyStrong" color={colors.textSecondary}>
                {t('common.cancel')}
              </Txt>
            </PressableScale>
            <Button label={t('common.confirm')} onPress={confirm} style={styles.confirm} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: colors.scrim },
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  card: {
    borderRadius: radius.xxl,
    backgroundColor: colors.surface,
    paddingHorizontal: PAD,
    paddingTop: space.lg,
    paddingBottom: space.lg,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginBottom: space.md, paddingLeft: space.xs },
  month: { flex: 1 },
  nav: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  off: { opacity: 0.35 },
  row: { flexDirection: 'row', marginBottom: space.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { alignItems: 'center', justifyContent: 'center' },
  day: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: colors.primary },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent' },
  dotOn: { backgroundColor: colors.primary },
  foot: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.lg },
  cancel: { paddingHorizontal: space.md, paddingVertical: space.sm },
  confirm: { flex: 1 },
});
