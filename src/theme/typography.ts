import { Platform, TextStyle } from 'react-native';

/**
 * Fredoka (OFL, loaded in the root layout) carries the rounded wordmark and the
 * big playful numbers; body copy stays on the system face like the reference.
 */
export const fonts = {
  display: 'Fredoka_700Bold',
  displaySemi: 'Fredoka_600SemiBold',
  body: Platform.select({ ios: 'System', default: 'sans-serif' }),
  /** Caveat (OFL): the handwriting on diary pages and diary covers. */
  hand: 'Caveat_600SemiBold',
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
  // Headings, body and secondary text sit on the iOS text styles (HIG Typography):
  // Title 1, Title 2, Title 3, Body and Subheadline.
  h1: { fontSize: 28, fontWeight: weight.heavy, letterSpacing: -0.5, lineHeight: 34 } as Variant,
  h2: { fontSize: 22, fontWeight: weight.heavy, letterSpacing: -0.3, lineHeight: 28 } as Variant,
  h3: { fontSize: 20, fontWeight: weight.bold, letterSpacing: -0.1, lineHeight: 25 } as Variant,
  title: { fontSize: 17, fontWeight: weight.bold } as Variant,
  body: { fontSize: 17, fontWeight: weight.regular, lineHeight: 22 } as Variant,
  bodyStrong: { fontSize: 17, fontWeight: weight.bold, lineHeight: 22 } as Variant,
  small: { fontSize: 15, fontWeight: weight.regular, lineHeight: 20 } as Variant,
  smallStrong: { fontSize: 15, fontWeight: weight.bold, lineHeight: 20 } as Variant,
  caption: { fontSize: 12, fontWeight: weight.semibold, letterSpacing: 0.1 } as Variant,
  /** Short labels on chips and small cells */
  chip: { fontSize: 13, fontWeight: weight.bold } as Variant,
  tiny: { fontSize: 11, fontWeight: weight.semibold } as Variant,
  /** Home grid tile labels — two lines, tight */
  tile: { fontSize: 11, fontWeight: weight.semibold, lineHeight: 13 } as Variant,
  /** A playful figure inside a row: shell counts on the store packs */
  figure: { fontSize: 22, fontFamily: fonts.display, lineHeight: 26 } as Variant,
  /** The big day count on the Today hero, and its unit word beside it */
  heroFigure: { fontSize: 44, fontFamily: fonts.displaySemi, lineHeight: 48 } as Variant,
  heroUnit: { fontSize: 20, fontFamily: fonts.displaySemi, lineHeight: 26 } as Variant,
  /** Handwriting on a diary page; the line height is the ruled-line pitch. */
  hand: { fontSize: 23, fontFamily: fonts.hand, lineHeight: 32 } as Variant,
  /** A diary's name on its cover */
  handTitle: { fontSize: 30, fontFamily: fonts.hand, lineHeight: 32 } as Variant,
} as const;

export type TypeVariant = keyof typeof type;
