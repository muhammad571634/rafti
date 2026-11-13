import type { Character, Emotion, Mood, Relationship } from '@/types';

import type { MessageRead, Temperament, TurnTrigger } from './types';

const NEUTRAL: Temperament = { baseline: 'calm', expressive: 0.5, chatty: 0.5, teasing: 0.3, curious: 0.5 };

/** What each seed tag says about a temperament. Unknown tags change nothing. */
const TAGS: Record<string, Partial<Temperament>> = {
  cheerful: { baseline: 'happy', chatty: 0.7, expressive: 0.7 },
  sporty: { chatty: 0.6 },
  loyal: { curious: 0.6 },
  calm: { baseline: 'calm', expressive: 0.3 },
  smart: { curious: 0.5 },
  quiet: { chatty: 0.2 },
  playful: { baseline: 'playful', teasing: 0.7, chatty: 0.7 },
  confident: { teasing: 0.5 },
  teasing: { teasing: 0.9 },
  tsundere: { baseline: 'annoyed', teasing: 0.6, expressive: 0.7 },
  bold: { expressive: 0.7 },
  gentle: { baseline: 'tender', teasing: 0.1, curious: 0.7 },
  shy: { baseline: 'shy', chatty: 0.3 },
  bookish: { curious: 0.6 },
  elegant: { baseline: 'calm' },
  mysterious: { chatty: 0.3, curious: 0.3 },
  romantic: { baseline: 'tender' },
  wise: { baseline: 'calm', curious: 0.5 },
  storyteller: { chatty: 0.8 },
  dangerous: { baseline: 'calm', teasing: 0.4 },
  blunt: { chatty: 0.3, teasing: 0.3 },
  protective: { curious: 0.7 },
  strict: { baseline: 'calm', teasing: 0.2 },
  caring: { baseline: 'tender', curious: 0.8 },
  leader: { baseline: 'calm' },
  devoted: { curious: 0.7 },
  sweet: { baseline: 'happy', teasing: 0.2 },
  warm: { baseline: 'tender' },
  cocky: { baseline: 'playful', teasing: 0.8 },
  funny: { teasing: 0.6, chatty: 0.7 },
  energetic: { expressive: 0.9, chatty: 0.8 },
  clingy: { chatty: 0.9, curious: 0.8 },
  mature: { expressive: 0.3 },
  thoughtful: { curious: 0.7 },
  steady: { expressive: 0.2 },
  tired: { chatty: 0.3 },
  witty: { teasing: 0.6 },
  'big sister': { baseline: 'tender', teasing: 0.5 },
  boyfriend: { baseline: 'tender' },
  cozy: { baseline: 'calm' },
};

/** The first tag is the strongest trait, so it is applied last and wins. */
export function temperamentFor(character: Character): Temperament {
  return [...character.tags].reverse().reduce<Temperament>((t, tag) => ({ ...t, ...TAGS[tag] }), NEUTRAL);
}

const HALF_LIFE_MS = 2 * 60 * 60 * 1000;
const RESTING = 0.3;

/** Feelings fade: two hours halves them, and a faint one gives way to their usual self. */
export function currentMood(mood: Mood | undefined, temperament: Temperament, now: number): Mood {
  const resting: Mood = { emotion: temperament.baseline, intensity: RESTING, at: new Date(now).toISOString() };
  if (!mood) return resting;

  const intensity = mood.intensity * 0.5 ** ((now - Date.parse(mood.at)) / HALF_LIFE_MS);
  return intensity < 0.2 ? resting : { ...mood, intensity };
}

/** The feeling your message lands as, given who they are. `null`: it does not move them. */
function landsAs(read: MessageRead, t: Temperament, relationship: Relationship): [Emotion, number] | null {
  const has = (cue: MessageRead['cues'][number]) => read.cues.includes(cue);
  // Flustered rather than sweet: shy and tsundere types get embarrassed by affection.
  const flusters = t.baseline === 'shy' || t.baseline === 'annoyed';

  if (has('rude')) return ['annoyed', 0.7];
  if (has('sad')) return [t.baseline === 'tender' ? 'tender' : 'worried', 0.8];
  if (has('stressed')) return ['worried', 0.6];
  if (has('tired')) return ['tender', 0.5];
  if (has('affection')) return flusters ? ['shy', 0.8] : [relationship.level >= 4 ? 'tender' : 'happy', 0.7];
  if (has('apology')) return ['tender', 0.5];
  if (has('goodbye')) return [t.chatty > 0.6 ? 'sad' : 'tender', 0.4];
  if (has('tease')) return [t.baseline === 'annoyed' ? 'annoyed' : 'playful', 0.5];
  if (has('happy') || has('photo')) return ['happy', 0.6];
  if (has('greeting')) return ['happy', 0.4];
  if (read.lowEffort) return [t.teasing > 0.5 ? 'annoyed' : 'worried', 0.3];
  return null;
}

/** How they feel after reading your message. */
export function feel(
  mood: Mood,
  read: MessageRead,
  trigger: TurnTrigger,
  temperament: Temperament,
  relationship: Relationship,
  now: number,
): Mood {
  const at = new Date(now).toISOString();
  // Left on read: a little hurt or a little needy, depending on who they are.
  if (trigger === 'silence') {
    return { emotion: temperament.teasing > 0.5 ? 'annoyed' : 'sad', intensity: 0.35, at };
  }

  const hit = landsAs(read, temperament, relationship);
  if (!hit) return { ...mood, at };

  const [emotion, strength] = hit;
  const delta = strength * (0.4 + temperament.expressive * 0.6);
  // The same feeling again builds up; a new one replaces the old.
  const intensity = emotion === mood.emotion ? mood.intensity + delta * 0.5 : delta;
  return { emotion, intensity: Math.min(1, Math.max(0.2, intensity)), at };
}
