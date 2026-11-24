import type { Character, GroupChat } from '@/types';

/** A group story's shown words in one language: its name and each member's line. */
export interface StoryLabels {
  name: string;
  members: { id: string; who: string }[];
}

/**
 * A group story's group and members keep the words of the language the app had when it started
 * (audit #12: a story begun in Russian showed "Комната 214" in an English Find). Here they follow
 * the screen language: the group's name, each member's world (`series`, Find's folders) and line
 * (`tagline`), but only while they still hold one of the story's own words in some language, so a
 * name the user gave the group stays theirs. Same arrays back when nothing changed.
 */
export function relabelStoryGroups(
  groups: GroupChat[],
  characters: Character[],
  wordsFor: (storyId: string) => { local: StoryLabels; all: StoryLabels[] } | undefined,
): { groups: GroupChat[]; characters: Character[] } {
  const cache = new Map<string, ReturnType<typeof wordsFor>>();
  const words = (id: string) => {
    if (!cache.has(id)) cache.set(id, wordsFor(id));
    return cache.get(id);
  };
  const nextGroups = groups.map((g) => {
    const w = g.story ? words(g.story.id) : undefined;
    if (!w || !g.name || g.name === w.local.name || !w.all.some((l) => l.name === g.name)) return g;
    return { ...g, name: w.local.name };
  });
  const nextCharacters = characters.map((c) => {
    const [storyId, memberId] = c.fromTemplate?.split(':') ?? [];
    if (!storyId || !memberId || c.isOfficial) return c;
    const w = words(storyId);
    if (!w) return c;
    const who = w.local.members.find((m) => m.id === memberId)?.who;
    const series = c.series && c.series !== w.local.name && w.all.some((l) => l.name === c.series) ? w.local.name : c.series;
    const tagline =
      who && c.tagline && c.tagline !== who && w.all.some((l) => l.members.some((m) => m.id === memberId && m.who === c.tagline)) ? who : c.tagline;
    return series === c.series && tagline === c.tagline ? c : { ...c, series, tagline };
  });
  return {
    groups: nextGroups.some((g, i) => g !== groups[i]) ? nextGroups : groups,
    characters: nextCharacters.some((c, i) => c !== characters[i]) ? nextCharacters : characters,
  };
}
