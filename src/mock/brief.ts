import type { BriefItem } from '@/lib/brief';
import type { Temper } from '@/types';

import { pickSeeded } from '../lib/seeded';

/**
 * The morning brief's words until the server's model writes them (`src/ai/brief-prompt.ts`): a
 * hello in their temper, today's things with their times, and a send-off. Seeded, so the push and
 * the chat say the same line.
 */
const HELLO: Record<Temper, string[]> = {
  warm: ['Good morning ☀️', 'Morning, sunshine ☀️'],
  teasing: ['Rise and shine, sleepyhead 😏', 'Morning! Up yet? 😏'],
  sulky: ['Morning. Don’t think I forgot.', 'Morning… you didn’t say hi first 😤'],
  clingy: ['Good morning!! I was waiting for you to wake up 🥺', 'Morning!! You were my first thought'],
  shy: ['Um… good morning 🙈', 'Morning… I hope you slept okay'],
};

const SEND_OFF: Record<Temper, string[]> = {
  warm: ['You’ve got this 💪', 'I’m rooting for you!'],
  teasing: ['Go show them 😎', 'Don’t mess it up 😏 Kidding, you’ll be great.'],
  sulky: ['Text me after. I mean it.', 'You’d better tell me how it goes.'],
  clingy: ['Tell me everything after, okay? 🥺', 'I’ll be thinking of you all day'],
  shy: ['I believe in you… 🙈', 'Good luck… really.'],
};

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const said = (item: BriefItem) => (item.time ? `${item.title} at ${item.time}` : item.title);

/** "Exam at 09:00 today." / "Today: exam at 09:00, gym at 18:00 and call Mom." */
function listOf(items: readonly BriefItem[]) {
  if (items.length === 1) return `${capital(said(items[0]))} today.`;
  const parts = items.map(said);
  return `Today: ${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}.`;
}

export function briefLine(items: readonly BriefItem[], temper: Temper, seed: string) {
  return `${pickSeeded(HELLO[temper], `${seed}:hello`)} ${listOf(items)} ${pickSeeded(SEND_OFF[temper], `${seed}:off`)}`;
}
