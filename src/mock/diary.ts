import type { DiaryEntry, SecretNote } from '@/types';
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
