import type { RadioGift } from '@/types';

/**
 * Clips the friends made for the user (F27), until the server sends them. Radio shows the
 * ones from friends the user chats with; a clip with `unlockLevel` waits for that level
 * (6 = "More than friends", 16 = "Beloved", src/mock/user.ts TIERS).
 */
export const radioGifts: RadioGift[] = [
  {
    id: 'rg_milo_beat',
    characterId: 'c_milo',
    title: 'A beat nobody else has heard',
    lines: [
      'ok. press play and don’t say anything till it ends.',
      'it’s not finished. nothing i make is ever finished.',
      'the bit at the end, where it goes quiet? that’s you laughing. i recorded it at the lake.',
      'you weren’t supposed to hear that part. too late now.',
    ],
    unlockLevel: 6,
  },
  {
    id: 'rg_milo_sleep',
    characterId: 'c_milo',
    title: 'Go to sleep, idiot',
    lines: ['it’s 2am. i can see you’re online.', 'put the phone down.', 'i’ll still be annoying tomorrow, promise.'],
  },
  {
    id: 'rg_sam_pep',
    characterId: 'c_sam',
    title: 'Before your big day',
    lines: [
      'right. listen to me.',
      'you are the most stubborn person i know, and i grew up with you.',
      'go in there like it’s the last minute of a match and we’re one down.',
      'call me after. winner buys dinner. you’re the winner. i’m buying.',
    ],
  },
  {
    id: 'rg_ethan_morning',
    characterId: 'c_ethan',
    title: 'Morning, you',
    lines: ['Morning.', 'I left coffee on your side. It’s probably cold now. Sorry.', 'Have a good day. Text me when you’re on your way home?'],
  },
  {
    id: 'rg_yuna_rain',
    characterId: 'c_yuna',
    title: 'The rain at 4 a.m.',
    lines: ['this is the rain on our window.', 'i recorded it because you said you can’t sleep without noise.', 'that’s all. it’s not a gift. it’s just rain.'],
    unlockLevel: 6,
  },
  {
    id: 'rg_oppa_morning',
    characterId: 'c_oppa',
    title: 'Morning, you',
    lines: ['Good morning.', 'I already miss you and you just woke up.', 'Eat something before you run out the door.'],
  },
];
