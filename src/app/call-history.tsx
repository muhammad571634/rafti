import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { clockTime, relativeStamp, shortName } from '@/lib/format';
import { dayKey, dayKeyFromToday } from '@/mock';
import { displayName, minutesOf, useAppStore } from '@/store/use-app-store';
import { colors, shadows, space, systemColors } from '@/theme';
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
  const [filter, setFilter] = useState<Filter>('all');

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

        <View style={styles.track} accessibilityRole="tablist">
          {(['all', 'missed'] as const).map((f) => {
            const on = f === filter;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                aria-selected={on}
                style={[styles.segment, on && styles.segmentOn]}>
                <Txt style={[styles.segmentText, on && styles.segmentTextOn]}>{t(`callHistory.${f}`)}</Txt>
              </Pressable>
            );
          })}
        </View>

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
                {section.calls.map((call, i) => {
                  const character = characters.find((c) => c.id === call.characterId)!;
                  return (
                    <CallRow
                      key={call.id}
                      call={call}
                      name={nameOf(character)}
                      character={character}
                      when={section.key === 'earlier' ? relativeStamp(call.startedAt) : clockTime(call.startedAt)}
                      last={i === section.calls.length - 1}
                      onOpen={() => router.push(`/character/${character.id}`)}
                      onCall={() => router.push(`/call/${character.id}`)}
                    />
                  );
                })}
              </InsetGroup>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function CallRow({
  call,
  name,
  character,
  when,
  last,
  onOpen,
  onCall,
}: {
  call: CallRecord;
  name: string;
  character: Character;
  when: string;
  last: boolean;
  onOpen: () => void;
  onCall: () => void;
}) {
  const { t } = useTranslation();
  const incoming = call.direction === 'incoming';
  const line = call.missed
    ? t('call.missed')
    : `${t(`call.${call.direction}`)} · ${t('callHistory.min', { count: Math.max(1, Math.round(call.durationSec / 60)) })}`;
  const tint = call.missed ? systemColors.red : colors.textSecondary;

  return (
    // The call-back button sits beside the row's tap area, not inside it.
    <View style={styles.row}>
      <Pressable
        style={({ pressed }) => [styles.rowTap, pressed && styles.pressed]}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${line}, ${when}`}>
        <CharacterAvatar character={character} size={AVATAR} />
        <View style={styles.body}>
          <Txt style={[styles.name, call.missed && { color: systemColors.red }]} lines={1}>
            {name}
          </Txt>
          <View style={styles.meta}>
            <Ionicons
              name={incoming ? 'arrow-down' : 'arrow-up'}
              size={12}
              color={tint}
              style={styles.arrow}
            />
            <Txt style={styles.metaText}>{line}</Txt>
          </View>
        </View>
        <Txt style={styles.when}>{when}</Txt>
      </Pressable>
      <PressableScale
        scaleTo={0.88}
        onPress={onCall}
        accessibilityRole="button"
        accessibilityLabel={t('a11y.callBack')}
        style={styles.callBack}>
        <SFIcon ios="phone.fill" icon="call" size={17} color={systemColors.green} />
      </PressableScale>
      {last ? null : <View style={styles.line} />}
    </View>
  );
}

const styles = StyleSheet.create({
  minutes: {
    height: 44,
    borderRadius: 22,
    paddingLeft: 12,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  minutesText: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2, fontVariant: ['tabular-nums'], color: colors.text },
  track: {
    marginTop: 12,
    marginHorizontal: space.lg,
    height: 34,
    padding: 2,
    borderRadius: 9,
    flexDirection: 'row',
    backgroundColor: systemColors.fill,
  },
  segment: { flex: 1, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: systemColors.thumb, ...shadows.card },
  segmentText: { fontSize: 14, fontWeight: '500', letterSpacing: -0.1, color: colors.text },
  segmentTextOn: { fontWeight: '600' },
  sectionLabel: {
    marginTop: 22,
    marginBottom: 6,
    marginHorizontal: space.lg * 2,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  group: { borderRadius: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, paddingRight: 12 },
  rowTap: { flex: 1, minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pressed: { opacity: 0.6 },
  body: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.4, color: colors.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  // iOS draws the direction as a diagonal arrow: down-left in, up-right out.
  arrow: { transform: [{ rotate: '45deg' }] },
  metaText: { fontSize: 13, color: colors.textSecondary },
  when: { fontSize: 15, letterSpacing: -0.2, color: colors.textSecondary },
  callBack: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  noMissedText: { fontSize: 15, color: colors.textSecondary },
});
