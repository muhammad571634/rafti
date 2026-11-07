import type { AlarmSound } from '@/types';

/** The melody files (scripts/build-alarm-sounds.py builds them; our own, no licensed music). */
export const ALARM_SOUND_FILES: Record<AlarmSound, number> = {
  morningTide: require('../../assets/sounds/alarms/morning_tide.wav'),
  shellChimes: require('../../assets/sounds/alarms/shell_chimes.wav'),
  seaBreeze: require('../../assets/sounds/alarms/sea_breeze.wav'),
  softBells: require('../../assets/sounds/alarms/soft_bells.wav'),
  lighthouse: require('../../assets/sounds/alarms/lighthouse.wav'),
};

/** The same melodies as native resources (Android res/raw, the iOS bundle), for alarms that ring
 * with the app closed. Android names allow only lowercase letters, digits and underscores. */
export const ALARM_SOUND_NAMES: Record<AlarmSound, string> = {
  morningTide: 'morning_tide',
  shellChimes: 'shell_chimes',
  seaBreeze: 'sea_breeze',
  softBells: 'soft_bells',
  lighthouse: 'lighthouse',
};
