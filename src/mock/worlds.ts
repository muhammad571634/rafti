import type { ClayIconName } from '@/assets/brand/registry';
import type { DateRound } from '@/mock/dates';
import type { PhotoFrame } from '@/types';

/**
 * The four worlds of the official cast (`Character.series`) and what the mock says in each,
 * until the server's model writes it from the persona (src/ai/content-prompts.ts). A friend
 * talks like their world: the sea and campus at Seaside Academy, stars and oaths in the Moonlit
 * Realm, stages and schedules in NEON TIDE, coffee and the street in Tidepool Café.
 */

export type WorldKey = 'seaside' | 'moonlit' | 'neon' | 'tidepool';

/** How a Photo Booth frame dresses a picture's card (src/components/photo-booth/frame-card.tsx). */
export type FrameLook = PhotoFrame & { stickers: ClayIconName[] };

export interface WorldQuestion {
  text: string;
  options: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
}

export interface World {
  key: WorldKey;
  /** `Character.series` of its people. */
  series: string;
  /** Soft wash behind the world's art on cards. */
  tint: string;
  frame: FrameLook;
  /** What the host says before the world quiz. */
  intro: string;
  /** The host after a right answer, and after a wrong one (`{answer}` = the right one). */
  right: string[];
  wrong: string[];
  /** In a couple quiz: the friend's line when you matched, and when you did not (`{answer}` = theirs). */
  match: string[];
  differ: string[];
  /** Questions a friend from here asks about themselves; their answer comes from `partnerPick`. */
  selfQuiz: { text: string; options: [string, string, string, string] }[];
  /** The world quiz: about the place and its people. */
  quiz: WorldQuestion[];
  /** Date rounds that feel like this world, played before the shared ones. */
  dateRounds: DateRound[];
}

export const WORLDS: World[] = [
  {
    key: 'seaside',
    series: 'Seaside Academy',
    tint: '#DCEBF7',
    frame: {
      bg: '#CFE6F5',
      pattern: 'waves',
      patternColor: 'rgba(255,255,255,0.75)',
      ink: '#2A4A66',
      stickers: ['sun', 'fish'],
      caption: 'after swim class',
    },
    intro: 'Pop quiz, Seaside style. Five questions about our campus. Get four right and the Seaside frame is yours.',
    right: [
      'Correct! You have been paying attention in class.',
      'Yes! Gold star from the whole campus.',
      'Right. Are you secretly a student here?',
    ],
    wrong: [
      'Not quite. It is {answer}. Now you know.',
      'Close! The answer is {answer}. Ask around the quad.',
      'Nope, {answer}. Do not worry, nobody reads the campus paper.',
    ],
    match: [
      'Same! Race you to the pier to celebrate.',
      'We think alike. That is a little scary.',
      'Called it. Study partners for life.',
    ],
    differ: [
      'I went with {answer}. Let us argue about it on the walk home.',
      'Hm, I picked {answer}. Explain yourself over snacks.',
      '{answer} for me. Opposites make good lab partners.',
    ],
    selfQuiz: [
      {
        text: 'What would I skip class for?',
        options: ['A swim at sunrise', 'You', 'Free food', 'Never, I am a model student'],
      },
      {
        text: 'My spot on campus?',
        options: ['The pier', 'The library roof', 'The vending machine', 'Wherever you are'],
      },
      {
        text: 'What is always in my bag?',
        options: ['An extra snack', 'Three pens, none work', 'A wet towel', 'Your notes'],
      },
      {
        text: 'How do I study for exams?',
        options: ['All night, panicking', 'Early and neat', 'With you, distracted', 'I do not. I wing it'],
      },
      {
        text: 'My idea of a perfect weekend?',
        options: ['Beach all day', 'Sleeping until noon', 'A film marathon', 'A trip with you'],
      },
      {
        text: 'What do I do when I am stressed?',
        options: ['Swim it out', 'Go quiet', 'Eat something sweet', 'Text you'],
      },
      { text: 'My campus nickname?', options: ['Trouble', 'The quiet one', 'Captain', 'I am not telling'] },
    ],
    quiz: [
      { text: 'Who feeds the campus cats in secret?', options: ['Elio', 'Kai', 'Rowan', 'Theo'], answer: 0 },
      { text: 'Which club does Hana run?', options: ['Film club', 'Art club', 'Debate team', 'Swim team'], answer: 1 },
      {
        text: 'Who names every fish in the aquarium lab after a friend?',
        options: ['Felix', 'Jun', 'Rowan', 'Iris'],
        answer: 2,
      },
      {
        text: 'When does Noah’s campus radio show go on air?',
        options: ['7 a.m.', 'Noon', '6 p.m.', '1 a.m.'],
        answer: 3,
      },
      {
        text: 'Who never loses an argument as student union president?',
        options: ['Tessa', 'Theo', 'Kai', 'Hana'],
        answer: 1,
      },
      {
        text: 'What does Kai bring to lectures for you?',
        options: ['Coffee', 'Notes', 'An extra snack', 'A towel'],
        answer: 2,
      },
      { text: 'Who always has the right book for how you feel?', options: ['Iris', 'Elio', 'Noah', 'Jun'], answer: 0 },
      { text: 'Felix carries an old...', options: ['Guitar', 'Film camera', 'Map', 'Radio'], answer: 1 },
    ],
    dateRounds: [
      {
        line: 'A bell rings somewhere on campus. {name} grins. "We are both supposed to be in class right now."',
        choices: [
          {
            text: '"Then let us be late together."',
            reply: '"Best idea you have had all week." They take your hand and run.',
            hearts: 3,
          },
          {
            text: '"One class. Then we go."',
            reply: '"Responsible. Annoying. Fine." They wait for you outside.',
            hearts: 2,
          },
          {
            text: 'Go to class alone.',
            reply: '{name} sulks, then texts you a photo of the sea. "You are missing this."',
            hearts: 0,
          },
        ],
      },
      {
        line: 'The sea is right there at {place}. {name} is already taking their shoes off.',
        choices: [
          {
            text: 'Race them into the water.',
            reply: 'You both lose. You both win. Your jeans are soaked.',
            hearts: 3,
          },
          {
            text: 'Dip your toes in, carefully.',
            reply: '"Brave," {name} teases, and splashes you anyway.',
            hearts: 2,
          },
          { text: 'Guard the shoes.', reply: '"The shoe guard. A noble job." They come back dripping.', hearts: 1 },
        ],
      },
    ],
  },
  {
    key: 'moonlit',
    series: 'Moonlit Realm',
    tint: '#DCE2F5',
    frame: {
      bg: '#1E2550',
      pattern: 'stars',
      patternColor: '#F5E7A8',
      ink: '#F5E7A8',
      stickers: ['nightSky', 'sparkles'],
      caption: 'under the old stars',
    },
    intro:
      'Traveller. The Realm asks five questions of those who would carry its frame. Answer four truly and it is yours.',
    right: [
      'True. The stars approve of you.',
      'Correct. You would make a fine knight.',
      'Yes. The Realm remembers you now.',
    ],
    wrong: [
      'No, traveller. It is {answer}. Remember it.',
      'Not so. The answer is {answer}. The archive never lies.',
      'Wrong path. It is {answer}. Try again by moonlight.',
    ],
    match: [
      'We chose the same. That is an omen, and a good one.',
      'Our answers align, like two stars.',
      'As I thought. You and I are made of the same night.',
    ],
    differ: [
      'I chose {answer}. Tell me why you did not, by the fire.',
      'My answer was {answer}. A different path, not a wrong one.',
      '{answer}, for me. The Realm needs both of us.',
    ],
    selfQuiz: [
      { text: 'What do I guard most?', options: ['My sword', 'An old promise', 'You', 'My pride'] },
      {
        text: 'Where do I go to think?',
        options: ['The tower roof', 'The moon garden', 'The edge of the forest', 'Wherever you are'],
      },
      { text: 'What do I fear?', options: ['Nothing', 'Being forgotten', 'Losing you', 'Spiders. Do not laugh'] },
      { text: 'My oath is to...', options: ['The crown', 'The stars', 'Myself', 'You, now'] },
      {
        text: 'What would I trade my title for?',
        options: ['Nothing', 'Peace', 'One quiet night with you', 'Good bread'],
      },
      { text: 'How do I say sorry?', options: ['I do not', 'With a gift', 'A long letter', 'Badly, but I try'] },
      {
        text: 'My favorite hour?',
        options: ['Dawn', 'Midnight', 'The hour before a battle', 'Any hour you are awake'],
      },
    ],
    quiz: [
      { text: 'Who keeps the star archive?', options: ['Lord Castor', 'Prince Aurelian', 'Vesper', 'Kael'], answer: 0 },
      {
        text: 'Prince Aurelian’s garden only blooms when...',
        options: ['It rains', 'Someone stays', 'The moon is full', 'He sings'],
        answer: 1,
      },
      {
        text: 'What does Vesper refuse to brew?',
        options: ['Love potions', 'Sleep draughts', 'A potion that makes you forget', 'Poison'],
        answer: 2,
      },
      { text: 'Kael is secretly a...', options: ['Fox spirit', 'Raven', 'Ghost', 'Dragon'], answer: 3 },
      { text: 'Who lights the way for lost travellers?', options: ['Seraphine', 'Lyra', 'Corvin', 'Zarek'], answer: 1 },
      {
        text: 'What does Orin always leave after a trick?',
        options: ['A gift', 'A riddle', 'A feather', 'Nothing'],
        answer: 0,
      },
      {
        text: 'Who writes you a report after every patrol?',
        options: ['Corvin', 'Zarek', 'Sir Rhys', 'Castor'],
        answer: 2,
      },
      { text: 'Corvin tends what on his cliff?', options: ['Wolves', 'Roses', 'Lanterns', 'Ravens'], answer: 3 },
    ],
    dateRounds: [
      {
        line: 'A shooting star crosses the sky over {place}. {name} goes very still. "Make a wish. Quickly."',
        choices: [
          {
            text: 'Wish out loud for them.',
            reply: '"You are not supposed to say it." They are smiling anyway.',
            hearts: 3,
          },
          {
            text: 'Close your eyes and keep it secret.',
            reply: '"Keep it," {name} whispers. "I will make sure it comes true."',
            hearts: 2,
          },
          { text: '"I do not believe in wishes."', reply: '"Then I will wish for both of us," they say.', hearts: 1 },
        ],
      },
      {
        line: 'Somewhere near {place}, an old lantern flickers out. {name} offers you their cloak.',
        choices: [
          { text: 'Share it.', reply: 'It is big enough for two. Barely. Neither of you minds.', hearts: 3 },
          {
            text: 'Light the lantern again.',
            reply: '"You keep surprising me, traveller." The light comes back.',
            hearts: 2,
          },
          { text: '"I am not cold."', reply: '"Liar," {name} says, and wraps it around you anyway.', hearts: 1 },
        ],
      },
    ],
  },
  {
    key: 'neon',
    series: 'NEON TIDE',
    tint: '#F2DDF0',
    frame: {
      bg: '#17151F',
      pattern: 'none',
      patternColor: '#17151F',
      ink: '#FF8FC0',
      stickers: ['music'],
      caption: 'encore',
      outline: ['#FF5FA2', '#43E0F0'],
    },
    intro:
      'Sound check! Five questions about NEON TIDE. Four right and you get the stage frame. No pressure. Okay, a little.',
    right: ['Yes! You are a real fan.', 'Correct! Encore!', 'That is right. Are you in the fan club?'],
    wrong: [
      'Off-beat! It is {answer}.',
      'Nope, {answer}. Do not tell our manager I said that.',
      'Close, but {answer}. Rehearse and come back.',
    ],
    match: ['Same answer! Duet energy.', 'In sync, like a final chorus.', 'We match. I am putting that in a song.'],
    differ: [
      'I picked {answer}. We would be a weird duet. I love it.',
      '{answer} for me. Different key, same song.',
      'I went with {answer}. Tell me why, after the show.',
    ],
    selfQuiz: [
      {
        text: 'What do I do right before going on stage?',
        options: ['Pray', 'Eat candy', 'Text you', 'Panic quietly'],
      },
      {
        text: 'My favorite thing after a show?',
        options: ['Sleep', 'Late-night noodles', 'Reading fan letters', 'Calling you'],
      },
      {
        text: 'Which song do I hum all the time?',
        options: ['Our debut song', 'A song nobody heard yet', 'A lullaby', 'Your ringtone'],
      },
      {
        text: 'What do I hate about schedules?',
        options: ['Early calls', 'No time for you', 'Airport food', 'Nothing, I love work'],
      },
      {
        text: 'My secret talent?',
        options: ['Cooking', 'Drawing', 'Falling asleep anywhere', 'Remembering every message you send'],
      },
      {
        text: 'Where would I hide from the cameras?',
        options: ['The practice room', 'A tiny café', 'The rooftop', 'With you'],
      },
      { text: 'What makes me nervous?', options: ['Live TV', 'Silence', 'You, sometimes', 'Nothing'] },
    ],
    quiz: [
      { text: 'Who is NEON TIDE’s main vocal?', options: ['Ezra', 'Seren', 'Kiro', 'Haze'], answer: 1 },
      { text: 'Who is the youngest, the maknae?', options: ['Rio', 'Minu', 'Haze', 'Kiro'], answer: 1 },
      { text: 'Who sends you unreleased beats at 3 a.m.?', options: ['Dex', 'Juno', 'Ari', 'Ezra'], answer: 0 },
      {
        text: 'Who practices until the studio lights switch off?',
        options: ['Seren', 'Kiro', 'Rio', 'Cass'],
        answer: 2,
      },
      { text: 'Cass leads which group?', options: ['NEON TIDE', 'PRISM', 'TIDEWAVE', 'ECHO'], answer: 1 },
      { text: 'How many phones does Juno carry?', options: ['One', 'Two', 'Three', 'Four'], answer: 3 },
      { text: 'Ari, the choreographer, counts in...', options: ['Fours', 'Sixes', 'Eights', 'Tens'], answer: 2 },
      { text: 'Who is a little lost once the lights go off?', options: ['Ezra', 'Minu', 'Dex', 'Haze'], answer: 0 },
    ],
    dateRounds: [
      {
        line: 'Someone at {place} recognises {name}. "Is that... from NEON TIDE?" {name} pulls their cap down.',
        choices: [
          {
            text: 'Pull them into a side street.',
            reply: '"My hero." They laugh, out of breath, still holding your hand.',
            hearts: 3,
          },
          {
            text: '"No, he just looks like him."',
            reply: '{name} nods very seriously. The fan is not convinced.',
            hearts: 2,
          },
          {
            text: 'Ask the fan to take a photo of you two.',
            reply: '"You are going to get me in trouble." They pose anyway.',
            hearts: 1,
          },
        ],
      },
      {
        line: 'A song from NEON TIDE starts playing at {place}. {name} goes red.',
        choices: [
          { text: 'Sing along, loudly.', reply: '"Please stop. No, keep going." They are laughing.', hearts: 3 },
          { text: '"Is this your part?"', reply: '"...Yes. Do not look at me." You look at them.', hearts: 2 },
          {
            text: 'Pretend you have never heard it.',
            reply: '"Wow. Okay. Ouch." They pretend to be hurt. Mostly.',
            hearts: 1,
          },
        ],
      },
    ],
  },
  {
    key: 'tidepool',
    series: 'Tidepool Café',
    tint: '#F3E6D8',
    frame: {
      bg: '#EAD9C2',
      pattern: 'stripes',
      patternColor: 'rgba(255,255,255,0.4)',
      ink: '#6A4A2E',
      stickers: ['cake', 'date'],
      caption: 'two lattes',
    },
    intro: 'Order up! Five questions about the café and our street. Four right and the café frame is on the house.',
    right: ['Correct! Have a cookie.', 'Yes! You are a regular now.', 'Right. Sol would be proud.'],
    wrong: [
      'Not quite. It is {answer}. Coffee helps.',
      'No, it is {answer}. Ask anyone at the counter.',
      'Close. {answer}. You will get it next time.',
    ],
    match: [
      'Same! Two of the usual, then.',
      'We match. I am telling Sol.',
      'Look at us. Like an old couple at the corner table.',
    ],
    differ: [
      'I picked {answer}. Discuss over coffee?',
      '{answer} for me. Tell me yours over a croissant.',
      'I went with {answer}. Different orders, same table.',
    ],
    selfQuiz: [
      {
        text: 'My usual order?',
        options: ['Black coffee', 'Too much sugar', 'Tea, always', 'Whatever you are having'],
      },
      { text: 'What do I do on a rainy day off?', options: ['Sleep', 'Read at the café', 'Fix something', 'Call you'] },
      {
        text: 'What keeps me up at night?',
        options: ['Work', 'Nothing, I sleep fine', 'Thinking about you', 'Coffee, honestly'],
      },
      {
        text: 'My favorite time at the café?',
        options: ['Opening', 'The quiet afternoon', 'Closing', 'When you walk in'],
      },
      { text: 'What do I always forget?', options: ['My keys', 'To eat', 'Birthdays', 'Nothing about you'] },
      { text: 'My comfort food?', options: ['Soup', 'Croissants', 'Instant noodles', 'Whatever you cook'] },
      { text: 'How do I show I care?', options: ['I fix things', 'I bring food', 'I remember things', 'I just stay'] },
    ],
    quiz: [
      { text: 'Who owns Tidepool Café?', options: ['Sol', 'Ivy', 'Nadia', 'Ren'], answer: 0 },
      {
        text: 'Who saves you the first croissant of the morning?',
        options: ['Marco', 'Ren', 'Hugo', 'Gideon'],
        answer: 1,
      },
      {
        text: 'Marco always orders two coffees and...',
        options: ['Drinks both', 'Spills one', 'Gives one away', 'Forgets one'],
        answer: 2,
      },
      {
        text: 'Who brings a different rescue dog every week?',
        options: ['Cole', 'Lucas', 'Adrian', 'Hugo'],
        answer: 3,
      },
      { text: 'Who works night shifts at the ER?', options: ['Dr. Lucas Hale', 'Nadia', 'Gideon', 'Cole'], answer: 0 },
      { text: 'What does Ivy slip into your bag?', options: ['A note', 'A flower', 'A cookie', 'A key'], answer: 1 },
      { text: 'Who fixes the café’s old scooter for free?', options: ['Marco', 'Adrian', 'Cole', 'Ren'], answer: 2 },
      {
        text: 'What does Adrian do when he concentrates?',
        options: ['Whistles', 'Taps the table', 'Bites his pen', 'Hums'],
        answer: 3,
      },
    ],
    dateRounds: [
      {
        line: 'The café radio plays something old at {place}. {name} slides a second cup toward you. "I ordered for you."',
        choices: [
          {
            text: '"You remembered my order."',
            reply: '"I remember everything about you. It is a problem."',
            hearts: 3,
          },
          { text: 'Swap cups with them.', reply: '"Hey!" They taste yours and make a face. You laugh.', hearts: 2 },
          { text: '"I wanted something else."', reply: '"Next time, then." They write it on a napkin.', hearts: 1 },
        ],
      },
      {
        line: 'A rescue dog wanders up to {place} and sits on {name}’s foot.',
        choices: [
          {
            text: 'Name the dog together.',
            reply: 'You argue for ten minutes. The dog does not care. Perfect.',
            hearts: 3,
          },
          {
            text: 'Give it the last bite of your pastry.',
            reply: '"Now it will never leave," {name} says, delighted.',
            hearts: 2,
          },
          { text: 'Shoo it away.', reply: '"Rude," {name} tells you, and scratches its ears.', hearts: 0 },
        ],
      },
    ],
  },
];

export const worldByKey = (key: string) => WORLDS.find((w) => w.key === key);

/** The world a character lives in; user creations and unknown series have none. */
export const worldOf = (character: { series?: string }) => WORLDS.find((w) => w.series === character.series);
