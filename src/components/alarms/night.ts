import { Platform } from 'react-native';

import { sleepColors as night, systemColors } from '@/theme';

import type { WheelTone } from './time-wheel';

/** The iOS switch on Bedtime's navy (Alarms and their editor): green when on, a translucent track when off. */
export const NIGHT_SWITCH = {
  trackColor: { true: systemColors.green, false: 'rgba(120,120,128,0.36)' },
  thumbColor: '#FFFFFF',
  ios_backgroundColor: 'rgba(120,120,128,0.36)',
  // react-native-web tints the thumb on its own unless told.
  ...(Platform.OS === 'web' ? ({ activeThumbColor: '#FFFFFF' } as object) : {}),
} as const;

/** The time wheel on the navy, as Bedtime draws it. */
export const NIGHT_WHEEL: WheelTone = { text: night.text, near: night.textSecondary, far: night.textFaint, band: 'rgba(255,255,255,0.10)' };
