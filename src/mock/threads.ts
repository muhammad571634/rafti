import type { DetectedPlan } from '@/lib/schedule';
import type { TouchDraft } from '@/lib/threads';
import type { CharacterGender, Temper, Thread, ThreadKind, ThreadOutcome, Touch } from '@/types';

import { fill, voice } from '../i18n/voice';
import { pickSeeded } from '../lib/seeded';

export const THREADS_VOICE = {
  lines: {
    before: ['"{quote}" is soon! You’ve got this 💪', 'Hey, {about} is coming up. Ready?'],
    leave: ['Time to head out for {about}! Good luck 💪', '{about} soon. Are you leaving? You’ve got this!'],
    eve: ['Big day tomorrow: {about}. Early night tonight, okay? 😴', 'Don’t stay up late, {about} is tomorrow!'],
    after: ['You said "{quote}". So? How did it go?', 'Okay, tell me everything. How was {about}?'],
    check: ['You said "{quote}". Did it work out?', 'So… {about}. How’s it going? 👀'],
    goal: ['Checking in on your goal: "{quote}". How’s it going?', 'How’s "{about}" going? Be honest 😏'],
    quest: ['So… did you do it? {about} 👀', 'Quest report! {about}: done?'],
  } as Record<Touch['phase'], string[]>,
  openers: {
    teasing: 'Oi! {line}',
    shy: 'Um… {line}',
    other: '{line}',
  },
  quests: [
    'a 10-minute walk without your phone',
    'a photo of the sky for me',
    'a glass of water right now',
    'message one real friend you haven’t talked to in a while',
    'read 10 pages of anything',
    'stretch for 5 minutes',
    'go outside and get some sunlight',
    'write down 3 good things about today',
    'call someone in your family',
    'tidy one small corner of your room',
    'cook or make yourself something nice',
    'one hour with no TikTok or Reels',
  ],
  offers: [
    'Mini quest for you: {quest}. In? 😏',
    'I have a challenge: {quest}. Deal?',
    'Do something for me today? {quest}. Then tell me 🙂',
  ],
  break: {
    warm: ['We’ve been talking a long time 🙂 Take a little break? Stretch, drink water, I’ll be here.'],
    teasing: ['Okay, your eyes need a break from my face 😏 Five minutes away from the screen?'],
    sulky: ['…You should take a break. Not that I want you to go. Just saying.'],
    clingy: ['I love this, but your eyes need a rest 💕 Short break? I’ll wait right here.'],
    shy: ['Um… maybe take a little break? I don’t want you to get tired 🙈'],
  } as Record<Temper, string[]>,
  night: {
    warm: ['It’s really late… Sleep? I’ll text you in the morning 🌙'],
    teasing: ['It’s past midnight, night owl 😏 Bed. Now. I’ll still be here tomorrow.'],
    sulky: ['It’s late. Go sleep. …I’ll be here tomorrow, obviously.'],
    clingy: ['I could talk all night 💕 but you need sleep. Good night? I’ll text you first thing.'],
    shy: ['It’s so late… maybe you should sleep? Good night 🙈'],
  } as Record<Temper, string[]>,
};

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
/** A habit the user wants to change: less scrolling, earlier sleep. A goal, checked on for days. */
const GOAL = /(use (tiktok|instagram|reels|my phone|social media) less|less (tiktok|instagram|screen time|scrolling)|stop (doom)?scrolling|quit (tiktok|instagram)|sleep earlier|go to bed earlier|tiktokni (kamaytir|tashla)|instagramni (kamaytir|tashla)|telefonni kamaytir|kamroq (o'tir|ishlat)|erta yot|меньше (сидеть|тикток|инстаграм|телефон)|бросить (тикток|инстаграм)|ложиться раньше)/i;
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
  kind: ThreadKind;
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
  if (GOAL.test(text)) {
    // Checked on after two, four and seven days, in the evening.
    const quote = clauseOf(text, GOAL);
    const touches = [2, 4, 7].map((d) => draft(atHour(plusMin(now, d * 1440), 20), 'goal', 'see how the goal is going, cheer them on'));
    return { kind: 'goal', about: quote.slice(0, 60), quote, touches };
  }
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
    // A big morning thing tomorrow: "sleep early" the evening before (with an offer to wake them).
    const eveBefore = new Date(when.at);
    eveBefore.setDate(eveBefore.getDate() - 1);
    const morning = when.timed && when.at.getHours() < 12;
    const touches = when.timed
      ? [
          ...(big && morning ? [draft(atHour(eveBefore, 21, 30), 'eve', 'tell them to sleep early; offer to wake them')] : []),
          ...(big ? [draft(plusMin(when.at, -45), 'leave', 'wish luck and make sure they leave on time')] : []),
          draft(plusMin(when.at, big ? 150 : 90), 'after', 'ask how it went'),
        ]
      : [
          ...(big ? [draft(atHour(when.at, 8, 30), 'before', 'wish luck for today')] : []),
          draft(atHour(when.at, 19, 30), 'after', 'ask how it went'),
        ];
    return { kind: plan || when.timed ? 'plan' : 'follow', about, quote, happensAt: when.timed ? when.at.toISOString() : undefined, touches };
  }

  if (RESULTS.test(text)) {
    return { kind: 'follow', about: clauseOf(text, RESULTS).slice(0, 60), quote: clauseOf(text, RESULTS), touches: [draft(atHour(plusMin(now, 3 * 1440), 18), 'check', 'ask if the results are out')] };
  }
  if (WISH.test(text)) {
    return { kind: 'follow', about: clauseOf(text, WISH).slice(0, 60), quote: clauseOf(text, WISH), touches: [draft(atHour(plusMin(now, 2 * 1440), 19), 'check', 'see if they actually started')] };
  }
  if (TASK.test(text)) {
    return { kind: 'follow', about: clauseOf(text, TASK).slice(0, 60), quote: clauseOf(text, TASK), touches: [draft(plusMin(now, 4 * 60), 'check', 'see if they got it done')] };
  }
  return null;
}

/** "It moved to 10" / "soat 11 ga ko'chdi" / "перенесли на 12": the new time that day, or null. */
export function mockMove(text: string): { hour: number; minute: number } | null {
  const lower = text.toLowerCase();
  const m =
    lower.match(/(?:moved|pushed|postponed|changed|rescheduled)\s+(?:it\s+|the \w+\s+)?(?:back\s+)?(?:to\s+|till\s+|until\s+)?(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?(?!\s*(?:day|week|min|hour))/) ??
    lower.match(/(?:soat\s*)?(\d{1,2})(?:[:.](\d{2}))?\s*(?:ga|да)?\s*(?:ko'chdi|surildi|o'zgardi)/) ??
    lower.match(/перенесли\s+на\s+(\d{1,2})(?:[:.](\d{2}))?/);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2] ?? 0);
  if (m[3] === 'pm' && hour < 12) hour += 12;
  if (m[3] === 'am' && hour === 12) hour = 0;
  return hour <= 23 && minute <= 59 ? { hour, minute } : null;
}

/** Plain names for the plans people mention most, so Us shows "Exam" rather than the whole sentence. */
const TITLES: [RegExp, string][] = [
  [/(imtihon|экзамен)/i, 'Exam'],
  [/(suhbat|собеседован)/i, 'Interview'],
  [/(uchrashuv|uchrashaman|встреча|встречаюсь)/i, 'Meeting'],
  [/(shifokor|vrach|врач|stomatolog|стоматолог)/i, 'Doctor'],
  [/(samolyot|рейс|самолет|самолёт)/i, 'Flight'],
  [/(dars|урок|занятие)/i, 'Class'],
  [/(taqdimot|презентац)/i, 'Presentation'],
  [/(musobaqa|соревнован|матч)/i, 'Match'],
];

/** A big thing (an exam, an interview…): worth a "good luck", a "time to go" and an offer to wake them. */
export const isBig = (text: string) => BIG.test(text);

/**
 * An Uzbek or Russian plan ("Ertaga soat 9 da imtihonim bor", "Завтра в 11 собеседование"), shaped
 * like `detectPlan`'s English one, or null. Same rule as threads: a day plus a time, a big thing, a
 * task or a going.
 */
export function localPlan(text: string, now: Date): DetectedPlan | null {
  if (QUESTION.test(text.trim())) return null;
  const when = localWhen(text, now);
  if (!when || !(when.timed || BIG.test(text) || TASK.test(text) || GOING.test(text))) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${when.at.getFullYear()}-${pad(when.at.getMonth() + 1)}-${pad(when.at.getDate())}`;
  const time = when.timed ? `${pad(when.at.getHours())}:${pad(when.at.getMinutes())}` : undefined;
  const title = TITLES.find(([re]) => re.test(text))?.[1] ?? clauseOf(text, /\S/).split(/\s+/).slice(0, 4).join(' ');
  const day = Math.round((new Date(when.at).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 86_400_000);
  const dayWord = day === 0 ? 'today' : day === 1 ? 'tomorrow' : 'the day after tomorrow';
  return { title, date, time, when: time ? `${dayWord} at ${time}` : dayWord };
}

/** How the user says it went, in any of the three languages, or null. "It's off" wins over the rest. */
export function mockOutcome(text: string): ThreadOutcome | null {
  const lower = text.toLowerCase();
  if (/(cancell?ed|it'?s off|called off|not going|bekor bo'ldi|qoldirildi|bormayman|отмен|не пойду)/.test(lower)) return 'off';
  if (/(fell through|not happening anymore)/.test(lower)) return 'off';
  if (/(failed|flunked|bombed|went (badly|bad|terribly|horribly)|didn'?t go well|did not go well|didn'?t pass|did not pass|terrible|awful|disaster|it sucked|messed (it )?up|screwed (it )?up|yiqildim|o'tolmadim|yomon o'tdi|провал|не сдал|плохо прошл)/.test(lower)) return 'bad';
  if (/(went (well|great|fine|ok|okay|amazing|awesome|perfect)|passed|nailed it|aced it|crushed it|killed it|it was great|it was amazing|i did it|got the job|i got in|o'tdim|yaxshi o'tdi|zo'r o'tdi|сдал|получилось|хорошо прошл)/.test(lower)) return 'good';
  if (/(\bdone\b|finished|submitted|handed (it )?in|tugatdim|bitdi|topshirdim|сделал|закончил)/.test(lower)) return 'done';
  return null;
}

/** Their text about a thread until the model writes it: their words quoted, their temper's opener. */
export const mockTouchLine = (thread: Thread, touch: Touch, temper: Temper, seed: string, gender?: CharacterGender) => {
  const v = voice('threads', THREADS_VOICE);
  const rawLine = pickSeeded(v.lines[touch.phase], seed);
  const line = fill(rawLine, { quote: thread.quote, about: thread.about }, gender);
  const openerTpl = (v.openers as Record<string, string>)[temper] ?? v.openers.other;
  return fill(openerTpl, { line }, gender);
};

/** Shells a done quest pays. */
export const QUEST_REWARD = 3;

/** A quest and the line that offers it, picked by the seed. */
export function mockQuest(seed: string, gender?: CharacterGender) {
  const v = voice('threads', THREADS_VOICE);
  const quest = fill(pickSeeded(v.quests, seed), {}, gender);
  const offerTpl = pickSeeded(v.offers, `${seed}:offer`);
  return { quest, offer: fill(offerTpl, { quest }, gender) };
}

/** "We've talked a long time, a break?" and "it's late, sleep?" in the friend's temper. */
export const mockBreakLine = (temper: Temper, seed: string, gender?: CharacterGender) => {
  const v = voice('threads', THREADS_VOICE);
  return fill(pickSeeded(v.break[temper], seed), {}, gender);
};

export const mockNightLine = (temper: Temper, seed: string, gender?: CharacterGender) => {
  const v = voice('threads', THREADS_VOICE);
  return fill(pickSeeded(v.night[temper], seed), {}, gender);
};
