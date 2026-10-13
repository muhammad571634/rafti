import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TimeWheel } from '@/components/alarms/time-wheel';
import { CharacterAvatar, Toggle, Txt } from '@/components/ui';
import { dayNames, repeatText, uses12Hour } from '@/lib/alarm-format';
import { ALARM_SOUNDS } from '@/lib/alarms';
import { allowAlarms } from '@/notifications/alarms';
import { useAppStore } from '@/store/use-app-store';
import { colors, radius, space, type } from '@/theme';
import type { Alarm, AlarmSound, Character } from '@/types';

type Page = 'main' | 'repeat' | 'who' | 'sound';
type Draft = Omit<Alarm, 'id' | 'createdAt' | 'enabled'>;

/**
 * Add or edit a wake-up alarm, as the iPhone's Clock sheet (approved prototype B and C):
 * Cancel / title / Save, the time wheel, then Repeat, Label, Who wakes you, Sound,
 * Reply to wake up and Snooze. Repeat, Who and Sound open as pages inside the sheet.
 */
export default function AlarmEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editId = Array.isArray(id) ? id[0] : id;
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const existing = useAppStore((s) => (editId ? s.alarms.find((a) => a.id === editId) : undefined));
  const characters = useAppStore((s) => s.characters);
  const conversations = useAppStore((s) => s.conversations);
  const blockedIds = useAppStore((s) => s.blockedIds);
  const saveAlarm = useAppStore((s) => s.saveAlarm);
  const deleteAlarm = useAppStore((s) => s.deleteAlarm);
  const h12 = uses12Hour();

  // Friends, the one you talked with last first.
  const friends = useMemo(
    () =>
      [...conversations]
        .sort((a, b) => Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt))
        .map((c) => characters.find((ch) => ch.id === c.characterId))
        .filter((c): c is Character => !!c && !blockedIds.includes(c.id)),
    [conversations, characters, blockedIds],
  );

  const [draft, setDraft] = useState<Draft>(() => {
    if (existing) {
      const { id: _id, createdAt: _c, enabled: _e, ...rest } = existing;
      return rest;
    }
    const now = new Date();
    const friend = friends.find((f) => f.voiceReady) ?? friends[0];
    return {
      hour: now.getHours(),
      minute: now.getMinutes(),
      repeat: [],
      label: '',
      characterId: friend?.id,
      voice: !!friend?.voiceReady,
      sound: 'morningTide',
      replyToWake: !!friend,
      snooze: true,
    };
  });
  const [page, setPage] = useState<Page>('main');

  const friend = characters.find((c) => c.id === draft.characterId);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  // Opened from a link there is nothing to go back to: land on the list instead.
  const close = () => (router.canGoBack() ? router.back() : router.replace('/alarms'));

  const save = () => {
    saveAlarm({ ...draft, id: existing?.id });
    // The first alarm asks for notifications; where they cannot run the list still works.
    void allowAlarms();
    close();
  };

  const remove = () => {
    if (existing) deleteAlarm(existing.id);
    close();
  };

  const title =
    page === 'repeat' ? t('alarms.repeat') : page === 'who' ? t('alarms.who') : page === 'sound' ? t('alarms.sound') : existing ? t('alarms.edit') : t('alarms.add');

  return (
    <View style={[styles.sheet, { paddingTop: Math.max(insets.top, space.md) }]}>
      <View style={styles.nav}>
        {page === 'main' ? (
          <NavButton label={t('alarms.cancel')} onPress={close} />
        ) : (
          <NavButton label={t('alarms.back')} chevron onPress={() => setPage('main')} />
        )}
        <Txt variant="bodyStrong" style={styles.navTitle}>
          {title}
        </Txt>
        {page === 'main' ? <NavButton label={t('alarms.save')} strong onPress={save} /> : <View style={styles.navSpacer} />}
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + space.xxl }]} keyboardShouldPersistTaps="handled">
        {page === 'main' ? (
          <>
            <TimeWheel hour={draft.hour} minute={draft.minute} h12={h12} onChange={(hour, minute) => set({ hour, minute })} />
            <Group>
              <Cell label={t('alarms.repeat')} value={repeatText(t, draft.repeat, i18n.language)} onPress={() => setPage('repeat')} />
              <View style={styles.cell}>
                <Txt variant="body">{t('alarms.label')}</Txt>
                <TextInput
                  value={draft.label}
                  onChangeText={(label) => set({ label })}
                  placeholder={t('alarms.defaultLabel')}
                  placeholderTextColor={colors.textMuted}
                  style={styles.labelInput}
                  maxLength={40}
                  returnKeyType="done"
                />
              </View>
              <Cell label={t('alarms.who')} value={friend?.name ?? t('alarms.nobody')} onPress={() => setPage('who')} />
              <Cell label={t('alarms.sound')} value={t(`alarms.sounds.${draft.sound}`)} onPress={() => setPage('sound')} />
              <SwitchCell
                label={t('alarms.replyToWake')}
                value={draft.replyToWake && !!friend}
                disabled={!friend}
                onChange={(replyToWake) => set({ replyToWake })}
              />
              <SwitchCell label={t('alarms.snooze')} value={draft.snooze} onChange={(snooze) => set({ snooze })} last />
            </Group>
            {existing ? (
              <Group>
                <Pressable style={[styles.cell, styles.last]} onPress={remove} accessibilityRole="button">
                  <Txt variant="body" color={colors.dangerText}>
                    {t('alarms.deleteAlarm')}
                  </Txt>
                </Pressable>
              </Group>
            ) : null}
          </>
        ) : null}

        {page === 'repeat' ? (
          <Group>
            {dayNames(i18n.language).map((name, day) => (
              <CheckCell
                key={day}
                label={t('alarms.everyDayName', { day: name })}
                checked={draft.repeat.includes(day)}
                last={day === 6}
                onPress={() =>
                  setDraft((d) => ({
                    ...d,
                    repeat: d.repeat.includes(day) ? d.repeat.filter((x) => x !== day) : [...d.repeat, day].sort(),
                  }))
                }
              />
            ))}
          </Group>
        ) : null}

        {page === 'who' ? (
          <Group>
            <CheckCell
              label={t('alarms.nobody')}
              checked={!draft.characterId}
              onPress={() => set({ characterId: undefined, voice: false, replyToWake: false })}
              last={friends.length === 0}
            />
            {friends.map((c, i) => (
              <CheckCell
                key={c.id}
                label={c.name}
                lead={<CharacterAvatar character={c} size={30} />}
                checked={draft.characterId === c.id}
                last={i === friends.length - 1}
                onPress={() => set({ characterId: c.id, voice: c.voiceReady, replyToWake: draft.characterId ? draft.replyToWake : true })}
              />
            ))}
          </Group>
        ) : null}

        {page === 'sound' ? (
          <>
            <Txt variant="caption" color={colors.textMuted} style={styles.groupTitle}>
              {t('alarms.theirVoice').toUpperCase()}
            </Txt>
            <Group>
              {friend?.voiceReady ? (
                <CheckCell
                  label={t('alarms.saysGoodMorning', { name: friend.name.split(' ')[0] })}
                  checked={draft.voice}
                  onPress={() => set({ voice: true })}
                />
              ) : null}
              <CheckCell label={t('alarms.voiceOff')} checked={!draft.voice} onPress={() => set({ voice: false })} last />
            </Group>
            <Txt variant="caption" color={colors.textMuted} style={styles.groupTitle}>
              {t('alarms.melody').toUpperCase()}
            </Txt>
            <Group>
              {ALARM_SOUNDS.map((sound: AlarmSound, i) => (
                <CheckCell
                  key={sound}
                  label={t(`alarms.sounds.${sound}`)}
                  checked={draft.sound === sound}
                  last={i === ALARM_SOUNDS.length - 1}
                  onPress={() => set({ sound })}
                />
              ))}
            </Group>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function NavButton({ label, onPress, strong, chevron }: { label: string; onPress: () => void; strong?: boolean; chevron?: boolean }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.navButton} accessibilityRole="button">
      {chevron ? <Ionicons name="chevron-back" size={20} color={colors.primary} /> : null}
      <Txt variant={strong ? 'bodyStrong' : 'body'} color={colors.primary}>
        {label}
      </Txt>
    </Pressable>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

function Cell({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable style={styles.cell} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}, ${value}`}>
      <Txt variant="body">{label}</Txt>
      <View style={styles.value}>
        <Txt variant="body" color={colors.textMuted} lines={1} style={styles.valueText}>
          {value}
        </Txt>
        <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
      </View>
    </Pressable>
  );
}

function SwitchCell({
  label,
  value,
  onChange,
  disabled,
  last,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.cell, last && styles.last]}>
      <Txt variant="body" color={disabled ? colors.textMuted : colors.text}>
        {label}
      </Txt>
      <Toggle value={value} onChange={onChange} disabled={disabled} onColor={colors.success} accessibilityLabel={label} />
    </View>
  );
}

function CheckCell({
  label,
  checked,
  onPress,
  lead,
  last,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
  lead?: React.ReactNode;
  last?: boolean;
}) {
  return (
    <Pressable
      style={[styles.cell, last && styles.last]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: checked }}>
      <View style={styles.lead}>
        {lead}
        <Txt variant="body">{label}</Txt>
      </View>
      {checked ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.bgPlain },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingBottom: space.sm },
  navTitle: { flex: 1, textAlign: 'center' },
  navButton: { flexDirection: 'row', alignItems: 'center', minWidth: 64, minHeight: 44 },
  navSpacer: { minWidth: 64 },
  scroll: { gap: space.lg, paddingTop: space.sm },
  group: {
    marginHorizontal: space.lg,
    borderRadius: radius.sm + 1,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  groupTitle: { marginHorizontal: space.lg + space.lg, marginBottom: -space.sm, letterSpacing: 0.4 },
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    minHeight: 46,
    paddingHorizontal: space.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  last: { borderBottomWidth: 0 },
  value: { flexDirection: 'row', alignItems: 'center', gap: space.xs, flexShrink: 1 },
  valueText: { flexShrink: 1 },
  labelInput: { flex: 1, textAlign: 'right', color: colors.textMuted, paddingVertical: space.sm, ...type.body },
  lead: { flexDirection: 'row', alignItems: 'center', gap: space.md, flexShrink: 1 },
});
