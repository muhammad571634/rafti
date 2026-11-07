import type { ComponentType } from 'react';

import { skiaReady } from '@/lib/skia-ready';

import type { LevelUpTakeoverProps } from './level-up-takeover';

export type { LevelUpTakeoverProps } from './level-up-takeover';

/** Null on builds without Skia (before 1.1.0): the chat keeps its plain level-up card. */
export const LevelUpTakeover: ComponentType<LevelUpTakeoverProps> | null = skiaReady
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('./level-up-takeover') as typeof import('./level-up-takeover')).LevelUpTakeover
  : null;
