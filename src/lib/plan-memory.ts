import { dateFromKey } from '../mock/time';

/**
 * The memory a plan from chat leaves: the title with the real day ("Exam - Thu, Oct 15, 17:00."),
 * never the phrase the user said ("tomorrow"), which is wrong by the next day (audit 2026-10-13).
 * English and fixed, like the rest of the memory text the server prompt reads.
 */
export function planMemoryLine(plan: { title: string; date: string; time?: string }) {
  const day = dateFromKey(plan.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return `${plan.title} - ${day}${plan.time ? `, ${plan.time}` : ''}.`;
}
