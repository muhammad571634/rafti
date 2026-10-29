import type { CharacterGender, IdeaIntent, Temper } from '@/types';

import { fill, voice } from '../i18n/voice';
import { pickSeeded } from '../lib/seeded';
import { TEMPERS } from '../lib/temper';
import { askAnswer } from './temper';

export const IDEAS_VOICE = {
  answers: {
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
    wake: ['Of course! I set it. I’ll wake you, sleep well 😴', 'Done, I’ll be your alarm. Now sleep!'],
    lead30: ['Got it, I’ll text you 30 minutes before 📌', 'Deal. Half an hour before, I’ll be there.'],
    lead60: ['Okay, an hour before it is 📌', 'Got it: I’ll text you an hour before.'],
  } as Record<IdeaIntent, string[]>,

  sibling: {
    no: ['Sleeping all day again? Classic you 😂', 'Wow. Lazy champion of the year 🏆'],
    good: ['Look at you, having a life 😏', 'Okay okay, I’m a little proud.'],
    rough: ['Who do I need to fight? Tell me.', 'Ugh. Come here. Tell me everything.'],
  } as Partial<Record<IdeaIntent, string[]>>,

  special: {
    'brief:rough': ['That just means it matters to you. Breathe, you’re ready.', 'Nervous is normal. You prepared for this, I know you did.'],
    'brief:good': ['Morning! Now go have a good one ☀️', 'Hehe, morning. Eat breakfast, okay?'],
    'day:good': ['Yay, I love good days. What was the best bit?', 'Good! I wrote it down in your diary 📖 What made it good?'],
    'day:rough': ['Come here. Long days are heavy. Rest now, I’ll keep it in your diary 📖', 'I’m sorry. Do you want to tell me, or just rest?'],
    'day:later': ['Okay. I’m here when you want to talk 🙂', 'Deal. I’ll be waiting.'],
    'week:good': ['It really was. I liked every day of it 🙂', 'Same here. You made it a good one.'],
    'week:rough': ['Then I’m glad it’s over. Tell me the worst part, and then we leave it behind?', 'Rough weeks end. This one did. I’m right here for the next.'],
    'week:thanks': ['To next week 🥂', 'Deal. Same us, new week 💪'],
    'quest:yes': ['Yesss. Report back later 😏', 'Deal! Tell me how it went.'],
    'quest:no': ['Okay, no pressure. Another day 🙂', 'Fair. Maybe tomorrow!'],
    'lead:off': ['Okay, no reminder. You’ve got this.', 'Alright, I trust you 😌'],
    'pause:break:yes': ['Good. Stretch, drink some water, I’ll be right here 🙂', 'Go! Look out the window for a bit. I’ll wait.'],
    'pause:break:later': ['Okay, five more. Then a break, deal? 😏', 'Fine, five minutes. I’m counting 👀'],
    'pause:night:yes': ['Sweet dreams 🌙 I’ll text you in the morning.', 'Good night. Phone away now, okay? 😴'],
    'pause:night:rough': ['Then I’ll stay with you a bit. What’s keeping you up?', 'Okay, I’m here. Want to talk, or should I tell you something calm?'],
    'thread:goal:good': ['Look at you! I’m proud 💪', 'See? You can do it. Keep going!'],
    'thread:goal:rough': ['That’s okay. One slip isn’t the end. Tomorrow’s new.', 'It happens. Be kind to yourself, we try again.'],
  } as Record<string, string[]>,
};

/**
 * Their answer to a tapped reply idea (`src/lib/reply-ideas.ts`) until the server's model writes
 * it: it fits what the user meant, and a sibling teases where a parent would fuss.
 */
export function ideaAnswer(reach: string | undefined, intent: IdeaIntent, seed: string, gender?: CharacterGender) {
  // "May I text you?": their answer follows their temper.
  const [source, temper] = reach?.split(':') ?? [];
  if (source === 'ask' && TEMPERS.includes(temper as Temper)) return askAnswer(temper as Temper, intent === 'yes', seed, gender);
  const v = voice('ideas', IDEAS_VOICE);
  const [, second] = reach?.split(':') ?? [];
  const special = v.special[`${source}:${second}:${intent}`] ?? v.special[`${reach}:${intent}`] ?? v.special[`${source}:${intent}`];
  if (special) return fill(pickSeeded(special, seed), {}, gender);
  const sibling = reach?.split(':')[1] === 'sibling';
  const pool = (sibling && v.sibling[intent]) || v.answers[intent];
  return fill(pickSeeded(pool, seed), {}, gender);
}
