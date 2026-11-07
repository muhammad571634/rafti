import type { ComponentType } from 'react';

import { skiaReady } from '@/lib/skia-ready';

import type { CoinDropRewardProps } from './coin-drop-reward';

export type { CoinDropRewardProps, Point } from './coin-drop-reward';
export { wobbleAt } from './cdr-motion';

/** Null on builds without Skia (before 1.1.0): the caller keeps its plain prize sheet. */
export const CoinDropReward: ComponentType<CoinDropRewardProps> | null = skiaReady
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('./coin-drop-reward') as typeof import('./coin-drop-reward')).CoinDropReward
  : null;
