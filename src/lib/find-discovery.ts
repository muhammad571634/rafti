import type { Character, CharacterGender } from '../types';

import type { GroupStory } from './group-stories';
import type { StoryTemplate } from './templates';

/** Find's four social circles for Cast 2.0 discovery filters. */
export const CAST_CIRCLES = ['Friends', 'Partners', "It's complicated", 'Around you'] as const;
export type CastCircle = (typeof CAST_CIRCLES)[number];

/** Characters spawned as members of a group story (`fromTemplate` = `<storyId>:<memberId>`). */
export function isGroupStoryMember(c: Pick<Character, 'fromTemplate'>): boolean {
  return Boolean(c.fromTemplate && c.fromTemplate.includes(':'));
}

/** Main official Cast 2.0 characters, excluding any spawned group story member copies. */
export function isOfficialCast(c: Pick<Character, 'isOfficial' | 'fromTemplate'>): boolean {
  return Boolean(c.isOfficial) && !isGroupStoryMember(c);
}

/** Private user-created characters made in Create (neither official cast nor story/community copies). */
export function isUserCreation(c: Pick<Character, 'isOfficial' | 'fromTemplate' | 'fromCommunity'>): boolean {
  return !c.isOfficial && !c.fromTemplate && !c.fromCommunity;
}

/**
 * Group stories include mixed-cast stories under both Him and Her filters as long as at least one
 * member matches the chosen gender. (`storyFits` in `group-stories.ts` stays strict for its contract.)
 */
export function groupStoryFitsGender(story: GroupStory, gender: CharacterGender | undefined): boolean {
  return !gender || story.members.some((m) => m.gender === gender);
}

/**
 * Organizes ranked official Cast characters for Find:
 * - Already-chatted friends move behind people the user has not met yet, keeping personalized rank within each group.
 * - Spotlight surfaces up to 3 top characters (preferring pictured ones).
 * - Meet-the-cast grid shows up to 4 characters after Spotlight #1 so For You stays diverse without repetition.
 */
export function splitCastForFind<TChar extends Pick<Character, 'id' | 'isOfficial' | 'fromTemplate'>>(
  rankedCast: readonly TChar[],
  chattedIds: ReadonlySet<string>,
  hasPicture: (c: TChar) => boolean,
): {
  ordered: TChar[];
  spotlight: TChar[];
  gridPreview: TChar[];
} {
  const official = rankedCast.filter(isOfficialCast);
  const unmet = official.filter((c) => !chattedIds.has(c.id));
  const chatted = official.filter((c) => chattedIds.has(c.id));
  const ordered = [...unmet, ...chatted];

  const pictured = ordered.filter(hasPicture);
  const spotlight: TChar[] = [...pictured.slice(0, 3)];
  if (spotlight.length < 3) {
    const seen = new Set(spotlight.map((c) => c.id));
    for (const c of ordered) {
      if (spotlight.length >= 3) break;
      if (!seen.has(c.id)) {
        spotlight.push(c);
        seen.add(c.id);
      }
    }
  }

  const leadId = spotlight[0]?.id;
  const gridPreview = ordered.filter((c) => c.id !== leadId).slice(0, 4);
  if (gridPreview.length < 4 && ordered.length > gridPreview.length) {
    const seen = new Set(gridPreview.map((c) => c.id));
    for (const c of ordered) {
      if (gridPreview.length >= 4) break;
      if (!seen.has(c.id)) {
        gridPreview.push(c);
        seen.add(c.id);
      }
    }
  }

  return { ordered, spotlight, gridPreview };
}

/**
 * Searches across every discovery surface in Find (Cast + user creations, Group scenes, and 100 Solo Stories),
 * stripping group-story member duplicates and applying the active Everyone / Him / Her filter.
 */
export function searchFindUniverse<TChar extends Character>(params: {
  query: string;
  gender?: CharacterGender;
  people: readonly TChar[];
  groups: readonly GroupStory[];
  templates: readonly StoryTemplate[];
  localizeCharacter: (c: TChar) => { relation?: string; greeting?: string; tags?: readonly string[] };
  localizeGroup: (g: GroupStory) => { name: string; hook: string; knot: string; members: readonly { name: string }[] };
  localizeTemplate: (t: StoryTemplate) => { hook: string; card: { name: string; tagline?: string; greeting: string; tags?: readonly string[] } };
}): {
  people: TChar[];
  groups: GroupStory[];
  templates: StoryTemplate[];
} {
  const q = params.query.trim().toLowerCase();
  if (!q) return { people: [], groups: [], templates: [] };

  const includesQ = (text?: string) => Boolean(text && text.toLowerCase().includes(q));

  const people = params.people.filter((c) => {
    if (isGroupStoryMember(c)) return false;
    if (params.gender && c.gender !== params.gender) return false;
    const loc = params.localizeCharacter(c);
    return (
      includesQ(c.name) ||
      includesQ(c.handle) ||
      includesQ(c.series) ||
      includesQ(loc.relation) ||
      includesQ(loc.greeting) ||
      c.tags.some(includesQ) ||
      Boolean(loc.tags?.some(includesQ))
    );
  });

  const groups = params.groups.filter((g) => {
    if (!groupStoryFitsGender(g, params.gender)) return false;
    const loc = params.localizeGroup(g);
    return (
      includesQ(loc.name) ||
      includesQ(loc.hook) ||
      includesQ(loc.knot) ||
      loc.members.some((m) => includesQ(m.name)) ||
      g.tags.some(includesQ)
    );
  });

  const templates = params.templates.filter((t) => {
    if (params.gender && t.card.gender && t.card.gender !== params.gender) return false;
    const loc = params.localizeTemplate(t);
    return (
      includesQ(t.trope) ||
      includesQ(loc.card.name) ||
      includesQ(loc.hook) ||
      includesQ(loc.card.tagline) ||
      includesQ(loc.card.greeting) ||
      Boolean(loc.card.tags?.some(includesQ))
    );
  });

  return { people, groups, templates };
}
