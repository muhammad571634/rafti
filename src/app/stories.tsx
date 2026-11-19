import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { InkScreen } from '@/components/ink';
import { StoryChips, StoryGrid, type StoryShelf, StorySheet, storiesFor } from '@/components/stories/stories-shelf';
import { useTemplateStats } from '@/components/stories/use-template-stats';
import { type StoryTemplate, TROPES, trendingIds } from '@/lib/templates';
import { inkGutter } from '@/theme/ink';

const SHELVES = new Set<string>(['forYou', ...TROPES]);

/** Every story template on one shelf (Find → See all), with the trope chips to switch shelf. */
export default function StoriesScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ trope?: string }>();
  const start = typeof params.trope === 'string' && SHELVES.has(params.trope) ? (params.trope as StoryShelf) : 'forYou';
  const [trope, setTrope] = useState<StoryShelf>(start);
  const [open, setOpen] = useState<StoryTemplate | null>(null);
  const stats = useTemplateStats();
  const list = storiesFor(trope, undefined, stats);
  return (
    <InkScreen title={t('stories.title')} overlays={<StorySheet template={open} stats={open ? stats[open.id] : undefined} onClose={() => setOpen(null)} />}>
      <View style={styles.bleed}>
        <StoryChips value={trope} onChange={setTrope} />
        <StoryGrid items={list} stats={stats} trending={trendingIds(list, stats)} onOpen={setOpen} />
      </View>
    </InkScreen>
  );
}

const styles = StyleSheet.create({
  // The chips and the grid keep their own gutter so they scroll edge to edge.
  bleed: { marginHorizontal: -inkGutter },
});
