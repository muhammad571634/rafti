import type { AlarmSound } from '@/types';

/** The melody files (scripts/build-alarm-sounds.py builds them; our own, no licensed music). */
export const ALARM_SOUND_FILES: Record<AlarmSound, number> = {
  morningTide: require('../../assets/sounds/alarms/morning-tide.wav'),
  shellChimes: require('../../assets/sounds/alarms/shell-chimes.wav'),
  seaBreeze: require('../../assets/sounds/alarms/sea-breeze.wav'),
  softBells: require('../../assets/sounds/alarms/soft-bells.wav'),
  lighthouse: require('../../assets/sounds/alarms/lighthouse.wav'),
};
