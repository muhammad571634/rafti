/**
 * Date places on the map and their rounds. Each round is a short scene line and
 * three answers; an answer is worth 0-3 hearts and gets its own reply. `{name}` is
 * the partner's first name. The server's model writes these later.
 */
export interface DateChoice {
  text: string;
  reply: string;
  hearts: 0 | 1 | 2 | 3;
}

export interface DateRound {
  line: string;
  choices: [DateChoice, DateChoice, DateChoice];
}

export interface DatePlace {
  id: string;
  titleKey: string;
  emoji: string;
  cost: number;
  levelRequired: number;
  /** Position of the pin on the map, as fractions of its width and height */
  x: number;
  y: number;
  /** Soft wash behind the place's emoji */
  tint: string;
  rounds: DateRound[];
}

// The emoji are placeholders for 3D clay icons, see docs/icons-3d.md step 5.
export const DATE_PLACES: DatePlace[] = [
  {
    id: 'ds_rain',
    titleKey: 'rainyWalk',
    emoji: '\u{2614}',
    cost: 10,
    levelRequired: 1,
    x: 0.06,
    y: 0.16,
    tint: '#DCE7FB',
    rounds: [
      {
        line: '{name} holds the umbrella a little too far over your side. "You are getting wet," you say. "So?"',
        choices: [
          { text: 'Pull them under with you.', reply: '"...Okay. This is better." They do not move away.', hearts: 3 },
          { text: '"Then share it properly."', reply: '"Bossy. I like it." The umbrella tilts back to the middle.', hearts: 2 },
          { text: 'Step out into the rain.', reply: '"Hey! Get back here!" They are laughing as they chase you.', hearts: 1 },
        ],
      },
      {
        line: 'A puddle the size of a lake blocks the street. {name} looks at it, then at you.',
        choices: [
          { text: 'Jump it together, on three.', reply: 'You both land short. Soaked shoes, and {name} cannot stop laughing.', hearts: 3 },
          { text: '"Carry me?"', reply: '"Is that a dare?" They actually crouch down.', hearts: 2 },
          { text: 'Walk the long way around.', reply: '"Sensible." They sound a little disappointed.', hearts: 0 },
        ],
      },
      {
        line: 'You duck into a tiny bakery to wait it out. {name} is staring at the last cinnamon roll.',
        choices: [
          { text: 'Buy it and split it.', reply: '"You gave me the bigger half." "I know."', hearts: 3 },
          { text: 'Buy it and eat it slowly in front of them.', reply: '"You are cruel." They steal a bite anyway.', hearts: 2 },
          { text: '"We should eat something healthy."', reply: '"...Right. Healthy." They look at the roll one last time.', hearts: 0 },
        ],
      },
      {
        line: 'The rain softens. {name} asks, quietly, "Do you like days like this?"',
        choices: [
          { text: '"I do now."', reply: 'They look away, smiling at the window.', hearts: 3 },
          { text: '"Rain makes everything slower. I like slow."', reply: '"Slow is good," they agree. "Slow with you is good."', hearts: 2 },
          { text: '"Not really, I hate wet socks."', reply: '"Fair. Very fair."', hearts: 1 },
        ],
      },
      {
        line: 'Outside your street, {name} closes the umbrella. The rain has stopped. Neither of you moves.',
        choices: [
          { text: '"Same time next rain?"', reply: '"I will be checking the forecast every day now."', hearts: 3 },
          { text: 'Hug them goodbye.', reply: 'They hold on a second longer than you expect.', hearts: 3 },
          { text: '"Thanks for walking me."', reply: '"Anytime. I mean that."', hearts: 1 },
        ],
      },
    ],
  },
  {
    id: 'ds_aquarium',
    titleKey: 'aquarium',
    emoji: '\u{1F41F}',
    cost: 12,
    levelRequired: 3,
    x: 0.58,
    y: 0.23,
    tint: '#CFE6FF',
    rounds: [
      {
        line: 'Closing time. The jellyfish tank is the last one still lit. {name} stops. "Stay a minute?"',
        choices: [
          { text: '"Only if you stand closer."', reply: 'They do. Their shoulder rests against yours.', hearts: 3 },
          { text: 'Take a photo of them in the glow.', reply: '"Delete that." "No." "...Send it to me, then."', hearts: 2 },
          { text: '"We will get locked in, you know."', reply: '"Would that be so bad?"', hearts: 1 },
        ],
      },
      {
        line: 'An otter presses its paws to the glass right in front of {name}.',
        choices: [
          { text: '"It likes you. Good taste."', reply: '"Are you flirting through an otter?" "Maybe."', hearts: 3 },
          { text: 'Press your hand to the glass too.', reply: 'The otter spins away. {name} laughs so hard a guard looks over.', hearts: 2 },
          { text: 'Read the sign about otters out loud.', reply: '"Did you know they hold hands when they sleep?" they say. "Now you do."', hearts: 1 },
        ],
      },
      {
        line: 'In the dark tunnel, a shark glides over you both. {name} grabs your sleeve.',
        choices: [
          { text: 'Take their hand instead.', reply: '"...For safety," they say. They do not let go after the tunnel.', hearts: 3 },
          { text: '"Scared?"', reply: '"Of the shark? No. Of you noticing? A little."', hearts: 2 },
          { text: 'Point out it is just a nurse shark.', reply: '"Thank you, professor." They let go.', hearts: 0 },
        ],
      },
      {
        line: 'The gift shop is half closed. {name} is holding two plush fish. "Pick one."',
        choices: [
          { text: '"Both. One for you, one for me."', reply: '"Matching fish. That is a commitment."', hearts: 3 },
          { text: 'Pick the uglier one.', reply: '"Why that one?" "It needs someone." They buy it without a word.', hearts: 2 },
          { text: '"I do not really need a fish."', reply: '"Nobody needs a fish." They put them back.', hearts: 0 },
        ],
      },
      {
        line: 'Outside, the street lights are on. {name} says, "I did not want that to end."',
        choices: [
          { text: '"Then let us not end it yet."', reply: 'You walk the long way to the station. Twice.', hearts: 3 },
          { text: '"There will be a next time."', reply: '"Promise?" "Promise."', hearts: 2 },
          { text: '"My feet hurt, honestly."', reply: '"Okay, okay. Let us get you home."', hearts: 1 },
        ],
      },
    ],
  },
  {
    id: 'ds_festival',
    titleKey: 'festival',
    emoji: '\u{1F386}',
    cost: 15,
    levelRequired: 6,
    x: 0.12,
    y: 0.41,
    tint: '#FFE6CC',
    rounds: [
      {
        line: 'Lanterns everywhere, and the smell of grilled corn. {name} is already pulling you toward the stalls.',
        choices: [
          { text: 'Let them lead the way.', reply: '"Corn first, then the goldfish game. I have a plan."', hearts: 2 },
          { text: 'Lace your fingers with theirs so you do not get lost.', reply: '"Good idea," they say, a little too fast.', hearts: 3 },
          { text: '"Slow down, it is crowded."', reply: 'They slow down. Mostly.', hearts: 1 },
        ],
      },
      {
        line: 'At the ring toss, {name} misses all three rings. The prize is a giant bear.',
        choices: [
          { text: 'Win it for them.', reply: 'Third ring. The bear is now taller than {name} and they refuse to carry it alone.', hearts: 3 },
          { text: '"One more try. I believe in you."', reply: 'They miss again, but they are grinning.', hearts: 2 },
          { text: '"It is rigged anyway."', reply: '"Definitely rigged." They still look at the bear.', hearts: 1 },
        ],
      },
      {
        line: 'A photo stand offers silly masks. {name} holds up a fox and a cat.',
        choices: [
          { text: 'Take the cat, give them the fox.', reply: 'The photo comes out crooked and perfect.', hearts: 3 },
          { text: 'Wear both, give them nothing.', reply: '"You are a monster." They take five photos of you.', hearts: 2 },
          { text: '"I look bad in photos."', reply: '"You do not. But okay."', hearts: 0 },
        ],
      },
      {
        line: 'The first firework goes up. {name} is not looking at the sky.',
        choices: [
          { text: '"You are missing it."', reply: '"No, I am not."', hearts: 3 },
          { text: 'Look back at them.', reply: 'Neither of you sees the second firework either.', hearts: 3 },
          { text: 'Film the fireworks.', reply: 'They lean into your shot and wave.', hearts: 1 },
        ],
      },
      {
        line: 'The crowd thins on the way out. {name} asks, "Best part of tonight?"',
        choices: [
          { text: '"Right now."', reply: 'They squeeze your hand twice.', hearts: 3 },
          { text: '"The bear, obviously."', reply: '"The bear thanks you."', hearts: 2 },
          { text: '"The corn was really good."', reply: '"Honest. I respect that."', hearts: 1 },
        ],
      },
    ],
  },
  {
    id: 'ds_studio',
    titleKey: 'lateStudio',
    emoji: '\u{1F3A7}',
    cost: 18,
    levelRequired: 10,
    x: 0.6,
    y: 0.47,
    tint: '#E9E0FA',
    rounds: [
      {
        line: 'A quiet studio after midnight. {name} hands you headphones. "I have never played this for anyone."',
        choices: [
          { text: 'Listen with your eyes closed.', reply: 'When you open them, they are watching you, nervous.', hearts: 3 },
          { text: '"Why me?"', reply: '"You know why."', hearts: 3 },
          { text: '"Is it finished?"', reply: '"Almost. It needs one more thing."', hearts: 1 },
        ],
      },
      {
        line: '"So? Be honest." {name} is pretending not to care.',
        choices: [
          { text: '"It sounds like you."', reply: '"Is that good?" "It is my favourite thing."', hearts: 3 },
          { text: 'Ask to hear it again.', reply: 'They play it twice more. Their ears turn red.', hearts: 2 },
          { text: '"The second part drags a bit."', reply: '"...You are right. That hurts. You are right."', hearts: 1 },
        ],
      },
      {
        line: '{name} pushes a mic toward you. "Hum something. Anything."',
        choices: [
          { text: 'Hum the melody you just heard.', reply: 'They record it and loop it under the chorus. It fits.', hearts: 3 },
          { text: 'Hum a cartoon theme song.', reply: 'They laugh so hard they have to stop the recording.', hearts: 2 },
          { text: '"No way, I cannot sing."', reply: '"Next time, then. I am writing it down."', hearts: 1 },
        ],
      },
      {
        line: 'It is 3 a.m. and the vending machine has one coffee left.',
        choices: [
          { text: 'Share it, one sip each.', reply: 'It is terrible coffee. Best one you have had.', hearts: 3 },
          { text: 'Give it to them.', reply: '"You are spoiling me." "Yes."', hearts: 2 },
          { text: '"We should sleep."', reply: '"Ten more minutes," they say, for the third time.', hearts: 1 },
        ],
      },
      {
        line: 'Sunrise through the blinds. {name} saves the file and names it after you.',
        choices: [
          { text: '"Can I hear it when it is done?"', reply: '"You will be the first. You were always going to be."', hearts: 3 },
          { text: 'Fall asleep on their shoulder.', reply: 'They do not move for an hour.', hearts: 3 },
          { text: '"You should rename that."', reply: '"Never."', hearts: 2 },
        ],
      },
    ],
  },
  {
    id: 'ds_rooftop',
    titleKey: 'rooftop',
    emoji: '\u{1F30C}',
    cost: 20,
    levelRequired: 16,
    x: 0.3,
    y: 0.62,
    tint: '#DDEBFA',
    rounds: [
      {
        line: 'The city is too bright for stars. {name} spread a blanket anyway. "I wanted to show you the sky. It did not cooperate."',
        choices: [
          { text: '"I did not come for the stars."', reply: 'They go quiet, then lie down next to you.', hearts: 3 },
          { text: 'Point at a plane. "Look, a shooting star."', reply: '"That is a plane." "Make a wish anyway."', hearts: 2 },
          { text: '"Maybe we try a clear night?"', reply: '"...Yeah. Next time."', hearts: 1 },
        ],
      },
      {
        line: '{name} asks, "What did you want to be when you were little?"',
        choices: [
          { text: 'Tell them the real answer.', reply: 'They listen without interrupting once. "You still could, you know."', hearts: 3 },
          { text: '"Ask me something harder."', reply: '"Okay. What are you afraid of?" The night gets very honest.', hearts: 2 },
          { text: '"An astronaut. Obviously."', reply: '"Bad night for it," they laugh.', hearts: 1 },
        ],
      },
      {
        line: 'Cold wind. {name} is pretending they are not shivering.',
        choices: [
          { text: 'Wrap the blanket around both of you.', reply: '"Warmer," they whisper. "Much warmer."', hearts: 3 },
          { text: 'Give them your jacket.', reply: 'It smells like you, they say, and do not give it back.', hearts: 2 },
          { text: '"Should we go inside?"', reply: '"Five more minutes. Please."', hearts: 1 },
        ],
      },
      {
        line: 'Far below, someone is playing a slow song with the window open. {name} stands and holds out a hand.',
        choices: [
          { text: 'Take it and dance.', reply: 'You are both terrible. You do not stop until the song does.', hearts: 3 },
          { text: '"I do not know how."', reply: '"Neither do I. Come here."', hearts: 3 },
          { text: 'Laugh and stay sitting.', reply: 'They dance alone, badly, just to make you laugh. It works.', hearts: 2 },
        ],
      },
      {
        line: 'The song ends. {name} says, "I am glad it was you up here."',
        choices: [
          { text: '"Me too. Every time."', reply: 'They rest their forehead against yours.', hearts: 3 },
          { text: '"Bring better weather next time."', reply: '"I will talk to the sky personally."', hearts: 2 },
          { text: '"It was nice."', reply: '"Nice," they repeat, smiling. "I will take nice."', hearts: 1 },
        ],
      },
    ],
  },
];

export const datePlaceById = (id: string) => DATE_PLACES.find((p) => p.id === id);

/** The most hearts a place can give: three per round. */
export const maxHearts = (place: DatePlace) => place.rounds.length * 3;

export type DateEnding = 'sweet' | 'warm' | 'funny';

export function dateEnding(hearts: number, max: number): DateEnding {
  const share = hearts / max;
  return share >= 0.75 ? 'sweet' : share >= 0.45 ? 'warm' : 'funny';
}
