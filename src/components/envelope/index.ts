import type { ComponentType } from 'react';

import { skiaReady } from '@/lib/skia-ready';

import type { EnvelopeGiftRevealProps } from './envelope-gift-reveal';

export type { EnvelopeGiftRevealProps } from './envelope-gift-reveal';
export type { EnvelopeContent } from './theme';

/** Null on builds without Skia (before 1.1.0): Secret Note keeps its plain opening. */
export const EnvelopeLetter: ComponentType<EnvelopeGiftRevealProps> | null = skiaReady
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('./envelope-gift-reveal') as typeof import('./envelope-gift-reveal')).EnvelopeLetter
  : null;
