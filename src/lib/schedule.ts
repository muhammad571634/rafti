import { dayKeyFromToday } from '@/mock/time';

export interface DetectedPlan {
  title: string;
  /** Day key the plan falls on */
  date: string;
  /** The time phrase as the user said it, e.g. "tomorrow", "on Friday" */
  when: string;
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** Only first-person plans count — "what are you doing tomorrow?" is not a schedule. */
const LEAD_IN =
  /^\s*(?:and\s+|so\s+|well\s+)?(?:i have|i've got|i got|i'm going to|i am going to|i'm going|i am going|i'll|i will|i need to|i have to|i must|we have|we're going to|we're going|my)\b\s*/i;

const FILLER_START = /^(?:to|a|an|the|my|our)\s+/i;
const FILLER_END = /\s+(?:is|are|at|on|in|will be|coming up)$/i;

function findWhen(lower: string, now: Date): { offset: number; phrase: string; when: string } | null {
  let m = lower.match(/\bday after tomorrow\b/);
  if (m) return { offset: 2, phrase: m[0], when: 'the day after tomorrow' };

  m = lower.match(/\b(tonight|today|this evening)\b/);
  if (m) return { offset: 0, phrase: m[0], when: m[1] };

  m = lower.match(/\b(tomorrow|tmrw|tmr)\b/);
  if (m) return { offset: 1, phrase: m[0], when: 'tomorrow' };

  m = lower.match(/\bnext week\b/);
  if (m) return { offset: 7, phrase: m[0], when: 'next week' };

  m = lower.match(/\bin (\d{1,2}) days?\b/);
  if (m) return { offset: Number(m[1]), phrase: m[0], when: m[0] };

  m = lower.match(/\b(?:on |this |next )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (m) {
    const target = WEEKDAYS.indexOf(m[1]);
    let diff = (target - now.getDay() + 7) % 7;
    if (diff === 0) diff = 7;
    const day = m[1][0].toUpperCase() + m[1].slice(1);
    return { offset: diff, phrase: m[0], when: `on ${day}` };
  }

  return null;
}

/**
 * "I have an exam tomorrow" -> { title: "Exam", when: "tomorrow" }.
 * Stands in for the model's structured extraction of the reference app's
 * "Smart Auto Schedule Creation".
 */
export function detectPlan(text: string, now = new Date()): DetectedPlan | null {
  const sentence = text.trim();
  if (!LEAD_IN.test(sentence)) return null;

  const found = findWhen(sentence.toLowerCase(), now);
  if (!found) return null;

  let title = sentence
    .replace(new RegExp(found.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), ' ')
    .replace(LEAD_IN, '')
    .replace(/[!?.,~]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  for (let i = 0; i < 3; i += 1) {
    title = title.replace(FILLER_START, '').replace(FILLER_END, '').trim();
  }

  if (title.length < 3) return null;
  if (title.length > 40) title = `${title.slice(0, 39).trim()}…`;

  return {
    title: title[0].toUpperCase() + title.slice(1),
    date: dayKeyFromToday(found.offset),
    when: found.when,
  };
}
