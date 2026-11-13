import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeatureBar } from '@/components/feature/feature-kit';
import { CharacterAvatar, EmptyState, Screen, SystemSegmented } from '@/components/ui';
import { characterImage } from '@/components/ui/avatar';
import { MomentCard, useMomentContent, useMomentTimeline, useOpenMoment } from '@/components/us/moments';
import { useDayKey } from '@/hooks/use-day-key';
import { filtersWith, inFilter, type MomentFilter, type TimelineItem } from '@/lib/moment-groups';
import { useAppStore } from '@/store/use-app-store';
import { fonts, space, systemGround } from '@/theme';

/**
 * The whole story with one friend ("Show N more" under Us' three newest moments): every moment
 * since you met, newest first, the four filters on top, each as the same Ink card Us draws (owner,
 * 2026-11-13); the date rides on each card. Drawn a screenful at a time, so years of moments scroll
 * as lightly as a week. A plan takes you back to Us with its day open in the calendar.
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
  const items = useMemo(() => everything.filter((item) => inFilter(item.kind, filter)), [everything, filter]);
  const content = useMomentContent(character, relationship);
  const face = character ? characterImage(character) : undefined;
  const openDay = useCallback(
    (day: string) => router.navigate({ pathname: '/(tabs)/us', params: { friend: characterId, day, at: String(Date.now()) } }),
    [router, characterId],
  );
  const open = useOpenMoment(openDay);

  const renderItem = useCallback(
    ({ item }: { item: TimelineItem }) => (
      <View style={styles.cell}>
        <MomentCard item={item} today={today} content={content(item)} face={face} onPress={open(item)} />
      </View>
    ),
    [today, content, face, open],
  );

  return (
    <Screen background={systemGround.ground}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
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
            <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
              {t('us.moments')}
            </Text>
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
  title: { marginTop: 4, marginHorizontal: 20, marginBottom: 12, fontFamily: fonts.serif, fontSize: 34, lineHeight: 40, letterSpacing: -0.4, color: systemGround.label },
  segments: { marginHorizontal: 14, marginBottom: 14 },
  cell: { marginHorizontal: 14, marginBottom: 12 },
});
