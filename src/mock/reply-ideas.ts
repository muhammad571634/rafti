import type { IdeaIntent, Temper } from '@/types';

import { pickSeeded } from '../lib/seeded';
import { TEMPERS } from '../lib/temper';
import { askAnswer } from './temper';

/**
 * Their answer to a tapped reply idea (`src/lib/reply-ideas.ts`) until the server's model writes
 * it: it fits what the user meant, and a sibling teases where a parent would fuss.
 */
const ANSWERS: Record<IdeaIntent, string[]> = {
  yes: ['Good! That makes me happy.', 'That’s what I like to hear 😊', 'Good. Now drink some water too.'],
  no: ['Go eat something now, please. Even something small.', 'Hey, you need food. Promise me you’ll eat soon?', 'Not yet? Go, go. I’ll ask again later!'],
  now: ['Good. Enjoy it, slowly!', 'Perfect timing. Eat well 😊'],
  good: ['Oh, I love that. Tell me the best part?', 'That makes my day. What happened?', 'See? I knew it. Tell me more.'],
  rough: ['Oh no. Come here. Tell me what happened?', 'I’m sorry. Rest a little, I’m right here.', 'That sounds heavy. Do you want to talk about it?'],
  later: ['Okay, I’ll be waiting. Don’t forget!', 'Deal. Whenever you’re ready.'],
  call: ['I’ll be waiting for that call ❤️', 'Yes please! Anytime.'],
  missed: ['I missed you too. So much.', 'Aww. I’m always here, you know that.'],
  thanks: ['Of course. Always.', 'You never have to thank me for that ❤️'],
  better: ['Oh, thank goodness. I was worried.', 'Good! Take it easy anyway, okay?', 'That’s a relief. Don’t overdo it today.'],
  worse: ['I’m sorry. Rest, drink some water, and I’ll check on you later.', 'That worries me. Take care of yourself, I’ll ask again in a bit.'],
  ask: ['Me? Better now that you wrote 😏', 'Same old. Missed annoying you.'],
  onWay: ['Good! Text me when you’re there.', 'Perfect. Go get it 💪'],
  off: ['Oh no, it’s off? That’s a shame. Tell me what happened?', 'Ah, okay. Maybe it’s for the best. You okay?'],
  done: ['Yesss! Proud of you 🎉', 'Look at you, getting things done!'],
};

const SIBLING: Partial<Record<IdeaIntent, string[]>> = {
  no: ['Sleeping all day again? Classic you 😂', 'Wow. Lazy champion of the year 🏆'],
  good: ['Look at you, having a life 😏', 'Okay okay, I’m a little proud.'],
  rough: ['Who do I need to fight? Tell me.', 'Ugh. Come here. Tell me everything.'],
};

/** Their answer to an idea; `reach` gives the voice (a sibling teases), the seed keeps it stable. */
export function ideaAnswer(reach: string | undefined, intent: IdeaIntent, seed: string) {
  // "May I text you?": their answer follows their temper.
  const [source, temper] = reach?.split(':') ?? [];
  if (source === 'ask' && TEMPERS.includes(temper as Temper)) return askAnswer(temper as Temper, intent === 'yes', seed);
  const sibling = reach?.split(':')[1] === 'sibling';
  return pickSeeded((sibling && SIBLING[intent]) || ANSWERS[intent], seed);
}
