import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button, CharacterAvatar, ClayIcon, PressableScale, Sheet, Toggle, Txt } from '@/components/ui';
import { shortName } from '@/lib/format';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, radius, space } from '@/theme';

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

  // Each opening starts from what is saved; the chat's friend is preselected when they can call.
  useEffect(() => {
    if (!visible) return;
    const current = settings.callerId && callers.some((c) => c.id === settings.callerId) ? settings.callerId : undefined;
    setCallerId(current ?? (callers.some((c) => c.id === characterId) ? characterId : callers[0]?.id));
    setMorning({ on: settings.morningCall, at: toMinutes(settings.morningCallTime) });
    setNight({ on: settings.nightCall, at: toMinutes(settings.nightCallTime) });
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
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.body}>
        <Txt variant="h1">{t('games.dailyCalls')}</Txt>

        {callers.length === 0 ? (
          <Txt variant="body" color={colors.textSecondary}>
            {t('games.noVoices')}
          </Txt>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.people}>
            {callers.map((c) => {
              const on = c.id === callerId;
              return (
                <PressableScale
                  key={c.id}
                  style={styles.person}
                  scaleTo={0.94}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => setCallerId(c.id)}>
                  <CharacterAvatar character={c} size={56} ring={on} ringColor={colors.text} />
                  <Txt variant="smallStrong" lines={1} color={on ? colors.text : colors.textMuted}>
                    {shortName(displayName(c, relationships[c.id]))}
                  </Txt>
                </PressableScale>
              );
            })}
          </ScrollView>
        )}

        <CallRow
          icon={<ClayIcon name="sun" size={32} tile={false} />}
          label={t('games.morning')}
          value={morning}
          onChange={setMorning}
        />
        <CallRow
          icon={<ClayIcon name="bedtime" size={32} tile={false} />}
          label={t('games.night')}
          value={night}
          onChange={setNight}
        />

        <Button label={t('common.save')} size="lg" full disabled={!callerId} onPress={save} />
      </View>
    </Sheet>
  );
}

function CallRow({
  icon,
  label,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: { on: boolean; at: number };
  onChange: (v: { on: boolean; at: number }) => void;
}) {
  const { t } = useTranslation();
  const step = (delta: number) => onChange({ ...value, at: (value.at + delta + DAY_MIN) % DAY_MIN });
  return (
    <View style={[styles.row, !value.on && styles.rowOff]}>
      {icon}
      <Txt variant="title" style={styles.grow}>
        {label}
      </Txt>
      <PressableScale style={styles.step} scaleTo={0.88} accessibilityLabel={t('games.earlier')} onPress={() => step(-STEP_MIN)}>
        <Ionicons name="remove" size={18} color={colors.text} />
      </PressableScale>
      <Txt variant="figure" style={styles.time}>
        {toClock(value.at)}
      </Txt>
      <PressableScale style={styles.step} scaleTo={0.88} accessibilityLabel={t('games.later')} onPress={() => step(STEP_MIN)}>
        <Ionicons name="add" size={18} color={colors.text} />
      </PressableScale>
      <Toggle value={value.on} accessibilityLabel={label} onChange={(on) => onChange({ ...value, on })} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.lg, paddingBottom: space.sm },
  grow: { flex: 1 },
  people: { gap: space.lg, paddingVertical: space.xs },
  person: { alignItems: 'center', gap: space.xs, width: 64 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceAlt,
  },
  rowOff: { opacity: 0.6 },
  step: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  time: { minWidth: 62, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
