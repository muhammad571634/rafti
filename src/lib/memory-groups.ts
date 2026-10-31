import type { MemoryAbout, MemoryItem } from '@/types';

/** The Memories tabs, in the order the screen shows them. */
export const MEMORY_TABS: readonly MemoryAbout[] = ['story', 'them', 'you'];

/** Whose memory it is; memories from before the tabs are all about you. */
export const aboutOf = (memory: MemoryItem): MemoryAbout => memory.about ?? 'you';

/** A heading in one tab of the Memories screen (canvas `MemTabs.dc.html`). */
export type MemoryGroupKey = 'pinnedChat' | 'moments' | 'them' | 'likes' | 'life' | 'plans' | 'habits' | 'notFan';

/** The groups each tab shows, top to bottom. */
const ORDER: Record<MemoryAbout, readonly MemoryGroupKey[]> = {
  story: ['pinnedChat', 'moments'],
  them: ['them'],
  you: ['likes', 'life', 'plans', 'habits', 'notFan'],
};

/** Where one memory sits: Story splits pinned chat lines from moments, You goes by kind of fact. */
export function memoryGroup(memory: MemoryItem): MemoryGroupKey {
  const about = aboutOf(memory);
  if (about === 'story') return memory.quote ? 'pinnedChat' : 'moments';
  if (about === 'them') return 'them';
  switch (memory.type) {
    case 'preference':
      return 'likes';
    case 'dislike':
      return 'notFan';
    case 'schedule':
    case 'promise':
      return 'plans';
    case 'habit':
      return 'habits';
    default:
      return 'life';
  }
}

/** One tab's memories under its headings, empty headings left out; the input order is kept. */
export function groupMemories(memories: readonly MemoryItem[], tab: MemoryAbout) {
  const mine = memories.filter((m) => aboutOf(m) === tab);
  return ORDER[tab]
    .map((key) => ({ key, items: mine.filter((m) => memoryGroup(m) === key) }))
    .filter((group) => group.items.length > 0);
}

/** How many memories each tab holds, for the bar and its legend. */
export function countByTab(memories: readonly MemoryItem[]): Record<MemoryAbout, number> {
  const counts: Record<MemoryAbout, number> = { story: 0, them: 0, you: 0 };
  for (const memory of memories) counts[aboutOf(memory)] += 1;
  return counts;
}
