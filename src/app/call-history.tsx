import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InkSegmented } from '@/components/ink';
import {
  CharacterAvatar,
  EmptyState,
  GlassBar,
  glassStyle,
  InsetGroup,
  LargeTitle,
  PressableScale,
  Screen,
  SFIcon,
  Txt,
  useScrolledPast,
} from '@/components/ui';
import { callRuns } from '@/lib/call-runs';
import { confirmAction } from '@/lib/confirm';
import { clockTime, relativeStamp, shortName } from '@/lib/format';
import { dayKey, dayKeyFromToday } from '@/mock';
import { displayName, minutesOf, useAppStore } from '@/store/use-app-store';
import { colors, space, systemColors } from '@/theme';
import { inkFace, inkRadius } from '@/theme/ink';
import type { CallRecord, Character } from '@/types';

type Filter = 'all' | 'missed';

const AVATAR = 44;

/**
 * Today's Calls tile → the call log (canvas "CallHistory", 2026-10-21), iOS Phone Recents on the
 * grouped ground: All / Missed, then Today, Yesterday and Earlier as inset groups. A row opens the
 * friend's profile; the green button beside it calls them back. The capsule up top is the
 * call minutes left.
 */
export default function CallHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const { scrolled, onScroll } = useScrolledPast(40);

  const calls = useAppStore((s) => s.calls);
  const characters = useAppStore((s) => s.characters);
  const relationships = useAppStore((s) => s.relationships);
  const wallet = useAppStore((s) => s.wallet);
  const { filter: askedFilter } = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState<Filter>(askedFilter === 'missed' ? 'missed' : 'all');
  const deleteCall = useAppStore((s) => s.deleteCall);
  const clearCalls = useAppStore((s) => s.clearCalls);
  // Hold a row to take that call off the list; "Clear" under the list takes them all (0z181).
  // A merged row ("Milo (3)") takes all its calls, as iOS Recents' delete does.
  const removeCalls = (ids: string[]) =>
    confirmAction({ title: t('callHistory.deleteTitle'), action: t('common.delete'), cancel: t('common.cancel'), onConfirm: () => ids.forEach(deleteCall) });
  const clearAll = () =>
    confirmAction({ title: t('callHistory.clearTitle'), action: t('callHistory.clear'), cancel: t('common.cancel'), onConfirm: clearCalls });

  const minutesLeft = Math.floor(minutesOf(wallet, 'call').total / 60);

  const sections = useMemo(() => {
    const today = dayKey();
    const yesterday = dayKeyFromToday(-1);
    const list = calls
      .filter((c) => (filter === 'missed' ? c.missed : true))
      .filter((c) => characters.some((ch) => ch.id === c.characterId))
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    const groups: { key: string; title: string; calls: CallRecord[] }[] = [
      { key: 'today', title: t('common.today'), calls: list.filter((c) => dayKey(c.startedAt) === today) },
      { key: 'yesterday', title: t('common.yesterday'), calls: list.filter((c) => dayKey(c.startedAt) === yesterday) },
      {
        key: 'earlier',
        title: t('callHistory.earlier'),
        calls: list.filter((c) => dayKey(c.startedAt) !== today && dayKey(c.startedAt) !== yesterday),
      },
    ];
    return groups.filter((g) => g.calls.length > 0);
  }, [calls, characters, filter, t]);

  const nameOf = (c: Character) => shortName(displayName(c, relationships[c.id]));

  const minutesCapsule =
    minutesLeft > 0 ? (
      <PressableScale
        scaleTo={0.94}
        accessibilityRole="button"
        accessibilityLabel={t('callHistory.minutesLeft', { count: minutesLeft })}
        onPress={() => router.push('/my-plan')}
        style={[glassStyle, styles.minutes]}>
        <SFIcon ios="phone.fill" icon="call" size={16} color={systemColors.green} />
        <Txt style={styles.minutesText}>{t('callHistory.min', { count: minutesLeft })}</Txt>
      </PressableScale>
    ) : undefined;

  if (calls.length === 0) {
    return (
      <Screen background={colors.bg}>
        <GlassBar right={minutesCapsule} />
        <LargeTitle>{t('callHistory.title')}</LargeTitle>
        <EmptyState title={t('callHistory.empty')} hint={t('callHistory.emptyHint')} />
      </Screen>
    );
  }

  return (
    <Screen background={colors.bg}>
      <GlassBar right={minutesCapsule} title={t('callHistory.title')} scrolled={scrolled} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}>
        <LargeTitle>{t('callHistory.title')}</LargeTitle>

        <InkSegmented
          options={[
            { value: 'all', label: t('callHistory.all') },
            { value: 'missed', label: t('callHistory.missed') },
          ]}
          value={filter}
          onChange={(f: Filter) => setFilter(f)}
          style={styles.track}
        />

        {sections.length === 0 ? (
          <View style={styles.noMissed}>
            <Ionicons name="checkmark" size={28} color={colors.textSecondary} />
            <Txt style={styles.noMissedText}>{t('callHistory.noMissed')}</Txt>
          </View>
        ) : (
          sections.map((section) => (
            <View key={section.key}>
              <Txt style={styles.sectionLabel}>{section.title}</Txt>
              <InsetGroup style={styles.group}>
                {callRuns(section.calls).map((run, i, runs) => {
                  const call = run[0];
                  const character = characters.find((c) => c.id === call.characterId)!;
                  const stamp = (c: CallRecord) => (section.key === 'earlier' ? relativeStamp(c.startedAt) : clockTime(c.startedAt));
                  return (
                    <CallRow
                      key={call.id}
                      run={run}
                      name={nameOf(character)}
                      character={character}
                      stamp={stamp}
                      last={i === runs.length - 1}
                      onOpen={() => router.push(`/character/${character.id}`)}
                      onRemove={() => removeCalls(run.map((c) => c.id))}
                      onCall={() => router.push(`/call/${character.id}`)}
                    />
                  );
                })}
              </InsetGroup>
            </View>
          ))
        )}
        {calls.length > 0 ? (
          <PressableScale scaleTo={0.97} accessibilityRole="button" onPress={clearAll} style={styles.clear}>
            <Txt style={styles.clearText}>{t('callHistory.clear')}</Txt>
          </PressableScale>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

/**
 * One row of Recents: a single call, or a run of back-to-back calls with one friend of one kind
 * ("Milo (3)", `callRuns`). A single call's row opens the friend's profile; a run's row opens its
 * calls under it (time and length of each), and the friend's face still opens the profile.
 */
function CallRow({
  run,
  name,
  character,
  stamp,
  last,
  onOpen,
  onCall,
  onRemove,
}: {
  run: CallRecord[];
  name: string;
  character: Character;
  stamp: (call: CallRecord) => string;
  last: boolean;
  onOpen: () => void;
  onCall: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const call = run[0];
  const many = run.length > 1;
  const incoming = call.direction === 'incoming';
  const length = (c: CallRecord) => t('callHistory.min', { count: Math.max(1, Math.round(c.durationSec / 60)) });
  // A run says only its kind; the lengths are in its open list.
  const line = call.missed ? t('call.missed') : many ? t(`call.${call.direction}`) : `${t(`call.${call.direction}`)} · ${length(call)}`;
  const tint = call.missed ? systemColors.red : colors.textSecondary;
  const title = many ? `${name} (${run.length})` : name;

  return (
    <View>
      {/* The call-back button sits beside the row's tap area, not inside it. */}
      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [styles.rowTap, pressed && styles.pressed]}
          onPress={many ? () => setOpen((v) => !v) : onOpen}
          delayLongPress={400}
          onLongPress={onRemove}
          accessibilityRole="button"
          accessibilityState={many ? { expanded: open } : undefined}
          accessibilityActions={[{ name: 'longpress', label: t('common.delete') }]}
          onAccessibilityAction={onRemove}
          accessibilityLabel={`${title}, ${line}, ${stamp(call)}`}>
          {many ? (
            <Pressable onPress={onOpen} hitSlop={4} accessibilityRole="button" accessibilityLabel={name}>
              <CharacterAvatar character={character} size={AVATAR} />
            </Pressable>
          ) : (
            <CharacterAvatar character={character} size={AVATAR} />
          )}
          <View style={styles.body}>
            <Txt style={[styles.name, call.missed && { color: systemColors.red }]} lines={1}>
              {title}
            </Txt>
            <View style={styles.meta}>
              <Ionicons name={incoming ? 'arrow-down' : 'arrow-up'} size={12} color={tint} style={styles.arrow} />
              <Txt style={styles.metaText} lines={1}>
                {line}
              </Txt>
            </View>
          </View>
          <Txt style={styles.when}>{stamp(call)}</Txt>
          {many ? <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} /> : null}
        </Pressable>
        <PressableScale scaleTo={0.88} onPress={onCall} accessibilityRole="button" accessibilityLabel={t('a11y.callBack')} style={styles.callBack}>
          <SFIcon ios="phone.fill" icon="call" size={17} color={systemColors.green} />
        </PressableScale>
      </View>
      {many && open ? (
        <View style={styles.runList}>
          {run.map((c) => (
            <View key={c.id} style={styles.runRow}>
              {/* An earlier day's call also says its hour, so two calls on one day read apart. */}
              <Txt style={styles.runWhen}>{stamp(c) === clockTime(c.startedAt) ? stamp(c) : `${stamp(c)}, ${clockTime(c.startedAt)}`}</Txt>
              <Txt style={styles.metaText}>{c.missed ? t('call.missed') : length(c)}</Txt>
            </View>
          ))}
        </View>
      ) : null}
      {last ? null : <View style={styles.line} />}
    </View>
  );
}

const styles = StyleSheet.create({
  clear: { alignSelf: 'center', marginTop: space.xl, paddingVertical: 10, paddingHorizontal: space.lg },
  clearText: { ...inkFace('body'), color: systemColors.red },
  minutes: {
    height: 44,
    borderRadius: inkRadius.pill,
    paddingLeft: 12,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  minutesText: { ...inkFace('subStrong'), fontVariant: ['tabular-nums'], color: colors.text },
  track: { marginTop: 12, marginHorizontal: space.lg },
  sectionLabel: {
    marginTop: 22,
    marginBottom: 6,
    marginHorizontal: space.lg * 2,
    ...inkFace('caption'),
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  group: { borderRadius: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, paddingRight: 12 },
  rowTap: { flex: 1, minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pressed: { opacity: 0.6 },
  body: { flex: 1, minWidth: 0, gap: 2 },
  name: { ...inkFace('bodyStrong'), color: colors.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  // iOS draws the direction as a diagonal arrow: down-left in, up-right out.
  arrow: { transform: [{ rotate: '45deg' }] },
  metaText: { ...inkFace('footnote'), color: colors.textSecondary },
  when: { ...inkFace('sub'), color: colors.textSecondary },
  // A run's calls, under its row, lined up with the name.
  runList: { paddingLeft: 70, paddingRight: 60, paddingBottom: 10, gap: 6 },
  runRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  runWhen: { ...inkFace('footnote'), color: colors.text, fontVariant: ['tabular-nums'] },
  callBack: {
    width: 36,
    height: 36,
    borderRadius: inkRadius.pill,
    backgroundColor: systemColors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    position: 'absolute',
    left: 70,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderStrong,
  },
  noMissed: {
    marginTop: 22,
    marginHorizontal: space.lg,
    height: 140,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  noMissedText: { ...inkFace('sub'), color: colors.textSecondary },
});
