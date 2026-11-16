import { Easing } from 'react-native-reanimated';

/**
 * Curves and timings of the night onboarding (0z250, `docs/prototypes/onboarding-motion.html`).
 * Strong ease-out for things that arrive, ease-in-out for things that travel on screen; springs only
 * where a finger let go (the deck, the wheel's native snap).
 */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
export const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);

/** After midnight everything moves a quarter slower (the quiet hour). */
export const slowFor = (quiet: boolean) => (quiet ? 1.25 : 1);

/** The moon's drawn size; every place it goes is a centre and a scale of this. */
export const MOON_SIZE = 140;

export type MoonPlace = 'hero' | 'header' | 'halo' | 'gone';

/** Where the moon sits in each place, from the window and the safe area. */
export function moonPlaces(width: number, height: number, top: number) {
  const x = width / 2;
  return {
    hero: { x, y: Math.round(height * 0.36), s: 1 },
    header: { x, y: top + 30, s: 0.2 },
    halo: { x, y: Math.round(height * 0.37), s: 1.5 },
    gone: { x, y: Math.round(height * 0.37), s: 0.6 },
  } satisfies Record<MoonPlace, { x: number; y: number; s: number }>;
}
