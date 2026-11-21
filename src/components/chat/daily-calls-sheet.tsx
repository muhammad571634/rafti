import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CharacterAvatar, PressableScale, SFIcon, Sheet, Toggle, Txt } from '@/components/ui';
import { shortName } from '@/lib/format';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, space, systemColors } from '@/theme';

const STEP_MIN = 30;
const DAY_MIN = 24 * 60;

const pad = (n: number) => String(n).padStart(2, '0');
const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};
const toClock = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/**
 * Daily calls for every chat: who rings, and when in the morning and at night.
 * Only friends with a voice can call; the one picked here is the one who rings.
 */
export function DailyCallsSheet({
  visible,
  onClose,
  characterId,
}: {
  visible: boolean;
  onClose: () => void;
  /** The chat this was opened from; their voice is offered first */
  characterId: string;
}) {
  const { t } = useTranslation();
  const settings = useAppStore((s) => s.settings);
  const setSetting = useAppStore((s) => s.setSetting);
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);

  const callers = useMemo(
    () => characters.filter((c) => c.voiceReady && relationships[c.id]),
    [characters, relationships],
  );

  const [callerId, setCallerId] = useState<string | undefined>();
  const [morning, setMorning] = useState({ on: true, at: 8 * 60 });
  const [night, setNight] = useState({ on: true, at: 21 * 60 });
  /** Which row's wheel is open (iOS). */
  const [picking, setPicking] = useState<'morning' | 'night' | null>(null);

  // Each opening starts from what is saved; the chat's friend is preselected when they can call.
  useEffect(() => {
    if (!visible) return;
    const current = settings.callerId && callers.some((c) => c.id === settings.callerId) ? settings.callerId : undefined;
    setCallerId(current ?? (callers.some((c) => c.id === characterId) ? characterId : callers[0]?.id));
    setMorning({ on: settings.morningCall, at: toMinutes(settings.morningCallTime) });
    setNight({ on: settings.nightCall, at: toMinutes(settings.nightCallTime) });
    setPicking(null);
    // Only on opening: edits in the sheet must not be reset by store updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const save = () => {
    setSetting('callerId', callerId);
    setSetting('morningCall', morning.on);
    setSetting('morningCallTime', toClock(morning.at));
    setSetting('nightCall', night.on);
    setSetting('nightCallTime', toClock(night.at));
    onClose();
  };

  return (
    // Clock-app look (approved prototype `SheetCalls.dc.html`): pick who rings, then two alarm rows.
    <Sheet visible={visible} onClose={onClose} title={t('games.dailyCalls')} onDone={save} doneDisabled={!callerId}>
      <View style={styles.body}>
        {callers.length === 0 ? (
          <Txt style={styles.empty}>{t('games.noVoices')}</Txt>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.people}>
            {callers.map((c) => {
              const on = c.id === callerId;
              const name = shortName(displayName(c, relationships[c.id]));
              return (
                <PressableScale
                  key={c.id}
                  style={styles.person}
                  scaleTo={0.94}
                  accessibilityRole="radio"
                  accessibilityLabel={name}
                  accessibilityState={{ selected: on }}
                  onPress={() => setCallerId(c.id)}>
                  <View collapsable={false} style={[styles.face, on && styles.faceOn]}>
                    <CharacterAvatar character={c} size={56} />
                    {on ? (
                      <View style={styles.tick}>
                        <Ionicons name="checkmark" size={12} color={colors.white} />
                      </View>
                    ) : null}
                  </View>
                  <Txt style={[styles.personName, on && styles.personNameOn]} lines={1}>
                    {name}
                  </Txt>
                </PressableScale>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.group}>
          <CallRow
            icon={<SFIcon ios="sun.max.fill" icon="sunny" size={22} color={SUN} />}
            label={t('games.morning')}
            value={morning}
            onChange={setMorning}
            open={picking === 'morning'}
            onToggle={() => setPicking((p) => (p === 'morning' ? null : 'morning'))}
          />
          <CallRow
            icon={<SFIcon ios="moon.fill" icon="moon" size={20} color={MOON} />}
            label={t('games.night')}
            value={night}
            onChange={setNight}
            open={picking === 'night'}
            onToggle={() => setPicking((p) => (p === 'night' ? null : 'night'))}
            last
          />
        </View>
      </View>
    </Sheet>
  );
}

/** iOS system orange and indigo, as the Clock and Sleep apps colour morning and night. */
const SUN = systemColors.orange;
const MOON = systemColors.indigo;

/** The time as a Date for the system picker (only hours and minutes matter). */
const asDate = (minutes: number) => {
  const d = new Date();
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
};

/**
 * One call: icon, label, the time in a grey pill and a switch. Tapping the time opens the
 * system time picker: a wheel under the row on iOS (Clock app), the clock dialog on Android.
 * Web has no native picker, so the pill steps 30 minutes later there.
 */
function CallRow({
  icon,
  label,
  value,
  onChange,
  open,
  onToggle,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  value: { on: boolean; at: number };
  onChange: (v: { on: boolean; at: number }) => void;
  open: boolean;
  onToggle: () => void;
  last?: boolean;
}) {
  const pick = (date?: Date) => {
    if (date) onChange({ ...value, at: date.getHours() * 60 + date.getMinutes() });
  };
  const pressTime = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: asDate(value.at), mode: 'time', is24Hour: true, onChange: (_, date) => pick(date) });
    } else if (Platform.OS === 'ios') {
      onToggle();
    } else {
      onChange({ ...value, at: (value.at + STEP_MIN) % DAY_MIN });
    }
  };

  return (
    <View style={!last && styles.rowLine}>
      <View style={styles.row}>
        {icon}
        <Txt style={styles.label}>{label}</Txt>
        <Pressable
          onPress={pressTime}
          accessibilityRole="button"
          accessibilityLabel={`${label}, ${toClock(value.at)}`}
          style={[styles.time, open && styles.timeOpen]}>
          <Txt style={styles.timeText} color={open ? colors.brandText : colors.text}>
            {toClock(value.at)}
          </Txt>
        </Pressable>
        <Toggle
          value={value.on}
          onChange={(on) => onChange({ ...value, on })}
          accessibilityLabel={label}
        />
      </View>
      {open && Platform.OS === 'ios' ? (
        <DateTimePicker
          value={asDate(value.at)}
          mode="time"
          display="spinner"
          minuteInterval={5}
          onChange={(_, date) => pick(date)}
          style={styles.wheel}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.lg },
  empty: { fontSize: 15, color: colors.textSecondary },
  people: { gap: space.lg, paddingHorizontal: space.xs, paddingVertical: space.xs },
  person: { alignItems: 'center', gap: 6, width: 64 },
  // The picked caller: a peach ring with a white gap, and a peach tick badge.
  face: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
  faceOn: { borderWidth: 2.5, borderColor: colors.primary },
  tick: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personName: { fontSize: 13, color: colors.textSecondary },
  personNameOn: { fontWeight: '600', color: colors.text },
  group: { borderRadius: 14, backgroundColor: colors.bg, overflow: 'hidden' },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  label: { flex: 1, fontSize: 17, letterSpacing: -0.4 },
  time: { height: 34, paddingHorizontal: space.md, borderRadius: 8, backgroundColor: colors.surfaceAlt, justifyContent: 'center' },
  timeOpen: { backgroundColor: colors.primarySoft },
  timeText: { fontSize: 17, fontVariant: ['tabular-nums'] },
  wheel: { alignSelf: 'stretch' },
});
