import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, Switch, useWindowDimensions, View } from 'react-native';

import { CalendarPopover } from '@/components/diary/calendar-popover';
import { CharacterAvatar, Sheet, Txt } from '@/components/ui';
import { confirmAction } from '@/lib/confirm';
import { clockTime, relativeStamp, shortName } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { dateFromKey, dayKey } from '@/mock';
import { displayName, useAppStore } from '@/store/use-app-store';
import { colors, space } from '@/theme';
import type { Thread, ThreadOutcome } from '@/types';

import { kindOf, whenText } from './labels';

/** The ends a thread offers, by kind and by whether its time has passed. */
function endsFor(thread: Thread, now: number): ThreadOutcome[] {
  const kind = kindOf(thread);
  if (kind === 'quest') return ['done', 'off'];
  if (kind === 'goal') return ['done', 'off'];
  if (thread.happensAt) return Date.parse(thread.happensAt) <= now ? ['good', 'bad', 'off'] : ['off', 'quiet'];
  return ['done', 'off', 'quiet'];
}

/**
 * One thread, open to the user (Keeping in mind, A1-A2): what they said, when it is (change it
 * here; ✓ saves and the friend plans their texts again), the texts the friend means to send and
 * which went, then how it ended, "No texts about it", and "Forget this" for a wrong guess.
 */
export function ThreadSheet({ threadId, onClose }: { threadId: string | null; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const { height } = useWindowDimensions();
  const thread = useAppStore((s) => (threadId ? s.threads.find((x) => x.id === threadId) : undefined));
  const character = useAppStore((s) => s.characters.find((c) => c.id === thread?.characterId));
  const relationship = useAppStore((s) => (thread ? s.relationships[thread.characterId] : undefined));
  const retimeThread = useAppStore((s) => s.retimeThread);
  const endThread = useAppStore((s) => s.endThread);
  const forgetThread = useAppStore((s) => s.forgetThread);
  const setCharacterPref = useAppStore((s) => s.setCharacterPref);

  /** The new time while it is being changed; ✓ saves it. */
  const [draft, setDraft] = useState<Date | null>(null);
  const [open, setOpen] = useState<'day' | 'time' | null>(null);
  useEffect(() => {
    setDraft(null);
    setOpen(null);
  }, [threadId]);

  const visible = !!thread && !!character;
  const name = character ? shortName(displayName(character, relationship)) : '';
  const isOpen = thread?.status === 'open';
  const at = draft ?? (thread?.happensAt ? new Date(thread.happensAt) : null);
  const canRetime = isOpen && !!thread?.happensAt;

  const pickTime = () => {
    if (!at) return;
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: at,
        mode: 'time',
        is24Hour: true,
        onChange: (e, d) => {
          if (e.type !== 'set' || !d) return;
          const next = new Date(at);
          next.setHours(d.getHours(), d.getMinutes(), 0, 0);
          setDraft(next);
        },
      });
    } else if (Platform.OS === 'ios') {
      setOpen((o) => (o === 'time' ? null : 'time'));
    } else {
      setDraft(new Date(at.getTime() + 15 * 60_000));
    }
  };

  const pickDay = (key: string) => {
    if (!at) return;
    const next = dateFromKey(key);
    next.setHours(at.getHours(), at.getMinutes(), 0, 0);
    setDraft(next);
  };

  const save = () => {
    if (thread && draft) {
      haptic.success();
      retimeThread(thread.id, draft.toISOString());
    }
    setDraft(null);
    setOpen(null);
  };

  const end = (outcome: ThreadOutcome) => {
    if (!thread) return;
    haptic.selection();
    endThread(thread.id, outcome);
  };

  const forget = () => {
    if (!thread) return;
    confirmAction({
      title: t('mind.forgetConfirm', { name }),
      action: t('mind.forget'),
      cancel: t('common.cancel'),
      onConfirm: () => {
        forgetThread(thread.id);
        onClose();
      },
    });
  };

  const touches = thread ? [...thread.touches].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)) : [];
  const pending = touches.filter((x) => !x.sent);
  const ends = thread && isOpen ? endsFor(thread, Date.now()) : [];

  return (
    <Sheet visible={visible} onClose={onClose} title={thread?.about} onDone={draft ? save : undefined}>
      {thread && character ? (
        <>
          {/* What they said, as they said it. */}
          <View style={styles.group}>
            <View style={styles.quoteHead}>
              <CharacterAvatar character={character} size={22} />
              <Txt style={styles.small} color={colors.textSecondary}>
                {t('mind.youSaid')}
              </Txt>
              <Txt style={[styles.small, styles.stamp]} color={colors.textMuted}>
                {relativeStamp(thread.createdAt)}
              </Txt>
            </View>
            <Txt style={styles.quote}>“{thread.quote}”</Txt>
          </View>

          {at ? (
            <View style={[styles.group, styles.gap]}>
              <View style={styles.row}>
                <Txt style={[styles.label, styles.grow]}>{t('mind.when')}</Txt>
                <Pill label={whenText(t, i18n.language, at.toISOString(), true)} disabled={!canRetime} onPress={() => setOpen('day')} />
                <Pill label={clockTime(at.toISOString())} disabled={!canRetime} onPress={pickTime} />
              </View>
              {open === 'time' && Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={at}
                  mode="time"
                  display="spinner"
                  minuteInterval={5}
                  onChange={(_, d) => {
                    if (!d) return;
                    const next = new Date(at);
                    next.setHours(d.getHours(), d.getMinutes(), 0, 0);
                    setDraft(next);
                  }}
                />
              ) : null}
            </View>
          ) : null}

          {!isOpen ? (
            <View style={[styles.group, styles.gap]}>
              <View style={styles.row}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Txt style={[styles.label, styles.grow]}>{t(`mind.outcome.${thread.outcome ?? 'done'}`)}</Txt>
                {thread.closedAt ? <Txt style={styles.meta}>{relativeStamp(thread.closedAt)}</Txt> : null}
              </View>
            </View>
          ) : null}

          {touches.length ? (
            <>
              <Txt style={styles.section}>{t('mind.texts', { name })}</Txt>
              <View style={styles.group}>
                {isOpen && pending.length && !relationship?.messagesFirst ? (
                  <View style={[styles.row, styles.line]}>
                    <Ionicons name="notifications-off" size={18} color={colors.danger} />
                    <Txt style={[styles.label, styles.grow]} lines={2}>
                      {t('mind.reachOff', { name })}
                    </Txt>
                    <Switch
                      value={false}
                      onValueChange={(on) => {
                        haptic.toggle(on);
                        setCharacterPref(thread.characterId, 'messagesFirst', on);
                      }}
                      accessibilityLabel={t('characterSettings.messagesFirst')}
                      trackColor={{ true: colors.success }}
                      ios_backgroundColor={colors.surfaceAlt}
                    />
                  </View>
                ) : null}
                {touches.map((touch, i) => {
                  const gone = touch.sent || !isOpen;
                  return (
                    <View key={touch.id} style={[styles.row, i < touches.length - 1 && styles.line]}>
                      <Ionicons
                        name={touch.sent ? 'checkmark-circle' : 'time-outline'}
                        size={18}
                        color={touch.sent ? colors.textFaint : colors.primary}
                      />
                      <Txt style={[styles.label, styles.grow]} color={gone ? colors.textMuted : colors.text} lines={1}>
                        {t(`mind.phase.${touch.phase}`)}
                      </Txt>
                      <Txt style={styles.meta}>{whenText(t, i18n.language, touch.at)}</Txt>
                    </View>
                  );
                })}
              </View>
            </>
          ) : null}

          {ends.length ? (
            <View style={[styles.group, styles.gapLarge]}>
              {ends.map((outcome, i) => (
                <Pressable
                  key={outcome}
                  onPress={() => end(outcome)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.row, i < ends.length - 1 && styles.line, pressed && styles.pressed]}>
                  <Txt style={styles.label} color={colors.brandText}>
                    {t(`mind.end.${kindOf(thread) === 'goal' && outcome === 'off' ? 'stopGoal' : outcome}`)}
                  </Txt>
                </Pressable>
              ))}
            </View>
          ) : null}

          <View style={[styles.group, ends.length ? styles.gap : styles.gapLarge]}>
            <Pressable onPress={forget} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <Txt style={styles.label} color={colors.danger}>
                {t('mind.forget')}
              </Txt>
            </Pressable>
          </View>

          <CalendarPopover
            visible={open === 'day'}
            onClose={() => setOpen(null)}
            value={at ? dayKey(at) : dayKey()}
            onChange={pickDay}
            marked={new Set()}
            top={Math.round(height * 0.18)}
            allow="future"
          />
        </>
      ) : null}
    </Sheet>
  );
}

/** A grey capsule holding a value, as iOS Calendar's date and time. */
function Pill({ label, disabled, onPress }: { label: string; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} style={styles.pill}>
      <Txt style={styles.pillText} color={disabled ? colors.text : colors.brandText}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // iOS inset groups on the white sheet: grey cards, hairlines between rows.
  group: { borderRadius: 14, backgroundColor: colors.bg, overflow: 'hidden' },
  gap: { marginTop: space.md },
  gapLarge: { marginTop: 22 },
  grow: { flex: 1 },
  quoteHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.md },
  stamp: { marginLeft: 'auto' },
  small: { fontSize: 13 },
  quote: { fontSize: 17, lineHeight: 23, letterSpacing: -0.4, color: colors.text, paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.md },
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, paddingHorizontal: space.lg },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  pressed: { backgroundColor: colors.surfaceAlt },
  label: { fontSize: 17, letterSpacing: -0.4 },
  meta: { fontSize: 15, color: colors.textSecondary },
  section: { fontSize: 13, color: colors.textSecondary, textTransform: 'uppercase', paddingHorizontal: space.lg, paddingTop: 22, paddingBottom: space.sm - 2 },
  pill: { height: 34, paddingHorizontal: 11, borderRadius: 8, justifyContent: 'center', backgroundColor: colors.surfaceAlt },
  pillText: { fontSize: 16, letterSpacing: -0.3 },
});
