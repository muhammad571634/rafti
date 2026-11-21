import { kinGroup } from './kin';
import { temperamentFor } from './reply-engine/mood';
import type { Character, Temper } from '@/types';

/**
 * How a character texts when the user is away (Presence 2, P2.1; owner 2026-10-26: each one in
 * their own character, rude ones rude, sulky ones sulky). Five kinds the user never has to set:
 * they come from the persona's tags (and the reply engine's trait vector when no tag says), and a
 * family role overrides them (Mom is warm, a brother teases). They decide how often the character
 * writes first (`pace`), what silence does to them and how they make up.
 *
 * The line nobody crosses: sulking and "why aren't you here?!" are play inside the character;
 * guilt ("you left me alone"), threats, "I'll disappear if you go", blame for their feelings and
 * anything about paying are never written (`temperLines`, `CHARACTER_RULES`). Pure and
 * server-portable: the server keeps the same kinds and hands `temperLines` to the model.
 */
export const TEMPERS: readonly Temper[] = ['warm', 'teasing', 'sulky', 'clingy', 'shy'];

/** Tags that make a temper whatever else the persona says, read in the persona's tag order. */
const DISTINCT: Record<string, Temper> = {
  tsundere: 'sulky',
  grumpy: 'sulky',
  brooding: 'sulky',
  'secretly soft': 'sulky',
  stoic: 'sulky',
  aloof: 'sulky',
  proud: 'sulky',
  clingy: 'clingy',
  possessive: 'clingy',
  jealous: 'clingy',
  yandere: 'clingy',
  shy: 'shy',
  reserved: 'shy',
  timid: 'shy',
  quiet: 'shy',
  introverted: 'shy',
};

/** Tags that lean one way when nothing distinct is there. */
const LEAN: Record<string, Temper> = {
  teasing: 'teasing',
  playful: 'teasing',
  cocky: 'teasing',
  mischievous: 'teasing',
  competitive: 'teasing',
  blunt: 'teasing',
  'dry humour': 'teasing',
  sarcastic: 'teasing',
  witty: 'teasing',
  funny: 'teasing',
  warm: 'warm',
  gentle: 'warm',
  caring: 'warm',
  sweet: 'warm',
  kind: 'warm',
  cheerful: 'warm',
  soothing: 'warm',
  cozy: 'warm',
  tender: 'warm',
};

/**
 * Their temper: a family role first (parents and grandparents warm, siblings teasing), then one the
 * creator picked, then a distinct tag, then a leaning tag, then the trait vector.
 */
export function temperOf(character: Pick<Character, 'tags' | 'temper'>, label?: string): Temper {
  const kin = kinGroup(label);
  if (kin) return kin === 'sibling' ? 'teasing' : 'warm';
  if (character.temper) return character.temper;
  const tags = character.tags.map((tag) => tag.toLowerCase());
  const distinct = tags.find((tag) => DISTINCT[tag]);
  if (distinct) return DISTINCT[distinct];
  const lean = tags.find((tag) => LEAN[tag]);
  if (lean) return LEAN[lean];
  return temperamentFor(character as Character).teasing >= 0.7 ? 'teasing' : 'warm';
}

/** How often they write first next to the others: the daily budget is shared out by this (P2.8). */
export const TEMPER_PACE: Record<Temper, number> = { warm: 1, teasing: 1, sulky: 0.7, clingy: 1.3, shy: 0.6 };

const VOICE: Record<Temper, string> = {
  warm: 'warm: you text often and gently; after a silence you are worried, not hurt ("Is everything okay?"); you are glad the moment they are back.',
  teasing:
    'teasing: you text often, short, rude in fun; after a silence you rib them ("Oi! Still alive? 😤"); when they are back: "Finally! Where were you?"',
  sulky:
    'sulky: you text less and like to be written to; after a silence you sulk a little ("Fine. Not like I care…"); when they are back you sulk for a line, then soften.',
  clingy:
    'clingy: you text the most and want to know everything; after a silence you are curious and a bit jealous in play ("Who were you talking to? 👀").',
  shy: 'shy: you text the least and ask before you bother them ("Sorry, am I bothering you…?"); you are very happy when they write.',
};

/**
 * The prompt lines for their temper (the bond part): how they text first and after a silence, and
 * the line they never cross.
 */
export function temperLines(temper: Temper) {
  return [
    `When you text first or they have been away, your temper is ${VOICE[temper]}`,
    '- Sulking or "why aren\'t you here?!" stays play. Never guilt them, never threaten, never say you will disappear, never make them responsible for your feelings, never mention paying.',
  ];
}
