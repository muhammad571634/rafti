/**
 * The morning chain after a wake-up alarm (approved prototype
 * https://claude.ai/artifact/YKTHLBfcC9sTHnK6CoR8UC): a real reply turns the alarm off, then the
 * friend helps with what the user said: a reminder before they leave, a question when there is
 * no time, a 5-minute check when they are too sleepy. Pure and English-only, like the mock AI;
 * with the server the model reads the reply and these steps stay the same.
 */

/** Replies inside this window after the ring are free and can turn the alarm off. */
export const WAKE_WINDOW_MIN = 30;
/** A real reply, not "k": at least this many words. */
export const MIN_WAKE_WORDS = 3;
export const MAX_SNOOZES = 3;
/** The reminder comes this long before the time the user named. */
export const REMIND_LEAD_MIN = 20;
export const SLEEPY_CHECK_MIN = 5;

export type MorningRead =
  | { kind: 'time'; activity: string | null; time: string }
  | { kind: 'activity'; activity: string }
  | { kind: 'sleepy' }
  | { kind: 'other' };

const pad = (n: number) => String(n).padStart(2, '0');
const hm = (h: number, m: number) => `${pad(h)}:${pad(m)}`;
const minutesOf = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

/** Enough words (letters or digits) to count as a real reply. */
export function countsAsWakeReply(text: string) {
  return (text.match(/[\p{L}\p{N}]+/gu) ?? []).length >= MIN_WAKE_WORDS;
}

/**
 * A time said in the morning, as today's "HH:MM": 9.30, 9:30, 9am, at 9, half past 9,
 * quarter to 10, in 30 min, in an hour. Without am/pm the nearest time still ahead today wins
 * ("at 5" at 07:00 is 17:00, "9.30" is 09:30).
 */
export function readMorningTime(text: string, now: Date): string | null {
  const lower = text.toLowerCase();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  let m = lower.match(/\bin\s+(an?|one|\d{1,3})\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes)\b/);
  if (m) {
    const n = /^\d+$/.test(m[1]) ? Number(m[1]) : 1;
    const add = m[2].startsWith('h') ? n * 60 : n;
    const t = nowMin + add;
    return t < 24 * 60 ? hm(Math.floor(t / 60), t % 60) : null;
  }

  let hour: number | null = null;
  let minute = 0;
  let period: 'am' | 'pm' | null = null;

  if ((m = lower.match(/\bhalf\s+past\s+(\d{1,2})\b/))) {
    hour = Number(m[1]);
    minute = 30;
  } else if ((m = lower.match(/\bquarter\s+past\s+(\d{1,2})\b/))) {
    hour = Number(m[1]);
    minute = 15;
  } else if ((m = lower.match(/\bquarter\s+to\s+(\d{1,2})\b/))) {
    hour = Number(m[1]) - 1;
    minute = 45;
  } else if ((m = lower.match(/\b(\d{1,2})[:.](\d{2})\s*(am|pm|a\.m\.|p\.m\.)?/))) {
    hour = Number(m[1]);
    minute = Number(m[2]);
    period = m[3] ? (m[3].startsWith('p') ? 'pm' : 'am') : null;
  } else if ((m = lower.match(/\b(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)/))) {
    hour = Number(m[1]);
    period = m[2].startsWith('p') ? 'pm' : 'am';
  } else if ((m = lower.match(/\b(?:at|by|around|till|until)\s+(\d{1,2})\b/))) {
    hour = Number(m[1]);
  }

  if (hour == null || hour < 0 || hour > 23 || minute > 59) return null;
  if (period) {
    if (hour > 12) return null;
    return hm((hour % 12) + (period === 'pm' ? 12 : 0), minute);
  }
  if (hour > 12) return hm(hour, minute);
  // No am/pm: the first of h and h+12 still ahead today, else h.
  const candidates = [hour % 12, (hour % 12) + 12].map((h) => h * 60 + minute);
  const t = candidates.find((c) => c >= nowMin) ?? candidates[0];
  return hm(Math.floor(t / 60) % 24, t % 60);
}

const ACTIVITIES: [RegExp, string][] = [
  [/\b(work|office|job)\b/, 'Work'],
  [/\b(shift)\b/, 'Shift'],
  [/\b(school|class|classes|lecture|lectures|uni|university|college|lesson)\b/, 'Class'],
  [/\b(gym|workout|run|running|training|practice|swim)\b/, 'Gym'],
  [/\b(exam|test|quiz)\b/, 'Exam'],
  [/\b(meeting|standup|stand-up)\b/, 'Meeting'],
  [/\b(interview)\b/, 'Interview'],
  [/\b(flight|airport|plane)\b/, 'Flight'],
  [/\b(train|bus|metro)\b/, 'Train'],
  [/\b(doctor|dentist|appointment)\b/, 'Appointment'],
];

/** What the day starts with, as a short plan title: the activity named first ("gym then classes"). */
export function readActivity(text: string): string | null {
  const lower = text.toLowerCase();
  let best: { at: number; title: string } | null = null;
  for (const [re, title] of ACTIVITIES) {
    const at = lower.search(re);
    if (at >= 0 && (!best || at < best.at)) best = { at, title };
  }
  return best?.title ?? null;
}

const SLEEPY =
  /\b(sleepy|tired|exhausted|don'?t wanna|don'?t want to|can'?t get up|five more|5 more|more min|more minutes|ugh+|nooo+|zzz+)\b/;

export function readMorningReply(text: string, now: Date): MorningRead {
  const lower = text.toLowerCase().replace(/’/g, "'");
  const time = readMorningTime(lower, now);
  const activity = readActivity(lower);
  if (time) return { kind: 'time', activity, time };
  if (activity) return { kind: 'activity', activity };
  if (SLEEPY.test(lower)) return { kind: 'sleepy' };
  return { kind: 'other' };
}

/** When to remind: 20 min before, else 5 min before if that is still ahead; null when too late. */
export function reminderTimeFor(time: string, now: Date): string | null {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const at = minutesOf(time);
  for (const lead of [REMIND_LEAD_MIN, 5]) {
    const r = at - lead;
    if (r > nowMin) return hm(Math.floor(r / 60), r % 60);
  }
  return null;
}

/** A likely leave time to offer as a chip: the next full or half hour, at least 30 min away. */
export function likelyLeaveTime(now: Date): string {
  const t = now.getHours() * 60 + now.getMinutes() + 30;
  const rounded = Math.ceil(t / 30) * 30;
  return hm(Math.floor(rounded / 60) % 24, rounded % 60);
}

/** "9:30" for chat lines (the friend's words stay short). */
export function sayTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  return `${h}:${pad(m)}`;
}

/** "HH:MM" moved by `minutes` (negative goes earlier), within the same day. */
export function addMinutes(time: string, minutes: number) {
  const t = Math.max(0, Math.min(24 * 60 - 1, minutesOf(time) + minutes));
  return hm(Math.floor(t / 60), t % 60);
}

/** Yes / no for a typed answer to an offer. */
export function readYesNo(text: string): 'yes' | 'no' | null {
  const lower = text.toLowerCase();
  if (/\b(no|nope|nah|don'?t)\b/.test(lower)) return 'no';
  if (/\b(yes|yeah|yep|yup|sure|ok|okay|please|pls|do it)\b/.test(lower)) return 'yes';
  return null;
}

const pick = <T,>(list: readonly T[], seed: number) => list[Math.abs(seed) % list.length];

/** The question on the ringing screen and in the wake-up voice note. */
export function wakeQuestion(seed: number, todayPlan?: { title: string; time?: string }) {
  if (todayPlan) {
    return todayPlan.time
      ? `${todayPlan.title} at ${sayTime(todayPlan.time)} today. Ready? What's first?`
      : `${todayPlan.title} today! What's the first thing you'll do?`;
  }
  return pick(
    [
      "Morning, sleepyhead ☀️ Big day? What's the first thing on it?",
      "Good morning ☀️ What's first today?",
      'Rise and shine 🌤️ Tell me one thing you have to do today.',
      "Morning! I'm up. Are you? What's the plan today?",
    ],
    seed,
  );
}

export const CHAIN_LINES = {
  offer: (time: string, remind: string) =>
    `${sayTime(time)}, got it. Want me to text you at ${sayTime(remind)} so you're out the door on time?`,
  tooLate: (time: string) => `${sayTime(time)}?? Then you'd better hurry 🏃 Tell me how it goes.`,
  saved: (remind: string) => `Done 🧡 I'll ping you at ${sayTime(remind)}. Go eat something.`,
  pickRemind: 'When should I text you?',
  noThanks: 'Okay! Have a good one, tell me how it goes tonight 🧡',
  askTime: (activity: string) =>
    `${activity === 'Gym' ? 'Gym first?? Proud of you 💪' : `${activity} today, nice.`} What time are you heading out?`,
  notSure: "No rush. Tell me when you're off and I'll cheer you on 🧡",
  noTime: 'Got it! Have a great day, tell me everything tonight 🧡',
  sleepy: "I know 🥺 Sit up for me. Splash some cold water and I'll check on you in 5 minutes.",
  sleepyOk: "Good. 5 minutes, I'm counting ⏱️",
  sleepyMore: 'Fine… 10 minutes. Not one more 😤',
  checkIn: 'Up yet? 👀 Tell me one thing you did.',
  other: 'Love that. Have a good day and tell me how it goes tonight 🧡',
} as const;

export const CHIPS = {
  yes: (remind: string) => `Yes, ${sayTime(remind)}`,
  another: 'Another time',
  no: 'No thanks',
  in30: 'In 30 min',
  notSure: 'Not sure',
  okay: 'Okay',
  more: '10 more min',
  before30: '30 min before',
  before10: '10 min before',
} as const;
