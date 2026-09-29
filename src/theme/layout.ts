import { Platform, ViewStyle } from 'react-native';

/** 4pt scale. */
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
  tile: 20,
  bubble: 18,
  pill: 999,
} as const;

/** Soft, low-contrast elevation — the reference app never uses hard shadows. */
const shadow = (
  y: number,
  blur: number,
  opacity: number,
  elevation: number,
  color = '#8A6A50',
): ViewStyle =>
  Platform.select<ViewStyle>({
    android: { elevation },
    default: {
      shadowColor: color,
      shadowOffset: { width: 0, height: y },
      shadowOpacity: opacity,
      shadowRadius: blur,
    },
  })!;

export const shadows = {
  none: {} as ViewStyle,
  card: shadow(2, 10, 0.08, 2),
  raised: shadow(4, 16, 0.12, 4),
  fab: shadow(6, 14, 0.24, 8, '#E8742A'),
  modal: shadow(10, 30, 0.18, 12),
  bar: shadow(-2, 12, 0.06, 8),
} as const;

export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;

/** Height of the custom bottom tab bar (excluding safe-area inset). */
export const TAB_BAR_HEIGHT = 58;
export const HEADER_HEIGHT = 52;
