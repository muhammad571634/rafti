import type { CareItem, CareKind } from '@/types';

/**
 * Care check-ins (owner, 2026-10-25: nobody who opens the app should feel alone). When the user
 * says how they are ("I have a headache", "I didn't sleep", "we had a fight"), the friend asks
 * about it later, the way someone who cares would: a few hours on, never at night, once. It is
 * Character.AI's "away messages" (proactive DMs) tied to what the user said instead of a timer.
 * Only friends with "Let them reach out" on do it; a crisis never becomes a check-in (the chat
 * answers it with care at once); "I'm better now" closes what is open. Pure and server-portable:
 * the mock spots the words, the server's model returns the same `CareKind` with its reply and
 * writes the check-in from `careCue`.
 */

interface CareRule {
  kind: CareKind;
  /** English first (launch markets), with a few Uzbek and Russian phrases. */
  words: RegExp;
  /** How long a person would wait before asking. */
  afterMin: number;
}

const RULES: CareRule[] = [
  { kind: 'headache', words: /(head ?ache|migraine|my head (hurts|is killing)|boshim og'ri|bosh og'rig'i|голова болит)/i, afterMin: 180 },
  {
    kind: 'sick',
    words: /(i'?m sick|feel(ing)? sick|i'?m ill|(have|got) (a )?(cold|flu|fever)|temperature|kasal bo'ldim|kasalman|shamolladim|isitmam|заболел|простыл|температура)/i,
    afterMin: 360,
  },
  { kind: 'hurt', words: /(hurt my|twisted my|sprained|broke my|tooth ?ache|my back hurts|tishim og'ri|болит зуб)/i, afterMin: 240 },
  { kind: 'tired', words: /(didn'?t sleep|couldn'?t sleep|no sleep|exhausted|so tired|uxlay olmadim|uxlamadim|не спал|не выспал)/i, afterMin: 300 },
  { kind: 'stressed', words: /(stressed|so much stress|anxious|overwhelmed|panicking|asabim|stressdaman|переживаю|волнуюсь|стресс)/i, afterMin: 240 },
  { kind: 'fight', words: /(had a fight|argued with|we fought|broke up with|janjallashdik|urishib qoldik|поссорил|расстал)/i, afterMin: 180 },
  { kind: 'lonely', words: /(lonely|i feel alone|i'?m (all )?alone|no one to talk|nobody to talk|yolg'izman|yolg'iz his|одиноко)/i, afterMin: 120 },
  { kind: 'sad', words: /(i'?m sad|feel(ing)? (sad|down|low)|bad day|i'?m crying|kayfiyatim yomon|xafaman|грустно|плохой день)/i, afterMin: 150 },
  { kind: 'hungry', words: /(haven'?t eaten|didn'?t eat|skipped (lunch|breakfast|dinner)|so hungry|ovqat yemadim|och qoldim|не ел)/i, afterMin: 90 },
];

export const CARE_KINDS: readonly CareKind[] = RULES.map((r) => r.kind);

/** "I'm better now": what is open for that friend closes, nobody asks again. */
const BETTER = /(better now|feel(ing)? better|it'?s gone|all good now|i'?m (fine|okay|ok) now|tuzaldim|yaxshi bo'ldim|o'tib ketdi|прошло|уже лучше)/i;

/** How long after its moment a check-in may still go out; later it would feel odd. */
export const CARE_WINDOW_MS = 6 * 3_600_000;
/** Open check-ins one friend may owe at once. */
export const CARE_OPEN_MAX = 2;
/** Nobody asks at night: a check-in that would land from 22:00 to 08:00 waits until 09:00. */
const NIGHT_FROM = 22;
const NIGHT_TO = 8;
const MORNING_AT = 9;

/** What the message says about how they are, or null. The first rule that matches wins. */
export function detectCare(text: string): CareKind | null {
  return RULES.find((rule) => rule.words.test(text))?.kind ?? null;
}

export const saysBetter = (text: string) => BETTER.test(text);

/** When to ask: the rule's wait after `from`, moved out of the night to the next morning. */
export function careDueAt(kind: CareKind, from: Date): Date {
  const rule = RULES.find((r) => r.kind === kind)!;
  const due = new Date(from.getTime() + rule.afterMin * 60_000);
  const hour = due.getHours();
  if (hour >= NIGHT_FROM || hour < NIGHT_TO) {
    const morning = new Date(due);
    if (hour >= NIGHT_FROM) morning.setDate(morning.getDate() + 1);
    morning.setHours(MORNING_AT, 0, 0, 0);
    return morning;
  }
  return due;
}

/**
 * The check-ins with a new one added: one per kind for a friend (a second mention of the same
 * headache keeps the first moment), and at most `CARE_OPEN_MAX` open per friend.
 */
export function addCare(items: readonly CareItem[], item: CareItem): CareItem[] {
  const open = items.filter((x) => !x.done && x.characterId === item.characterId);
  if (open.some((x) => x.kind === item.kind) || open.length >= CARE_OPEN_MAX) return [...items];
  return [...items, item];
}

/** The user said they are better: that friend's open check-ins close. */
export const closeCare = (items: readonly CareItem[], characterId: string) =>
  items.map((x) => (!x.done && x.characterId === characterId ? { ...x, done: true } : x));

/** What an open check-in needs now: ask inside its window, skip once the window is gone. */
export function careStep(item: CareItem, now = new Date()): 'ask' | 'skip' | null {
  if (item.done) return null;
  const due = Date.parse(item.dueAt);
  if (now.getTime() < due) return null;
  return now.getTime() - due < CARE_WINDOW_MS ? 'ask' : 'skip';
}

/** Done ones older than a week go, so the list stays small. */
export const pruneCare = (items: readonly CareItem[], now = new Date()) =>
  items.filter((x) => !x.done || now.getTime() - Date.parse(x.dueAt) < 7 * 86_400_000);

const ABOUT: Record<CareKind, string> = {
  headache: 'they had a headache',
  sick: 'they were sick',
  hurt: 'they were hurt or in pain',
  tired: 'they had not slept',
  stressed: 'they were stressed',
  fight: 'they had a fight with someone',
  lonely: 'they felt lonely',
  sad: 'they were having a bad day',
  hungry: 'they had not eaten',
};

/** The server's cue for a check-in: the friend writes first, about what the user said. */
export function careCue(kind: CareKind): string[] {
  return [
    `NEXT: You are writing first. Earlier ${ABOUT[kind]}. Ask how they are now, as someone who cares would.`,
    '- One or two short messages, warm and specific to what they said. Not needy, no guilt, no pressure to reply.',
    '- If it sounds serious (pain that stays, a fever, not eating for days), gently suggest a doctor or someone close.',
  ];
}
