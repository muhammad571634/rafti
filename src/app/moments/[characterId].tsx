import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeatureBar } from '@/components/feature/feature-kit';
import { CharacterAvatar, EmptyState, LargeTitle, Screen, SystemSegmented } from '@/components/ui';
import { MomentLineView, useMomentContent, useMomentTimeline, useOpenMoment } from '@/components/us/moments';
import { useDayKey } from '@/hooks/use-day-key';
import { filtersWith, groupByDay, inFilter, type MomentFilter, type MomentLine, momentLines } from '@/lib/moment-groups';
import { useAppStore } from '@/store/use-app-store';
import { space, systemGround } from '@/theme';

/**
 * The whole story with one friend (owner, 2026-11-09: "See all" from Us' moments, which show only
 * the last week): every day since you met, newest first, the four filters on top. Drawn a screenful
 * at a time (a list of day headers, big moments and rows), so years of moments scroll as lightly as
 * a week. A plan takes you back to Us with its day open in the calendar.
 */
export default function MomentsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { characterId = '' } = useLocalSearchParams<{ characterId: string }>();
  const character = useAppStore((s) => s.characters.find((c) => c.id === characterId));
  const relationship = useAppStore((s) => s.relationships[characterId]);
  const today = useDayKey();
  const everything = useMomentTimeline(characterId, today);
  const [picked, setPicked] = useState<MomentFilter>('all');
  const filters = filtersWith(everything);
  const filter: MomentFilter = picked !== 'all' && filters.includes(picked) ? picked : 'all';
  const lines = useMemo(() => momentLines(groupByDay(everything.filter((item) => inFilter(item.kind, filter)))), [everything, filter]);
  const content = useMomentContent(character, relationship);
  const openDay = useCallback(
    (day: string) => router.navigate({ pathname: '/(tabs)/us', params: { friend: characterId, day, at: String(Date.now()) } }),
    [router, characterId],
  );
  const open = useOpenMoment(openDay);

  const renderItem = useCallback(
    ({ item }: { item: MomentLine }) => <MomentLineView line={item} today={today} content={content} open={open} />,
    [today, content, open],
  );

  return (
    <Screen background={systemGround.ground}>
      <FlatList
        data={lines}
        keyExtractor={(line) => line.key}
        renderItem={renderItem}
        initialNumToRender={18}
        maxToRenderPerBatch={18}
        windowSize={9}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.huge }}
        ListHeaderComponent={
          <View>
            <FeatureBar
              backLabel={t('common.back')}
              onBack={() => router.back()}
              // Whose story this is, without words.
              right={character ? <CharacterAvatar character={character} size={36} /> : undefined}
            />
            <LargeTitle>{t('us.moments')}</LargeTitle>
            {filters.length > 1 ? (
              <SystemSegmented
                style={styles.segments}
                options={(['all', ...filters] as MomentFilter[]).map((key) => ({ value: key, label: t(`us.filter.${key}`) }))}
                value={filter}
                onChange={setPicked}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={<EmptyState title={t('us.noMoments')} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  segments: { marginHorizontal: 14, marginBottom: 4 },
});
