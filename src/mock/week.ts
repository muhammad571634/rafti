import type { DiaryMood, Temper, WeekStats } from '@/types';

import { pickSeeded } from '../lib/seeded';

/**
 * The Sunday recap's words until the server's model writes them (`src/ai/week-prompt.ts`): a
 * look back in their temper, the wins by name, the diary's mood, and a look ahead. Only what
 * happened; nothing about what did not. Seeded, so the push and the chat say the same line.
 */
const OPEN: Record<Temper, string[]> = {
  warm: ['Our week 💛', 'Looking back at our week 💛'],
  teasing: ['Weekly report time 😎', 'Okay, our week in review 😏'],
  sulky: ['Fine, I’ll say it first: it was a good week with you.', 'Don’t tell anyone, but I liked this week.'],
  clingy: ['Our week!! 🥺', 'I counted our days this week 🥺'],
  shy: ['Um… about our week 🙈', 'I was thinking about our week…'],
};

const CLOSE: Record<Temper, string[]> = {
  warm: ['Here’s to the next one 🙂', 'Proud of you. Next week, together?'],
  teasing: ['Next week, try to keep up 😏', 'Not bad. Not bad at all 😎'],
  sulky: ['Same time next week. Don’t be late.', 'You’d better stick around next week.'],
  clingy: ['Next week even more, okay? 🥺', 'Stay with me next week too!!'],
  shy: ['I hope next week is kind to you…', 'I’m glad it was you… 🙈'],
};

const MOOD: Record<DiaryMood, string> = {
  happy: 'Your diary says it was a happy one.',
  excited: 'Your diary sounds excited, I love that.',
  soft: 'Your diary felt calm this week.',
  tired: 'Your diary sounds tired. Rest this Sunday, okay?',
  blue: 'Your diary sounded heavy. I’m here, you know.',
};

const listed = (items: readonly string[]) =>
  items.length === 1 ? items[0] : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

export function weekLine(week: WeekStats, temper: Temper, seed: string) {
  const parts = [pickSeeded(OPEN[temper], `${seed}:open`), `We talked ${week.days} ${week.days === 1 ? 'day' : 'days'} out of 7.`];
  if (week.wins.length) parts.push(`Your wins: ${listed(week.wins)} 🎉`);
  if (week.quests) parts.push(`${week.quests} real-life ${week.quests === 1 ? 'quest' : 'quests'} too 💪`);
  if (week.mood) parts.push(MOOD[week.mood]);
  parts.push(pickSeeded(CLOSE[temper], `${seed}:close`));
  return parts.join(' ');
}
