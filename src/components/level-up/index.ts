import type { ComponentType } from 'react';

import { safeMoment } from '@/components/safe-moment';
import { skiaReady } from '@/lib/skia-ready';

import type { LevelUpTakeoverProps } from './level-up-takeover';

export type { LevelUpTakeoverProps } from './level-up-takeover';

/** Null on builds without Skia (before 1.1.0): the chat keeps its plain level-up card. A failure dismisses it. */
export const LevelUpTakeover: ComponentType<LevelUpTakeoverProps> | null = skiaReady
  ? safeMoment(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('./level-up-takeover') as typeof import('./level-up-takeover')).LevelUpTakeover,
      (props) => props.onClose(),
    )
  : null;
