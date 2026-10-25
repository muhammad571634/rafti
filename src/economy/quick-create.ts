/**
 * Quick create's daily allowance (owner, 2026-10-25): 3 written drafts a day for free. One
 * setting, so it can follow the unit economics later (backend-plan §12.17). Only a draft that
 * came back counts; writing one field again does not, and the form is always free.
 */
export const FREE_QUICK_CREATES_PER_DAY = 3;

/** How many drafts were written on `day` (a day key). */
export interface QuickCreateUse {
  day: string;
  used: number;
}

const usedOn = (use: QuickCreateUse | undefined, today: string) => (use?.day === today ? use.used : 0);

export const quickCreatesLeft = (use: QuickCreateUse | undefined, today: string) =>
  Math.max(0, FREE_QUICK_CREATES_PER_DAY - usedOn(use, today));

/** The allowance after one more draft today, or null when today's are used up. */
export function spendQuickCreate(use: QuickCreateUse | undefined, today: string): QuickCreateUse | null {
  if (quickCreatesLeft(use, today) === 0) return null;
  return { day: today, used: usedOn(use, today) + 1 };
}
