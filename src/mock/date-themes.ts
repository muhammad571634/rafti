import type { ClayIconName } from '@/assets/brand/registry';
import type { ThemePools } from '@/lib/date-themes';

/**
 * Canned rounds for the user's own dates (F28) until the server's model writes them from the
 * scene. `{name}` is the friend's first name, `{place}` the date's title. Kept short and kind,
 * like the map places in dates.ts.
 */
export const themePools: ThemePools = {
  openers: {
    friendly: [
      [
        { text: 'Laugh and go along with it.', reply: '{name} grins. "Okay. This is already a good day."', hearts: 3 },
        { text: '"Was this your idea?"', reply: '"Maybe. Do you like it?" They look a little proud.', hearts: 2 },
        {
          text: 'Check your phone for a second.',
          reply: '{name} waits, then nudges you. "Hey. I am right here."',
          hearts: 0,
        },
      ],
      [
        {
          text: '"Okay, I am in. Lead the way."',
          reply: '"Finally, someone who trusts me." {name} sets off.',
          hearts: 3,
        },
        { text: 'Make a joke about it.', reply: '{name} snorts. "You are not funny." They are laughing.', hearts: 2 },
        {
          text: '"Can we just sit for a bit?"',
          reply: '"Sure." They sit next to you, close but not too close.',
          hearts: 1,
        },
      ],
    ],
    flirty: [
      [
        {
          text: '"You planned this just to see me, right?"',
          reply: '"Took you long enough to notice." {name} does not look away.',
          hearts: 3,
        },
        { text: 'Bump their shoulder.', reply: 'They bump back, then leave their shoulder there.', hearts: 2 },
        {
          text: 'Act like you do not care.',
          reply: '"Sure you do not." {name} smiles like they know better.',
          hearts: 1,
        },
      ],
      [
        {
          text: 'Hold their gaze a second too long.',
          reply: '{name} looks down first. Their ears go a little red.',
          hearts: 3,
        },
        { text: '"You look nice today."', reply: '"Only today?" They are trying very hard not to smile.', hearts: 2 },
        { text: 'Talk about the weather.', reply: '"The weather. Really." {name} laughs at you, softly.', hearts: 0 },
      ],
    ],
    sweet: [
      [
        { text: 'Take their hand.', reply: '{name} laces their fingers with yours without a word.', hearts: 3 },
        { text: '"I am glad it is you."', reply: '"Me too," they say, quietly. "Every time."', hearts: 3 },
        { text: '"Let us not stay too long."', reply: '"Already?" {name} looks a bit sad, then nods.', hearts: 0 },
      ],
      [
        {
          text: 'Lean your head on their shoulder.',
          reply: 'They go very still, as if you might fly away.',
          hearts: 3,
        },
        {
          text: '"Tell me about your day."',
          reply: '{name} starts talking and does not stop. You love it.',
          hearts: 2,
        },
        { text: 'Stay a little quiet.', reply: '"Quiet is good with you," they say after a while.', hearts: 1 },
      ],
    ],
  },
  shared: [
    {
      line: 'Somewhere near {place}, a street musician starts a song you both know.',
      choices: [
        {
          text: 'Sing along, badly.',
          reply: '{name} joins in, even worse. The musician gives up and laughs.',
          hearts: 3,
        },
        {
          text: 'Drop a coin and request another.',
          reply: '"Something slow," {name} adds, and looks at you.',
          hearts: 2,
        },
        { text: 'Walk on.', reply: '{name} hums the song for the next ten minutes.', hearts: 1 },
      ],
    },
    {
      line: '{name} is suddenly starving. "Snacks. Now. It is an emergency."',
      choices: [
        { text: 'Share the last of yours.', reply: '"You are my hero." They eat it in one bite.', hearts: 3 },
        {
          text: 'Race them to the nearest stall.',
          reply: 'You win. {name} claims they let you. They did not.',
          hearts: 2,
        },
        { text: '"You just ate."', reply: '"That was an hour ago." They look betrayed.', hearts: 0 },
      ],
    },
    {
      line: 'It starts to drizzle at {place}. Nobody has an umbrella.',
      choices: [
        {
          text: 'Share a jacket over both your heads.',
          reply: 'You end up very close. Neither of you complains.',
          hearts: 3,
        },
        { text: 'Run for cover together.', reply: '{name} grabs your hand so you do not slip.', hearts: 2 },
        {
          text: 'Stand in it. It is only rain.',
          reply: '"You are strange," {name} says, and stays with you.',
          hearts: 1,
        },
      ],
    },
    {
      line: '{name} wants a photo at {place}. "For the memories," they say.',
      choices: [
        {
          text: 'Pull a silly face.',
          reply: 'They laugh so hard the photo is blurry. They keep it anyway.',
          hearts: 3,
        },
        { text: 'Smile properly for once.', reply: '"Wow. Framing this one." {name} saves it twice.', hearts: 2 },
        { text: '"I hate photos."', reply: '"One. Just one." You let them have one.', hearts: 1 },
      ],
    },
    {
      line: 'A little kid near {place} asks if you two are a couple.',
      choices: [
        { text: '"Ask them."', reply: '{name} stammers something. The kid is delighted.', hearts: 3 },
        { text: '"Best friends. For now."', reply: '{name} raises an eyebrow at "for now".', hearts: 2 },
        { text: '"No way!"', reply: '"Wow. Okay." {name} pretends to be hurt. Mostly pretends.', hearts: 0 },
      ],
    },
    {
      line: 'You find a quiet bench at {place}. {name} asks what you are thinking about.',
      choices: [
        { text: '"You, honestly."', reply: 'They look away and smile at nothing.', hearts: 3 },
        { text: '"How nice today is."', reply: '"It is," {name} agrees. "Let us do this more."', hearts: 2 },
        { text: '"Dinner."', reply: '"Fair. Very fair." {name} is thinking about dinner now too.', hearts: 1 },
      ],
    },
  ],
  moodRounds: {
    friendly: [
      {
        line: '{name} challenges you to a game: whoever laughs first at {place} buys drinks.',
        choices: [
          { text: 'Make your worst face.', reply: '{name} lasts two seconds. "Unfair! That was a weapon."', hearts: 3 },
          {
            text: 'Tell your worst joke.',
            reply: 'They groan, then laugh anyway. "I hate that I laughed."',
            hearts: 2,
          },
          {
            text: 'Laugh first on purpose.',
            reply: '"Did you just let me win?" They buy you a drink anyway.',
            hearts: 1,
          },
        ],
      },
      {
        line: '{name} tells you a story about the worst day they ever had, and it is very funny.',
        choices: [
          { text: 'Tell yours back.', reply: '"No way. You win." They are wiping their eyes.', hearts: 3 },
          { text: 'Laugh until you cannot breathe.', reply: '"It was not THAT funny." It was.', hearts: 2 },
          { text: '"That sounds awful."', reply: '"It was. But now it is funny." They shrug and smile.', hearts: 1 },
        ],
      },
    ],
    flirty: [
      {
        line: '{name} brushes something off your cheek. "Eyelash. Make a wish."',
        choices: [
          { text: '"Already came true."', reply: '{name} has nothing to say to that. For once.', hearts: 3 },
          { text: 'Blow it toward them.', reply: '"Did you just wish for me?" They are smirking.', hearts: 2 },
          {
            text: '"I do not believe in wishes."',
            reply: '"Then I will wish for you," they say, and close their eyes.',
            hearts: 1,
          },
        ],
      },
      {
        line: '{name} steals a sip of your drink without asking. "Tastes better than mine."',
        choices: [
          { text: 'Steal theirs back.', reply: '"Hey!" A tiny war begins. Nobody wins. Everybody laughs.', hearts: 3 },
          {
            text: '"That counts as a kiss, you know."',
            reply: '{name} chokes a little. "It does not." Their face is red.',
            hearts: 3,
          },
          { text: '"Buy your own."', reply: '"Fine." They buy two and give you one.', hearts: 1 },
        ],
      },
    ],
    sweet: [
      {
        line: '{name} tucks your hair behind your ear. "Sorry. It was in your eyes."',
        choices: [
          { text: '"Do not be sorry."', reply: 'Their hand stays a moment longer than it needs to.', hearts: 3 },
          { text: 'Do the same for them.', reply: '{name} laughs softly. "We are ridiculous."', hearts: 2 },
          { text: '"I can do it myself."', reply: '"I know," they say. "I wanted to."', hearts: 1 },
        ],
      },
      {
        line: 'At {place}, {name} says, "Can I tell you something? I think about our days a lot."',
        choices: [
          { text: '"Me too. All the time."', reply: '{name} lets out a breath, like they were nervous.', hearts: 3 },
          { text: '"Which one is your favorite?"', reply: '"This one," they say, without thinking.', hearts: 3 },
          { text: '"Why?"', reply: '"Because they are with you." They say it simply.', hearts: 2 },
        ],
      },
    ],
  },
  closers: {
    friendly: [
      {
        line: 'It is getting late at {place}. {name} stretches. "Same time next week?"',
        choices: [
          {
            text: '"Deal. You pick next time."',
            reply: '"Dangerous. I have ideas." They are already planning.',
            hearts: 3,
          },
          { text: 'High five them.', reply: 'They miss on purpose and hug you instead.', hearts: 2 },
          { text: '"Maybe."', reply: '"I will take maybe." {name} waves for a long time.', hearts: 1 },
        ],
      },
      {
        line: 'On the way home, {name} says, "That was a good one. Thanks for today."',
        choices: [
          { text: '"Thank YOU."', reply: '"We are both very polite." They bump your arm.', hearts: 3 },
          { text: 'Walk them to their door.', reply: '"You did not have to." They are glad you did.', hearts: 2 },
          { text: '"It was okay."', reply: '"Only okay? Next time, then." They sound determined.', hearts: 1 },
        ],
      },
    ],
    flirty: [
      {
        line: 'Leaving {place}, {name} slows down. "I do not really want to go yet."',
        choices: [
          { text: '"Then walk me home. The long way."', reply: 'They take the longest way possible.', hearts: 3 },
          { text: '"Neither do I."', reply: '{name} smiles at the ground. "Good."', hearts: 3 },
          { text: '"See you soon, then."', reply: '"Soon," they repeat, like a promise.', hearts: 1 },
        ],
      },
      {
        line: 'At the corner, {name} says, "Text me when you are home. So I know."',
        choices: [
          { text: '"Only if you text first."', reply: 'Your phone buzzes before you even turn the corner.', hearts: 3 },
          { text: 'Wink and walk away.', reply: 'You hear them laugh behind you.', hearts: 2 },
          { text: '"Okay."', reply: '"Okay," they echo, and wait until you are gone.', hearts: 1 },
        ],
      },
    ],
    sweet: [
      {
        line: 'At the end of the day at {place}, {name} pulls you into a long hug.',
        choices: [
          { text: 'Hold on a little longer.', reply: '"Stay like this a minute," they whisper.', hearts: 3 },
          { text: '"Thank you for today."', reply: '"Thank you for every day," {name} says.', hearts: 3 },
          { text: 'Pat their back.', reply: 'They laugh into your shoulder. "That was a pat."', hearts: 1 },
        ],
      },
      {
        line: '{name} looks at you for a long moment. "I would do today again. All of it."',
        choices: [
          { text: '"Then let us."', reply: 'They squeeze your hand. "Tomorrow, then."', hearts: 3 },
          { text: 'Kiss their cheek.', reply: '{name} goes quiet, then smiles the whole way home.', hearts: 3 },
          { text: '"Even the rain?"', reply: '"Especially the rain."', hearts: 2 },
        ],
      },
    ],
  },
};

/** Pictures for a user's date: clay icons on a soft tint, like the map places. */
export const THEME_ARTS: { id: ClayIconName; tint: string; labelKey: string }[] = [
  { id: 'sun', tint: '#FFF0C7', labelKey: 'sun' },
  { id: 'date', tint: '#FBE3D2', labelKey: 'cafe' },
  { id: 'plane', tint: '#DCE7FB', labelKey: 'trip' },
  { id: 'house', tint: '#F3E6D8', labelKey: 'home' },
  { id: 'music', tint: '#E6DDF5', labelKey: 'music' },
  { id: 'nightSky', tint: '#DCE2F5', labelKey: 'night' },
];

export const themeArt = (id: string) => THEME_ARTS.find((a) => a.id === id) ?? THEME_ARTS[0];
