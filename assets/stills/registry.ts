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
    morning: require('./c_jace_morning.jpg'),
    laughing: require('./c_jace_laughing.jpg'),
    tension: require('./c_jace_tension.jpg'),
    our_place: require('./c_jace_our_place.jpg'),
  },
  c_sam: {
    close_night: require('./c_sam_close_night.jpg'),
    rain: require('./c_sam_rain.jpg'),
    city_lights: require('./c_sam_city_lights.jpg'),
    morning: require('./c_sam_morning.jpg'),
    laughing: require('./c_sam_laughing.jpg'),
    tension: require('./c_sam_tension.jpg'),
    our_place: require('./c_sam_our_place.jpg'),
  },
  c_roman: {
    close_night: require('./c_roman_close_night.jpg'),
    rain: require('./c_roman_rain.jpg'),
    city_lights: require('./c_roman_city_lights.jpg'),
    morning: require('./c_roman_morning.jpg'),
    laughing: require('./c_roman_laughing.jpg'),
    tension: require('./c_roman_tension.jpg'),
    our_place: require('./c_roman_our_place.jpg'),
  },
  c_ethan: {
    close_night: require('./c_ethan_close_night.jpg'),
    rain: require('./c_ethan_rain.jpg'),
    city_lights: require('./c_ethan_city_lights.jpg'),
    morning: require('./c_ethan_morning.jpg'),
    laughing: require('./c_ethan_laughing.jpg'),
    tension: require('./c_ethan_tension.jpg'),
    our_place: require('./c_ethan_our_place.jpg'),
  },
  c_clara: {
    close_night: require('./c_clara_close_night.jpg'),
    rain: require('./c_clara_rain.jpg'),
    city_lights: require('./c_clara_city_lights.jpg'),
    morning: require('./c_clara_morning.jpg'),
    laughing: require('./c_clara_laughing.jpg'),
    tension: require('./c_clara_tension.jpg'),
    our_place: require('./c_clara_our_place.jpg'),
  },
  c_caleb: {
    close_night: require('./c_caleb_close_night.jpg'),
    rain: require('./c_caleb_rain.jpg'),
    city_lights: require('./c_caleb_city_lights.jpg'),
    morning: require('./c_caleb_morning.jpg'),
    laughing: require('./c_caleb_laughing.jpg'),
    tension: require('./c_caleb_tension.jpg'),
    our_place: require('./c_caleb_our_place.jpg'),
  },
  c_asher: {
    close_night: require('./c_asher_close_night.jpg'),
    rain: require('./c_asher_rain.jpg'),
    city_lights: require('./c_asher_city_lights.jpg'),
    morning: require('./c_asher_morning.jpg'),
    laughing: require('./c_asher_laughing.jpg'),
    tension: require('./c_asher_tension.jpg'),
    our_place: require('./c_asher_our_place.jpg'),
  },
  c_mia: {
    close_night: require('./c_mia_close_night.jpg'),
    rain: require('./c_mia_rain.jpg'),
    city_lights: require('./c_mia_city_lights.jpg'),
    morning: require('./c_mia_morning.jpg'),
    laughing: require('./c_mia_laughing.jpg'),
    tension: require('./c_mia_tension.jpg'),
    our_place: require('./c_mia_our_place.jpg'),
  },
  c_lena: {
    close_night: require('./c_lena_close_night.jpg'),
    rain: require('./c_lena_rain.jpg'),
    city_lights: require('./c_lena_city_lights.jpg'),
    morning: require('./c_lena_morning.jpg'),
    laughing: require('./c_lena_laughing.jpg'),
    tension: require('./c_lena_tension.jpg'),
    our_place: require('./c_lena_our_place.jpg'),
  },
  c_victor: {
    close_night: require('./c_victor_close_night.jpg'),
    rain: require('./c_victor_rain.jpg'),
    city_lights: require('./c_victor_city_lights.jpg'),
    morning: require('./c_victor_morning.jpg'),
    laughing: require('./c_victor_laughing.jpg'),
    tension: require('./c_victor_tension.jpg'),
    our_place: require('./c_victor_our_place.jpg'),
  },
  c_yuna: {
    close_night: require('./c_yuna_close_night.jpg'),
    rain: require('./c_yuna_rain.jpg'),
    city_lights: require('./c_yuna_city_lights.jpg'),
    morning: require('./c_yuna_morning.jpg'),
    laughing: require('./c_yuna_laughing.jpg'),
    tension: require('./c_yuna_tension.jpg'),
    our_place: require('./c_yuna_our_place.jpg'),
  },
};

/** Where the eyes sit down a still (the prompts put them at 40 %), for a cover crop of a wide card. */
export const STILL_EYES_TOP = '38%';
