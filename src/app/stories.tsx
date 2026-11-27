import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { InkScreen } from '@/components/ink';
import { GroupStoryGrid } from '@/components/stories/group-stories';
import { StoryChips, StoryGrid, type StoryShelf, StorySheet, storiesFor } from '@/components/stories/stories-shelf';
import { useTemplateStats } from '@/components/stories/use-template-stats';
import { useDiscoveryWeights } from '@/hooks/use-discovery-rank';
import { type StoryTemplate, TROPES, trendingIds } from '@/lib/templates';
import type { CharacterGender } from '@/types';

const SHELVES = new Set<string>(['forYou', 'groups', ...TROPES]);

/** Every story template on one shelf (Find → See all), preserving Find's Him / Her filter if passed. */
export default function StoriesScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ trope?: string; who?: string }>();
  const start = typeof params.trope === 'string' && SHELVES.has(params.trope) ? (params.trope as StoryShelf) : 'forYou';
  const gender: CharacterGender | undefined = params.who === 'male' || params.who === 'female' ? params.who : undefined;
  const [trope, setTrope] = useState<StoryShelf>(start);
  const [open, setOpen] = useState<StoryTemplate | null>(null);
  const stats = useTemplateStats();
  const weights = useDiscoveryWeights();
  const list = storiesFor(trope, gender, stats, weights);
  return (
    <InkScreen title={t('stories.title')} overlays={<StorySheet template={open} stats={open ? stats[open.id] : undefined} onClose={() => setOpen(null)} />}>
      <StoryChips value={trope} onChange={setTrope} />
      {trope === 'groups' ? <GroupStoryGrid gender={gender} /> : <StoryGrid items={list} stats={stats} trending={trendingIds(list, stats)} onOpen={setOpen} />}
    </InkScreen>
  );
}
