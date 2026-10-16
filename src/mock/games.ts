/**
 * Chat "+" games: couple quiz packs and truth-or-dare prompts. The character's
 * quiz answers are stable per character and question (`partnerPick` in src/lib/quiz.ts),
 * so replaying a pack gives the same partner. The server's model replaces this.
 */
import type { ClayIconName } from '@/assets/brand/registry';

export interface QuizQuestion {
  text: string;
  options: [string, string, string, string];
}

export interface QuizPack {
  id: string;
  titleKey: string;
  icon: ClayIconName;
  questions: QuizQuestion[];
}

export const QUIZ_PACKS: QuizPack[] = [
  {
    id: 'qp_first_date',
    titleKey: 'firstDate',
    icon: 'cake',
    questions: [
      { text: 'Perfect first date?', options: ['Fancy dinner', 'Long walk, no plan', 'Movie marathon', 'Arcade, loser pays'] },
      { text: 'Who texts first after?', options: ['Me, right away', 'You, obviously', 'Both at once', 'Nobody, we play it cool'] },
      { text: 'Best thing to share?', options: ['Dessert', 'Headphones', 'An umbrella', 'A secret'] },
      { text: 'Late or early?', options: ['Ten minutes early', 'Exactly on time', 'Fashionably late', 'Lost on the way'] },
      { text: 'How does it end?', options: ['A hug', 'Walking each other home', 'Planning the next one', 'Talking till 2 a.m.'] },
    ],
  },
  {
    id: 'qp_sunday',
    titleKey: 'lazySunday',
    icon: 'date',
    questions: [
      { text: 'Sunday breakfast?', options: ['Pancakes', 'Just coffee', 'Leftover pizza', 'Brunch out'] },
      { text: 'Rainy afternoon plan?', options: ['Blanket and a show', 'Board games', 'Nap together', 'Walk in the rain'] },
      { text: 'Who picks the movie?', options: ['Me', 'You', 'We argue for an hour', 'We spin a wheel'] },
      { text: 'Cooking dinner?', options: ['You cook, I watch', 'I cook, you watch', 'Together, messy', 'Order in'] },
      { text: 'Last thing before sleep?', options: ['"Good night"', 'One more episode', 'Long talk', 'Plan tomorrow'] },
    ],
  },
  {
    id: 'qp_ten_years',
    titleKey: 'tenYears',
    icon: 'house',
    questions: [
      { text: 'Where do we live?', options: ['Big city', 'By the sea', 'Quiet countryside', 'Somewhere new every year'] },
      { text: 'Pet?', options: ['A cat', 'A dog', 'Something weird', 'Plants count'] },
      { text: 'Our tradition?', options: ['Yearly trip', 'Sunday dinner', 'Anniversary letters', 'Same café every week'] },
      { text: 'Who is still late?', options: ['Me', 'You', 'Both, always', 'Neither, we grew up'] },
      { text: 'Still doing this quiz?', options: ['Every year', 'Once more, to compare', 'We know the answers', 'We wrote our own'] },
    ],
  },
  {
    id: 'qp_late_night',
    titleKey: 'lateNight',
    icon: 'nightSky',
    questions: [
      { text: 'Best time for deep talks?', options: ['Midnight', '3 a.m.', 'Sunrise', 'Any time with you'] },
      { text: 'Can\u2019t sleep. What now?', options: ['Call each other', 'Snack run', 'Count stars', 'Scroll until 4'] },
      { text: 'Biggest late-night fear?', options: ['Strange noises', 'Tomorrow', 'Being alone', 'Nothing'] },
      { text: 'Something we only say at night?', options: ['"I miss you"', 'Old secrets', 'Silly dreams', '"Stay"'] },
      { text: 'Who falls asleep first on a call?', options: ['Me', 'You', 'Both, at once', 'Nobody, we talk till dawn'] },
    ],
  },
  {
    id: 'qp_habits',
    titleKey: 'habits',
    icon: 'sun',
    questions: [
      { text: 'First thing in the morning?', options: ['Phone', 'Coffee', 'Snooze', 'A good-morning text'] },
      { text: 'How do we eat pizza?', options: ['Crust first', 'Fold it', 'Fork and knife', 'Steal yours'] },
      { text: 'Messy or tidy?', options: ['Very messy', 'Neat', 'Messy, but I know where things are', 'Depends on the day'] },
      { text: 'Hands when nervous?', options: ['In pockets', 'Playing with hair', 'Tapping', 'Holding yours'] },
      { text: 'Music while working?', options: ['Always', 'Never', 'Rain sounds', 'Your voice notes'] },
    ],
  },
];

/** A friend from no known world (a user creation): their lines in a couple quiz. */
export const QUIZ_LINES = {
  match: ['Same! I knew it.', 'We think alike. I like that.', 'Look at us. Matching.'],
  differ: ['I picked {answer}. Tell me why you did not.', '{answer} for me. Different, and that is fine.', 'Hm, I went with {answer}. Convince me.'],
};

/** Questions a friend from no known world asks about themselves. */
export const SELF_QUIZ: { text: string; options: [string, string, string, string] }[] = [
  { text: 'My favorite time of day?', options: ['Morning', 'Afternoon', 'Late night', 'Whenever you text'] },
  { text: 'What do I do when I am sad?', options: ['Sleep', 'Go for a walk', 'Eat something sweet', 'Talk to you'] },
  { text: 'My comfort food?', options: ['Soup', 'Noodles', 'Chocolate', 'Anything you make'] },
  { text: 'What makes me laugh most?', options: ['Bad jokes', 'You', 'Animal videos', 'My own jokes'] },
  { text: 'My dream weekend?', options: ['Sleep in', 'A road trip', 'A quiet café', 'Anything with you'] },
  { text: 'How do I say I care?', options: ['Small gifts', 'Words', 'I just show up', 'Too many texts'] },
  { text: 'What am I secretly bad at?', options: ['Cooking', 'Goodbyes', 'Waking up', 'Hiding feelings'] },
];

/** What they text after a quiz, by how many answers matched out of five. */
export function quizReply(matches: number, total: number) {
  if (matches >= total - 1) return `${matches} out of ${total}. Okay, that is a little scary. We really get each other.`;
  if (matches >= Math.ceil(total / 2)) return `${matches} out of ${total}! Not bad. I want to know why you picked the others, though.`;
  return `${matches} out of ${total}... so we are opposites. Honestly? I like learning you.`;
}

/** Truths and dares the user can give the character, each with the answer they send back. */
export const TRUTHS_FOR_THEM: { ask: string; answer: string }[] = [
  { ask: 'Truth: what did you think of me the first time we talked?', answer: 'Honestly? That you were going to be trouble. The good kind.' },
  { ask: 'Truth: what is something you have never told anyone?', answer: 'I still sleep with the light on when it storms. Do not laugh.' },
  { ask: 'Truth: when did you last think about me?', answer: 'Five minutes ago. And ten minutes before that.' },
  { ask: 'Truth: what is your most embarrassing habit?', answer: 'I talk to my plants. They have names. Do not ask the names.' },
];

export const DARES_FOR_THEM: { ask: string; answer: string }[] = [
  { ask: 'Dare: send me the last song you listened to.', answer: 'Fine. It is a sad one. Listen to it with me sometime?' },
  { ask: 'Dare: describe me in three words.', answer: 'Warm. Stubborn. Mine-ish.' },
  { ask: 'Dare: tell me a terrible joke.', answer: 'Why did the otter cross the river? To get to the otter side. ...I hate myself.' },
  { ask: 'Dare: compliment me like you mean it.', answer: 'You make ordinary days feel like something I want to remember.' },
];

/** What the character asks when the wheel lands on the user. */
export const TRUTHS_FOR_YOU = [
  'Your turn. Truth: what made you smile today?',
  'Truth for you: what is a song that reminds you of me?',
  'Truth: what are you afraid I will find out about you?',
];

export const DARES_FOR_YOU = [
  'Dare for you: send me a photo of whatever is in front of you right now.',
  'Dare: tell me one thing you have never said out loud.',
  'Dare: say good night to me first tonight. No excuses.',
];
