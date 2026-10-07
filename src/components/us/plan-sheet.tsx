import { Ionicons } from '@expo/vector-icons';
import { CalendarDotsIcon } from 'phosphor-react-native/src/icons/CalendarDots';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';

import { CalendarPopover } from '@/components/diary/calendar-popover';
import { Button, CharacterAvatar, PressableScale, Sheet, Txt } from '@/components/ui';
import { useKeyboardVisible } from '@/hooks/use-keyboard-visible';
import { dateFromKey, dayKeyFromToday } from '@/mock';
import { colors, fonts, radius, space } from '@/theme';
import type { Character } from '@/types';

const STEP_MIN = 15;
const DAY_MIN = 24 * 60;
const TITLE_MAX = 40;
/** The sheet takes most of the screen, so nothing in it is cramped. */
const SHEET_SHARE = 0.72;

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

/**
 * A plan by hand: what, which day and, if it matters, what time. Days are three
 * equal buttons — Today, Tomorrow and the calendar, which shows the date once a
 * later day is picked from it.
 */
export function PlanSheet({
  visible,
  onClose,
  day,
  character,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  /** The day selected on the calendar */
  day: string;
  /** The friend the plan is with; they send the reminder */
  character?: Character;
  onSubmit: (plan: NewPlan) => void;
}) {
  const { t, i18n } = useTranslation();
  const { height } = useWindowDimensions();
  const keyboard = useKeyboardVisible();
  const today = dayKeyFromToday(0);
  const tomorrow = dayKeyFromToday(1);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(day);
  const [timed, setTimed] = useState(true);
  const [minutes, setMinutes] = useState(defaultMinutes);
  const [focused, setFocused] = useState(false);
  const [picking, setPicking] = useState(false);

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
  }, [visible]);

  const later = date !== today && date !== tomorrow;
  const shortDate = (key: string) => dateFromKey(key).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });

  const step = (delta: number) => setMinutes((m) => (m + delta + DAY_MIN) % DAY_MIN);

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
    <Sheet visible={visible} onClose={onClose} avoidKeyboard>
      {/* Tall while browsing; while typing it gives the room back to the keyboard. */}
      <View style={[styles.body, !keyboard && { minHeight: Math.round(height * SHEET_SHARE) }]}>
        <View style={styles.head}>
          <Txt variant="h1" style={styles.grow}>
            {t('us.newPlan')}
          </Txt>
          {character ? <CharacterAvatar character={character} size={40} /> : null}
        </View>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={t('us.planPlaceholder')}
          placeholderTextColor={colors.textFaint}
          maxLength={TITLE_MAX}
          returnKeyType="done"
          onSubmitEditing={submit}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, focused && styles.inputFocused]}
        />

        <View style={styles.group}>
          <Txt variant="title">{t('us.day')}</Txt>
          <View style={styles.segments}>
            <Segment label={t('common.today')} active={date === today} onPress={() => setDate(today)} />
            <Segment label={t('common.tomorrow')} active={date === tomorrow} onPress={() => setDate(tomorrow)} />
            <Segment
              label={later ? shortDate(date) : undefined}
              icon
              active={later}
              accessibilityLabel={t('us.pickDay')}
              onPress={() => setPicking(true)}
            />
          </View>
        </View>

        <View style={styles.group}>
          <Txt variant="title">{t('us.time')}</Txt>
          <View style={styles.segments}>
            <Segment label={t('us.anyTime')} active={!timed} onPress={() => setTimed(false)} />
            <Segment label={t('us.atTime')} active={timed} onPress={() => setTimed(true)} />
          </View>
          {timed ? (
            <View style={styles.clock}>
              <Stepper icon="remove" label={t('us.earlier')} onPress={() => step(-STEP_MIN)} />
              <Txt variant="heroFigure" style={styles.time}>
                {toClock(minutes)}
              </Txt>
              <Stepper icon="add" label={t('us.later')} onPress={() => step(STEP_MIN)} />
            </View>
          ) : null}
        </View>

        <View style={styles.grow} />
        <Button label={t('us.addPlan')} full size="lg" disabled={!title.trim()} onPress={submit} />
      </View>

      <CalendarPopover
        visible={picking}
        onClose={() => setPicking(false)}
        value={date}
        onChange={setDate}
        marked={new Set()}
        top={Math.round(height * 0.18)}
        allow="future"
      />
    </Sheet>
  );
}

/** One of a row of equal buttons: grey when idle, ink when chosen. */
function Segment({
  label,
  icon,
  active,
  accessibilityLabel,
  onPress,
}: {
  label?: string;
  icon?: boolean;
  active: boolean;
  accessibilityLabel?: string;
  onPress: () => void;
}) {
  const fg = active ? colors.textOnPrimary : colors.text;
  return (
    <PressableScale
      style={[styles.segment, active && styles.segmentActive]}
      scaleTo={0.96}
      dimOnPress={false}
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: active }}
      onPress={onPress}>
      {icon ? <CalendarDotsIcon size={22} weight="bold" color={fg} /> : null}
      {label ? (
        <Txt variant="bodyStrong" color={fg} lines={1}>
          {label}
        </Txt>
      ) : null}
    </PressableScale>
  );
}

function Stepper({ icon, label, onPress }: { icon: 'add' | 'remove'; label: string; onPress: () => void }) {
  return (
    <PressableScale style={styles.stepper} scaleTo={0.88} accessibilityLabel={label} onPress={onPress}>
      <Ionicons name={icon} size={26} color={colors.text} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  body: { gap: space.xl, paddingTop: space.xs },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  input: {
    height: 58,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    fontSize: 18,
    fontWeight: '600',
    fontFamily: fonts.body,
    color: colors.text,
  },
  inputFocused: { borderColor: colors.primary },
  group: { gap: space.md },
  segments: { flexDirection: 'row', gap: space.sm },
  segment: {
    flex: 1,
    flexDirection: 'row',
    gap: space.xs,
    height: 50,
    paddingHorizontal: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: { backgroundColor: colors.text },
  clock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xl, paddingTop: space.xs },
  time: { minWidth: 130, textAlign: 'center', fontVariant: ['tabular-nums'] },
  stepper: {
    width: 54,
    height: 54,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
});
