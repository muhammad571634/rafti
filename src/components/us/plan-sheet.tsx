import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button, Chip, PressableScale, Sheet, Txt } from '@/components/ui';
import { dateFromKey, dayKeyFromToday } from '@/mock';
import { colors, fonts, radius, space } from '@/theme';

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

/** A plan by hand: what, which day (the day picked on the calendar is offered), and an optional time. */
export function PlanSheet({
  visible,
  onClose,
  day,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  /** The day selected on the calendar */
  day: string;
  onSubmit: (plan: NewPlan) => void;
}) {
  const { t, i18n } = useTranslation();
  const today = dayKeyFromToday(0);
  const tomorrow = dayKeyFromToday(1);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(day);
  const [timed, setTimed] = useState(true);
  const [minutes, setMinutes] = useState(defaultMinutes);

  // Every opening starts clean, on the day picked in the calendar.
  useEffect(() => {
    if (!visible) return;
    setTitle('');
    setDate(day < today ? today : day);
    setTimed(true);
    setMinutes(defaultMinutes());
  }, [visible, day, today]);

  const days = [today, tomorrow, ...(day > tomorrow ? [day] : [])];
  const dayLabel = (key: string) =>
    key === today
      ? t('common.today')
      : key === tomorrow
        ? t('common.tomorrow')
        : dateFromKey(key).toLocaleDateString(i18n.language, { weekday: 'short', month: 'short', day: 'numeric' });

  const step = (delta: number) => setMinutes((m) => (m + delta + DAY_MIN) % DAY_MIN);

  const submit = () => {
    const clean = title.trim();
    if (!clean) return;
    const time = timed ? toClock(minutes) : undefined;
    const base = date === today ? 'today' : date === tomorrow ? 'tomorrow' : `on ${dayLabel(date)}`;
    onSubmit({ title: clean, date, time, whenLabel: time ? `${base} at ${time}` : base });
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('us.newPlan')}>
      <View style={styles.body}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={t('us.planPlaceholder')}
          placeholderTextColor={colors.textFaint}
          maxLength={TITLE_MAX}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={submit}
          style={styles.input}
        />

        <View style={styles.chips}>
          {days.map((key) => (
            <Chip key={key} label={dayLabel(key)} active={date === key} onPress={() => setDate(key)} />
          ))}
        </View>

        <View style={styles.chips}>
          <Chip label={t('us.anyTime')} active={!timed} onPress={() => setTimed(false)} />
          <Chip label={t('us.atTime')} active={timed} onPress={() => setTimed(true)} />
        </View>

        {timed ? (
          <View style={styles.clock}>
            <Stepper icon="remove" label={t('us.earlier')} onPress={() => step(-STEP_MIN)} />
            <Txt variant="heroUnit" style={styles.time}>
              {toClock(minutes)}
            </Txt>
            <Stepper icon="add" label={t('us.later')} onPress={() => step(STEP_MIN)} />
          </View>
        ) : null}

        <Button label={t('us.addPlan')} full disabled={!title.trim()} onPress={submit} />
      </View>
    </Sheet>
  );
}

function Stepper({ icon, label, onPress }: { icon: 'add' | 'remove'; label: string; onPress: () => void }) {
  return (
    <PressableScale style={styles.stepper} scaleTo={0.88} accessibilityLabel={label} onPress={onPress}>
      <Ionicons name={icon} size={20} color={colors.text} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.lg },
  input: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  clock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.lg },
  time: { minWidth: 90, textAlign: 'center', fontVariant: ['tabular-nums'] },
  stepper: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
});
