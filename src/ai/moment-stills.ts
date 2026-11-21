import type { MomentStill } from '@/types';

/**
 * The film stills a friend's moments can show (`docs/nano-banana-moment-stills.md`): seven moods, the
 * same seven for every character, each drawn once per friend by the owner. A moment names the one that
 * fits it (the model picks it when it writes the week's moments, the app's scenes carry their own),
 * and the card shows that friend's drawing of it; a friend with none drawn shows their portrait.
 * Mood and light, never a named place (but `our_place`, the one from their history), so one still serves many scenes. One list for every character,
 * official and user-made, in every language.
 */
export const MOMENT_STILLS: readonly { id: MomentStill; mood: string }[] = [
  { id: 'close_night', mood: 'night, close and tender, a warm low light' },
  { id: 'rain', mood: 'rain or a storm, longing, something not yet said' },
  { id: 'city_lights', mood: 'out at night, city lights, adventure, "come on"' },
  { id: 'morning', mood: 'morning light at home, sleepy and cosy' },
  { id: 'laughing', mood: 'a party or a joke, warm lights, caught mid-laugh' },
  { id: 'tension', mood: 'tense or unfinished, hard light, holding your gaze' },
  // The place their shared history names (Victor's car park, Caleb's family kitchen): what made a
  // Character.AI character's stills pull was its own story's place, drawn again and again.
  { id: 'our_place', mood: 'back at the place from your shared history' },
];

const IDS = new Set<string>(MOMENT_STILLS.map((s) => s.id));

/** The still a model's answer named, when it is one of the seven; else none (the card shows the portrait). */
export const asMomentStill = (value: unknown): MomentStill | undefined =>
  typeof value === 'string' && IDS.has(value.trim().toLowerCase()) ? (value.trim().toLowerCase() as MomentStill) : undefined;

/** The prompt's line naming the seven, for the `moments` write. */
export const momentStillLine = () => `- "still": the picture of you that fits it, one of: ${MOMENT_STILLS.map((s) => `${s.id} (${s.mood})`).join('; ')}. Use each one once at most.`;
