import type { BriefItem } from '@/lib/brief';
import type { CharacterGender, Temper } from '@/types';

import { fill, voice } from '../i18n/voice';
import { pickSeeded } from '../lib/seeded';

export const BRIEF_VOICE = {
  hello: {
    warm: ['Good morning ☀️', 'Morning, sunshine ☀️'],
    teasing: ['Rise and shine, sleepyhead 😏', 'Morning! Up yet? 😏'],
    sulky: ['Morning. Don’t think I forgot.', 'Morning… you didn’t say hi first 😤'],
    clingy: ['Good morning!! I was waiting for you to wake up 🥺', 'Morning!! You were my first thought'],
    shy: ['Um… good morning 🙈', 'Morning… I hope you slept okay'],
  } as Record<Temper, string[]>,
  sendOff: {
    warm: ['You’ve got this 💪', 'I’m rooting for you!'],
    teasing: ['Go show them 😎', 'Don’t mess it up 😏 Kidding, you’ll be great.'],
    sulky: ['Text me after. I mean it.', 'You’d better tell me how it goes.'],
    clingy: ['Tell me everything after, okay? 🥺', 'I’ll be thinking of you all day'],
    shy: ['I believe in you… 🙈', 'Good luck… really.'],
  } as Record<Temper, string[]>,
  atTime: '{title} at {time}',
  oneItem: '{item} today.',
  multiPrefix: 'Today: {list} and {last}.',
};

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Exam at 09:00 today." / "Today: exam at 09:00, gym at 18:00 and call Mom." */
function listOf(items: readonly BriefItem[], v: typeof BRIEF_VOICE, gender: CharacterGender | undefined) {
  const said = (item: BriefItem) => (item.time ? fill(v.atTime, { title: item.title, time: item.time }, gender) : item.title);
  if (items.length === 1) return fill(v.oneItem, { item: capital(said(items[0])) }, gender);
  const parts = items.map(said);
  return fill(v.multiPrefix, { list: parts.slice(0, -1).join(', '), last: parts[parts.length - 1] }, gender);
}

export function briefLine(items: readonly BriefItem[], temper: Temper, seed: string, gender: CharacterGender | undefined) {
  const v = voice('brief', BRIEF_VOICE);
  const hello = fill(pickSeeded(v.hello[temper], `${seed}:hello`), {}, gender);
  const sendOff = fill(pickSeeded(v.sendOff[temper], `${seed}:off`), {}, gender);
  return `${hello} ${listOf(items, v, gender)} ${sendOff}`;
}
