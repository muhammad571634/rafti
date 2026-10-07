/**
 * Chat "+" games: couple quiz packs and truth-or-dare prompts. The character's
 * quiz answers are stable per character and question (a hash, not a coin flip),
 * so replaying a pack gives the same partner. The server's model replaces this.
 */
export interface QuizQuestion {
  text: string;
  options: [string, string, string, string];
}

export interface QuizPack {
  id: string;
  titleKey: string;
  emoji: string;
  questions: QuizQuestion[];
}

// The emoji are placeholders for 3D clay icons, see docs/icons-3d.md step 6.
export const QUIZ_PACKS: QuizPack[] = [
  {
    id: 'qp_first_date',
    titleKey: 'firstDate',
    emoji: '\u{1F370}',
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
    emoji: '\u{2615}',
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
    emoji: '\u{1F3E1}',
    questions: [
      { text: 'Where do we live?', options: ['Big city', 'By the sea', 'Quiet countryside', 'Somewhere new every year'] },
      { text: 'Pet?', options: ['A cat', 'A dog', 'Something weird', 'Plants count'] },
      { text: 'Our tradition?', options: ['Yearly trip', 'Sunday dinner', 'Anniversary letters', 'Same café every week'] },
      { text: 'Who is still late?', options: ['Me', 'You', 'Both, always', 'Neither, we grew up'] },
      { text: 'Still doing this quiz?', options: ['Every year', 'Once more, to compare', 'We know the answers', 'We wrote our own'] },
    ],
  },
];

export const quizPackById = (id: string) => QUIZ_PACKS.find((p) => p.id === id);

/** The character's answer to a question: stable for that character and question. */
export function partnerAnswer(characterId: string, packId: string, question: number) {
  const seed = `${characterId}:${packId}:${question}`;
  let h = 7;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 4;
}

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
