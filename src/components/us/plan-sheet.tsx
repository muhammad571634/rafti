import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';

import { CalendarPopover } from '@/components/diary/calendar-popover';
import { InkText } from '@/components/ink';
import { CharacterAvatar, PressableScale, Sheet, ShellIcon, Toggle } from '@/components/ui';
import { useFriendName } from '@/hooks/use-friend-name';
import { REMIND_BEFORE_MIN } from '@/lib/schedule';
import { dateFromKey, dayKeyFromToday } from '@/mock';
import { colors, space, systemColors } from '@/theme';
import { ink, inkRadius, inkType } from '@/theme/ink';
import type { Character } from '@/types';

const STEP_MIN = 15;
const DAY_MIN = 24 * 60;
const TITLE_MAX = 40;

export interface NewPlan {
  title: string;
  date: string;
  time?: string;
  /** How the character will say it: "tomorrow at 19:30", "on Sat, Oct 10" */
  whenLabel: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const toClock = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/** The next whole hour, so a fresh plan starts at a time that is still ahead. */
function defaultMinutes() {
  const now = new Date();
  return Math.min(23, now.getHours() + 1) * 60;
}

/** The day as a Date for the system pickers (hours and minutes from `minutes`). */
const asDate = (key: string, minutes = 12 * 60) => {
  const d = dateFromKey(key);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
};

/**
 * A plan by hand, iOS Calendar's "New Event" (approved prototype `UsPlan.dc.html`): the title,
 * who it is with, the day (Today / Tomorrow / Other day: the app's own calendar) and, if it matters,
 * the time (the system picker: inline on iOS, a dialog on Android); ✓ in the header adds it.
 */
export function PlanSheet({
  visible,
  onClose,
  day,
  character,
  onSubmit,
  cost,
}: {
  visible: boolean;
  onClose: () => void;
  /** The day selected on the calendar */
  day: string;
  /** The friend the plan is with; they send the reminder */
  character?: Character;
  onSubmit: (plan: NewPlan) => void;
  /** Shells it costs, shown under the form (`shellCosts.planSetup`). */
  cost?: number;
}) {
  const friendName = useFriendName();
  const { t, i18n } = useTranslation();
  const { height } = useWindowDimensions();
  const today = dayKeyFromToday(0);
  const tomorrow = dayKeyFromToday(1);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(day);
  const [timed, setTimed] = useState(true);
  const [minutes, setMinutes] = useState(defaultMinutes);
  /** Which inline wheel is open (iOS); web uses the calendar popover for the day. */
  const [open, setOpen] = useState<'day' | 'time' | null>(null);

  // Every opening starts clean, on the day picked in the calendar. Only the opening
  // resets it: a later change to the calendar behind must not wipe what was typed.
  const openDay = useRef(day);
  openDay.current = day;
  useEffect(() => {
    if (!visible) return;
    const start = dayKeyFromToday(0);
    setTitle('');
    setDate(openDay.current < start ? start : openDay.current);
    setTimed(true);
    setMinutes(defaultMinutes());
    setOpen(null);
  }, [visible]);

  const later = date !== today && date !== tomorrow;
  const shortDate = (key: string) => dateFromKey(key).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });
  const name = character ? friendName(character, true) : '';

  // Other day opens the app's own calendar on every platform (owner, 2026-10-17), not the system one.
  const pickOtherDay = () => setOpen('day');

  const pickTime = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: asDate(date, minutes),
        mode: 'time',
        is24Hour: true,
        onChange: (e, d) => e.type === 'set' && d && setMinutes(d.getHours() * 60 + d.getMinutes()),
      });
    } else if (Platform.OS === 'ios') {
      setOpen((o) => (o === 'time' ? null : 'time'));
    } else {
      // Web has no native time picker: each tap steps a quarter of an hour.
      setMinutes((m) => (m + STEP_MIN) % DAY_MIN);
    }
  };

  const submit = () => {
    const clean = title.trim();
    if (!clean) return;
    const time = timed ? toClock(minutes) : undefined;
    const base =
      date === today
        ? 'today'
        : date === tomorrow
          ? 'tomorrow'
          : `on ${dateFromKey(date).toLocaleDateString(i18n.language, { weekday: 'short', month: 'short', day: 'numeric' })}`;
    onSubmit({ title: clean, date, time, whenLabel: time ? `${base} at ${time}` : base });
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('us.newPlan')} avoidKeyboard>
      <View style={styles.group}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={t('us.planPlaceholder')}
          placeholderTextColor={colors.textFaint}
          maxLength={TITLE_MAX}
          returnKeyType="done"
          onSubmitEditing={submit}
          accessibilityLabel={t('us.planPlaceholder')}
          style={styles.input}
        />
      </View>

      <View style={[styles.group, styles.gap]}>
        {character ? (
          <View style={[styles.row, styles.line]}>
            <InkText style={styles.grow}>{t('us.with')}</InkText>
            <CharacterAvatar character={character} size={26} />
            <InkText color={ink.text2}>{name}</InkText>
          </View>
        ) : null}

        <InkText style={styles.dayLabel}>{t('us.day')}</InkText>
        <View style={styles.segment} accessibilityRole="radiogroup">
          <Segment label={t('common.today')} active={date === today} onPress={() => setDate(today)} />
          <Segment label={t('common.tomorrow')} active={date === tomorrow} onPress={() => setDate(tomorrow)} />
          <Segment
            label={later ? shortDate(date) : t('us.otherDay')}
            icon
            active={later}
            accessibilityLabel={t('us.pickDay')}
            onPress={pickOtherDay}
          />
        </View>

        <View style={[styles.row, styles.lineTop]}>
          <InkText style={styles.grow}>{t('us.time')}</InkText>
          {timed ? (
            <PressableScale
              scaleTo={0.94}
              onPress={pickTime}
              accessibilityRole="button"
              accessibilityLabel={`${t('us.time')}, ${toClock(minutes)}`}
              style={styles.timePill}>
              <InkText color={ink.accent} style={styles.tabular}>
                {toClock(minutes)}
              </InkText>
            </PressableScale>
          ) : null}
          <Toggle
            value={timed}
            onChange={(on) => {
              setTimed(on);
              if (!on) setOpen((o) => (o === 'time' ? null : o));
            }}
            accessibilityLabel={t('us.atTime')}
          />
        </View>
        {open === 'time' && timed && Platform.OS === 'ios' ? (
          <DateTimePicker
            value={asDate(date, minutes)}
            mode="time"
            display="spinner"
            minuteInterval={5}
            onChange={(_, d) => d && setMinutes(d.getHours() * 60 + d.getMinutes())}
          />
        ) : null}
      </View>

      {character ? (
        <InkText variant="footnote" style={styles.footer}>
          {timed ? t('us.remindBefore', { name, count: REMIND_BEFORE_MIN }) : t('us.remindMorning', { name })}
        </InkText>
      ) : null}

      {/* One big action with its price, as on the alarm screens (owner, 2026-11-07). */}
      <PressableScale
        onPress={submit}
        disabled={!title.trim()}
        accessibilityRole="button"
        accessibilityState={{ disabled: !title.trim() }}
        accessibilityLabel={cost ? `${t('chat.setup.add')}, ${cost} ${t('common.shells')}` : t('chat.setup.add')}
        style={[styles.cta, !title.trim() && styles.ctaOff]}>
        <InkText variant="bodyStrong" color={ink.onAccent}>
          {t('chat.setup.add')}
        </InkText>
        {cost ? (
          <View style={styles.cost}>
            <ShellIcon size={15} />
            <InkText variant="subStrong" color={ink.onAccent} style={styles.tabular}>
              {cost}
            </InkText>
          </View>
        ) : null}
      </PressableScale>

      {/* The app's own calendar for a later day (the time keeps the system picker). */}
      <CalendarPopover
        visible={open === 'day'}
        onClose={() => setOpen(null)}
        value={date}
        onChange={setDate}
        marked={new Set()}
        top={Math.round(height * 0.18)}
        allow="future"
      />
    </Sheet>
  );
}

/** One side of the iOS segmented control: the chosen one is a raised white pill. */
function Segment({
  label,
  icon,
  active,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  icon?: boolean;
  active: boolean;
  accessibilityLabel?: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      scaleTo={0.97}
      style={[styles.segmentItem, active && styles.segmentOn]}
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: active }}
      onPress={onPress}>
      {icon ? <Ionicons name="calendar-outline" size={13} color={ink.text} /> : null}
      <InkText variant={active ? 'subStrong' : 'sub'} color={ink.text} lines={1}>
        {label}
      </InkText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  // iOS inset groups on the sheet: raised cards, hairlines between rows.
  group: { borderRadius: inkRadius.field, borderCurve: 'continuous', backgroundColor: ink.card, overflow: 'hidden' },
  gap: { marginTop: 22 },
  input: { ...inkType.body, minHeight: 48, paddingHorizontal: space.lg },
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, paddingHorizontal: space.lg },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ink.line },
  lineTop: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: ink.line, minHeight: 52 },
  dayLabel: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm },
  // Apple's segmented control on dark.
  segment: {
    flexDirection: 'row',
    minHeight: 34,
    marginHorizontal: space.lg,
    marginBottom: space.md,
    padding: 2,
    borderRadius: inkRadius.pill,
    backgroundColor: ink.raised,
  },
  segmentItem: { flex: 1, flexDirection: 'row', gap: 4, borderRadius: inkRadius.pill, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: systemColors.thumb },
  timePill: { minHeight: 34, paddingHorizontal: space.md, borderRadius: inkRadius.pill, backgroundColor: colors.primarySofter, justifyContent: 'center' },
  footer: { marginTop: space.sm, marginHorizontal: space.lg },
  // Adding a plan costs shells: the money peach.
  cta: {
    minHeight: 56,
    borderRadius: inkRadius.pill,
    marginTop: space.lg,
    marginHorizontal: space.lg,
    backgroundColor: ink.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  ctaOff: { opacity: 0.45 },
  cost: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 4, borderRadius: inkRadius.pill, backgroundColor: 'rgba(42,26,18,0.12)' },
});
