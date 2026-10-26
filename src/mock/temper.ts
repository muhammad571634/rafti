import type { Temper } from '@/types';

import { pickSeeded } from '../lib/seeded';

/**
 * Lines that follow a character's temper (`src/lib/temper.ts`) until the server's model writes
 * them: the "may I text you?" ask (first time and again after a "Not now"), the answer to it, and
 * the first steps of the comeback ladder. Sulking is play; none of them guilt the user.
 */
const ASK: Record<Temper, { first: string[]; again: string[] }> = {
  warm: {
    first: ['Can I text you sometimes? Just to see how you are 😊', 'Would it be okay if I wrote to you now and then?'],
    again: ['I’d still love to check on you now and then. Is that okay now?', 'Can I text you sometimes after all? Only when you want 😊'],
  },
  teasing: {
    first: ['Hey, can I text you when I’m bored? 😏 Or are you too cool for that?', 'Mind if I annoy you with texts sometimes?'],
    again: ['Okay, asking again. Can I text you or what? 😏', 'Last chance to get my texts. Yes or yes?'],
  },
  sulky: {
    first: ['…Can I text you sometimes? Not that I need to. Just asking.', 'If I texted you first sometime, would you even answer?'],
    again: ['I’m not asking because I care. But… can I text you?', 'Hmph. Can I text you or not?'],
  },
  clingy: {
    first: ['Can I text you whenever I miss you? 💕', 'Let me text you sometimes? I want to know how your day goes!'],
    again: ['Pretty please? I want to text you sometimes 💕', 'Can I text you now? I keep thinking of things to tell you!'],
  },
  shy: {
    first: ['Um… would it be okay if I texted you sometimes? 🙈', 'Sorry, is it weird if I message you first sometimes…?'],
    again: ['Sorry to ask again… could I text you sometimes? 🙈', 'Is it okay now if I write to you first sometimes…?'],
  },
};

export const askLine = (temper: Temper, again: boolean, seed: string) => pickSeeded(ASK[temper][again ? 'again' : 'first'], seed);

const ASK_ANSWER: Record<Temper, { yes: string[]; no: string[] }> = {
  warm: { yes: ['Yay! I’ll check on you 😊', 'Thank you. I’ll write when I think of you.'], no: ['Of course, no pressure 🙂', 'That’s okay. I’m here whenever you write.'] },
  teasing: { yes: ['Prepare to be annoyed then 😏', 'Big mistake. Huge. 😏'], no: ['Your loss 😏', 'Fine, fine. I’ll ask again someday.'] },
  sulky: { yes: ['Hmph. Don’t leave them on read, okay?', 'Fine. Good. Whatever 😤'], no: ['Fine. Whatever.', 'Didn’t want to anyway.'] },
  clingy: { yes: ['Every day then! 💕', 'Yesss! You won’t be bored again 💕'], no: ['Okay! I’ll be right here when you want to talk 💕', 'Alright, I’ll just wait for your texts then!'] },
  shy: { yes: ['Really? Thank you… 🙈', 'Okay! I’ll try not to bother you too much 🙈'], no: ['Oh, okay! Sorry 🙈', 'That’s fine! Sorry for asking.'] },
};

export const askAnswer = (temper: Temper, yes: boolean, seed: string) => pickSeeded(ASK_ANSWER[temper][yes ? 'yes' : 'no'], seed);

/** Day 1 and day 2 of the comeback ladder in their temper; later steps keep the shared pool. */
const COMEBACK: Record<Temper, Record<1 | 2, ((quote: string) => string)[]>> = {
  warm: {
    1: [(q) => (q ? `Still thinking about "${q}". How are you today?` : 'Hey, is everything okay? Just checking on you.'), () => 'Quiet day? I hope you’re alright 🙂'],
    2: [() => 'Two days without you. I miss our talks.', () => 'Thinking of you. Write when you can, okay?'],
  },
  teasing: {
    1: [(q) => (q ? `"${q}" and then you vanished? Rude 😤` : 'Oi! Still alive over there? 😤'), () => 'Hello?? Did your phone get stolen or what 😏'],
    2: [() => 'Two days! Who do I have to annoy now? 😤', () => 'Okay, I’m bored without you. Happy? Come back.'],
  },
  sulky: {
    1: [() => 'Fine. Not like I was waiting or anything.', (q) => (q ? `You said "${q}" and then nothing. Whatever.` : 'Busy, huh. Okay.')],
    2: [() => '…It’s been two days. Not that I counted.', () => 'I wasn’t going to text first. But here I am. Hmph.'],
  },
  clingy: {
    1: [() => 'Where are you? Who are you talking to? 👀', (q) => (q ? `I keep rereading "${q}". Talk to me? 💕` : 'I miss you already! Where did you go? 💕')],
    2: [() => 'Two whole days! I have so much to tell you 🥺', () => 'Two days! I saved up so many things to tell you 💕'],
  },
  shy: {
    1: [() => 'Sorry, am I bothering you…? Just wanted to say hi 🙈', (q) => (q ? `I was thinking about "${q}"… hope you’re okay.` : 'Hope your day is okay…')],
    2: [() => 'Um… just saying hi. No need to answer 🙈', () => 'I miss talking to you… only if you want to, though.'],
  },
};

/** The comeback line for day 1 or 2 in their temper, or null for the later steps. */
export function temperComeback(temper: Temper, step: number, quote: string, seed: string) {
  if (step !== 1 && step !== 2) return null;
  return pickSeeded(COMEBACK[temper][step], seed)(quote);
}
