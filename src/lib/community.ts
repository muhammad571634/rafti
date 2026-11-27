import type { Character } from '@/types';

import {
  BIO_MAX,
  GREETING_MAX,
  MORE_GREETINGS_MAX,
  OPENING_MAX,
  QUIRK_MAX,
  SCENARIO_MAX,
  TAGLINE_MAX,
} from './create-character';

/**
 * The community library (docs/agent-tasks/community-library.md, 0z300): a user's own character
 * shared in Find. Pure and server-portable: the app builds a card from its character, the server
 * cleans the same card again before it keeps it, and the review prompt reads it.
 *
 * A card carries only what others may see: no picture (no uploads in this phase), no voice clone,
 * no sample dialog, no looks, no secret or story beats, nothing about the creator.
 */
export const COMMUNITY_FIELDS = [
  'name',
  'tagline',
  'bio',
  'greeting',
  'greetings',
  'opening',
  'scenario',
  'tags',
  'gender',
  'age',
  'heightCm',
  'role',
  'speakingStyle',
  'voicePreset',
  'quirk',
  'likes',
  'dislikes',
  'relation',
  'mask',
  'accentIndex',
] as const;

export type CommunityCard = Partial<Pick<Character, (typeof COMMUNITY_FIELDS)[number]>> & { name: string; greeting: string };

/** Statuses a shared character can have; only `live` ones are listed. */
export type CommunityStatus = 'live' | 'rejected' | 'hidden' | 'removed';

/** Why the review said no (`busy`: the model did not answer, try again). */
export type CommunityReason = 'realPerson' | 'minor' | 'explicit' | 'hate' | 'harm' | 'busy';
export const COMMUNITY_REASONS: readonly CommunityReason[] = ['realPerson', 'minor', 'explicit', 'hate', 'harm', 'busy'];

/** One page of the shelf, and how it is sorted. */
export const COMMUNITY_PAGE = 30;
export type CommunitySort = 'popular' | 'new';

/** Different users whose reports hide a character until a person looks. */
export const REPORTS_TO_HIDE = 3;

export interface CommunityItem {
  id: string;
  card: CommunityCard;
  chats: number;
  createdAt: string;
}

/**
 * The character in the user's list that a community item already is: their own share (the
 * original, never a copy of it) or a copy they added before. Say hi opens it instead of adding one.
 */
export function knownCommunityCharacter<T extends Pick<Character, 'communityId' | 'fromCommunity'>>(characters: T[], communityId: string): T | undefined {
  return characters.find((c) => c.communityId === communityId) ?? characters.find((c) => c.fromCommunity === communityId);
}

const NAME_MAX = 36;
const SHORT_MAX = 60;
const LIST_MAX = 8;
const RELATION_MAX = 160;
const MASK_MAX = 300;

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const list = (v: unknown, max: number, size: number) =>
  Array.isArray(v) ? v.map((x) => str(x, size)).filter(Boolean).slice(0, max) : [];

/**
 * A card from anything (the app's character or a request body): only the shared fields, each cut to
 * its length; null without a name and a greeting.
 */
export function cleanCard(raw: unknown): CommunityCard | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const name = str(r.name, NAME_MAX);
  const greeting = str(r.greeting, GREETING_MAX);
  if (!name || !greeting) return null;
  const card: CommunityCard = { name, greeting };
  const text = (key: keyof CommunityCard, max: number) => {
    const v = str(r[key], max);
    if (v) (card as Record<string, unknown>)[key] = v;
  };
  text('tagline', TAGLINE_MAX);
  text('bio', BIO_MAX);
  text('opening', OPENING_MAX);
  text('scenario', SCENARIO_MAX);
  text('quirk', QUIRK_MAX);
  text('relation', RELATION_MAX);
  text('mask', MASK_MAX);
  text('role', SHORT_MAX);
  text('speakingStyle', SHORT_MAX);
  text('voicePreset', SHORT_MAX);
  const greetings = list(r.greetings, MORE_GREETINGS_MAX, GREETING_MAX);
  if (greetings.length) card.greetings = greetings;
  for (const key of ['tags', 'likes', 'dislikes'] as const) {
    const items = list(r[key], LIST_MAX, SHORT_MAX);
    if (items.length) card[key] = items;
  }
  if (r.gender === 'male' || r.gender === 'female') card.gender = r.gender;
  if (typeof r.age === 'number' && Number.isFinite(r.age)) card.age = Math.min(120, Math.max(18, Math.round(r.age)));
  if (typeof r.heightCm === 'number' && Number.isFinite(r.heightCm)) card.heightCm = Math.round(r.heightCm);
  if (typeof r.accentIndex === 'number' && Number.isInteger(r.accentIndex) && r.accentIndex >= 0) card.accentIndex = r.accentIndex % 64;
  return card as CommunityCard;
}

/** The shared card of the user's own character: the looks, dialog, secret and picture stay home. */
export const cardOf = (character: Character) => cleanCard(character);

/** Every text of a card, for the app's own word check (`contentProblems`) and the review. */
export const cardTexts = (card: CommunityCard) =>
  [card.name, card.tagline, card.bio, card.greeting, ...(card.greetings ?? []), card.opening, card.scenario, card.quirk, card.relation, card.mask, ...(card.tags ?? []), ...(card.likes ?? []), ...(card.dislikes ?? [])].filter(
    (t): t is string => !!t,
  );

/** The review prompt: one character card, one verdict. Fan characters pass; real people never. */
export function reviewPrompt(card: CommunityCard) {
  return [
    'You review a character a user wants to share with other adults (18+) in a companion app.',
    'Refuse it only for one of these reasons:',
    '- realPerson: it is or imitates a real person (celebrity, idol, actor, singer, athlete, public figure, creator, streamer).',
    '- minor: anyone in it is under 18 or a school student, or youthfulness is sexualised.',
    '- explicit: it describes sex or nudity explicitly.',
    '- hate: hate or harassment against real groups, slurs.',
    '- harm: it promotes real-world self-harm, crime, terror or weapons.',
    'Everything else passes: romance, flirting, dark or sad stories, villains, swearing, and fan characters from films, series, books, anime or games.',
    'Answer with JSON only: {"ok":true} or {"ok":false,"reason":"realPerson|minor|explicit|hate|harm"}.',
    '',
    'THE CHARACTER:',
    ...cardTexts(card).map((t) => `- ${t}`),
  ].join('\n');
}

/** The review's verdict; anything unreadable counts as busy, so nothing slips through unread. */
export function parseReview(raw: string): { ok: true } | { ok: false; reason: CommunityReason } {
  const json = raw.match(/\{[\s\S]*\}/)?.[0];
  if (!json) return { ok: false, reason: 'busy' };
  try {
    const data = JSON.parse(json) as { ok?: unknown; reason?: unknown };
    if (data.ok === true) return { ok: true };
    const reason = COMMUNITY_REASONS.includes(data.reason as CommunityReason) && data.reason !== 'busy' ? (data.reason as CommunityReason) : 'harm';
    return { ok: false, reason };
  } catch {
    return { ok: false, reason: 'busy' };
  }
}
