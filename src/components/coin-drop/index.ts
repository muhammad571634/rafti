import type { ComponentType } from 'react';
import { TurboModuleRegistry } from 'react-native';

import type { CoinDropRewardProps } from './coin-drop-reward';

export type { CoinDropRewardProps, Point } from './coin-drop-reward';
export { wobbleAt } from './cdr-motion';

/**
 * The prize pour needs Skia's native side, which builds before 1.1.0 do not have. Loading Skia's
 * JavaScript there would take the whole app down (a missing native module is fatal at import,
 * and `catch` does not save it), so the component is required only when the module is present.
 * Null means "not on this build": the caller keeps its plain prize sheet.
 */
const skiaReady = TurboModuleRegistry.get('RNSkiaModule') != null;

export const CoinDropReward: ComponentType<CoinDropRewardProps> | null = skiaReady
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('./coin-drop-reward') as typeof import('./coin-drop-reward')).CoinDropReward
  : null;
