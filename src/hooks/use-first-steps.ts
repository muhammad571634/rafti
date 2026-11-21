import { useMemo } from 'react';

import { firstStepProgress, firstStepReady, firstStepsDone, firstStepsOpen, firstStepStates } from '@/economy/first-steps';
import { useAppStore } from '@/store/use-app-store';

/**
 * First steps as a screen reads them (`src/economy/first-steps.ts`), worked out only when what they
 * read changes. `pushOn`: the phone's own answer when the screen asked it; else the push planner's
 * last record says whether pushes are on.
 */
export function useFirstSteps(pushOn?: boolean) {
  const characters = useAppStore((s) => s.characters);
  const conversations = useAppStore((s) => s.conversations);
  const messages = useAppStore((s) => s.messages);
  const plans = useAppStore((s) => s.schedules.length + s.alarms.length);
  const pushesPlanned = useAppStore((s) => !!s.pushHealth && !s.pushHealth.off && s.pushHealth.scheduled > 0);
  const claimed = useAppStore((s) => s.daily.firstSteps);
  return useMemo(() => {
    const input = { characters, conversations, messages, plans, notifications: pushOn ?? pushesPlanned };
    const states = firstStepStates(firstStepsDone(input), claimed);
    return { states, progress: firstStepProgress(input), open: firstStepsOpen(claimed), ready: firstStepReady(states) };
  }, [characters, conversations, messages, plans, pushOn, pushesPlanned, claimed]);
}
