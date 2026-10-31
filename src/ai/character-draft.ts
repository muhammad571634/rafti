import {
  BACKSTORY_MAX,
  BIO_MAX,
  contentProblems,
  DEFINITION_MAX,
  GREETING_MAX,
  LOOK_MAX,
  MAX_TRAITS,
  MIN_AGE,
  MORE_GREETINGS_MAX,
  NAME_MAX,
  ROLES,
  STARTER_MAX,
  STARTERS_MAX,
  STYLE_VOICE,
  STYLES,
  TAGLINE_MAX,
  OPENING_MAX,
  QUIRK_MAX,
  HEIGHT_MAX,
  HEIGHT_MIN,
  THING_MAX,
  THINGS_MAX,
  TRAITS,
  VOICES,
} from '../lib/create-character';
import { pickSeeded } from '../lib/seeded';
import type { Character, CharacterGender, CharacterRole, ReplyStyle, SpeakingStyle, VoicePreset } from '@/types';

/**
 * Quick create: the creation chain taken from Character.AI (docs/character-ai-teardown.md §11).
 * A sentence or two about the character and up to three sparks go to the server in one
 * description (`ideaText`); one model call writes the whole character as JSON
 * (`buildDraftPrompt`); `parseDraft` checks and trims it; the picture is drawn from `look`;
 * the user reviews everything in the create form and saves. One field can be written again
 * the same way (`buildFieldPrompt`, `parseField`). The sample dialog (`definition`) is never
 * shown in a chat: the persona prompt carries it (`definitionForPrompt`). The app plays
 * `mockDraft` (src/mock/character-drafts.ts) until the server sends these.
 */

export const IDEA_MAX = 300;
export const SPARKS_MAX = 3;

/** Two-sided traits for quick create: a strength with its catch, so the character has an edge. */
export const SPARKS = [
  'gentleStubborn',
  'teasesWhenNervous',
  'calmUntilHurt',
  'flirtsToDodge',
  'proudLonely',
  'sunnySecret',
  'remembersEverything',
  'braveForOthers',
  'plansThenImprovises',
  'bluntThenSorry',
  'actsCoolCaresLots',
  'toughOutsideKindInside',
] as const;
export type Spark = (typeof SPARKS)[number];

/** What each spark means, written for the model; the app shows its own short label. */
export const SPARK_MEANING: Record<Spark, string> = {
  gentleStubborn: 'gentle, with a stubborn streak once their mind is made up',
  teasesWhenNervous: 'teases the user whenever they feel nervous or caught out',
  calmUntilHurt: 'calm about everything, until someone hurts the people they love',
  flirtsToDodge: 'flirts to dodge questions that get too real',
  proudLonely: 'proud, and a little lonely underneath it',
  sunnySecret: 'sunny and easy to be around, with one secret they keep close',
  remembersEverything: 'remembers every small thing the user ever said',
  braveForOthers: 'braver for others than for themself',
  plansThenImprovises: 'plans every detail, then throws the plan away when it counts',
  bluntThenSorry: 'blunt first, sorry right after',
  actsCoolCaresLots: 'acts cool and unbothered, cares a lot',
  toughOutsideKindInside: 'tough on the outside, soft with the user',
};

export interface DraftInput {
  idea: string;
  sparks: Spark[];
  /** What they are to the user, when the creator picked it. */
  role?: CharacterRole;
  /** The language every field is written in. */
  language: string;
}

/** Everything a quick create fills in; the form shows it for review before anything is saved. */
export interface CharacterDraft {
  name: string;
  tagline: string;
  bio: string;
  look: string;
  gender?: CharacterGender;
  age: number;
  speakingStyle: SpeakingStyle;
  role: CharacterRole;
  /** A stock voice to start with; the creator can change it or clone one. */
  voicePreset: VoicePreset;
  tags: string[];
  greeting: string;
  /** A short action before the greeting (`*looks up from the counter*`); may be empty. */
  opening: string;
  /** One small endearing flaw; may be empty. */
  quirk: string;
  greetings: string[];
  definition: string;
  starters: string[];
  /** For the chat's first card and the profile (D110); each may be empty. */
  backstory: string;
  likes: string[];
  dislikes: string[];
  heightCm?: number;
}

/** What the form holds when one field is written again. */
export type FieldContext = Partial<CharacterDraft>;

export type IdeaProblem = 'empty' | 'long' | 'sparks' | 'minors' | 'explicit';

/** Checks before the request goes out; the server moderates the idea again. Empty means ok. */
export function checkIdea(idea: string, sparks: readonly string[]): IdeaProblem[] {
  const problems: IdeaProblem[] = [];
  const text = idea.trim();
  if (!text) problems.push('empty');
  if (text.length > IDEA_MAX) problems.push('long');
  if (sparks.length > SPARKS_MAX || sparks.some((s) => !(SPARKS as readonly string[]).includes(s))) problems.push('sparks');
  problems.push(...contentProblems(text));
  return problems;
}

/** The idea and its sparks as one description, the way the request carries them. */
export function ideaText(idea: string, sparks: readonly Spark[]) {
  const text = idea.trim();
  return sparks.length ? `${text}\nPersonality: ${sparks.map((s) => SPARK_MEANING[s]).join('; ')}.` : text;
}

const JSON_ONLY = 'Answer with JSON only, no other text. Write every string in the REPLY LANGUAGE.';

const CREATION_RULES = [
  'You write characters for Sigmazam, an app for adults (18+) who want company: romance, friendship, comfort.',
  '- Every character is an original adult, 18 or older.',
  '- Never a real person (celebrity, idol, public figure), never a character another company owns, never someone the idea places at school or as a minor.',
  '- Romance and drama are welcome; nothing sexually explicit.',
  '- If the idea asks for any of these, write nothing else and answer {"refused":"realPerson"}, {"refused":"owned"}, {"refused":"minor"} or {"refused":"explicit"}.',
].join('\n');

/** The fields a draft or a single-field request writes. */
export type DraftField =
  | 'tagline'
  | 'bio'
  | 'look'
  | 'greeting'
  | 'opening'
  | 'quirk'
  | 'greetings'
  | 'dialog'
  | 'starters'
  | 'backstory'
  | 'likes'
  | 'dislikes';

/** One rule per field, shared by the whole-draft and the single-field prompt. */
const FIELD_RULES: Record<DraftField, string> = {
  tagline: `tagline: how they would sum themselves up in a few words, max ${TAGLINE_MAX} characters.`,
  bio: `bio: who they are, what they want, their world and habits, in their own voice (first person), max ${BIO_MAX} characters.`,
  look: `look: what they look like, for their picture: hair, eyes, clothes, one detail. Adult features. Max ${LOOK_MAX} characters.`,
  greeting: `greeting: their first message to the user, in character, setting the scene, max ${GREETING_MAX} characters. {{user}} stands for the user's name.`,
  opening: `opening: a short physical action before the greeting, in *asterisks*, third person, what they are doing as the user arrives (*looks up from the counter, smiling*), max ${OPENING_MAX} characters.`,
  quirk: `quirk: one small, endearing flaw or habit that makes them human (forgets their own lunch, hums when focused); kind and healthy, never jealous, possessive or controlling. Max ${QUIRK_MAX} characters.`,
  greetings: `greetings: ${MORE_GREETINGS_MAX} more first messages, each a different mood or moment, max ${GREETING_MAX} characters each.`,
  dialog:
    'dialog: 4-6 short lines of them talking with someone else (not the user), "from" is "char" or "other". It shows their voice, words and rhythm; no facts about the user.',
  starters: `starters: ${STARTERS_MAX} first messages the user could send them, max ${STARTER_MAX} characters each.`,
  backstory: `backstory: where they come from and what they want now, 2-3 sentences, third person, max ${BACKSTORY_MAX} characters.`,
  likes: `likes: ${THINGS_MAX} small, concrete things they love (a food, a place, a habit), a few words each, max ${THING_MAX} characters each.`,
  dislikes: `dislikes: 2-3 small things they can't stand, harmless and a little funny, a few words each, max ${THING_MAX} characters each.`,
};

/** Every field one "write it for me" may ask for (the server checks requests against it). */
export const DRAFT_FIELDS = Object.keys(FIELD_RULES) as DraftField[];

const FIELD_SHAPES: Record<DraftField, string> = {
  tagline: '{"value":""}',
  bio: '{"value":""}',
  look: '{"value":""}',
  greeting: '{"value":""}',
  opening: '{"value":""}',
  quirk: '{"value":""}',
  greetings: '{"values":[]}',
  dialog: '{"dialog":[{"from":"char","text":""}]}',
  starters: '{"values":[]}',
  backstory: '{"value":""}',
  likes: '{"values":[]}',
  dislikes: '{"values":[]}',
};

/** One call that writes the whole character from the idea. */
export function buildDraftPrompt(input: DraftInput) {
  return [
    CREATION_RULES,
    '',
    `REPLY LANGUAGE: ${input.language}`,
    '',
    'THE IDEA (from the creator):',
    ideaText(input.idea, input.sparks),
    input.role ? `What they are to the user: their ${input.role}.` : 'Pick what they are to the user.',
    '',
    'TASK: Write the whole character. Keep everything the idea says; invent the rest so it fits.',
    `- name: a first name, or first and last, max ${NAME_MAX} characters. Original, not famous.`,
    `- ${FIELD_RULES.tagline}`,
    `- ${FIELD_RULES.bio}`,
    `- ${FIELD_RULES.look}`,
    `- age: ${MIN_AGE} or older. gender: "male" or "female" when the idea says; else leave it out.`,
    `- speakingStyle: one of ${STYLES.join(', ')}. role: one of ${ROLES.join(', ')}. voicePreset: one of ${VOICES.join(', ')}.`,
    `- tags: 2-${MAX_TRAITS} of ${TRAITS.join(', ')}.`,
    `- ${FIELD_RULES.greeting}`,
    `- ${FIELD_RULES.opening}`,
    `- ${FIELD_RULES.quirk}`,
    `- ${FIELD_RULES.greetings}`,
    `- ${FIELD_RULES.dialog}`,
    `- ${FIELD_RULES.starters}`,
    `- ${FIELD_RULES.backstory}`,
    `- ${FIELD_RULES.likes}`,
    `- ${FIELD_RULES.dislikes}`,
    `- heightCm: their height in centimetres, ${HEIGHT_MIN}-${HEIGHT_MAX}, fitting the look.`,
    JSON_ONLY,
    'Shape: {"name":"","tagline":"","bio":"","look":"","age":24,"heightCm":170,"gender":"female","speakingStyle":"","role":"","voicePreset":"","tags":[],"greeting":"","opening":"","quirk":"","greetings":[],"dialog":[{"from":"char","text":""}],"starters":[],"backstory":"","likes":[],"dislikes":[]}',
  ].join('\n');
}

/** Writes one field again from what the form holds now (the creator's "write it for me"). */
export function buildFieldPrompt(field: DraftField, character: Partial<CharacterDraft>, language: string) {
  const known = [
    character.name && `Name: ${character.name}`,
    character.tagline && `Tagline: ${character.tagline}`,
    character.bio && `Bio: ${character.bio}`,
    character.age && `Age: ${character.age}`,
    character.gender && `Gender: ${character.gender}`,
    character.speakingStyle && `How they talk: ${character.speakingStyle}`,
    character.role && `What they are to the user: their ${character.role}`,
    character.tags?.length && `Personality: ${character.tags.join(', ')}`,
    character.greeting && `First message: ${character.greeting}`,
    character.quirk && `Quirk: ${character.quirk}`,
    character.backstory && `Story: ${character.backstory}`,
  ].filter(Boolean);
  return [
    CREATION_RULES,
    '',
    `REPLY LANGUAGE: ${language}`,
    '',
    'THE CHARACTER SO FAR:',
    ...(known.length ? known : ['(nothing yet)']),
    '',
    `TASK: Write only this field, so it fits everything above. Something new, not a copy of what is there.`,
    `- ${FIELD_RULES[field]}`,
    JSON_ONLY,
    `Shape: ${FIELD_SHAPES[field]}`,
  ].join('\n');
}

export type DraftProblem = 'format' | 'realPerson' | 'owned' | 'minors' | 'explicit';
export type DraftResult = { ok: true; draft: CharacterDraft } | { ok: false; problem: DraftProblem };

const REFUSALS: Record<string, DraftProblem> = {
  realPerson: 'realPerson',
  owned: 'owned',
  minor: 'minors',
  explicit: 'explicit',
};

/** Checks and trims what the model wrote; anything off is dropped, never guessed. */
export function parseDraft(raw: string): DraftResult {
  const data = readJson(raw);
  if (!data) return { ok: false, problem: 'format' };
  if (data.refused != null) return { ok: false, problem: REFUSALS[String(data.refused)] ?? 'format' };

  const name = clip(text(data.name), NAME_MAX);
  const greeting = clip(text(data.greeting), GREETING_MAX);
  const age = typeof data.age === 'number' ? Math.round(data.age) : NaN;
  if (!name || !greeting || !Number.isFinite(age)) return { ok: false, problem: 'format' };
  if (age < MIN_AGE) return { ok: false, problem: 'minors' };

  const gender = data.gender === 'male' || data.gender === 'female' ? data.gender : undefined;
  const speakingStyle = oneOf(STYLES, data.speakingStyle, 'casual');
  const draft: CharacterDraft = {
    name,
    tagline: clip(text(data.tagline), TAGLINE_MAX),
    bio: clip(text(data.bio), BIO_MAX),
    look: clip(text(data.look), LOOK_MAX),
    ...(gender ? { gender } : {}),
    age: Math.min(age, 120),
    speakingStyle,
    role: oneOf(ROLES, data.role, 'friend'),
    voicePreset: oneOf(VOICES, data.voicePreset, STYLE_VOICE[speakingStyle]),
    tags: [...new Set(texts(data.tags).filter((tag) => (TRAITS as readonly string[]).includes(tag)))].slice(0, MAX_TRAITS),
    greeting,
    opening: actionOf(text(data.opening)),
    quirk: clip(text(data.quirk), QUIRK_MAX),
    greetings: lines(data.greetings, GREETING_MAX, MORE_GREETINGS_MAX).filter((g) => g !== greeting),
    definition: definitionFromDialog(data.dialog),
    starters: lines(data.starters, STARTER_MAX, STARTERS_MAX),
    backstory: clip(text(data.backstory), BACKSTORY_MAX),
    likes: lines(data.likes, THING_MAX, THINGS_MAX),
    dislikes: lines(data.dislikes, THING_MAX, THINGS_MAX),
    ...(typeof data.heightCm === 'number' && data.heightCm >= HEIGHT_MIN && data.heightCm <= HEIGHT_MAX
      ? { heightCm: Math.round(data.heightCm) }
      : {}),
  };
  const problems = contentProblems(
    [
      draft.name,
      draft.tagline,
      draft.bio,
      draft.look,
      draft.greeting,
      draft.opening,
      draft.quirk,
      ...draft.greetings,
      draft.definition,
      ...draft.starters,
      draft.backstory,
      ...draft.likes,
      ...draft.dislikes,
    ].join(' '),
  );
  return problems.length > 0 ? { ok: false, problem: problems[0] } : { ok: true, draft };
}

/** The value of one rewritten field, checked like a draft; null when it is unusable. */
export function parseField(field: DraftField, raw: string): string | string[] | null {
  const data = readJson(raw);
  if (!data || data.refused != null) return null;
  let value: string | string[];
  switch (field) {
    case 'tagline':
      value = clip(text(data.value), TAGLINE_MAX);
      break;
    case 'bio':
      value = clip(text(data.value), BIO_MAX);
      break;
    case 'look':
      value = clip(text(data.value), LOOK_MAX);
      break;
    case 'greeting':
      value = clip(text(data.value), GREETING_MAX);
      break;
    case 'opening':
      value = actionOf(text(data.value));
      break;
    case 'quirk':
      value = clip(text(data.value), QUIRK_MAX);
      break;
    case 'greetings':
      value = lines(data.values, GREETING_MAX, MORE_GREETINGS_MAX);
      break;
    case 'starters':
      value = lines(data.values, STARTER_MAX, STARTERS_MAX);
      break;
    case 'backstory':
      value = clip(text(data.value), BACKSTORY_MAX);
      break;
    case 'likes':
    case 'dislikes':
      value = lines(data.values, THING_MAX, THINGS_MAX);
      break;
    case 'dialog':
      value = definitionFromDialog(data.dialog);
      break;
  }
  const all = Array.isArray(value) ? value.join(' ') : value;
  if (!all.trim() || contentProblems(all).length > 0) return null;
  return value;
}

/** The model's dialog lines as a definition: `{{char}}:` for them, `{{random_user_1}}:` for the other side. */
export function definitionFromDialog(dialog: unknown) {
  if (!Array.isArray(dialog)) return '';
  const out: string[] = [];
  let size = 0;
  for (const line of dialog) {
    if (!line || typeof line !== 'object') continue;
    const { from, text: said } = line as { from?: unknown; text?: unknown };
    const words = clip(text(said), 300);
    if (!words || (from !== 'char' && from !== 'other')) continue;
    const entry = `${from === 'char' ? '{{char}}' : '{{random_user_1}}'}: ${words}`;
    if (size + entry.length + 1 > DEFINITION_MAX) break;
    out.push(entry);
    size += entry.length + 1;
  }
  return out.join('\n');
}

/** One turn of a definition: who speaks (empty for plain notes before the first speaker) and what. */
export interface DefinitionTurn {
  speaker: string;
  text: string;
}

/**
 * Splits a definition into turns: a line that starts with `name:` opens a turn and the lines
 * under it carry on with it, as Character.AI's definitions read.
 */
export function parseDefinition(definition: string): DefinitionTurn[] {
  const turns: DefinitionTurn[] = [];
  for (const line of definition.split(/\r?\n/)) {
    const turn = /^\s*(\{\{[a-z0-9_]+\}\}|[^:\s{][^:\n]{0,29}):\s?(.*)$/i.exec(line);
    if (turn) turns.push({ speaker: turn[1], text: turn[2].trim() });
    else if (!line.trim()) continue;
    else if (turns.length > 0) turns[turns.length - 1].text += `\n${line.trim()}`;
    else turns.push({ speaker: '', text: line.trim() });
  }
  return turns;
}

/** Fills the name slots of a greeting or definition: {{char}}, {{user}} and {{random_user_N}}. */
export function fillNames(text: string, names: { char: string; user: string }) {
  return text
    .replace(/\{\{char\}\}/gi, names.char)
    .replace(/\{\{user\}\}/gi, names.user)
    .replace(/\{\{random_user_(\d+)\}\}/gi, (_, n: string) => `Person ${n}`);
}

/**
 * The definition as the persona prompt carries it: names filled in, whole turns from the start
 * while they fit, since the start matters most. Empty when there is none.
 */
export function definitionForPrompt(definition: string | undefined, names: { char: string; user: string }, max = DEFINITION_MAX) {
  if (!definition?.trim()) return '';
  const out: string[] = [];
  let size = 0;
  for (const turn of parseDefinition(definition)) {
    const said = fillNames(turn.text, names);
    const line = turn.speaker ? `${fillNames(turn.speaker, names)}: ${said}` : said;
    if (size + line.length + 1 > max) break;
    out.push(line);
    size += line.length + 1;
  }
  return out.join('\n');
}

/** The most recent chat lines one "add from chat" takes. */
export const CHAT_LINES_MAX = 8;

/**
 * Character.AI's "insert a chat": the latest lines of a chat with them go to the end of the
 * definition, theirs as `{{char}}:` and the user's as `{{random_user_1}}:`, so the example never
 * reads as something this user said. Lines that do not fit are left out, oldest first.
 */
export function chatToDefinition(definition: string, lines: readonly { author: 'me' | 'them'; text: string }[]) {
  const base = definition.trim();
  const turns = lines
    .map(({ author, text: said }) => ({ author, said: clip(text(said), 300) }))
    .filter(({ said }) => said)
    .slice(-CHAT_LINES_MAX)
    .map(({ author, said }) => `${author === 'them' ? '{{char}}' : '{{random_user_1}}'}: ${said}`);
  let room = DEFINITION_MAX - base.length - (base ? 1 : 0);
  const kept: string[] = [];
  for (let i = turns.length - 1; i >= 0 && turns[i].length + 1 <= room; i--) {
    kept.unshift(turns[i]);
    room -= turns[i].length + 1;
  }
  return { definition: [base, ...kept].filter(Boolean).join('\n'), added: kept.length };
}

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * A definition as its editor shows it: `{{char}}` as their name and every other person as one
 * label ("Someone"), so the creator never types slots. `textToDefinition` turns it back.
 */
export function definitionToText(definition: string, labels: { char: string; other: string }) {
  return definition
    .replace(/^(\s*)\{\{char\}\}:/gim, `$1${labels.char}:`)
    .replace(/^(\s*)\{\{random_user_\d+\}\}:/gim, `$1${labels.other}:`);
}

/** What the creator typed, with their name and the other label at a line start back as slots. */
export function textToDefinition(text: string, labels: { char: string; other: string }) {
  let out = text;
  if (labels.char.trim()) out = out.replace(new RegExp(`^(\\s*)${escape(labels.char.trim())}:`, 'gim'), '$1{{char}}:');
  if (labels.other.trim()) out = out.replace(new RegExp(`^(\\s*)${escape(labels.other.trim())}:`, 'gim'), '$1{{random_user_1}}:');
  return out.slice(0, DEFINITION_MAX);
}

/** An opening action as one `*…*`, however the model or the creator wrote it; empty stays empty. */
export function actionOf(raw: string) {
  const inner = raw.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
  return inner ? `*${inner.slice(0, OPENING_MAX - 2)}*` : '';
}

/**
 * A new chat's first message: their opening action before the main greeting, unless the chat is
 * plain texting (Talk), where narration never shows. Extra greetings set their own scene.
 */
export function withOpening(character: Pick<Character, 'greeting' | 'opening'>, picked: string, style: ReplyStyle) {
  const action = actionOf(character.opening ?? '');
  return action && picked === character.greeting && style !== 'talk' ? `${action} ${picked}` : picked;
}

/** The opening a new chat starts with: the greeting or one of the extra ones, the same for the same seed. */
export function pickOpening(character: Pick<Character, 'greeting' | 'greetings'>, seed: string) {
  const openings = [character.greeting, ...(character.greetings ?? [])].filter((g) => g.trim());
  return openings.length > 0 ? pickSeeded(openings, seed) : '';
}

/** A model's JSON answer as an object, or null; fences around it are fine. */
export function readJson(raw: string): Record<string, unknown> | null {
  // Models sometimes wrap JSON in a code fence.
  const body = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    const data: unknown = JSON.parse(body);
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const text = (value: unknown) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '');
const texts = (value: unknown) => (Array.isArray(value) ? value.map(text).filter(Boolean) : []);

/** At most `max` non-empty, distinct lines, each clipped to `size`. */
const lines = (value: unknown, size: number, max: number) =>
  [...new Set(texts(value).map((line) => clip(line, size)))].slice(0, max);

const oneOf = <T extends string>(options: readonly T[], value: unknown, fallback: T): T =>
  (options as readonly unknown[]).includes(value) ? (value as T) : fallback;

/** Cuts at the last word that fits and marks the cut, so a long field never breaks the layout. */
export function clip(value: string, max: number) {
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,;:.-]+$/, '')}…`;
}
