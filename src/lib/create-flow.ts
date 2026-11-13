import type { ArcBeat, CharacterCategory, CharacterGender, CharacterRole, SpeakingStyle, VoicePreset } from '@/types';

import type { CreationProblem } from './create-character';

/**
 * The create screen's chain (0z149, owner: "easy to use, and everything inside really works"):
 * an idea, the draft being written, then one review page of cards, then the "meet" moment and the
 * chat. Pure: which card a problem belongs to, whether a form holds anything worth keeping, and the
 * shape of an unfinished creation kept between visits (`src/lib/create-draft-storage.ts`).
 */

/** The review page's cards, top to bottom. */
export const CREATE_SECTIONS = ['who', 'personality', 'first', 'story', 'voice', 'more'] as const;
export type CreateSection = (typeof CREATE_SECTIONS)[number];

/** The card that can fix a problem, so the Create button scrolls there and marks it. */
export function sectionOf(problem: CreationProblem): CreateSection {
  switch (problem) {
    case 'name':
    case 'age':
    case 'photo':
    case 'photoRights':
      return 'who';
    case 'voice':
    case 'samples':
    case 'voiceConsent':
      return 'voice';
    // Words the rules turn down can be anywhere; the bio is where they usually are.
    case 'minors':
    case 'explicit':
      return 'personality';
  }
}

/** The first problem of each card, in the page's order: what each card shows under its title. */
export function problemsBySection(problems: readonly CreationProblem[]): Partial<Record<CreateSection, CreationProblem>> {
  const out: Partial<Record<CreateSection, CreationProblem>> = {};
  for (const problem of problems) {
    const section = sectionOf(problem);
    if (!out[section]) out[section] = problem;
  }
  return out;
}

/** The card the Create button takes the user to: the highest one with a problem. */
export function firstProblemSection(problems: readonly CreationProblem[]): CreateSection | undefined {
  const by = problemsBySection(problems);
  return CREATE_SECTIONS.find((s) => by[s]);
}

/** Everything the form holds, as plain values: what is kept between visits and compared for changes. */
export interface CreateForm {
  imageUri?: string;
  photoRights: boolean;
  name: string;
  tagline: string;
  gender?: CharacterGender;
  age: string;
  traits: string[];
  style: SpeakingStyle;
  role: CharacterRole;
  bio: string;
  look: string;
  quirk: string;
  greeting: string;
  opening: string;
  greetings: string[];
  definition: string;
  starters: string[];
  height: string;
  backstory: string;
  likes: string;
  dislikes: string;
  opinions: string[];
  preset?: VoicePreset;
  category: CharacterCategory;
  /**
   * Who they are to the user (Cast 2.0, docs/cast-2.md §4): the three the form asks (relation, how they
   * act with them, what they hide), and two the model writes (history, exception). `arcBeats` are the
   * beats written for `arcFor`; a changed secret drops them and the model writes new ones.
   */
  relation: string;
  mask: string;
  secret: string;
  history: string;
  exception: string;
  arcBeats: ArcBeat[];
  arcFor: string;
}

/** An unfinished new character, kept so leaving the screen (or Android closing the app) loses nothing. */
export interface SavedCreation {
  v: 1;
  savedAt: string;
  form: CreateForm;
}

/** Saved creations older than this are dropped: a week-old half-made character is not worth offering. */
export const SAVED_CREATION_DAYS = 7;

/** Whether the form holds something the user would miss (a name, a bio, a first message, a photo). */
export function hasContent(form: Pick<CreateForm, 'name' | 'bio' | 'greeting' | 'imageUri' | 'tagline'>) {
  return !!(form.name.trim() || form.bio.trim() || form.greeting.trim() || form.tagline.trim() || form.imageUri);
}

/** The same values, so an edit with nothing changed leaves without asking. */
export function sameForm(a: CreateForm, b: CreateForm) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** A kept creation read back: only a well-formed, recent one with something in it. */
export function readSavedCreation(raw: string | null, now: number): SavedCreation | null {
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw) as SavedCreation;
    if (saved?.v !== 1 || !saved.form || typeof saved.form.name !== 'string') return null;
    const age = now - Date.parse(saved.savedAt);
    if (!Number.isFinite(age) || age > SAVED_CREATION_DAYS * 86_400_000) return null;
    return hasContent(saved.form) ? saved : null;
  } catch {
    return null;
  }
}
