import {
  type CharacterDraft,
  type DraftField,
  type DraftInput,
  type FieldContext,
  parseDefinition,
  type Spark,
  SPARK_MEANING,
  SPARKS,
} from '../ai/character-draft';
import { BIO_MAX, MORE_GREETINGS_MAX, ROLES, STYLE_VOICE } from '../lib/create-character';

/** Stand-ins until the model writes them: an opening action and a small endearing quirk. */
const OPENINGS = [
  '*looks up and smiles as you come in*',
  '*sets down what they were holding and waves you over*',
  '*glances at the door, then breaks into a grin*',
  '*pulls out the chair next to them*',
];
const QUIRKS = [
  'Forgets their own lunch, never yours.',
  'Hums without noticing when they concentrate.',
  'Gets flustered by compliments, every single time.',
  'Writes everything down, then loses the notebook.',
];
import { hashSeed, pickSeeded } from '../lib/seeded';
import type { CharacterGender, CharacterRole, SpeakingStyle } from '@/types';


/**
 * The mock provider's quick create: a whole character from the idea and its sparks, the same
 * every time for the same input, so the create flow works with no server. The real one is one
 * model call (`buildDraftPrompt`); this only fills the same fields.
 */

/** How each spark sounds: a form tag, a way of talking, a tagline, an opening and one exchange. */
const VOICES: Record<
  Spark,
  { tag: string; style: SpeakingStyle; tagline: string; greeting: string; other: string; reply: string }
> = {
  gentleStubborn: {
    tag: 'caring',
    style: 'gentle',
    tagline: 'Soft voice, stubborn heart',
    greeting: "There you are. I saved you the window seat, and no, I'm not moving.",
    other: "You don't have to wait for me.",
    reply: "I know. I'm waiting anyway.",
  },
  teasesWhenNervous: {
    tag: 'teasing',
    style: 'playful',
    tagline: 'Teases you when the stakes get high',
    greeting: 'Oh, it’s you. Good. I was getting bored of being right about everything alone.',
    other: 'Are you blushing?',
    reply: "It's warm in here. Obviously. Stop looking at me like that.",
  },
  calmUntilHurt: {
    tag: 'calm',
    style: 'dry',
    tagline: 'Calm, until someone hurts you',
    greeting: 'Sit. Tea first, then tell me who ruined your day.',
    other: 'Someone was rude to me at work.',
    reply: 'Mm. Name, desk and the time they leave. Just curious.',
  },
  flirtsToDodge: {
    tag: 'romantic',
    style: 'playful',
    tagline: 'Flirts whenever things get real',
    greeting: "Hey, stranger. You look like you came to ask me something serious. Don't.",
    other: 'Why did you leave so early yesterday?',
    reply: 'Because you were too charming and I panicked. Next question.',
  },
  proudLonely: {
    tag: 'confident',
    style: 'formal',
    tagline: 'Proud, and quietly lonely',
    greeting: "You came back. I wasn't waiting. I simply happened to be here. For an hour.",
    other: 'Do you ever ask anyone for help?',
    reply: "I don't need help. ...Would you stay a little longer, though?",
  },
  sunnySecret: {
    tag: 'energetic',
    style: 'casual',
    tagline: 'Sunshine with one locked drawer',
    greeting: 'Hi hi! Okay, first: you look great. Second: tell me everything.',
    other: 'What are you hiding behind that smile?',
    reply: 'A terrible singing voice. And maybe one other thing. Someday.',
  },
  remembersEverything: {
    tag: 'sweet',
    style: 'gentle',
    tagline: 'Remembers every little thing',
    greeting: 'Hey. Did the rain stop where you are? You said wet shoes ruin your whole day.',
    other: 'You remembered my coffee order?',
    reply: 'Oat milk, no sugar, extra hot. You told me once. I listen.',
  },
  braveForOthers: {
    tag: 'protective',
    style: 'casual',
    tagline: 'Braver for you than for themself',
    greeting: 'Stay behind me a second. ...Okay, false alarm. Hi. I missed you.',
    other: "Aren't you scared?",
    reply: "Of course. But you're here, so I'll be scared later.",
  },
  plansThenImprovises: {
    tag: 'nerdy',
    style: 'casual',
    tagline: 'Has a plan. Then a better idea',
    greeting: 'I made a schedule for tonight. Step one was saying hi. I forgot step two.',
    other: "So what's the plan?",
    reply: 'Seven steps, colour-coded. Or we just walk and see what happens. Your pick.',
  },
  bluntThenSorry: {
    tag: 'sarcastic',
    style: 'dry',
    tagline: 'Says it straight, then says sorry',
    greeting: "You're late. ...That came out wrong. I'm glad you're here.",
    other: 'Do you like my new haircut?',
    reply: "No. Wait. It's growing on me. Sorry. It's nice.",
  },
  actsCoolCaresLots: {
    tag: 'mysterious',
    style: 'dry',
    tagline: 'Too cool to admit they care',
    greeting: "Oh. You. I wasn't checking my phone every five minutes or anything.",
    other: 'Did you miss me?',
    reply: "Missed is a strong word. I noticed you were gone. Every hour.",
  },
  toughOutsideKindInside: {
    tag: 'grumpy',
    style: 'casual',
    tagline: 'Rough edges, soft with you',
    greeting: 'Took you long enough. Sit down, I got the good snacks.',
    other: "You're grumpy today.",
    reply: "I'm grumpy every day. You're the only one I share snacks with.",
  },
};

/** Original first names, none of them in the cast. */
const NAMES: Record<CharacterGender, readonly string[]> = {
  male: ['Arlo', 'Bastien', 'Emrys', 'Joren', 'Lior', 'Matteo', 'Nico', 'Soren', 'Tobin', 'Callum'],
  female: ['Elodie', 'Ines', 'Lira', 'Mira', 'Noor', 'Tamsin', 'Vela', 'Ottilie', 'Sabine', 'Wren'],
};

const LOOKS = [
  'Dark wavy hair, warm brown eyes, a worn denim jacket and a silver ring on one thumb.',
  'Short ash-blond hair, grey eyes, a cream knit sweater and ink on their fingertips.',
  'Long black hair in a loose braid, amber eyes, a long coat and one small earring.',
  'Messy chestnut curls, green eyes, rolled-up shirt sleeves and a pencil behind one ear.',
  'Sleek silver-dyed hair, dark eyes, a black turtleneck and a thin scar on one eyebrow.',
  'Soft auburn hair, hazel eyes, a yellow raincoat and a camera on a strap.',
];

/** First messages the user can tap, by what the character is to them. */
const STARTERS: Record<CharacterRole, readonly string[]> = {
  friend: ['What are you up to right now?', 'Tell me one good thing about your day.', 'I need a distraction. Got one?'],
  crush: ["I was hoping you'd be around.", 'Honest question: what do you think of me?', "Guess who couldn't sleep."],
  partner: ['Hey you. Miss me?', 'Long day. Talk to me?', 'Where should we go this weekend?'],
  mentor: ['Can I ask you for advice?', "I'm stuck on something. Help?", 'What would you do in my place?'],
  rival: ['Ready to lose again?', "I heard you've been talking about me.", 'Truce, just for today?'],
  family: ["Hi! How's everyone?", 'Can I come over later?', 'I have news. Sit down.'],
};

/** Stand-ins for the chat's first card (D110): a story, loves and can't stand. */
const BACKSTORIES = [
  'Moved to the city a few years ago with one suitcase and a plan that changed twice. Works long hours, keeps a small circle, and is ready to let one more person in.',
  'Grew up in a loud family by the sea and still cooks for six out of habit. Left home to chase a quiet dream, and now wants someone to share the noise with again.',
  'Spent years being the reliable one for everybody else. Lately has been learning to say what they want, starting with small things, like a slow evening and good company.',
  'Changed careers at an age people said was too late, and has not regretted it once. Curious about everything, and especially about you.',
];
const LIKES = ['rainy mornings', 'street food', 'old films', 'late-night walks', 'strong coffee', 'vinyl records', 'sea air', 'bookshops'];
const DISLIKES = ['cold coffee', 'being rushed', 'loud alarms', 'small talk', 'spoilers', 'soggy chips'];

/** A few things from a pool, picked by the seed, in a steady order. */
const some = (pool: readonly string[], seed: string, count: number) => {
  const from = hashSeed(seed) % pool.length;
  return [...pool.slice(from), ...pool].slice(0, count);
};

const MALE = /\b(he|him|his|guy|man|boyfriend|husband|prince|king|lord|sir)\b/i;
const FEMALE = /\b(she|her|hers|woman|lady|girlfriend|wife|princess|queen)\b/i;
const AGE = /\b(1[89]|[2-9]\d)\s*(?:-?\s*years?(?:\s*old)?|yo|y\/o)\b/i;

const sentence = (text: string) => {
  const line = text.trim().replace(/[.!?]*$/, '');
  return line ? `${line[0].toUpperCase()}${line.slice(1)}.` : '';
};

export function mockDraft(input: DraftInput): CharacterDraft {
  const idea = input.idea.trim();
  const seed = `${idea}|${input.sparks.join(',')}`;
  const sparks: Spark[] = input.sparks.length > 0 ? input.sparks : [pickSeeded(SPARKS, seed)];
  const gender: CharacterGender = MALE.test(idea) ? 'male' : FEMALE.test(idea) ? 'female' : hashSeed(seed) % 2 ? 'male' : 'female';
  const age = Number(AGE.exec(idea)?.[1] ?? 22 + (hashSeed(`${seed}|age`) % 9));
  const role = input.role ?? pickSeeded(ROLES, `${seed}|role`);
  const voices = sparks.map((spark) => VOICES[spark]);
  const bio = [sentence(idea), ...sparks.map((spark) => sentence(SPARK_MEANING[spark]))].join(' ');

  return {
    name: pickSeeded(NAMES[gender], seed),
    tagline: voices[0].tagline,
    bio: bio.length > BIO_MAX ? sentence(idea).slice(0, BIO_MAX) : bio,
    look: pickSeeded(LOOKS, `${seed}|look`),
    gender,
    age,
    speakingStyle: voices[0].style,
    role,
    voicePreset: STYLE_VOICE[voices[0].style],
    tags: [...new Set(voices.map((voice) => voice.tag))],
    greeting: voices[0].greeting,
    opening: pickSeeded(OPENINGS, `${seed}|opening`),
    quirk: pickSeeded(QUIRKS, `${seed}|quirk`),
    // The other sparks' openings first, then other moods, so there are always three more.
    greetings: [...voices.slice(1), ...SPARKS.map((spark) => VOICES[spark]).filter((voice) => !voices.includes(voice))]
      .slice(0, MORE_GREETINGS_MAX)
      .map((voice) => voice.greeting),
    definition: voices.flatMap((voice) => [`{{random_user_1}}: ${voice.other}`, `{{char}}: ${voice.reply}`]).join('\n'),
    starters: [...STARTERS[role]],
    backstory: pickSeeded(BACKSTORIES, `${seed}|story`),
    likes: some(LIKES, `${seed}|likes`, 4),
    dislikes: some(DISLIKES, `${seed}|dislikes`, 3),
    heightCm: (gender === 'male' ? 175 : 160) + (hashSeed(`${seed}|height`) % 14),
  };
}

/** The draft as the model's JSON reply, so the app runs it through the same `parseDraft` the server uses. */
export function mockDraftReply(input: DraftInput): string {
  const { definition, ...draft } = mockDraft(input);
  return JSON.stringify({ ...draft, dialog: dialogOf(definition) });
}

const dialogOf = (definition: string) =>
  parseDefinition(definition).map((turn) => ({ from: turn.speaker === '{{char}}' ? 'char' : 'other', text: turn.text }));

/** A line about them for a bio, by what they are to the user, in their own voice. */
const ROLE_LINES: Record<CharacterRole, string> = {
  friend: "I'm the one you text when the day goes sideways.",
  crush: "I notice when you walk in, even when I pretend I don't.",
  partner: 'I keep your favourite mug at my place. Just in case.',
  mentor: "I've made most mistakes once, so you don't have to.",
  rival: 'I like winning. I like winning against you more.',
  family: "I've known you forever and I still take your side.",
};

const HABITS = [
  'Rainy days are for long walks and longer talks.',
  "I collect postcards from places I haven't been yet.",
  'Mornings are not my thing; late nights are.',
  'I cook too much on purpose, so someone has to stay for dinner.',
];

const MORE_STARTERS = ['Guess what happened today.', 'Can I tell you something?', 'You were right, by the way.', 'Are you awake?'];

/**
 * One field written again, as the model's JSON reply (`buildFieldPrompt`). `attempt` counts the
 * taps on that field, so every tap brings a different take, as a new model call would.
 */
export function mockFieldReply(field: DraftField, character: FieldContext, attempt: number): string {
  const name = character.name?.trim() || 'I';
  const role = character.role ?? 'friend';
  const tags = character.tags ?? [];
  // Their voices: the sparks behind their tags first, every other one after.
  const all = SPARKS.map((spark) => VOICES[spark]);
  const voices = [...all.filter((v) => tags.includes(v.tag)), ...all.filter((v) => !tags.includes(v.tag))];
  const at = <T,>(list: readonly T[], skip?: (item: T) => boolean) => {
    const usable = skip ? list.filter((item) => !skip(item)) : list;
    return (usable.length > 0 ? usable : list)[attempt % (usable.length > 0 ? usable.length : list.length)];
  };
  switch (field) {
    case 'tagline':
      return JSON.stringify({ value: at(voices.map((v) => v.tagline), (line) => line === character.tagline) });
    case 'bio': {
      const intro = name === 'I' ? '' : `I'm ${name}. `;
      const traits = tags.length > 0 ? ` People call me ${tags.slice(0, 3).join(', ')}.` : '';
      return JSON.stringify({ value: `${intro}${ROLE_LINES[role]}${traits} ${at(HABITS)}` });
    }
    case 'look':
      return JSON.stringify({ value: at(LOOKS, (look) => look === character.look) });
    case 'opening':
      return JSON.stringify({ value: at(OPENINGS, (line) => line === character.opening) });
    case 'quirk':
      return JSON.stringify({ value: at(QUIRKS, (line) => line === character.quirk) });
    case 'greeting':
      return JSON.stringify({ value: at(voices.map((v) => v.greeting), (line) => line === character.greeting) });
    case 'greetings': {
      const lines = voices.map((v) => v.greeting).filter((line) => line !== character.greeting);
      const from = (attempt * MORE_GREETINGS_MAX) % lines.length;
      return JSON.stringify({ values: [...lines.slice(from), ...lines].slice(0, MORE_GREETINGS_MAX) });
    }
    case 'dialog': {
      const pair = [at(voices), voices[(attempt + 1) % voices.length]];
      return JSON.stringify({
        dialog: pair.flatMap((v) => [
          { from: 'other', text: v.other },
          { from: 'char', text: v.reply },
        ]),
      });
    }
    case 'starters': {
      const pool = [...STARTERS[role], ...MORE_STARTERS];
      const from = (attempt * 3) % pool.length;
      return JSON.stringify({ values: [...pool.slice(from), ...pool].slice(0, 3) });
    }
    case 'backstory':
      return JSON.stringify({ value: at(BACKSTORIES, (story) => story === character.backstory) });
    case 'likes':
      return JSON.stringify({ values: some(LIKES, `${name}|${attempt}`, 4) });
    case 'dislikes':
      return JSON.stringify({ values: some(DISLIKES, `${name}|${attempt}`, 3) });
  }
}
