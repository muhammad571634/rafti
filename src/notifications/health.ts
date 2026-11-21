/**
 * How the last hand-over of pushes to the phone went (0z189). Leaving the app plans the pushes and
 * the OS schedules them; that runs in the background with no one watching, and a failure there used
 * to vanish without a trace (a whole evening of nothing scheduled, seen on the A51). Each sync now
 * keeps this record: when, why, how many were planned and how many the OS took, and the first error.
 * Notification settings shows it in developer builds; `console.warn` puts failures in the device log.
 */
export interface PushHealth {
  at: string;
  /** What started it: coming back, a change while open, leaving the app, a language change, new written lines. */
  event: 'back' | 'change' | 'leave' | 'language' | 'write';
  /** Pushes the planner gave for the next two days (0 when pushes are off). */
  planned: number;
  /** Of those, the ones the OS accepted. */
  scheduled: number;
  /** Pushes are switched off on the phone, or not supported here. */
  off?: boolean;
  /** The first error, cut short. */
  error?: string;
  /** What was handed over, soonest first: "11-10 21:20 call Hana" (developer builds read it). */
  next?: string[];
}

/** How many planned pushes the record lists. */
export const HEALTH_LIST_MAX = 16;

/** One planned push as the record lists it. */
export function healthLine(push: { at: Date; kind: string; title?: string }) {
  const p = (n: number) => String(n).padStart(2, '0');
  const d = push.at;
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())} ${push.kind}${push.title ? ` ${push.title}` : ''}`;
}

/** An error as one short line for the record and the log. */
export const errorText = (error: unknown) => String((error as Error | undefined)?.message ?? error).slice(0, 160);
