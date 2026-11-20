import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InkNavBar, InkSegmented, InkText } from '@/components/ink';
import { CharacterAvatar, EmptyState, PressableScale, Screen, useScrolledPast } from '@/components/ui';
import { characterImage } from '@/components/ui/avatar';
import { MomentCard, useMomentContent, useMomentTimeline, useOpenMoment } from '@/components/us/moments';
import { useDayKey } from '@/hooks/use-day-key';
import { shortName } from '@/lib/format';
import { filtersWith, inFilter, type MomentFilter, type TimelineItem } from '@/lib/moment-groups';
import { dateFromKey, dayKey } from '@/mock';
import { displayName, useAppStore } from '@/store/use-app-store';
import { friendAccent, space } from '@/theme';
import { ink, inkGutter, inkRadius } from '@/theme/ink';

type PeriodKey = 'today' | 'thisWeek' | 'earlier';
type MomentRow =
  | { type: 'header'; key: string; period: PeriodKey; first: boolean }
  | { type: 'item'; key: string; item: TimelineItem };

function periodOf(at: string, today: string): PeriodKey {
  const diff = Math.round((dateFromKey(today).getTime() - dateFromKey(dayKey(at)).getTime()) / 86_400_000);
  if (diff <= 0) return 'today';
  if (diff <= 6) return 'thisWeek';
  return 'earlier';
}

/**
 * The whole story with one friend (approved Ink Night+ prototype): pinned sticky Apple HIG nav bar
 * with ringed friend avatar, editorial serif title + italic "with {name}" + tabular count, four
 * filters, and virtualized chronological groups (Today / This week / Earlier) with highlighted
 * milestone cards.
 */
export default function MomentsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { scrolled, onScroll } = useScrolledPast(34);
  const { characterId = '' } = useLocalSearchParams<{ characterId: string }>();
  const character = useAppStore((s) => s.characters.find((c) => c.id === characterId));
  const relationship = useAppStore((s) => s.relationships[characterId]);
  const today = useDayKey();
  const everything = useMomentTimeline(characterId, today);
  const [picked, setPicked] = useState<MomentFilter>('all');
  const filters = filtersWith(everything);
  const filter: MomentFilter = picked !== 'all' && filters.includes(picked) ? picked : 'all';
  const items = useMemo(() => everything.filter((item) => inFilter(item.kind, filter)), [everything, filter]);
  const content = useMomentContent(character, relationship);
  const face = character ? characterImage(character) : undefined;
  const openDay = useCallback(
    (day: string) => router.navigate({ pathname: '/(tabs)/us', params: { friend: characterId, day, at: String(Date.now()) } }),
    [router, characterId],
  );
  const open = useOpenMoment(openDay);

  const accentStrong = character ? friendAccent(character.id).strong : ink.accent;
  const short = character ? shortName(displayName(character, relationship)) : '';

  const rows = useMemo<MomentRow[]>(() => {
    const out: MomentRow[] = [];
    let current: PeriodKey | null = null;
    for (const item of items) {
      const p = periodOf(item.at, today);
      if (p !== current) {
        out.push({ type: 'header', key: `period:${p}`, period: p, first: current === null });
        current = p;
      }
      out.push({ type: 'item', key: item.key, item });
    }
    return out;
  }, [items, today]);

  const periodLabel = useCallback(
    (period: PeriodKey) => {
      if (period === 'today') return t('common.today');
      if (period === 'thisWeek') return t('scenes.thisWeek');
      return t('callHistory.earlier');
    },
    [t],
  );

  const renderRow = useCallback(
    ({ item: row }: { item: MomentRow }) => {
      if (row.type === 'header') {
        return (
          <View style={[styles.periodHead, row.first ? styles.periodFirst : styles.periodNext]}>
            <InkText variant="footnoteStrong" color={ink.text2} lines={1}>
              {periodLabel(row.period)}
            </InkText>
            <View style={styles.periodRule} />
          </View>
        );
      }
      return (
        <View style={styles.cell}>
          <MomentCard
            item={row.item}
            today={today}
            content={content(row.item)}
            face={face}
            highlightMilestone
            onPress={open(row.item)}
          />
        </View>
      );
    },
    [today, content, face, open, periodLabel],
  );

  return (
    <Screen background={ink.ground}>
      <LinearGradient
        pointerEvents="none"
        colors={[`${accentStrong}26`, `${accentStrong}00`]}
        start={{ x: 0.75, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.ambient}
      />

      <InkNavBar
        backLabel={t('common.back')}
        onBack={() => router.back()}
        title={t('us.moments')}
        scrolled={scrolled}
        right={
          character ? (
            <PressableScale
              scaleTo={0.92}
              accessibilityRole="button"
              accessibilityLabel={short}
              onPress={() => router.push(`/character/${character.id}`)}
              style={[styles.avatarRing, { borderColor: accentStrong }]}>
              <CharacterAvatar character={character} size={32} />
            </PressableScale>
          ) : undefined
        }
      />

      <FlatList
        data={rows}
        keyExtractor={(row) => row.key}
        renderItem={renderRow}
        onScroll={onScroll}
        scrollEventThrottle={16}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={9}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}
        ListHeaderComponent={
          <View>
            <View style={styles.titleRow}>
              <View style={styles.titleCol}>
                <InkText variant="display" accessibilityRole="header">
                  {t('us.moments')}
                </InkText>
                {short ? (
                  <InkText variant="quote" color={accentStrong} style={styles.withFriend}>
                    {t('us.withFriend', { name: short })}
                  </InkText>
                ) : null}
              </View>
              {items.length > 0 ? (
                <View style={styles.countPill} accessible accessibilityLabel={`${items.length}`}>
                  <InkText variant="footnoteStrong" color={ink.text2} style={styles.tabular}>
                    {items.length}
                  </InkText>
                </View>
              ) : null}
            </View>

            {filters.length > 1 ? (
              <InkSegmented
                style={styles.segments}
                options={(['all', ...filters] as MomentFilter[]).map((key) => ({ value: key, label: t(`us.filter.${key}`) }))}
                value={filter}
                onChange={setPicked}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={<EmptyState symbol={{ ios: 'sparkles', icon: 'sparkles-outline' }} title={t('us.noMoments')} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  ambient: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
  avatarRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 2,
    marginHorizontal: inkGutter,
  },
  titleCol: { flex: 1, minWidth: 0 },
  withFriend: { marginTop: 2 },
  countPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: inkRadius.pill,
    backgroundColor: 'rgba(118,118,128,0.20)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.edge,
    marginBottom: 4,
  },
  tabular: { fontVariant: ['tabular-nums'] },
  segments: { marginHorizontal: inkGutter, marginTop: 14, marginBottom: 4 },
  periodHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: inkGutter + 4,
    marginBottom: 9,
  },
  periodFirst: { marginTop: 16 },
  periodNext: { marginTop: 22 },
  periodRule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.08)' },
  cell: { marginHorizontal: inkGutter, marginBottom: 10 },
});
