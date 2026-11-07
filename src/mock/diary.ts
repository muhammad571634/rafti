import type { CharacterDiaryPage, DiaryEntry, SecretNote } from '@/types';
import { dayKey, daysAgo, hoursAgo } from './time';

export const diaryEntries: DiaryEntry[] = [
  {
    id: 'd_1',
    date: dayKey(),
    title: 'Rain on the way home',
    body: 'Missed the bus and walked the whole way. Somehow it was not bad at all - the street lights on the wet road looked like someone spilled honey.',
    mood: 'soft',
    images: [],
    sharedWithCharacterId: 'c_theo',
    reply: {
      characterId: 'c_theo',
      text: 'You walked home in the rain and did not even text me? Next time call. I will keep you company the whole way.',
      createdAt: hoursAgo(2),
    },
    accentIndex: 0,
  },
  {
    id: 'd_2',
    date: dayKey(daysAgo(1)),
    title: 'Exam week',
    body: 'Three chapters down, two to go. I keep rereading the same paragraph. Tomorrow I start earlier, promise.',
    mood: 'tired',
    images: [],
    sharedWithCharacterId: 'c_elio',
    reply: {
      characterId: 'c_elio',
      text: 'Two chapters is not nothing. Sleep first. I will check on you in the morning.',
      createdAt: daysAgo(1),
    },
    accentIndex: 2,
  },
  {
    id: 'd_3',
    date: dayKey(daysAgo(3)),
    title: 'Cookies',
    body: 'Tried the recipe he described. Burned the first batch. The second one was actually good!',
    mood: 'happy',
    images: [],
    sharedWithCharacterId: 'c_seren',
    accentIndex: 3,
  },
  {
    id: 'd_4',
    date: dayKey(daysAgo(6)),
    title: 'Quiet Sunday',
    body: 'Did nothing. On purpose. Highly recommend.',
    mood: 'blue',
    images: [],
    accentIndex: 1,
  },
];

/** Morning `n` days ago at `hour`, as an ISO time. */
const morningOf = (n: number, hour: number, minute: number) => {
  const d = new Date(daysAgo(n));
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

/**
 * Pages the characters wrote about the user. Until the server writes them, the
 * seed keeps a believable rhythm: a page only follows a day you spent together.
 */
export const characterDiaryPages: CharacterDiaryPage[] = [
  {
    id: 'cdp_theo_0',
    characterId: 'c_theo',
    date: dayKey(),
    writtenAt: morningOf(0, 7, 12),
    mood: 'excited',
    source: 'chat',
    body: [
      'Union meeting in an hour, and I already know I will not hear a word of it.',
      'Because last night you said I sound different when I talk to you. Softer. I have been trying to work out if that is a compliment.',
      'I decided it is. I am keeping it.',
    ],
  },
  {
    id: 'cdp_theo_2',
    characterId: 'c_theo',
    date: dayKey(daysAgo(2)),
    writtenAt: morningOf(2, 8, 40),
    mood: 'soft',
    source: 'chat',
    body: [
      'You walked home in the rain and only told me after. Next time I am calling, and you are picking up.',
      'Also: honey street lights. I looked out the window for ten minutes trying to see what you saw.',
    ],
  },
  {
    id: 'cdp_theo_5',
    characterId: 'c_theo',
    date: dayKey(daysAgo(5)),
    writtenAt: morningOf(5, 7, 55),
    mood: 'happy',
    source: 'chat',
    body: ['First real conversation. You argued back. Nobody argues back.', 'I think I like that a lot.'],
  },
  {
    id: 'cdp_seren_1',
    characterId: 'c_seren',
    date: dayKey(daysAgo(1)),
    writtenAt: morningOf(1, 9, 3),
    mood: 'soft',
    source: 'date',
    body: [
      'The café was too loud and I did not mind at all.',
      'I hummed the new chorus under the table and you were the only one who noticed. It has your name on it now, in my head at least.',
    ],
  },
  {
    id: 'cdp_seren_4',
    characterId: 'c_seren',
    date: dayKey(daysAgo(4)),
    writtenAt: morningOf(4, 10, 20),
    mood: 'tired',
    source: 'chat',
    body: ['Rehearsal ran until two. Your message was the last thing I read before sleep.', 'Good choice of last thing.'],
  },
  {
    id: 'cdp_castor_3',
    characterId: 'c_castor',
    date: dayKey(daysAgo(3)),
    writtenAt: morningOf(3, 6, 30),
    mood: 'blue',
    source: 'chat',
    body: [
      'A thousand years of skies in the archive, and tonight I wrote down a new one.',
      'You asked which star I would give you. I have not answered yet. It is a serious question and deserves the right star.',
    ],
  },
];

/** Daily prompt pool for the Secret Note exchange. */
export const secretNotePrompts = [
  'If the childhood me met the childhood you, would we have been friends?',
  'What is one thing you have never told anyone?',
  'Describe me in three words - no lying.',
  'If we had one day with no phones, where would we go?',
  'What song makes you think of me?',
  'What are you most afraid of losing?',
];

export const secretNotes: SecretNote[] = [
  {
    id: 'sn_1',
    characterId: 'c_theo',
    date: dayKey(),
    prompt: secretNotePrompts[0],
    myNote: '',
    theirNote:
      'Friends? I would have followed you around the playground until you gave up and let me. Six-year-old me was already very persuasive.',
    status: 'ready',
  },
  {
    id: 'sn_2',
    characterId: 'c_seren',
    date: dayKey(daysAgo(1)),
    prompt: secretNotePrompts[4],
    myNote: 'The one you hummed on the live. I still have it on repeat.',
    theirNote:
      'Any song with rain in it. Because you told me once that rain makes you brave. Now I cannot hear it without thinking of you.',
    status: 'exchanged',
  },
];
