/**
 * Native Cook "Envelope Gift Reveal", for Secret Note: a letter on a linen table under one warm lamp (upper left), a
 * cream cotton envelope with real grain, an oxblood wax seal pressed with the friend's initial, and inside it a heavy
 * card that turns over to their note in their own hand. Instrument Serif for what is printed, Caveat for what is
 * written (Latin and Cyrillic; other scripts fall back to the system's face), Inter for the interface. 4 pt grid.
 *
 * Kept from the block: every colour, size and position. Changed: the bookshop's gift card became the friend's note
 * (the card's face carries Sigmazam's letterpress and the day; its back, their note), and the words come in as
 * `EnvelopeContent` in the user's language instead of the block's fixed English.
 */
export const FONTS = {
  serif: 'EnvelopeInstrumentSerif',
  hand: 'EnvelopeCaveat',
  ui: 'EnvelopeInterMedium',
  uiBold: 'EnvelopeInterSemiBold',
} as const;

export const FONT_FILES = {
  serif: require('@/assets/fonts/envelope/InstrumentSerif-Regular.ttf'),
  hand: require('@/assets/fonts/envelope/Caveat-Regular.ttf'),
  ui: require('@/assets/fonts/envelope/Inter-Medium.ttf'),
  uiBold: require('@/assets/fonts/envelope/Inter-SemiBold.ttf'),
} as const;

export const COLORS = {
  table: '#1D1B18',
  tableHigh: '#2C2823',
  lamp: 'rgba(255, 214, 160, 0.16)',
  ink: '#F3ECDF',
  mute: 'rgba(243, 236, 223, 0.58)',
  faint: 'rgba(243, 236, 223, 0.36)',
  paper: '#EFE6D5',
  paperHigh: '#F7F0E2',
  paperLow: '#DCCFB8',
  paperInside: '#CDBFA5',
  paperShade: 'rgba(84, 62, 30, 0.22)',
  crease: 'rgba(96, 74, 40, 0.30)',
  pen: '#22314B',
  wax: '#7C1E22',
  waxHigh: '#B23A3A',
  waxLow: '#4C0F13',
  card: '#F6F0E4',
  cardEdge: 'rgba(80, 60, 30, 0.18)',
  cardInk: '#2A2219',
  cardMute: 'rgba(42, 34, 25, 0.56)',
  letterpress: '#2E4A3C',
  shadow: 'rgba(0, 0, 0, 0.55)',
  cta: '#F3ECDF',
  ctaInk: '#1D1B18',
} as const;

export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, side: 20, xl: 24, xxl: 32 } as const;

export const LAYOUT = {
  side: 24,
  headline: 44,
  headlineLine: 48,
  envW: 336,
  envH: 232,
  sealD: 56,
  sealY: 0.62,
  flapTip: 0.66,
  cardW: 340,
  cardH: 214,
  cardR: 8,
  cardInScale: 0.92,
  title: 40,
  titleLine: 44,
  hintH: 52,
  buttonH: 52,
} as const;

/**
 * Vertical positions. Sealed: a kicker and the headline under the status bar, the envelope a little below the
 * middle, the hint above the home indicator. Revealed: the title where the headline was, the card under it, its
 * caption, the button at the bottom.
 */
export function screenLayout(height: number, top: number, bottom: number) {
  const headlineTop = top + 40;
  const envTop = Math.round(height * 0.5 - LAYOUT.envH / 2 + 24);
  const foot = height - Math.max(bottom, 16) - 16;
  const buttonY = foot - LAYOUT.hintH / 2;
  const titleTop = headlineTop;
  const ctaTop = foot - LAYOUT.buttonH;
  // The card and its caption (about 60 pt) centred between the title and the button.
  const titleBottom = titleTop + LAYOUT.titleLine * 2;
  const cardTop = Math.round((titleBottom + ctaTop) / 2 - (LAYOUT.cardH + 60) / 2);
  const messageTop = cardTop + LAYOUT.cardH + 24;
  return { headlineTop, envTop, buttonY, titleTop, cardTop, messageTop, ctaTop };
}
export type ScreenLayout = ReturnType<typeof screenLayout>;

/** What the letter says, in the user's language (the block's `GIFT`). */
export interface EnvelopeContent {
  /** Small caps over the headline: who it is from and the day ("FROM HANA · 7 NOV"). */
  kicker: string;
  /** Two lines, letter by letter ("Something\nfor you"). */
  headline: string;
  /** The revealed screen's title, two lines ("From Hana,\nwith love"). */
  title: string;
  /** Written on the envelope's pocket: the user's name. */
  to: string;
  /** Pressed into the wax: the friend's initial. */
  initial: string;
  /** Their note, written on the card's back. */
  note: string;
  /** Printed on the card's face, lower right, as the block printed its amount: the day ("07.11"). */
  stamp: string;
  /** Under the card: the question they answered, and a quieter line (the date). */
  caption: string;
  captionSub: string;
  /** The final button. */
  cta: string;
  /** "Lift the flap". */
  hint: string;
  /** Accessibility: the sealed envelope. */
  sealedLabel: string;
}
