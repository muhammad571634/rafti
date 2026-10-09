import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button, Chip, PressableScale, Sheet, Txt } from '@/components/ui';
import { INTEREST_OPTIONS, MAX_INTERESTS, birthdayKey, daysInMonth } from '@/lib/profile';
import { colors, radius, space, type } from '@/theme';

/** One text field and Save. Cleared to the saved value each time it opens. */
export function TextFieldSheet({
  visible,
  title,
  value,
  max,
  multiline,
  required,
  onSave,
  onClose,
}: {
  visible: boolean;
  title: string;
  value: string;
  max: number;
  multiline?: boolean;
  /** A name cannot be saved empty; the other fields can be cleared. */
  required?: boolean;
  onSave: (value: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  const trimmed = draft.trim();

  return (
    <Sheet visible={visible} onClose={onClose} title={title} avoidKeyboard>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        maxLength={max}
        multiline={multiline}
        placeholderTextColor={colors.textFaint}
        style={[styles.input, multiline && styles.multiline]}
        accessibilityLabel={title}
      />
      <Txt variant="caption" color={colors.textMuted} style={styles.count}>
        {draft.length}/{max}
      </Txt>
      <Button
        label={t('editProfile.save')}
        size="lg"
        full
        disabled={(required && !trimmed) || trimmed === value.trim()}
        onPress={() => {
          onSave(trimmed);
          onClose();
        }}
      />
    </Sheet>
  );
}

/** A short list with a check on the current pick; picking saves and closes. */
export function OptionSheet<T extends string>({
  visible,
  title,
  options,
  value,
  onPick,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: { value: T; label: string }[];
  value?: T;
  onPick: (value: T) => void;
  onClose: () => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.options}>
        {options.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            active={option.value === value}
            style={styles.option}
            onPress={() => {
              onPick(option.value);
              onClose();
            }}
          />
        ))}
      </View>
    </Sheet>
  );
}

const MONTHS = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleString('en', { month: 'short' }),
);

/** Month and day only: the year is the one from the 18+ gate and is not edited here. */
export function BirthdaySheet({
  visible,
  value,
  onSave,
  onClose,
}: {
  visible: boolean;
  /** "MM-DD" */
  value?: string;
  onSave: (value: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [month, setMonth] = useState<number | null>(null);
  const [day, setDay] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) return;
    const [m, d] = value ? value.split('-').map(Number) : [null, null];
    setMonth(m);
    setDay(d);
  }, [visible, value]);

  const days = month ? daysInMonth(month) : 31;

  return (
    <Sheet visible={visible} onClose={onClose} title={t('editProfile.birthday')}>
      <View style={styles.months}>
        {MONTHS.map((label, i) => (
          <Chip
            key={label}
            label={label}
            active={month === i + 1}
            style={styles.month}
            onPress={() => {
              setMonth(i + 1);
              if (day && day > daysInMonth(i + 1)) setDay(null);
            }}
          />
        ))}
      </View>
      <View style={styles.days}>
        {Array.from({ length: days }, (_, i) => i + 1).map((d) => {
          const on = day === d;
          return (
            <PressableScale
              key={d}
              scaleTo={0.9}
              onPress={() => setDay(d)}
              accessibilityState={{ selected: on }}
              style={styles.dayCell}>
              <View style={[styles.day, on && styles.dayOn]}>
                <Txt variant="smallStrong" color={on ? colors.textOnPrimary : colors.text}>
                  {d}
                </Txt>
              </View>
            </PressableScale>
          );
        })}
      </View>
      <Button
        label={t('editProfile.save')}
        size="lg"
        full
        disabled={!month || !day}
        onPress={() => {
          if (!month || !day) return;
          onSave(birthdayKey(month, day));
          onClose();
        }}
      />
    </Sheet>
  );
}

/** Up to ten from the fixed list. */
export function InterestsSheet({
  visible,
  value,
  onSave,
  onClose,
}: {
  visible: boolean;
  value: string[];
  onSave: (value: string[]) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<string[]>(value);

  useEffect(() => {
    if (visible) setPicked(value);
  }, [visible, value]);

  const toggle = (interest: string) =>
    setPicked((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : prev.length < MAX_INTERESTS
          ? [...prev, interest]
          : prev,
    );

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('editProfile.interests', { count: picked.length, max: MAX_INTERESTS })}>
      <View style={styles.options}>
        {INTEREST_OPTIONS.map((interest) => (
          <Chip
            key={interest}
            label={interest}
            active={picked.includes(interest)}
            onPress={() => toggle(interest)}
          />
        ))}
      </View>
      <Button
        label={t('editProfile.save')}
        size="lg"
        full
        onPress={() => {
          onSave(picked);
          onClose();
        }}
      />
    </Sheet>
  );
}

const DAY = 38;

const styles = StyleSheet.create({
  input: {
    minHeight: 52,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    ...type.title,
  },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  count: { alignSelf: 'flex-end', marginTop: space.xs, marginBottom: space.md },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.lg },
  option: { height: 44 },
  months: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.lg },
  month: { width: '22.5%', paddingHorizontal: 0, alignItems: 'center' },
  // A week per row, like a calendar.
  days: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: space.lg },
  dayCell: { width: `${100 / 7}%`, height: DAY + space.xs, alignItems: 'center', justifyContent: 'center' },
  day: {
    width: DAY,
    height: DAY,
    borderRadius: DAY / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayOn: { backgroundColor: colors.primary },
});
