import type { Moment, ScheduleItem } from '@/types';

import { detectCrisis } from './safety';

/**
 * A crisis message is answered in the moment (helpline card, warm reply) but never
 * turned into a plan: no reminder push, no "how did it go?", no line on Us
 * (docs/backend-plan.md 14.7). These drop such plans saved by older builds.
 */

/** Plans whose title reads like a crisis are removed. */
export function withoutCrisisPlans(schedules: ScheduleItem[]): ScheduleItem[] {
  return schedules.filter((item) => !detectCrisis(item.title));
}

/** "Plan" moments on Us whose title reads like a crisis are removed; other moments stay. */
export function withoutCrisisPlanMoments(moments: Moment[]): Moment[] {
  return moments.filter((moment) => {
    const title = moment.params?.title;
    return !(moment.kind === 'plan' && typeof title === 'string' && detectCrisis(title));
  });
}
