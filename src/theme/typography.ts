import { Platform, TextStyle } from 'react-native';

/**
 * Fredoka (OFL, loaded in the root layout) carries the rounded wordmark and the
 * big playful numbers; body copy stays on the system face like the reference.
 */
export const fonts = {
  display: 'Fredoka_700Bold',
  displaySemi: 'Fredoka_600SemiBold',
  body: Platform.select({ ios: 'System', default: 'sans-serif' }),
} as const;

export const weight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const satisfies Record<string, TextStyle['fontWeight']>;

type Variant = TextStyle;

export const type = {
  /** Rafti wordmark */
  logo: { fontSize: 26, fontFamily: fonts.display, letterSpacing: 0.6 } as Variant,
  /** Big playful numbers: balances, rewards, the wheel */
  display: { fontSize: 30, fontFamily: fonts.display, letterSpacing: 0.2 } as Variant,
  h1: { fontSize: 28, fontWeight: weight.bold, letterSpacing: -0.3 } as Variant,
  h2: { fontSize: 22, fontWeight: weight.bold, letterSpacing: -0.2 } as Variant,
  h3: { fontSize: 18, fontWeight: weight.bold } as Variant,
  title: { fontSize: 16, fontWeight: weight.semibold } as Variant,
  body: { fontSize: 15, fontWeight: weight.regular, lineHeight: 21 } as Variant,
  bodyStrong: { fontSize: 15, fontWeight: weight.semibold, lineHeight: 21 } as Variant,
  small: { fontSize: 13, fontWeight: weight.regular, lineHeight: 18 } as Variant,
  smallStrong: { fontSize: 13, fontWeight: weight.semibold, lineHeight: 18 } as Variant,
  caption: { fontSize: 11, fontWeight: weight.medium, letterSpacing: 0.1 } as Variant,
  tiny: { fontSize: 10, fontWeight: weight.medium } as Variant,
  /** Home grid tile labels — two lines, tight */
  tile: { fontSize: 11, fontWeight: weight.semibold, lineHeight: 13 } as Variant,
  /** A playful figure inside a row: shell counts on the store packs */
  figure: { fontSize: 22, fontFamily: fonts.display, lineHeight: 26 } as Variant,
} as const;

export type TypeVariant = keyof typeof type;
