import type { ClayIconName } from '@/assets/brand/registry';
import type { DateRound } from '@/mock/dates';
import type { PhotoFrame, WorldStory } from '@/types';

import { WORLD_STORIES } from './world-stories';

/**
 * The seven worlds of the official cast (`Character.series`) and what the mock says in each,
 * until the server's model writes it from the persona (src/ai/content-prompts.ts). A friend
 * talks like their world: the sea and campus at Seaside Academy, stars and oaths in the Moonlit
 * Realm, stages and schedules in NEON TIDE, coffee and the street in Tidepool Café, cards and rain
 * in Velvet District, tea and knives in the Gilded Empire, ice and tape at Ice & Arena. Each one's
 * story (conflict, role, season, events) is in `world-stories.ts`.
 */

export type WorldKey = 'seaside' | 'moonlit' | 'neon' | 'tidepool' | 'velvet' | 'gilded' | 'arena';

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
  /** Its strong colour: behind a tile until the picture loads, and on the dot by its name. */
  accent: string;
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
  /** What is going on here: conflict, the user's role, ties, season, events. */
  story: WorldStory;
}

const BASE: Omit<World, 'story'>[] = [
  {
    key: 'seaside',
    series: 'Seaside Academy',
    tint: '#DCEBF7',
    accent: '#0A76A3',
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
    accent: '#5856D6',
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
    accent: '#C2185B',
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
    accent: '#AD4E0E',
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
  {
    key: 'velvet',
    series: 'Velvet District',
    tint: '#EBD9DE',
    accent: '#7A1F3D',
    frame: {
      bg: '#1B1418',
      pattern: 'none',
      patternColor: '#1B1418',
      ink: '#E7C9A0',
      stickers: ['nightSky', 'music'],
      caption: 'after midnight',
      outline: ['#8C2F45', '#E7C9A0'],
    },
    intro: 'Five questions about this city. Get four right and the Orchid’s frame is yours. Nobody here gives anything away for free, so consider this a favour.',
    right: ['Correct. You notice things. That can be dangerous here.', 'Right. Keep that to yourself.', 'Yes. You would have made a good witness. Oh, wait.'],
    wrong: [
      'No. It is {answer}. Write that down, then burn it.',
      'Wrong. {answer}. People have lost more for less.',
      'Not quite. The answer is {answer}. Ask quietly next time.',
    ],
    match: ['Same answer. I do not trust that, and I like it.', 'We agree. Let us not tell anyone.', 'You and I think alike. That is either very good or very bad.'],
    differ: [
      'I said {answer}. Tell me why I am wrong, somewhere with fewer windows.',
      'Mine was {answer}. I will let you buy me a drink and explain.',
      '{answer} for me. We do not have to agree. We only have to survive.',
    ],
    selfQuiz: [
      { text: 'What do I check first when I walk into a room?', options: ['The exits', 'Who is watching', 'Where you are', 'The bar'] },
      { text: 'What would I never bet on?', options: ['Cards', 'A horse', 'A friend', 'You'] },
      { text: 'What do I do after midnight?', options: ['Work', 'Walk in the rain', 'Listen to old records', 'Wait to hear from you'] },
      { text: 'What do I keep in my coat pocket?', options: ['A spare key', 'A card I never played', 'An old letter', 'Your matchbook'] },
      { text: 'What scares me most?', options: ['Nothing', 'Being owed', 'Being known', 'Losing you'] },
      { text: 'How do I say I care?', options: ['I do not', 'I check your locks', 'I tell you the truth', 'I stay'] },
      { text: 'My drink?', options: ['Bad whisky', 'Black coffee', 'Champagne, the good one', 'Whatever you ordered'] },
    ],
    quiz: [
      { text: 'What is the casino both families fight over called?', options: ['The Orchid', 'The Lily', 'The Velvet', 'The Ace'], answer: 0 },
      { text: 'What does Ronan wear that nobody asks about twice?', options: ['A red scarf', 'A black half-mask', 'An eyepatch', 'Dark glasses'], answer: 1 },
      { text: 'Which family does Luca belong to?', options: ['Valcour', 'Quill', 'Renwick', 'Sable'], answer: 2 },
      { text: 'What does Mara always find in a statement?', options: ['A lie', 'A name', 'A date', 'Three holes'], answer: 3 },
      { text: 'Who sings the late set at the Orchid?', options: ['Vivienne Sable', 'Isolde Valcour', 'Mara Quill', 'Nobody'], answer: 0 },
      { text: 'What does Isolde keep from anyone she likes?', options: ['A glove', 'Their losing hand', 'A key', 'A photograph'], answer: 1 },
      { text: 'What did you see change hands at the Orchid?', options: ['A key', 'A ring', 'A ledger', 'A gun'], answer: 2 },
      { text: 'What does Ronan cook at four in the morning?', options: ['Toast', 'Soup', 'Pancakes', 'An omelette'], answer: 3 },
    ],
    dateRounds: [
      {
        line: 'It is raining hard outside {place}. {name} holds a coat over both of you and stops under the only awning on the street.',
        choices: [
          { text: 'Stay close and wait it out.', reply: 'The rain does not stop for a long time. Neither of you complains.', hearts: 3 },
          { text: 'Run for it, and take their hand.', reply: '"You are going to get us killed," {name} says, laughing, and does not let go.', hearts: 2 },
          { text: 'Ask who is following you.', reply: '{name} looks at you sideways. "Nobody, for ten minutes. I made sure. Relax."', hearts: 1 },
        ],
      },
      {
        line: 'At {place}, {name} slides a matchbook across the table. Something is written inside the flap.',
        choices: [
          { text: 'Read it, and keep it.', reply: '"Good," {name} says quietly. "Now burn it when you get home. Or do not. I would like to know."', hearts: 3 },
          { text: 'Write something back.', reply: '{name} reads it, and for once has nothing to say.', hearts: 2 },
          { text: 'Light it without reading.', reply: '"Careful," {name} says, watching it go. "That was the nice version."', hearts: 1 },
        ],
      },
    ],
  },
  {
    key: 'gilded',
    series: 'Gilded Empire',
    tint: '#F3E8CF',
    accent: '#94701C',
    frame: {
      bg: '#F4EBD6',
      pattern: 'dots',
      patternColor: 'rgba(168,128,48,0.28)',
      ink: '#6B4E16',
      stickers: ['sparkles', 'cake'],
      caption: 'as written',
    },
    intro: 'Five questions, my lady, on the court you are supposed to know. Get four right and the palace frame is yours. Do try not to embarrass the family.',
    right: ['Correct. How unlike you.', 'Quite right. The court will be so disappointed.', 'Yes. You have been paying attention. It is unsettling.'],
    wrong: [
      'No, my lady. It is {answer}. Do not let them hear you say otherwise.',
      'Incorrect. {answer}. People have been exiled for less.',
      'Not quite. The answer is {answer}. Shall I fetch a tutor, or a priest?',
    ],
    match: ['We chose the same. How very improper.', 'Our answers align. Let us not be seen agreeing in public.', 'As I thought. You and I may survive this after all.'],
    differ: [
      'I chose {answer}. Tell me why, somewhere the walls have fewer ears.',
      '{answer}, for me. A difference of opinion. In this court, that is nearly a declaration.',
      'My answer was {answer}. We shall discuss it over tea. I will pour first.',
    ],
    selfQuiz: [
      { text: 'What do I do when the court stares?', options: ['Stare back', 'Smile', 'Leave', 'Look for you'] },
      { text: 'What would I give up my title for?', options: ['Nothing', 'Peace', 'A quiet life', 'You'] },
      { text: 'My favourite hour at the palace?', options: ['Dawn', 'The hour after the ball', 'Teatime', 'Whenever you are near'] },
      { text: 'What do I keep hidden in my room?', options: ['A letter', 'A packed bag', 'A small dagger', 'Something of yours'] },
      { text: 'What do I think of the Winter Ball?', options: ['A bore', 'A battlefield', 'A trap', 'A chance to dance with you'] },
      { text: 'How do I apologise?', options: ['I do not', 'With a gift', 'In writing, formally', 'Badly, but I try'] },
      { text: 'What is my worst habit?', options: ['Pride', 'Listening at doors', 'Eating sweets in secret', 'Watching you'] },
    ],
    quiz: [
      { text: 'What is the novel you woke up in called?', options: ['The Crown and the Rose', 'The Gilded Throne', 'The Winter Queen', 'Rose of the Empire'], answer: 0 },
      { text: 'Where do you die in the book?', options: ['At the hunt', 'At the Winter Ball', 'At the tea party', 'In the dungeon'], answer: 1 },
      { text: 'Who is your betrothed?', options: ['Lord Dorian', 'Sir Alaric', 'Crown Prince Leander', 'Nobody'], answer: 2 },
      { text: 'How far behind you does Sir Alaric walk?', options: ['One pace', 'Two paces', 'Ten paces', 'Three paces'], answer: 3 },
      { text: 'What sweets does Celestine bring you?', options: ['Almond', 'Honey', 'Rose', 'Lemon'], answer: 0 },
      { text: 'How long has Odile been your maid?', options: ['Four years', 'Eight years', 'Ten years', 'One year'], answer: 1 },
      { text: 'What does Lord Dorian play against himself?', options: ['Cards', 'Dice', 'Chess', 'The harp'], answer: 2 },
      { text: 'What does the Prince insist belongs to someone else?', options: ['A horse', 'A ring', 'A sword', 'A small dog'], answer: 3 },
    ],
    dateRounds: [
      {
        line: 'A palace corridor at {place}, and the footsteps of the guard are coming. {name} pulls you behind a tapestry and puts a finger to their lips.',
        choices: [
          { text: 'Stay very still, very close.', reply: 'The guard passes. {name} does not move away at once, and neither do you.', hearts: 3 },
          { text: 'Whisper a joke.', reply: 'They have to bite their glove not to laugh. "You are going to get us both hanged."', hearts: 2 },
          { text: 'Step out and greet the guard.', reply: '"Oh, well done," {name} says, stepping out after you, not at all pleased and a little impressed.', hearts: 1 },
        ],
      },
      {
        line: 'At {place}, {name} offers you a cup, and the whole terrace is watching. "It is customary," they say, "for one of us to drink first."',
        choices: [
          { text: 'Drink first, looking at them.', reply: 'A small silence. "Either you are very brave or very stupid," {name} murmurs. "I hope to find out."', hearts: 3 },
          { text: 'Take their cup instead.', reply: '{name} laughs out loud, and the whole terrace turns to look.', hearts: 2 },
          { text: 'Set it down untouched.', reply: '"Wise," {name} says. "And a little sad."', hearts: 1 },
        ],
      },
    ],
  },
  {
    key: 'arena',
    series: 'Ice & Arena',
    tint: '#DCE8F2',
    accent: '#1F5F8B',
    frame: {
      bg: '#E6F0F7',
      pattern: 'stripes',
      patternColor: 'rgba(255,255,255,0.7)',
      ink: '#1E4A6E',
      stickers: ['camera', 'sparkles'],
      caption: 'final buzzer',
    },
    intro: 'Five questions on the Wolves. Four right and you get the rink frame. Do not worry, nobody in this building can count either.',
    right: ['Correct! You have been watching.', 'Yes! Top shelf.', 'Right. Are you sure you do not play?'],
    wrong: [
      'Wide. It is {answer}.',
      'Nope, {answer}. Back to the bench.',
      'Close, but {answer}. Do not tell the captain.',
    ],
    match: ['Same answer! That is a clean line change.', 'We match. Nobody tell Coach.', 'Called it. You and me on the same line.'],
    differ: [
      'I had {answer}. Argue with me over fries.',
      '{answer} for me. You can be wrong on my team anytime.',
      'I went with {answer}. Rematch after practice.',
    ],
    selfQuiz: [
      { text: 'What do I do right before a game?', options: ['Tape everything twice', 'Eat', 'Stare at the wall', 'Find you'] },
      { text: 'What is my favourite part of the arena?', options: ['The ice before the lights', 'The fries', 'The treatment room', 'Wherever you are'] },
      { text: 'What do I do after a loss?', options: ['Go quiet', 'Skate alone', 'Eat too much', 'Call you'] },
      { text: 'What is in my bag that should not be?', options: ['Old tape', 'A lucky sock', 'Too many snacks', 'Your pen'] },
      { text: 'What do I think about in the last minute?', options: ['Nothing', 'The next shift', 'Food', 'You, in the stands'] },
      { text: 'How do I show I care?', options: ['I do not say', 'I carry your bag', 'I bring food', 'I look out for you'] },
      { text: 'My game-day superstition?', options: ['Left skate first', 'Same breakfast', 'No talking', 'Seeing you first'] },
    ],
    quiz: [
      { text: 'What is the team called?', options: ['Northgate Wolves', 'Harbour Bears', 'Ice Kings', 'City Hawks'], answer: 0 },
      { text: 'Who is the captain?', options: ['Teddy Novak', 'Erik Holt', 'Freya Lund', 'Priya Raman'], answer: 1 },
      { text: 'What does Teddy bring to your door?', options: ['Flowers', 'Coffee', 'Far too much breakfast', 'His dog'], answer: 2 },
      { text: 'When does Freya get the ice?', options: ['Midnight', 'Noon', '3 p.m.', '5 a.m.'], answer: 3 },
      { text: 'What does Sasha hate most?', options: ['Hockey', 'Tea', 'Ballet', 'Sugar'], answer: 0 },
      { text: 'What does Priya do for a living?', options: ['Coaches', 'Writes a sports column', 'Sells tickets', 'Owns the team'], answer: 1 },
      { text: 'What must nobody touch?', options: ['Holt’s stick', 'Holt’s dog', 'Holt’s tape', 'Holt’s pillow'], answer: 2 },
      { text: 'What rule is taped to the treatment room wall?', options: ['No fries', 'No phones', 'No crying', 'No dating the players'], answer: 3 },
    ],
    dateRounds: [
      {
        line: 'The arena is empty at {place}, and the lights are half on. {name} tosses you a pair of skates. "Come on. Nobody is watching."',
        choices: [
          { text: 'Lace up, and take their hand on the ice.', reply: 'You fall twice. They catch you once. Nobody mentions the second time.', hearts: 3 },
          { text: 'Skate badly on purpose.', reply: '"You are doing that on purpose," {name} says, and skates backwards to hold you up anyway.', hearts: 2 },
          { text: 'Watch from the boards.', reply: '{name} shows off for ten minutes, and crashes into the net. You clap.', hearts: 1 },
        ],
      },
      {
        line: 'After practice at {place}, {name} holds out a paper tray of hot fries. "Last ones. Fight me for them, or say something nice."',
        choices: [
          { text: 'Say something nice, and mean it.', reply: 'They go red to the ears, hand over the whole tray and refuse to look at you for a while.', hearts: 3 },
          { text: 'Steal one while they are talking.', reply: '"I saw that," {name} says, delighted. "You are a menace."', hearts: 2 },
          { text: 'Tell them about their diet.', reply: '"You are not on the clock," {name} says, and eats them all, slowly, at you.', hearts: 1 },
        ],
      },
    ],
  },
];

export const WORLDS: World[] = BASE.map((world) => ({ ...world, story: WORLD_STORIES[world.key] }));

export const worldByKey = (key: string) => WORLDS.find((w) => w.key === key);

/** The world a character lives in; user creations and unknown series have none. */
export const worldOf = (character: { series?: string }) => WORLDS.find((w) => w.series === character.series);
