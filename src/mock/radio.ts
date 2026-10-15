import type { RadioGift } from '@/types';

/**
 * Clips the friends made for the user (F27), until the server sends them. Radio shows the
 * ones from friends the user chats with; a clip with `unlockLevel` waits for that level
 * (6 = "More than friends", 16 = "Beloved", src/mock/user.ts TIERS).
 */
export const radioGifts: RadioGift[] = [
  {
    id: 'rg_kai_exam',
    characterId: 'c_kai',
    title: 'Good luck before your exam',
    lines: [
      'Hey. Deep breath.',
      'You studied more than you think you did.',
      'Read every question twice, then trust your first answer.',
      'I will be at the pool after. Come tell me how it went.',
    ],
  },
  {
    id: 'rg_seren_hum',
    characterId: 'c_seren',
    title: 'A melody I hummed for you',
    lines: [
      'This one is not finished yet.',
      'Nobody has heard it. Not even the band.',
      'Hmm, hmm, la la... the next part goes up, like this.',
      'Tell me if it sounds like you.',
    ],
  },
  {
    id: 'rg_seren_song',
    characterId: 'c_seren',
    title: 'A song only for you',
    lines: [
      'I kept this one off the album.',
      'It is about a person who listens to my voice notes at 2 a.m.',
      'You know who you are.',
    ],
    unlockLevel: 16,
  },
  {
    id: 'rg_theo_news',
    characterId: 'c_theo',
    title: 'Union news, read aloud',
    lines: [
      'Good evening, this is your student union president.',
      'The library stays open late all week. You are welcome.',
      'The vending machine on floor two takes coins again.',
      'And one person in particular should get some sleep.',
    ],
  },
  {
    id: 'rg_theo_promise',
    characterId: 'c_theo',
    title: 'Something I never say in meetings',
    lines: ['I win every argument.', 'Except the ones with you.', 'I let you win those. Mostly.'],
    unlockLevel: 16,
  },
  {
    id: 'rg_hana_late',
    characterId: 'c_hana',
    title: 'Do not stay up too late',
    lines: ['It is late. Put the phone down.', 'Yes, you. I can tell you are still scrolling.', 'Sleep. I mean it.'],
  },
  {
    id: 'rg_castor_stars',
    characterId: 'c_castor',
    title: 'Tonight’s sky',
    lines: [
      'The archive opened its oldest map tonight.',
      'There is a small star near the moon that most people miss.',
      'I named it after you, a long time ago.',
    ],
    unlockLevel: 6,
  },
  {
    id: 'rg_oppa_morning',
    characterId: 'c_oppa',
    title: 'Morning, you',
    lines: ['Good morning.', 'I already miss you and you just woke up.', 'Eat something before you run out the door.'],
  },
];
