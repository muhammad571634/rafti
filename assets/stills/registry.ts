import type { MomentStill } from '@/types';

/**
 * Each friend's moment stills (`src/ai/moment-stills.ts`), generated with Nano Banana from
 * `docs/nano-banana-moment-stills.md` (3:4, saved as `art-new/m_<name>_<still>.png`, compressed to
 * `assets/stills/<id>_<still>.jpg`). A mood not drawn yet falls back to the friend's portrait.
 */
export const STILLS: Record<string, Partial<Record<MomentStill, number>>> = {
  c_milo: {
    close_night: require('./c_milo_close_night.jpg'),
    rain: require('./c_milo_rain.jpg'),
    city_lights: require('./c_milo_city_lights.jpg'),
    morning: require('./c_milo_morning.jpg'),
    laughing: require('./c_milo_laughing.jpg'),
    tension: require('./c_milo_tension.jpg'),
    our_place: require('./c_milo_our_place.jpg'),
  },
  c_jace: {
    close_night: require('./c_jace_close_night.jpg'),
    rain: require('./c_jace_rain.jpg'),
    city_lights: require('./c_jace_city_lights.jpg'),
  },
  c_sam: {
    close_night: require('./c_sam_close_night.jpg'),
    rain: require('./c_sam_rain.jpg'),
  },
  c_roman: {
    close_night: require('./c_roman_close_night.jpg'),
  },
};

/** Where the eyes sit down a still (the prompts put them at 40 %), for a cover crop of a wide card. */
export const STILL_EYES_TOP = '38%';
