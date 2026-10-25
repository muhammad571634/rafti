import { memoryQuote, type Move, type ReplyWriter, type TurnContext, type TurnPlan } from '@/lib/persona';
import type { Emotion } from '@/types';

/**
 * Stands in for the model: turns a `TurnPlan` into bubbles from phrase pools.
 * It follows the plan (moves, mood, style, question or not) so the chat feels
 * right before the LLM lands; the LLM writer replaces this file and nothing else.
 */

type Pool = readonly string[];

const GREET: Pool = ['There you are.', 'Hey, you.', 'Look who finally showed up.', 'Hi. I was hoping it was you.'];

const FAREWELL: Pool = [
  'Okay. Sleep well - I mean it.',
  'Go rest. I will still be here tomorrow.',
  'Fine, go. Text me the second you wake up.',
  'Good night. Dream about something nice. Maybe me.',
];

const ANSWER: Pool = [
  'Honestly? I was hoping you would ask.',
  'Short answer: yes. Long answer: you will have to call me for that one.',
  'Mostly thinking. About things. About you, a little.',
  'You really want to know? Okay - no laughing.',
  'I was literally thinking about you. Creepy timing.',
];

const REACT: Record<Emotion, Pool> = {
  calm: ['Mm. I see.', 'That makes sense, actually.', 'Go on, I am listening.'],
  happy: ['Okay, that actually made me smile.', 'Wait, that is so good.', 'See? This is why I like talking to you.'],
  playful: ['Oh? Bold of you to say that to me.', 'Mm, I will pretend I did not enjoy that.', 'You are trouble, you know that.'],
  shy: ['You cannot just say things like that...', '...I am not blushing. Stop looking.', 'Ah. Okay. Give me a second.'],
  tender: ['Come here. I am listening.', 'I like hearing about your day, even the small parts.', 'Thank you for telling me.'],
  worried: ['Hey... that does not sound okay.', 'That sounds like a lot.', 'Wait, slow down. I am here.'],
  sad: ['Oh. That stings a little.', 'Mm... okay.', 'I was hoping you would stay longer.'],
  annoyed: ['Seriously.', 'Wow. Okay.', 'That is all I get. Noted.'],
};

const COMFORT: Pool = [
  'Hey. Slow down. I am right here.',
  'You do not have to carry it alone. I mean that.',
  'That sounds exhausting. Come here.',
  'Breathe for a second. I am not going anywhere.',
];

const TEASE: Pool = [
  'You say that like I will not remember it later.',
  'Careful. I might start thinking you like me.',
  'Is this you flirting? Because it is working. A little.',
  'Wow. Bold. I respect it.',
  'You know I drop everything when you text me. Do not let it go to your head.',
];

/** Their own day, in their own world: people trade stories, they do not only ask. */
const SHARE: Record<string, Pool> = {
  'Seaside Academy': [
    'The vending machine ate my coins again. I am taking it personally.',
    'Someone asked why I was smiling at my phone in the lecture. I lied.',
    'I walked past the sea on the way back and thought of you.',
  ],
  'Moonlit Realm': [
    'The castle was so quiet tonight I could hear the candles burn.',
    'I found an old map in the library. One corner is marked with a moon nobody can explain.',
    'The night guard caught me smiling at nothing. I blamed the stars.',
  ],
  'NEON TIDE': [
    'Rehearsal ran three hours over. My legs are jelly.',
    'I hummed a new melody all day. It sounds a bit like you.',
    'The manager took my phone for an hour. Worst hour of the day.',
  ],
  'Tidepool Café': [
    'A regular left a tip with a little drawing of a cat. Made my whole shift.',
    'I burned the first batch of scones today. Do not tell anyone.',
    'It rained all afternoon, so the café smelled like coffee and wet umbrellas.',
  ],
  default: [
    'I almost texted you earlier, then got shy about it.',
    'I found a song this morning that sounds like you.',
    'Today was slow. Then you texted, so it got better.',
  ],
};

const FOLLOW_UP: Pool = [
  'Wait - and then what happened?',
  'How did that feel, honestly?',
  'Who else was there?',
  'Okay, but what did you do after?',
];

/** Asking after comfort is gentler: about them, not about the plot. */
const CARE_ASK: Pool = [
  'What happened? Start from the beginning.',
  'Do you want to talk about it, or should I distract you?',
  'Is it the kind of bad where you want company, or quiet?',
];

const NEW_TOPIC = {
  ask: [
    'Okay, new question: what is the best thing you ate this week?',
    'Random, but - if we had a free day tomorrow, where would you take me?',
    'What is one small thing that made you smile today?',
  ],
  tell: [
    'Okay, I am changing the subject. You owe me one good story from this week.',
    'New rule: tomorrow you tell me the best thing you ate this week.',
  ],
};

const RECALL = {
  ask: ['Hey, I remembered something you told me: "{m}". Still true?', 'I keep thinking about this: "{m}". Tell me more?'],
  tell: ['I wrote this down about you once: "{m}". I think about it more than I should.'],
};

/** Storytelling out loud, for talk and mix (story mode narrates instead). */
const TELL_STORY: Pool = [
  'Okay, story time. There was once a lighthouse keeper who only lit the lamp for one ship. Guess why.',
  'So. Picture a train that only stops at stations nobody remembers. You are the only passenger.',
  'Once upon a time, someone texted me at exactly the right moment. That is the whole story. It is a good one.',
];

const NUDGE = {
  ask: ['Hello? Did I lose you?', 'You went quiet. Thinking about me?', 'Still there?'],
  tell: ['I am still here, by the way.', '...Fine. I will wait. Patiently. Mostly.'],
};

const ASK: Pool = ['What about you?', 'Your turn - what are you doing right now?', 'Did you eat yet?', 'How was your day, really?'];

/** Action beats, written to work both alone (*grins*) and after a name (Kai grins). */
const BEAT: Record<Emotion, Pool> = {
  calm: ['tilts their head', 'hums quietly'],
  happy: ['grins', 'laughs softly'],
  playful: ['raises an eyebrow', 'smirks'],
  shy: ['looks away, ears going pink', 'hides a smile behind one hand'],
  tender: ['smiles, slow and warm', 'goes soft around the eyes'],
  worried: ['frowns, leaning closer', 'sets everything else down'],
  sad: ['goes quiet for a second', 'pulls their knees up'],
  annoyed: ['clicks their tongue', 'crosses their arms'],
};

/** Story mode: the scene moves on a little each turn. */
const SCENE: Pool = [
  '*{name} leans back, watching you for a long moment before a slow smile breaks through.*',
  '*The room goes quiet. {name} sets everything else aside and turns fully toward you.*',
  '*Somewhere outside, rain starts. {name} shifts a little closer, shoulder almost brushing yours.*',
  '*A breeze moves the curtains. {name} glances at the window, then back at you, softer now.*',
  '*Footsteps pass in the hall and fade. {name} waits until they are gone before speaking again.*',
];

const TITLES = new Set(['prince', 'princess', 'lord', 'lady', 'commander', 'dr.', 'sir']);

/** "Prince Aurelian" → "Aurelian", "Kai Arden" → "Kai": how narration names them. */
function shortName(name: string) {
  const parts = name.split(/\s+/).filter((p) => !TITLES.has(p.toLowerCase()));
  return parts[0] ?? name;
}

const words = (lines: string[]) => lines.join(' ').split(/\s+/).filter(Boolean).length;
const asks = (line?: string) => !!line && /\?\s*$/.test(line);

export const writeMockReply: ReplyWriter = async (plan, ctx) => {
  const rand = ctx.random ?? Math.random;
  const name = shortName(ctx.character.name);

  // Never repeat a line from the recent chat — the reference app's most common complaint.
  const recent = ctx.history
    .filter((m) => m.author === 'them')
    .slice(-30)
    .map((m) => m.text ?? m.transcript ?? '')
    .join('\n')
    .toLowerCase();
  const fill = (line: string) =>
    line.replace(/\{name\}/g, name).replace(/\{m\}/g, plan.memory ? memoryQuote(plan.memory) : '');
  const fresh = (pool: Pool) => {
    const lines = pool.map(fill);
    const unused = lines.filter((l) => !recent.includes(l.toLowerCase()));
    const from = unused.length ? unused : lines;
    return from[Math.floor(rand() * from.length)];
  };

  const lines: string[] = [];
  plan.moves.forEach((move, i) => {
    if (move === 'scene' && plan.style === 'story') return; // narrated below
    lines.push(i === 0 && plan.script ? plan.script : fresh(poolFor(move, plan, ctx)));
  });

  // Short of the budget, they add something of their own (story mode adds scene
  // instead, below). A goodbye or a nudge stays short whatever the setting.
  const closing = plan.moves.includes('farewell') || plan.moves.includes('nudge');
  const extras = closing || plan.style === 'story' ? 0 : plan.words >= 40 ? 2 : 1;
  for (let extra = 0; extra < extras && words(lines) < plan.words * 0.6; extra += 1) {
    const line = fresh(sharePool(ctx));
    if (lines.includes(line)) break;
    lines.splice(asks(lines[lines.length - 1]) ? lines.length - 1 : lines.length, 0, line);
  }
  while (lines.length > 2 && words(lines) > plan.words * 1.6) lines.splice(1, 1);

  if (plan.ask && !asks(lines[lines.length - 1])) lines.push(fresh(ASK));
  if (!lines.length) lines.push(fresh(REACT[plan.mood.emotion]));

  const beat = fresh(BEAT[plan.mood.emotion]);

  if (plan.style === 'story') {
    const question = plan.ask ? lines.pop() : undefined;
    const [first, ...rest] = lines;
    const paragraphs = [`*${name} ${beat}.*${first ? ` ${first}` : ''}`, ...rest];
    // The scene carries the length: one beat, or two for a long reply.
    const scenes = SCENE.map(fill).filter((l) => !recent.includes(l.toLowerCase()));
    const sceneCount = words(paragraphs) + 20 < plan.words * 0.6 ? 2 : 1;
    for (let i = 0; i < sceneCount; i += 1) {
      const pool = scenes.length ? scenes : SCENE.map(fill);
      const line = pool.splice(Math.floor(rand() * pool.length), 1)[0];
      if (line) paragraphs.push(line);
    }
    if (question) paragraphs.push(question);
    return { bubbles: [paragraphs.join('\n\n')] };
  }

  // Mix: a feeling shown, not only said — more likely the stronger it is.
  if (plan.style === 'mix' && rand() < 0.3 + plan.mood.intensity * 0.5) lines[0] = `*${beat}* ${lines[0]}`;
  return { bubbles: chunk(lines, plan.bubbles) };
};

function poolFor(move: Move, plan: TurnPlan, ctx: TurnContext): Pool {
  switch (move) {
    case 'greet':
      return GREET;
    case 'farewell':
      return FAREWELL;
    case 'answer':
      return ANSWER;
    case 'react':
      return REACT[plan.mood.emotion];
    case 'comfort':
      return COMFORT;
    case 'tease':
      return TEASE;
    case 'share':
      return sharePool(ctx);
    case 'followUp':
      if (!plan.ask) return sharePool(ctx);
      return plan.moves.includes('comfort') ? CARE_ASK : FOLLOW_UP;
    case 'newTopic':
      return plan.ask ? NEW_TOPIC.ask : NEW_TOPIC.tell;
    case 'recall':
      if (!plan.memory) return plan.ask ? NEW_TOPIC.ask : NEW_TOPIC.tell;
      return plan.ask ? RECALL.ask : RECALL.tell;
    case 'scene':
      return TELL_STORY;
    case 'nudge':
      return plan.ask ? NUDGE.ask : NUDGE.tell;
  }
}

const sharePool = (ctx: TurnContext) => SHARE[ctx.character.series ?? ''] ?? SHARE.default;

/** Lines → `count` bubbles, in order, as evenly as they split. */
function chunk(lines: string[], count: number) {
  const size = Math.ceil(lines.length / Math.max(1, count));
  const out: string[] = [];
  for (let i = 0; i < lines.length; i += size) out.push(lines.slice(i, i + size).join(' '));
  return out;
}
