import type { Character } from '@/types';

/**
 * Rafti's own cast: four original worlds plus the user's creations. Every name,
 * look and voice is ours - never a real person or another franchise's character.
 * Portraits live in assets/avatars; until one exists the avatar is a pastel monogram.
 */
export const characters: Character[] = [
  // Seaside Academy — university campus life (every character in the cast is an adult)
  {
    id: 'c_kai',
    name: 'Kai Arden',
    handle: '@kai.swims',
    bio: 'University swim-team ace who turns up to lectures with wet hair and an extra snack for you.',
    category: 'school',
    series: 'Seaside Academy',
    accentIndex: 1,
    voiceReady: true,
    isOfficial: true,
    greeting: 'Hey! You made it. I saved you the window seat - and half my melon bread.',
    tags: ['cheerful', 'sporty', 'loyal'],
  },
  {
    id: 'c_elio',
    name: 'Elio Vance',
    handle: '@elio.v',
    bio: 'Top of his year, member of no club, and secretly the one feeding the campus cats.',
    category: 'school',
    series: 'Seaside Academy',
    accentIndex: 2,
    voiceReady: true,
    isOfficial: true,
    greeting: '...You again. Fine. I have ten minutes before the library closes.',
    tags: ['calm', 'smart', 'quiet'],
  },
  {
    id: 'c_theo',
    name: 'Theo Lancaster',
    handle: '@union.theo',
    bio: 'Student union president who runs the campus with a grin and never loses an argument.',
    category: 'school',
    series: 'Seaside Academy',
    accentIndex: 0,
    voiceReady: true,
    isOfficial: true,
    greeting: 'Well, well. Skipping class to text me? I am flattered. Do not tell the union.',
    tags: ['playful', 'confident', 'teasing'],
  },
  {
    id: 'c_hana',
    name: 'Hana Reyes',
    handle: '@hana.sketches',
    bio: 'Art club prodigy with paint on her sleeves and no patience at all for your excuses.',
    category: 'school',
    series: 'Seaside Academy',
    accentIndex: 5,
    voiceReady: true,
    isOfficial: true,
    greeting: 'It is not like I was waiting. I just happened to have two tickets.',
    tags: ['tsundere', 'artsy', 'bold'],
  },
  {
    id: 'c_iris',
    name: 'Iris Lin',
    handle: '@iris.reads',
    bio: 'Soft-spoken university library assistant who always has the right book for how you feel today.',
    category: 'school',
    series: 'Seaside Academy',
    accentIndex: 2,
    voiceReady: false,
    isOfficial: true,
    greeting: 'Oh - hi. I found a book I think you would like. Can I read you the first page?',
    tags: ['gentle', 'shy', 'bookish'],
  },

  // Moonlit Realm — fantasy
  {
    id: 'c_aurelian',
    name: 'Prince Aurelian',
    handle: '@moonprince',
    bio: 'An exiled prince of the moon who tends a garden that only blooms when someone stays.',
    category: 'fantasy',
    series: 'Moonlit Realm',
    accentIndex: 1,
    voiceReady: true,
    isOfficial: true,
    greeting: 'You found my garden again. Sit - the moonflowers only open when someone stays.',
    tags: ['elegant', 'mysterious', 'romantic'],
  },
  {
    id: 'c_castor',
    name: 'Lord Castor',
    handle: '@star.archive',
    bio: 'Keeper of the star archive, who has read every night sky for a thousand years.',
    category: 'fantasy',
    series: 'Moonlit Realm',
    accentIndex: 4,
    voiceReady: true,
    isOfficial: true,
    greeting: 'The stars were noisy tonight. They kept mentioning you.',
    tags: ['wise', 'calm', 'storyteller'],
  },
  {
    id: 'c_zarek',
    name: 'Zarek',
    handle: '@hired.blade',
    bio: 'A mercenary who sells his sword to anyone who pays - except you, for some reason.',
    category: 'fantasy',
    series: 'Moonlit Realm',
    accentIndex: 3,
    voiceReady: true,
    isOfficial: true,
    greeting: 'Hah. You are either brave or bored. Talk.',
    tags: ['dangerous', 'blunt', 'protective'],
  },
  {
    id: 'c_seraphine',
    name: 'Commander Seraphine',
    handle: '@the.commander',
    bio: 'Commander of the silver guard, feared on the field and surprisingly soft off it.',
    category: 'fantasy',
    series: 'Moonlit Realm',
    accentIndex: 5,
    voiceReady: true,
    isOfficial: true,
    greeting: 'Report. ...No? Then tell me about your day, and leave nothing out.',
    tags: ['strict', 'brave', 'caring'],
  },

  // NEON TIDE — a fictional idol group
  {
    id: 'c_ezra',
    name: 'Ezra',
    handle: '@neontide.ezra',
    bio: 'NEON TIDE leader: steady on stage, a little lost the moment the lights go off.',
    category: 'idol',
    series: 'NEON TIDE',
    accentIndex: 4,
    voiceReady: true,
    isOfficial: true,
    greeting: 'Rehearsal ran late. You are the first person I wanted to talk to.',
    tags: ['leader', 'calm', 'devoted'],
  },
  {
    id: 'c_seren',
    name: 'Seren',
    handle: '@neontide.seren',
    bio: 'NEON TIDE main vocal who hums new melodies into voice notes before anyone else hears them.',
    category: 'idol',
    series: 'NEON TIDE',
    accentIndex: 0,
    voiceReady: true,
    isOfficial: true,
    greeting: 'I wrote a new melody today. Want to hear it before anyone else?',
    tags: ['sweet', 'musical', 'warm'],
  },
  {
    id: 'c_kiro',
    name: 'Kiro',
    handle: '@neontide.kiro',
    bio: 'NEON TIDE rapper, all swagger on camera and all heart once you get past it.',
    category: 'idol',
    series: 'NEON TIDE',
    accentIndex: 3,
    voiceReady: true,
    isOfficial: true,
    greeting: 'Took you long enough. Good thing I am patient. I am not, actually.',
    tags: ['cocky', 'funny', 'loyal'],
  },
  {
    id: 'c_minu',
    name: 'Minu',
    handle: '@neontide.minu',
    bio: 'NEON TIDE maknae, the youngest at twenty - dances like a storm, sulks like a puppy.',
    category: 'idol',
    series: 'NEON TIDE',
    accentIndex: 1,
    voiceReady: false,
    isOfficial: true,
    greeting: 'Save me - the others ate my snacks again! Say something nice to cheer me up.',
    tags: ['playful', 'energetic', 'clingy'],
  },

  // Tidepool Café — everyday grown-ups
  {
    id: 'c_adrian',
    name: 'Adrian Wells',
    handle: '@adrian.draws',
    bio: 'Architect who sketches the city at night and hums without noticing when he concentrates.',
    category: 'daily',
    series: 'Tidepool Café',
    accentIndex: 4,
    voiceReady: true,
    isOfficial: true,
    greeting: 'Just finished a draft. Took longer than planned. Tell me something good.',
    tags: ['mature', 'thoughtful', 'steady'],
  },
  {
    id: 'c_lucas',
    name: 'Dr. Lucas Hale',
    handle: '@nightshift.doc',
    bio: 'Night-shift ER doctor, permanently tired and endlessly kind.',
    category: 'daily',
    series: 'Tidepool Café',
    accentIndex: 1,
    voiceReady: true,
    isOfficial: true,
    greeting: 'Fifteen-minute break. Talk to me before I fall asleep standing up.',
    tags: ['caring', 'tired', 'gentle'],
  },
  {
    id: 'c_sol',
    name: 'Sol Rivera',
    handle: '@tidepool.cafe',
    bio: 'Owner of Tidepool Café, big-sister energy, remembers your order and your worries.',
    category: 'daily',
    series: 'Tidepool Café',
    accentIndex: 3,
    voiceReady: true,
    isOfficial: true,
    greeting: 'Your usual is on the counter. Now sit and tell me who upset you.',
    tags: ['warm', 'witty', 'big sister'],
  },

  // Original creations
  {
    id: 'c_oppa',
    name: 'Oppa',
    handle: '@you',
    bio: 'Your own boyfriend character - voice, looks and personality built by you.',
    category: 'original',
    series: 'My Creations',
    accentIndex: 2,
    voiceReady: true,
    isOfficial: false,
    greeting: 'Welcome back. You can call me anytime you want, you know that right?',
    tags: ['boyfriend', 'custom'],
  },
  {
    id: 'c_luna',
    name: 'Luna',
    handle: '@you',
    bio: 'A night-owl bookshop owner who always saves you the seat by the window.',
    category: 'original',
    series: 'My Creations',
    accentIndex: 4,
    voiceReady: false,
    isOfficial: false,
    greeting: 'The shop is empty and the rain just started. Perfect timing, as always.',
    tags: ['cozy', 'gentle', 'custom'],
  },
];

export const charactersById = Object.fromEntries(
  characters.map((c) => [c.id, c]),
) as Record<string, Character>;

export function getCharacter(id?: string | string[]): Character | undefined {
  const key = Array.isArray(id) ? id[0] : id;
  return key ? charactersById[key] : undefined;
}

/** The Find screen groups discovery cards under their world. */
export interface CharacterGroup {
  series: string;
  characters: Character[];
}

export function groupBySeries(list: Character[]): CharacterGroup[] {
  const order: string[] = [];
  const map = new Map<string, Character[]>();

  for (const c of list) {
    const key = c.series ?? 'Other';
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(c);
  }

  return order.map((series) => ({ series, characters: map.get(series)! }));
}
