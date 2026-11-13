import type { ComponentType } from 'react';

import { safeMoment } from '@/components/safe-moment';
import { skiaReady } from '@/lib/skia-ready';

import type { CoinDropRewardProps } from './coin-drop-reward';

export type { CoinDropRewardProps, Point } from './coin-drop-reward';
export { wobbleAt } from './cdr-motion';

/**
 * Null on builds without Skia (before 1.1.0): the caller keeps its plain prize sheet. A failure lands the prize at
 * once (the wallet shows it) and closes the pour.
 */
export const CoinDropReward: ComponentType<CoinDropRewardProps> | null = skiaReady
  ? safeMoment(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('./coin-drop-reward') as typeof import('./coin-drop-reward')).CoinDropReward,
      (props) => {
        props.onAbsorb();
        props.onDone();
      },
    )
  : null;
