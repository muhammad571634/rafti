import type { MomentStill } from '@/types';

/**
 * Each friend's moment stills (`src/ai/moment-stills.ts`), drawn by the owner in Nano Banana from
 * `docs/nano-banana-moment-stills.md` (3:4, saved as `art-new/m_<name>_<still>.png`, compressed to
 * `assets/stills/<id>_<still>.jpg`). A mood not drawn yet falls back to the friend's portrait.
 */
export const STILLS: Record<string, Partial<Record<MomentStill, number>>> = {};

/** Where the eyes sit down a still (the prompts put them at 40 %), for a cover crop of a wide card. */
export const STILL_EYES_TOP = '38%';
