import type { Persona, Pronouns, User } from '@/types';

import { contentProblems } from './create-character';

/**
 * Personas, taken from Character.AI: besides their profile the user can be someone else in a
 * chat. One persona is the default for new chats and any chat can use another; the character
 * sees the one its chat uses (`buildCharacterPrompt`). The profile is always there as the first
 * persona, so nothing changes for users who never make one.
 */

export const PERSONAS_MAX = 5;
export const PERSONA_NAME_MAX = 30;
export const PERSONA_ABOUT_MAX = 750;
/** The profile's place in the list; it is never stored as a persona. */
export const PROFILE_PERSONA = 'profile';

/** Topic chips that start a line in "about" (Character.AI's persona topics, ours trimmed). */
export const PERSONA_TOPICS = ['looks', 'personality', 'likes', 'dislikes', 'backstory', 'style'] as const;
export type PersonaTopic = (typeof PERSONA_TOPICS)[number];

/** A persona as the chat and the prompt see it; `profile` marks the user's own profile. */
export interface PersonaView {
  id: string;
  name: string;
  pronouns?: Pronouns;
  about?: string;
  avatarUri?: string;
  profile: boolean;
}

export const profilePersona = (user: User): PersonaView => ({
  id: PROFILE_PERSONA,
  name: user.displayName,
  ...(user.pronouns ? { pronouns: user.pronouns } : {}),
  ...(user.about ? { about: user.about } : {}),
  ...(user.avatarUri ? { avatarUri: user.avatarUri } : {}),
  profile: true,
});

const viewOf = (persona: Persona): PersonaView => ({
  id: persona.id,
  name: persona.name,
  ...(persona.pronouns ? { pronouns: persona.pronouns } : {}),
  about: persona.about,
  ...(persona.avatarUri ? { avatarUri: persona.avatarUri } : {}),
  profile: false,
});

export interface PersonaState {
  user: User;
  personas: Persona[];
  /** The persona new chats use; none means the profile. */
  defaultPersonaId?: string;
  /** A chat's own pick, by conversation id. */
  chatPersonas: Record<string, string>;
}

/** Every persona to pick from: the profile first, then the user's own. */
export const personaList = (state: Pick<PersonaState, 'user' | 'personas'>): PersonaView[] => [
  profilePersona(state.user),
  ...state.personas.map(viewOf),
];

/** The persona new chats use. */
export function defaultPersona(state: Pick<PersonaState, 'user' | 'personas' | 'defaultPersonaId'>): PersonaView {
  const persona = state.personas.find((p) => p.id === state.defaultPersonaId);
  return persona ? viewOf(persona) : profilePersona(state.user);
}

/** Who the user is in this chat: its own pick, else the default, else the profile. */
export function personaFor(conversationId: string, state: PersonaState): PersonaView {
  const picked = state.chatPersonas[conversationId];
  if (picked === PROFILE_PERSONA) return profilePersona(state.user);
  const persona = state.personas.find((p) => p.id === picked);
  return persona ? viewOf(persona) : defaultPersona(state);
}

export type PersonaProblem = 'name' | 'full' | 'minors' | 'explicit';

/** Checks before a persona is saved; `count` is how many there are, the one being edited left out. */
export function checkPersona(input: { name: string; about: string }, count: number): PersonaProblem[] {
  const problems: PersonaProblem[] = [];
  if (!input.name.trim()) problems.push('name');
  if (count >= PERSONAS_MAX) problems.push('full');
  problems.push(...contentProblems(`${input.name} ${input.about}`));
  return problems;
}

/** Starts a "Label: " line at the end of `about`, unless the last line already is that empty one. */
export function addTopicLine(about: string, label: string) {
  const start = `${label}: `;
  const trimmed = about.replace(/\s+$/, '');
  if (trimmed.endsWith(start.trim())) return `${trimmed} `;
  return trimmed ? `${trimmed}\n${start}` : start;
}
