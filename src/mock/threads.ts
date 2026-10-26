import type { DetectedPlan } from '@/lib/schedule';
import type { TouchDraft } from '@/lib/threads';
import type { Temper, Thread, ThreadOutcome, Touch } from '@/types';

import { pickSeeded } from '../lib/seeded';

/**
 * Stands in for the model on the phone until the server runs (`src/ai/thread-prompt.ts` is the
 * real contract). It cannot understand a thousand topics, so it only notices the shape of a thing
 * with a future (a plan with a day or a time, something the user has to do, something they want to
 * start, results to wait for; English with some Uzbek and Russian) and keeps the user's own words.
 * Its texts quote those words instead of knowing what the topic is. The server's model replaces all
 * of it: what becomes a thread, when to write, and every word.
 */

/** Things that need a "time to go" and a "good luck", not only a "how did it go". */
const BIG = /(exam|test\b|interview|flight|doctor|dentist|surgery|presentation|audition|match|competition|imtihon|suhbat|samolyot|shifokor|vrach|taqdimot|musobaqa|экзамен|собеседован|рейс|врач|презентац|соревнован)/i;
const TASK = /(i (have|need|got) to|i must|i should|deadline|have to finish|qilishim kerak|tugatishim kerak|topshirishim kerak|yozishim kerak|надо|нужно|должен|должна)/i;
const WISH = /(i want to start|i'?m going to start|i'?ll start|i want to learn|boshlamoqchiman|o'rganmoqchiman|хочу начать|начну)/i;
const RESULTS = /(results? (come|will|are due)|waiting for (the )?results?|natija(lar)?.{0,20}chiqadi|результат)/i;
const GOING = /(boraman|kelaman|ketaman|uchrashuv|uchrashaman|пойду|поеду|встреча|встречаюсь)/i;
const QUESTION = /\?\s*$/;

/** Uzbek and Russian days and times, which `detectPlan` (English) does not read. */
function localWhen(text: string, now: Date): { at: Date; timed: boolean } | null {
  const lower = text.toLowerCase();
  const offset = /(indinga|послезавтра)/.test(lower) ? 2 : /(ertaga|завтра)/.test(lower) ? 1 : /(bugun|сегодня)/.test(lower) ? 0 : null;
  if (offset == null) return null;
  const time = lower.match(/soat\s*(\d{1,2})(?:[:.](\d{2}))?|(\d{1,2})[:.](\d{2})|в\s*(\d{1,2})(?:[:.](\d{2}))?\s*(?:час|утра|вечера)?/);
  const at = new Date(now);
  at.setDate(at.getDate() + offset);
  if (!time) {
    at.setHours(0, 0, 0, 0);
    return { at, timed: false };
  }
  const hour = Number(time[1] ?? time[3] ?? time[5]);
  const minute = Number(time[2] ?? time[4] ?? time[6] ?? 0);
  if (hour > 23 || minute > 59) return null;
  at.setHours(hour, minute, 0, 0);
  return { at, timed: true };
}

const clauseOf = (text: string, re: RegExp) =>
  (text.split(/(?<=[.!?…])\s+/).find((part) => re.test(part)) ?? text).trim().replace(/[.!…]+$/, '').slice(0, 160);

const atHour = (day: Date, hour: number, minute = 0) => {
  const d = new Date(day);
  d.setHours(hour, minute, 0, 0);
  return d;
};
const plusMin = (d: Date, min: number) => new Date(d.getTime() + min * 60_000);
const draft = (at: Date, phase: TouchDraft['phase'], why: string): TouchDraft => ({ at: at.toISOString(), phase, why });

export interface ThreadDraft {
  about: string;
  quote: string;
  happensAt?: string;
  touches: TouchDraft[];
}

/**
 * A thread from the user's message, or null. `plan` is what `detectPlan` found (the plan list
 * keeps it; the thread follows it up). Questions open nothing.
 */
export function mockThread(text: string, now: Date, plan: DetectedPlan | null): ThreadDraft | null {
  if (QUESTION.test(text.trim())) return null;
  const big = BIG.test(text);
  const quote = clauseOf(text, plan ? /./ : /\S/);

  let when: { at: Date; timed: boolean } | null = null;
  let about = '';
  if (plan) {
    const [y, m, d] = plan.date.split('-').map(Number);
    const at = new Date(y, m - 1, d);
    if (plan.time) at.setHours(Number(plan.time.slice(0, 2)), Number(plan.time.slice(3, 5)), 0, 0);
    when = { at, timed: !!plan.time };
    about = plan.title;
  } else {
    // "Bugun charchadim" (I'm tired today) has a day but no future: a time, a big thing, a task or a going makes it one.
    when = localWhen(text, now);
    if (when && !(when.timed || big || TASK.test(text) || GOING.test(text))) when = null;
    if (when) about = quote.slice(0, 60);
  }

  if (when) {
    const touches = when.timed
      ? [
          ...(big ? [draft(plusMin(when.at, -45), 'before', 'wish luck and make sure they leave on time')] : []),
          draft(plusMin(when.at, big ? 150 : 90), 'after', 'ask how it went'),
        ]
      : [
          ...(big ? [draft(atHour(when.at, 8, 30), 'before', 'wish luck for today')] : []),
          draft(atHour(when.at, 19, 30), 'after', 'ask how it went'),
        ];
    return { about, quote, happensAt: when.timed ? when.at.toISOString() : undefined, touches };
  }

  if (RESULTS.test(text)) {
    return { about: clauseOf(text, RESULTS).slice(0, 60), quote: clauseOf(text, RESULTS), touches: [draft(atHour(plusMin(now, 3 * 1440), 18), 'check', 'ask if the results are out')] };
  }
  if (WISH.test(text)) {
    return { about: clauseOf(text, WISH).slice(0, 60), quote: clauseOf(text, WISH), touches: [draft(atHour(plusMin(now, 2 * 1440), 19), 'check', 'see if they actually started')] };
  }
  if (TASK.test(text)) {
    return { about: clauseOf(text, TASK).slice(0, 60), quote: clauseOf(text, TASK), touches: [draft(plusMin(now, 4 * 60), 'check', 'see if they got it done')] };
  }
  return null;
}

/** How the user says it went, in any of the three languages, or null. "It's off" wins over the rest. */
export function mockOutcome(text: string): ThreadOutcome | null {
  const lower = text.toLowerCase();
  if (/(cancell?ed|it'?s off|called off|not going|postponed|bekor bo'ldi|qoldirildi|bormayman|отмен|не пойду|перенесли)/.test(lower)) return 'off';
  if (/(failed|went (badly|bad|terribly)|didn'?t go well|terrible|awful|yiqildim|o'tolmadim|yomon o'tdi|провал|не сдал|плохо прошл)/.test(lower)) return 'bad';
  if (/(went (well|great|fine|ok)|passed|nailed it|it was great|i did it|o'tdim|yaxshi o'tdi|zo'r o'tdi|сдал|получилось|хорошо прошл)/.test(lower)) return 'good';
  if (/(\bdone\b|finished|submitted|handed (it )?in|tugatdim|bitdi|topshirdim|сделал|закончил)/.test(lower)) return 'done';
  return null;
}

const LINES: Record<Touch['phase'], ((t: Thread) => string)[]> = {
  before: [(t) => `"${t.quote}" is soon! You’ve got this 💪`, (t) => `Hey, ${t.about} is coming up. Ready? Time to get going!`],
  after: [(t) => `You said "${t.quote}". So? How did it go?`, (t) => `Okay, tell me everything. How was ${t.about}?`],
  check: [(t) => `You said "${t.quote}". Did it work out?`, (t) => `So… ${t.about}. How’s it going? 👀`],
};

const OPENER: Partial<Record<Temper, string>> = { teasing: 'Oi! ', shy: 'Um… ' };

/** Their text about a thread until the model writes it: their words quoted, their temper's opener. */
export const mockTouchLine = (thread: Thread, touch: Touch, temper: Temper, seed: string) =>
  `${OPENER[temper] ?? ''}${pickSeeded(LINES[touch.phase], seed)(thread)}`;
