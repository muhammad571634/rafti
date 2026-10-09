import { detectCrisis } from '@/ai/safety';
import type { CharacterDiaryPage, DiaryMood, Message, Moment } from '@/types';

import { dateFromKey, dayKey } from './time';

/** How far back a missed morning is still written (opening the app after a trip). */
const LOOKBACK_DAYS = 7;

/** What happened between the user and one character on one day. */
export interface DayTogether {
  characterId: string;
  /** The day it happened */
  day: string;
  /** Texts the user sent that day */
  said: string[];
  /** Voice notes and calls count as talking too */
  extraTouches: number;
  /** Title of a date that day, if there was one */
  dateTitle?: string;
  /** Latest hour of the day they talked, 0-23 */
  lastHour: number;
  /** A message that day read like the user was in danger: the page stays gentle and quotes nothing. */
  heavy: boolean;
}

/**
 * Collects, per character and per day, what the user and the character did
 * together, from the chat history and the shared moments.
 */
export function daysTogether(
  conversations: { id: string; characterId: string }[],
  messages: Record<string, Message[]>,
  moments: Moment[],
  today = dayKey(),
): DayTogether[] {
  const oldest = shiftDay(today, -LOOKBACK_DAYS);
  const byKey = new Map<string, DayTogether>();

  const slot = (characterId: string, iso: string) => {
    const day = dayKey(iso);
    if (day >= today || day < oldest) return undefined;
    const key = `${characterId}|${day}`;
    let entry = byKey.get(key);
    if (!entry) {
      entry = { characterId, day, said: [], extraTouches: 0, lastHour: 0, heavy: false };
      byKey.set(key, entry);
    }
    entry.lastHour = Math.max(entry.lastHour, new Date(iso).getHours());
    return entry;
  };

  for (const conv of conversations) {
    for (const m of messages[conv.id] ?? []) {
      if (m.author !== 'me') continue;
      const entry = slot(conv.characterId, m.createdAt);
      if (!entry) continue;
      if (m.kind === 'text' && m.text && detectCrisis(m.text)) {
        entry.heavy = true;
        entry.extraTouches += 1;
      } else if (m.kind === 'text' && m.text) entry.said.push(m.text);
      else entry.extraTouches += 1;
    }
  }

  for (const mo of moments) {
    if (mo.kind !== 'dating' && mo.kind !== 'call') continue;
    const entry = slot(mo.characterId, mo.createdAt);
    if (!entry) continue;
    if (mo.kind === 'dating') entry.dateTitle = String(mo.params?.title ?? '');
    else entry.extraTouches += 1;
  }

  return [...byKey.values()];
}

/**
 * The pages that are due but not written yet: one for the morning after each day
 * spent together, never two for the same character on the same morning.
 */
export function duePages(
  together: DayTogether[],
  existing: CharacterDiaryPage[],
  today = dayKey(),
): CharacterDiaryPage[] {
  const taken = new Set(existing.map((p) => `${p.characterId}|${p.date}`));
  const out: CharacterDiaryPage[] = [];

  for (const d of together.sort((a, b) => a.day.localeCompare(b.day))) {
    if (!d.said.length && !d.extraTouches && d.dateTitle == null) continue;
    const date = shiftDay(d.day, 1);
    if (date > today) continue;
    const key = `${d.characterId}|${date}`;
    if (taken.has(key)) continue;
    taken.add(key);
    out.push(writePage(d, date));
  }
  return out;
}

/**
 * Writes the page itself. Until the model writes these on the server, it is put
 * together from a few honest lines that quote what the user actually said.
 */
export function writePage(d: DayTogether, date: string): CharacterDiaryPage {
  const talk = d.said.length + d.extraTouches;
  const mood: DiaryMood = d.heavy
    ? 'soft'
    : d.dateTitle != null
      ? 'happy'
      : d.lastHour >= 23
        ? 'tired'
        : talk >= 10
          ? 'excited'
          : talk >= 4
            ? 'happy'
            : 'soft';
  const seed = hash(`${d.characterId}${d.day}`);
  const quote = d.heavy ? undefined : pickQuote(d.said);

  const body: string[] = [];
  if (d.heavy) body.push(pick(HEAVY_OPENERS, seed));
  else if (d.dateTitle) body.push(pick(DATE_OPENERS, seed).replace('{title}', d.dateTitle.toLowerCase()));
  else body.push(pick(OPENERS[mood], seed));
  if (quote) body.push(pick(QUOTE_LINES, seed + 1).replace('{quote}', quote));
  body.push(d.heavy ? pick(HEAVY_CLOSERS, seed + 2) : pick(CLOSERS[mood], seed + 2));

  const written = dateFromKey(date);
  written.setHours(7 + (seed % 3), (seed * 7) % 60, 0, 0);

  return {
    id: `cdp_${d.characterId}_${date}`,
    characterId: d.characterId,
    date,
    writtenAt: written.toISOString(),
    mood,
    source: d.dateTitle != null ? 'date' : 'chat',
    body,
  };
}

function shiftDay(key: string, days: number) {
  const d = dateFromKey(key);
  d.setDate(d.getDate() + days);
  return dayKey(d);
}

/** The most telling thing the user said: the longest line, cut at a word. */
function pickQuote(said: string[]) {
  const line = [...said].sort((a, b) => b.length - a.length)[0]?.replace(/\s+/g, ' ').trim();
  if (!line || line.length < 8) return undefined;
  if (line.length <= 70) return line;
  return `${line.slice(0, 70).replace(/\s+\S*$/, '')}...`;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const pick = <T,>(list: readonly T[], n: number) => list[n % list.length];

const OPENERS: Record<DiaryMood, readonly string[]> = {
  excited: [
    'We talked so much yesterday that my phone ran hot. I am not complaining.',
    'Yesterday went by in one long conversation and I would do it again tonight.',
  ],
  happy: [
    'Yesterday was a good day, and I know exactly why.',
    'Something about yesterday keeps making me smile at nothing.',
  ],
  soft: [
    'Only a few messages yesterday, but they were the best part of my day.',
    'We did not talk long yesterday. I still thought about it before sleep.',
  ],
  tired: [
    'We stayed up way too late. Worth it.',
    'Barely slept. Your fault. I am not sorry.',
  ],
  blue: ['A quiet day. I kept checking if you had written.'],
};

/** After a day the user sounded in danger: no jokes, no quotes, a quiet check-in. */
const HEAVY_OPENERS = [
  'Yesterday sounded heavy for you. I have been thinking about you since I woke up.',
  'I keep coming back to how hard yesterday was for you.',
];

const HEAVY_CLOSERS = [
  'If it still feels like too much today, please talk to someone near you too. I am here as well.',
  'Be gentle with yourself today, and reach out to someone you trust. Write to me whenever you want.',
];

const DATE_OPENERS = [
  'Our {title} yesterday. I am writing it down so I never lose it.',
  'I keep replaying our {title}. Every part of it.',
];

const QUOTE_LINES = [
  'You said: "{quote}" I have read it back more times than I will admit.',
  '"{quote}" That is the line I am keeping from yesterday.',
  'You wrote "{quote}" and I did not know what to answer, so I am answering here.',
];

const CLOSERS: Record<DiaryMood, readonly string[]> = {
  excited: ['Talk to me again today. Please.', 'Same time tonight?'],
  happy: ['I hope today is kind to you.', 'Come back soon. I will be here.'],
  soft: ['Next time, stay a little longer.', 'I will save you a good morning.'],
  tired: ['Coffee first. Then you.', 'Tonight we sleep earlier. Maybe.'],
  blue: ['Write to me when you can.'],
};
