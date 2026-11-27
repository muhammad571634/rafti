import type { CharacterDraft, DraftField } from '@/ai/character-draft';
import type { Character, CharacterCategory } from '@/types';

import { MAX_TRAITS, TRAITS } from './create-character';
import type { CreateForm } from './create-flow';
import type { StoryTemplate } from './templates';

/** The Create page's form: blank, from a story template, from a kept character, from a written draft. */

export const isTrait = (tag: string) => (TRAITS as readonly string[]).includes(tag);

export const CATEGORIES: CharacterCategory[] = ['school', 'fantasy', 'idol', 'daily', 'original'];

/** "Alisa Vetrova" -> "AV": the same letters their avatar shows without a picture. */
export const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';

/** Non-empty lines, trimmed; undefined when none are left, so the field is cleared. */
export const cleanList = (list: string[]) => {
  const kept = list.map((line) => line.trim()).filter(Boolean);
  return kept.length > 0 ? kept : undefined;
};

/** A blank new character. */
export const BLANK: CreateForm = {
  name: '',
  tagline: '',
  age: '',
  traits: [],
  style: 'casual',
  role: 'friend',
  bio: '',
  look: '',
  quirk: '',
  scenario: '',
  greeting: '',
  opening: '',
  greetings: [],
  definition: '',
  starters: [],
  height: '',
  backstory: '',
  likes: '',
  dislikes: '',
  opinions: [],
  preset: 'warm',
  category: 'original',
  relation: '',
  mask: '',
  secret: '',
  history: '',
  exception: '',
  arcBeats: [],
  arcFor: '',
};

/**
 * A story template made the user's own (Find → Make it yours): the form starts filled in from it, and
 * the user changes anything, adds their own picture, and keeps it private.
 */
export function formOfTemplate({ card }: StoryTemplate): CreateForm {
  return {
    ...BLANK,
    name: card.name,
    tagline: card.tagline ?? '',
    gender: card.gender,
    age: card.age != null ? String(card.age) : '',
    traits: (card.tags ?? []).filter(isTrait),
    style: card.speakingStyle ?? 'casual',
    role: card.role ?? 'friend',
    bio: card.bio ?? '',
    scenario: card.scenario ?? '',
    greeting: card.greeting,
    opening: card.opening ?? '',
    preset: card.voicePreset ?? 'warm',
    relation: card.relation ?? '',
    mask: card.mask ?? '',
  };
}

/** A character the user made, as the form holds it. */
export function formOf(c: Character): CreateForm {
  return {
    imageUri: c.avatarUri,
    name: c.name,
    tagline: c.tagline ?? '',
    gender: c.gender,
    age: c.age != null ? String(c.age) : '',
    traits: c.tags.filter(isTrait),
    style: c.speakingStyle ?? 'casual',
    role: c.role ?? 'friend',
    bio: c.bio,
    look: c.look ?? '',
    quirk: c.quirk ?? '',
    scenario: c.scenario ?? '',
    greeting: c.greeting,
    opening: c.opening ?? '',
    greetings: c.greetings ?? [],
    definition: c.definition ?? '',
    starters: c.starters ?? [],
    height: c.heightCm != null ? String(c.heightCm) : '',
    backstory: c.backstory ?? '',
    likes: (c.likes ?? []).join(', '),
    dislikes: (c.dislikes ?? []).join(', '),
    opinions: c.opinions ?? [],
    preset: c.voicePreset,
    category: c.category,
    relation: c.relation ?? '',
    mask: c.mask ?? '',
    secret: c.arc?.secret ?? '',
    history: c.history ?? '',
    exception: c.exception ?? '',
    arcBeats: c.arc?.beats ?? [],
    arcFor: c.arc?.secret ?? '',
  };
}

/** A written draft as the form holds it; the photo and its rights stay as they were. */
export const fromDraft = (form: CreateForm, d: CharacterDraft): CreateForm => ({
  ...form,
  name: d.name,
  tagline: d.tagline,
  gender: d.gender,
  age: String(d.age),
  traits: d.tags.filter(isTrait).slice(0, MAX_TRAITS),
  style: d.speakingStyle,
  role: d.role,
  bio: d.bio,
  look: d.look,
  quirk: d.quirk,
  scenario: d.scenario,
  greeting: d.greeting,
  opening: d.opening,
  greetings: d.greetings,
  definition: d.definition,
  starters: d.starters,
  height: d.heightCm != null ? String(d.heightCm) : '',
  backstory: d.backstory,
  likes: d.likes.join(', '),
  dislikes: d.dislikes.join(', '),
  opinions: d.opinions,
  preset: d.voicePreset,
  relation: d.relation,
  mask: d.mask,
  secret: d.arc?.secret ?? '',
  history: d.history,
  exception: d.exception,
  arcBeats: d.arc?.beats ?? [],
  arcFor: d.arc?.secret ?? '',
});

/** Fields written again as one line of text. */
const TEXT_FIELDS = ['relation', 'mask', 'history', 'exception', 'tagline', 'bio', 'look', 'greeting', 'opening', 'quirk', 'scenario', 'backstory'] as const;
/** Fields written again as a list of lines. */
const LIST_FIELDS = ['greetings', 'starters', 'opinions'] as const;
/** Fields written again as a list the form keeps as one comma line. */
const THING_FIELDS = ['likes', 'dislikes'] as const;

/**
 * ✦ wrote one field again: what goes into the form. A list answer fills a list field as it is, a text
 * field as lines; the sample dialog (and anything else) lands in `definition`; a whole arc goes its own way first.
 */
export function fieldPatch(field: DraftField, value: string | string[]): Partial<CreateForm> {
  const text = Array.isArray(value) ? value.join('\n') : value;
  const list = Array.isArray(value) ? value : [value];
  if ((TEXT_FIELDS as readonly string[]).includes(field)) return { [field]: text };
  if ((LIST_FIELDS as readonly string[]).includes(field)) return { [field]: list };
  if ((THING_FIELDS as readonly string[]).includes(field)) return { [field]: list.join(', ') };
  return { definition: text };
}
