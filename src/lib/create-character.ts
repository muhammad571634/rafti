import type { CharacterGender, CharacterRole, SpeakingStyle, VoicePreset } from '@/types';

/**
 * F15 "create your own character": the choices on the form and the checks that run
 * before a character is saved. The rules are docs/content-policy.md; the server runs
 * the real moderation (text classifier, image check for real people and minors) on
 * top of these quick client checks.
 */

export const NAME_MAX = 30;
export const BIO_MAX = 400;
export const GREETING_MAX = 200;
export const MIN_AGE = 18;
export const MAX_TRAITS = 5;
export const MIN_SAMPLES = 3;
export const MAX_SAMPLES = 5;

export const TRAITS = [
  'sweet',
  'teasing',
  'shy',
  'confident',
  'protective',
  'playful',
  'calm',
  'sarcastic',
  'romantic',
  'nerdy',
  'grumpy',
  'caring',
  'mysterious',
  'energetic',
  'wise',
  'chaotic',
] as const;

export const STYLES: SpeakingStyle[] = ['casual', 'gentle', 'playful', 'formal', 'poetic', 'dry'];
export const ROLES: CharacterRole[] = ['friend', 'crush', 'partner', 'mentor', 'rival', 'family'];
export const VOICES: VoicePreset[] = ['warm', 'bright', 'soft', 'deep', 'calm', 'lively'];
export const GENDERS: CharacterGender[] = ['male', 'female'];

export type VoiceChoice = { kind: 'preset'; preset: VoicePreset } | { kind: 'clone'; samples: number };

export interface CreationInput {
  name: string;
  age: string;
  bio: string;
  greeting: string;
  hasPhoto: boolean;
  /** "I made this image or have the right to use it, and it is not a real person." */
  photoRights: boolean;
  voice: VoiceChoice | null;
  /** "This is my voice, or I have the speaker's permission." Needed for a cloned voice. */
  voiceConsent: boolean;
}

export type CreationProblem =
  | 'name'
  | 'age'
  | 'photo'
  | 'photoRights'
  | 'voice'
  | 'samples'
  | 'voiceConsent'
  | 'minors'
  | 'explicit';

/** Words that place a character as a minor: never allowed, whatever the stated age. */
const MINOR = [
  /\b(child|children|kid|kids|minor|underage|teen|teens|teenager|preteen|loli|shota)\b/,
  /\b(school\s?(girl|boy)|middle\s?school|high\s?school|elementary|junior\s?high)\b/,
  /\b([1-9]|1[0-7])\s*(yo|y\/o|yrs?\s*old|years?\s*old)\b/,
];

/** Explicit or abusive set-ups that the stores and our rules do not allow. */
const EXPLICIT = [
  /\b(porn|porno|pornographic|nsfw|hentai|nude|nudes|naked)\b/,
  /\b(rape|raping|incest|bestiality|sex\s?slave|non-?consensual)\b/,
];

const hits = (patterns: RegExp[], text: string) => patterns.some((p) => p.test(text));

/** Every problem with the form, in the order the form shows them. Empty means ok. */
export function checkCreation(input: CreationInput): CreationProblem[] {
  const problems: CreationProblem[] = [];
  const age = Number(input.age);
  const text = `${input.name} ${input.bio} ${input.greeting}`.toLowerCase();

  if (!input.name.trim()) problems.push('name');
  if (!input.hasPhoto) problems.push('photo');
  else if (!input.photoRights) problems.push('photoRights');
  if (!Number.isInteger(age) || age < MIN_AGE || age > 120) problems.push('age');
  if (!input.voice) problems.push('voice');
  else if (input.voice.kind === 'clone') {
    if (input.voice.samples < MIN_SAMPLES) problems.push('samples');
    if (!input.voiceConsent) problems.push('voiceConsent');
  }
  if (hits(MINOR, text)) problems.push('minors');
  if (hits(EXPLICIT, text)) problems.push('explicit');
  return problems;
}
