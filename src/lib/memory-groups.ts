import type { MemoryAbout, MemoryItem, ScheduleItem } from '@/types';

/** The Memories tabs, in the order the screen shows them. */
export const MEMORY_TABS: readonly MemoryAbout[] = ['story', 'them', 'you'];

/** Whose memory it is; memories from before the tabs are all about you. */
export const aboutOf = (memory: MemoryItem): MemoryAbout => memory.about ?? 'you';

/**
 * The tab a memory shows under. A promise sits in Story whoever made it: what the two of them agreed
 * reads as one list (`promises`), next to the plans set with this friend.
 */
export const tabOf = (memory: MemoryItem): MemoryAbout => (memory.type === 'promise' && !memory.quote ? 'story' : aboutOf(memory));

/** A heading in one tab of the Memories screen (canvas `MemTabs.dc.html`). */
export type MemoryGroupKey = 'promises' | 'pinnedChat' | 'moments' | 'them' | 'likes' | 'life' | 'plans' | 'habits' | 'notFan';

/** The groups each tab shows, top to bottom. */
const ORDER: Record<MemoryAbout, readonly MemoryGroupKey[]> = {
  story: ['promises', 'pinnedChat', 'moments'],
  them: ['them'],
  you: ['likes', 'life', 'plans', 'habits', 'notFan'],
};

/** Where one memory sits: Story splits pinned chat lines from moments, You goes by kind of fact. */
export function memoryGroup(memory: MemoryItem): MemoryGroupKey {
  if (tabOf(memory) === 'story' && memory.type === 'promise' && !memory.quote) return 'promises';
  const about = aboutOf(memory);
  if (about === 'story') return memory.quote ? 'pinnedChat' : 'moments';
  if (about === 'them') return 'them';
  switch (memory.type) {
    case 'preference':
      return 'likes';
    case 'dislike':
      return 'notFan';
    case 'schedule':
      return 'plans';
    case 'habit':
      return 'habits';
    default:
      return 'life';
  }
}

/** One tab's memories under its headings, empty headings left out; the input order is kept. */
export function groupMemories(memories: readonly MemoryItem[], tab: MemoryAbout) {
  const mine = memories.filter((m) => tabOf(m) === tab);
  return ORDER[tab]
    .map((key) => ({ key, items: mine.filter((m) => memoryGroup(m) === key) }))
    .filter((group) => group.items.length > 0);
}

/** How many memories each tab holds, for the bar and its legend. */
export function countByTab(memories: readonly MemoryItem[]): Record<MemoryAbout, number> {
  const counts: Record<MemoryAbout, number> = { story: 0, them: 0, you: 0 };
  for (const memory of memories) counts[tabOf(memory)] += 1;
  return counts;
}

/** The plans set with this friend from today on, soonest first (an all-day plan before the timed ones that day). */
export function upcomingPlans(schedules: readonly ScheduleItem[], characterId: string, today: string): ScheduleItem[] {
  return schedules
    .filter((plan) => plan.characterId === characterId && plan.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));
}
