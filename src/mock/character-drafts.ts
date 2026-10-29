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
import { fill, voice } from '../i18n/voice';
import { hashSeed, pickSeeded } from '../lib/seeded';
import type { CharacterGender, CharacterRole, SpeakingStyle } from '@/types';

const SPARK_STYLE: Record<Spark, SpeakingStyle> = {
  gentleStubborn: 'gentle',
  teasesWhenNervous: 'playful',
  calmUntilHurt: 'dry',
  flirtsToDodge: 'playful',
  proudLonely: 'formal',
  sunnySecret: 'casual',
  remembersEverything: 'gentle',
  braveForOthers: 'casual',
  plansThenImprovises: 'casual',
  bluntThenSorry: 'dry',
  actsCoolCaresLots: 'dry',
  toughOutsideKindInside: 'casual',
};

export const DRAFTS_VOICE = {
  openings: [
    '*looks up and smiles as you come in*',
    '*sets down what they were holding and waves you over*',
    '*glances at the door, then breaks into a grin*',
    '*pulls out the chair next to them*',
  ],
  quirks: [
    'Forgets their own lunch, never yours.',
    'Hums without noticing when they concentrate.',
    'Gets flustered by compliments, every single time.',
    'Writes everything down, then loses the notebook.',
  ],
  voices: {
    gentleStubborn: {
      tag: 'caring',
      tagline: 'Soft voice, stubborn heart',
      greeting: "There you are. I saved you the window seat, and no, I'm not moving.",
      other: "You don't have to wait for me.",
      reply: "I know. I'm waiting anyway.",
    },
    teasesWhenNervous: {
      tag: 'teasing',
      tagline: 'Teases you when the stakes get high',
      greeting: 'Oh, it’s you. Good. I was getting bored of being right about everything alone.',
      other: 'Are you blushing?',
      reply: "It's warm in here. Obviously. Stop looking at me like that.",
    },
    calmUntilHurt: {
      tag: 'calm',
      tagline: 'Calm, until someone hurts you',
      greeting: 'Sit. Tea first, then tell me who ruined your day.',
      other: 'Someone was rude to me at work.',
      reply: 'Mm. Name, desk and the time they leave. Just curious.',
    },
    flirtsToDodge: {
      tag: 'romantic',
      tagline: 'Flirts whenever things get real',
      greeting: "Hey, stranger. You look like you came to ask me something serious. Don't.",
      other: 'Why did you leave so early yesterday?',
      reply: 'Because you were too charming and I panicked. Next question.',
    },
    proudLonely: {
      tag: 'confident',
      tagline: 'Proud, and quietly lonely',
      greeting: "You came back. I wasn't waiting. I simply happened to be here. For an hour.",
      other: 'Do you ever ask anyone for help?',
      reply: "I don't need help. ...Would you stay a little longer, though?",
    },
    sunnySecret: {
      tag: 'energetic',
      tagline: 'Sunshine with one locked drawer',
      greeting: 'Hi hi! Okay, first: you look great. Second: tell me everything.',
      other: 'What are you hiding behind that smile?',
      reply: 'A terrible singing voice. And maybe one other thing. Someday.',
    },
    remembersEverything: {
      tag: 'sweet',
      tagline: 'Remembers every little thing',
      greeting: 'Hey. Did the rain stop where you are? You said wet shoes ruin your whole day.',
      other: 'You remembered my coffee order?',
      reply: 'Oat milk, no sugar, extra hot. You told me once. I listen.',
    },
    braveForOthers: {
      tag: 'protective',
      tagline: 'Braver for you than for themself',
      greeting: 'Stay behind me a second. ...Okay, false alarm. Hi. I missed you.',
      other: "Aren't you scared?",
      reply: "Of course. But you're here, so I'll be scared later.",
    },
    plansThenImprovises: {
      tag: 'nerdy',
      tagline: 'Has a plan. Then a better idea',
      greeting: 'I made a schedule for tonight. Step one was saying hi. I forgot step two.',
      other: "So what's the plan?",
      reply: 'Seven steps, colour-coded. Or we just walk and see what happens. Your pick.',
    },
    bluntThenSorry: {
      tag: 'sarcastic',
      tagline: 'Says it straight, then says sorry',
      greeting: "You're late. ...That came out wrong. I'm glad you're here.",
      other: 'Do you like my new haircut?',
      reply: "No. Wait. It's growing on me. Sorry. It's nice.",
    },
    actsCoolCaresLots: {
      tag: 'mysterious',
      tagline: 'Too cool to admit they care',
      greeting: "Oh. You. I wasn't checking my phone every five minutes or anything.",
      other: 'Did you miss me?',
      reply: "Missed is a strong word. I noticed you were gone. Every hour.",
    },
    toughOutsideKindInside: {
      tag: 'grumpy',
      tagline: 'Rough edges, soft with you',
      greeting: 'Took you long enough. Sit down, I got the good snacks.',
      other: "You're grumpy today.",
      reply: "I'm grumpy every day. You're the only one I share snacks with.",
    },
  } as Record<
    Spark,
    { tag: string; tagline: string; greeting: string; other: string; reply: string }
  >,
  names: {
    male: ['Arlo', 'Bastien', 'Emrys', 'Joren', 'Lior', 'Matteo', 'Nico', 'Soren', 'Tobin', 'Callum'],
    female: ['Elodie', 'Ines', 'Lira', 'Mira', 'Noor', 'Tamsin', 'Vela', 'Ottilie', 'Sabine', 'Wren'],
  } as Record<CharacterGender, readonly string[]>,
  looks: [
    'Dark wavy hair, warm brown eyes, a worn denim jacket and a silver ring on one thumb.',
    'Short ash-blond hair, grey eyes, a cream knit sweater and ink on their fingertips.',
    'Long black hair in a loose braid, amber eyes, a long coat and one small earring.',
    'Messy chestnut curls, green eyes, rolled-up shirt sleeves and a pencil behind one ear.',
    'Sleek silver-dyed hair, dark eyes, a black turtleneck and a thin scar on one eyebrow.',
    'Soft auburn hair, hazel eyes, a yellow raincoat and a camera on a strap.',
  ],
  starters: {
    friend: ['What are you up to right now?', 'Tell me one good thing about your day.', 'I need a distraction. Got one?'],
    crush: ["I was hoping you'd be around.", 'Honest question: what do you think of me?', "Guess who couldn't sleep."],
    partner: ['Hey you. Miss me?', 'Long day. Talk to me?', 'Where should we go this weekend?'],
    mentor: ['Can I ask you for advice?', "I'm stuck on something. Help?", 'What would you do in my place?'],
    rival: ['Ready to lose again?', "I heard you've been talking about me.", 'Truce, just for today?'],
    family: ["Hi! How's everyone?", 'Can I come over later?', 'I have news. Sit down.'],
  } as Record<CharacterRole, readonly string[]>,
  backstories: [
    'Moved to the city a few years ago with one suitcase and a plan that changed twice. Works long hours, keeps a small circle, and is ready to let one more person in.',
    'Grew up in a loud family by the sea and still cooks for six out of habit. Left home to chase a quiet dream, and now wants someone to share the noise with again.',
    'Spent years being the reliable one for everybody else. Lately has been learning to say what they want, starting with small things, like a slow evening and good company.',
    'Changed careers at an age people said was too late, and has not regretted it once. Curious about everything, and especially about you.',
  ],
  likes: ['rainy mornings', 'street food', 'old films', 'late-night walks', 'strong coffee', 'vinyl records', 'sea air', 'bookshops'],
  dislikes: ['cold coffee', 'being rushed', 'loud alarms', 'small talk', 'spoilers', 'soggy chips'],
  roleLines: {
    friend: "I'm the one you text when the day goes sideways.",
    crush: "I notice when you walk in, even when I pretend I don't.",
    partner: 'I keep your favourite mug at my place. Just in case.',
    mentor: "I've made most mistakes once, so you don't have to.",
    rival: 'I like winning. I like winning against you more.',
    family: "I've known you forever and I still take your side.",
  } as Record<CharacterRole, string>,
  habits: [
    'Rainy days are for long walks and longer talks.',
    "I collect postcards from places I haven't been yet.",
    'Mornings are not my thing; late nights are.',
    'I cook too much on purpose, so someone has to stay for dinner.',
  ],
  moreStarters: ['Guess what happened today.', 'Can I tell you something?', 'You were right, by the way.', 'Are you awake?'],
  introWithName: "I'm {name}. ",
  traits: ' People call me {tags}.',
};

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

export function mockDraft(input: DraftInput, genderParam?: CharacterGender): CharacterDraft {
  const v = voice('drafts', DRAFTS_VOICE);
  const idea = input.idea.trim();
  const seed = `${idea}|${input.sparks.join(',')}`;
  const sparks: Spark[] = input.sparks.length > 0 ? input.sparks : [pickSeeded(SPARKS, seed)];
  const gender: CharacterGender = genderParam ?? (MALE.test(idea) ? 'male' : FEMALE.test(idea) ? 'female' : hashSeed(seed) % 2 ? 'male' : 'female');
  const age = Number(AGE.exec(idea)?.[1] ?? 22 + (hashSeed(`${seed}|age`) % 9));
  const role = input.role ?? pickSeeded(ROLES, `${seed}|role`);
  const voices = sparks.map((spark) => ({ ...v.voices[spark], style: SPARK_STYLE[spark] }));
  const bio = [sentence(idea), ...sparks.map((spark) => sentence(SPARK_MEANING[spark]))].join(' ');

  return {
    name: fill(pickSeeded(v.names[gender], seed), {}, gender),
    tagline: fill(voices[0].tagline, {}, gender),
    bio: bio.length > BIO_MAX ? sentence(idea).slice(0, BIO_MAX) : bio,
    look: fill(pickSeeded(v.looks, `${seed}|look`), {}, gender),
    gender,
    age,
    speakingStyle: voices[0].style,
    role,
    voicePreset: STYLE_VOICE[voices[0].style],
    tags: [...new Set(voices.map((voice) => voice.tag))],
    greeting: fill(voices[0].greeting, {}, gender),
    opening: fill(pickSeeded(v.openings, `${seed}|opening`), {}, gender),
    quirk: fill(pickSeeded(v.quirks, `${seed}|quirk`), {}, gender),
    // The other sparks' openings first, then other moods, so there are always three more.
    greetings: [...voices.slice(1), ...SPARKS.map((spark) => ({ ...v.voices[spark], style: SPARK_STYLE[spark] })).filter((voice) => !voices.some((item) => item.greeting === voice.greeting))]
      .slice(0, MORE_GREETINGS_MAX)
      .map((voice) => fill(voice.greeting, {}, gender)),
    definition: voices.flatMap((voice) => [`{{random_user_1}}: ${fill(voice.other, {}, gender)}`, `{{char}}: ${fill(voice.reply, {}, gender)}`]).join('\n'),
    starters: [...(v.starters[role] ?? []).map((s) => fill(s, {}, gender))],
    backstory: fill(pickSeeded(v.backstories, `${seed}|story`), {}, gender),
    likes: some(v.likes, `${seed}|likes`, 4).map((l) => fill(l, {}, gender)),
    dislikes: some(v.dislikes, `${seed}|dislikes`, 3).map((d) => fill(d, {}, gender)),
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

/**
 * One field written again, as the model's JSON reply (`buildFieldPrompt`). `attempt` counts the
 * taps on that field, so every tap brings a different take, as a new model call would.
 */
export function mockFieldReply(field: DraftField, character: FieldContext, attempt: number, genderParam?: CharacterGender): string {
  const v = voice('drafts', DRAFTS_VOICE);
  const name = character.name?.trim() || 'I';
  const role = character.role ?? 'friend';
  const tags = character.tags ?? [];
  const gender = genderParam ?? character.gender;
  // Their voices: the sparks behind their tags first, every other one after.
  const all = SPARKS.map((spark) => ({ ...v.voices[spark], style: SPARK_STYLE[spark] }));
  const voices = [...all.filter((item) => tags.includes(item.tag)), ...all.filter((item) => !tags.includes(item.tag))];
  const at = <T,>(list: readonly T[], skip?: (item: T) => boolean) => {
    const usable = skip ? list.filter((item) => !skip(item)) : list;
    return (usable.length > 0 ? usable : list)[attempt % (usable.length > 0 ? usable.length : list.length)];
  };
  switch (field) {
    case 'tagline':
      return JSON.stringify({ value: fill(at(voices.map((item) => item.tagline), (line) => line === character.tagline), {}, gender) });
    case 'bio': {
      const intro = name === 'I' ? '' : fill(v.introWithName, { name }, gender);
      const traits = tags.length > 0 ? fill(v.traits, { tags: tags.slice(0, 3).join(', ') }, gender) : '';
      const roleLine = fill(v.roleLines[role], {}, gender);
      const habit = fill(at(v.habits), {}, gender);
      return JSON.stringify({ value: `${intro}${roleLine}${traits} ${habit}` });
    }
    case 'look':
      return JSON.stringify({ value: fill(at(v.looks, (look) => look === character.look), {}, gender) });
    case 'opening':
      return JSON.stringify({ value: fill(at(v.openings, (line) => line === character.opening), {}, gender) });
    case 'quirk':
      return JSON.stringify({ value: fill(at(v.quirks, (line) => line === character.quirk), {}, gender) });
    case 'greeting':
      return JSON.stringify({ value: fill(at(voices.map((item) => item.greeting), (line) => line === character.greeting), {}, gender) });
    case 'greetings': {
      const lines = voices.map((item) => item.greeting).filter((line) => line !== character.greeting);
      const from = (attempt * MORE_GREETINGS_MAX) % lines.length;
      return JSON.stringify({ values: [...lines.slice(from), ...lines].slice(0, MORE_GREETINGS_MAX).map((g) => fill(g, {}, gender)) });
    }
    case 'dialog': {
      const pair = [at(voices), voices[(attempt + 1) % voices.length]];
      return JSON.stringify({
        dialog: pair.flatMap((item) => [
          { from: 'other', text: fill(item.other, {}, gender) },
          { from: 'char', text: fill(item.reply, {}, gender) },
        ]),
      });
    }
    case 'starters': {
      const pool = [...(v.starters[role] ?? []), ...v.moreStarters];
      const from = (attempt * 3) % pool.length;
      return JSON.stringify({ values: [...pool.slice(from), ...pool].slice(0, 3).map((s) => fill(s, {}, gender)) });
    }
    case 'backstory':
      return JSON.stringify({ value: fill(at(v.backstories, (story) => story === character.backstory), {}, gender) });
    case 'likes':
      return JSON.stringify({ values: some(v.likes, `${name}|${attempt}`, 4).map((l) => fill(l, {}, gender)) });
    case 'dislikes':
      return JSON.stringify({ values: some(v.dislikes, `${name}|${attempt}`, 3).map((d) => fill(d, {}, gender)) });
  }
}
