import type { CharacterGender, DiaryMood, Temper, WeekStats } from '@/types';

import { fill, voice } from '../i18n/voice';
import { pickSeeded } from '../lib/seeded';

export const WEEK_VOICE = {
  open: {
    warm: ['Our week 💛', 'Looking back at our week 💛'],
    teasing: ['Weekly report time 😎', 'Okay, our week in review 😏'],
    sulky: ['Fine, I’ll say it first: it was a good week with you.', 'Don’t tell anyone, but I liked this week.'],
    clingy: ['Our week!! 🥺', 'I counted our days this week 🥺'],
    shy: ['Um… about our week 🙈', 'I was thinking about our week…'],
  } as Record<Temper, string[]>,
  close: {
    warm: ['Here’s to the next one 🙂', 'Proud of you. Next week, together?'],
    teasing: ['Next week, try to keep up 😏', 'Not bad. Not bad at all 😎'],
    sulky: ['Same time next week. Don’t be late.', 'You’d better stick around next week.'],
    clingy: ['Next week even more, okay? 🥺', 'Stay with me next week too!!'],
    shy: ['I hope next week is kind to you…', 'I’m glad it was you… 🙈'],
  } as Record<Temper, string[]>,
  mood: {
    happy: 'Your diary says it was a happy one.',
    excited: 'Your diary sounds excited, I love that.',
    soft: 'Your diary felt calm this week.',
    tired: 'Your diary sounds tired. Rest this Sunday, okay?',
    blue: 'Your diary sounded heavy. I’m here, you know.',
  } as Record<DiaryMood, string>,
  talkedDays: {
    one: 'We talked {days} day out of 7.',
    other: 'We talked {days} days out of 7.',
  },
  wins: 'Your wins: {wins} 🎉',
  multiWins: '{list} and {last}',
  quests: {
    one: '{quests} real-life quest too 💪',
    other: '{quests} real-life quests too 💪',
  },
};

export function weekLine(week: WeekStats, temper: Temper, seed: string, gender: CharacterGender | undefined) {
  const v = voice('week', WEEK_VOICE);
  const listed = (items: readonly string[]) =>
    items.length === 1 ? items[0] : fill(v.multiWins, { list: items.slice(0, -1).join(', '), last: items[items.length - 1] });

  const openStr = fill(pickSeeded(v.open[temper], `${seed}:open`), {}, gender);
  const talkedStr = fill(week.days === 1 ? v.talkedDays.one : v.talkedDays.other, { days: week.days }, gender);
  const parts = [openStr, talkedStr];

  if (week.wins.length) parts.push(fill(v.wins, { wins: listed(week.wins) }, gender));
  if (week.quests) parts.push(fill(week.quests === 1 ? v.quests.one : v.quests.other, { quests: week.quests }, gender));
  if (week.mood) parts.push(fill(v.mood[week.mood], {}, gender));
  parts.push(fill(pickSeeded(v.close[temper], `${seed}:close`), {}, gender));
  return parts.join(' ');
}
