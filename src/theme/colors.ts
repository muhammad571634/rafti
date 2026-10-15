import { Appearance } from 'react-native';

/**
 * Sigmazam palette — soft peach and mint, built around the Sigmazam mascot.
 * Raw values live in `palette`; screens should only use the semantic `colors` map
 * so a future dark theme / re-skin is a one-file change.
 */
export const palette = {
  // Soft peach — the whole Home + navigation identity (owner's pick, 2026-10-15: light and
  // gentle, away from the old terracotta). Fills are 200→400 with ink-brown text on them.
  apricot50: '#FFF7F0',
  apricot100: '#FFF0E4',
  apricot200: '#FFD3B1',
  apricot300: '#FFC497',
  apricot400: '#FFB37A',
  apricot500: '#F79E63',
  apricot600: '#EF8A4E',
  apricot700: '#C96A32',
  /** Text and icons on a peach fill: white would vanish on it. */
  peachInk: '#6A2F0C',

  // Mint — Rafti's scarf: Secret Note, level-up moments
  mint50: '#EEFBF8',
  mint100: '#D9F6F0',
  mint200: '#B5EDE2',
  mint400: '#3CCFB4',
  mint500: '#1FA88F',
  mint600: '#138A75',

  // Cream — app background and Heartbeat Diary paper
  cream50: '#FFF7EC',
  cream100: '#FFFAF1',
  cream200: '#FBF1DF',
  cream300: '#F0E2C6',
  cream500: '#B9A07A',

  // Sky — call / character blurred backdrops
  sky200: '#CFE6FF',
  sky400: '#6BB8FF',
  sky600: '#3D8FE0',

  // Caramel — Rafti's fur, warm shadows
  caramel300: '#E3BE9C',
  caramel500: '#C98B5E',
  caramel700: '#8E5A36',

  // Neutrals: warm lines, ink-blue text
  white: '#FFFFFF',
  gray50: '#FCF9F5',
  gray100: '#F5F0EA',
  gray200: '#EBE4DB',
  gray300: '#DAD1C6',
  gray400: '#B3B5C1',
  gray500: '#8D90A0',
  gray600: '#6B6F82',
  gray700: '#50546A',
  gray800: '#3A3E55',
  gray900: '#2A2E45',
  black: '#000000',

  // Shell — the currency pill
  shellSoft: '#FFF1E4',
  shellBorder: '#FFD2A8',
  shellText: '#C96A2A',

  // Status
  red: '#FF5A5A',
  redSoft: '#FFE6E3',
  green: '#3CCF8E',
  amber: '#FFB23F',
  blue: '#4D9BFF',
} as const;

const lightColors = {
  // Raw passthroughs used directly on tinted surfaces
  white: palette.white,
  black: palette.black,

  // Surfaces
  bg: palette.cream50,
  bgPlain: palette.gray50,
  surface: palette.white,
  surfaceAlt: palette.gray100,
  overlay: 'rgba(42,46,69,0.45)',
  scrim: 'rgba(42,46,69,0.25)',

  // Lines
  border: palette.gray200,
  borderStrong: palette.gray300,
  divider: palette.gray100,

  // Text
  text: palette.gray900,
  textSecondary: palette.gray600,
  textMuted: palette.gray500,
  textFaint: palette.gray400,
  textOnPrimary: palette.peachInk,
  textOnDark: palette.white,
  /** Text or icon on an ink fill (unread count, ticked box, selected segment). */
  textOnInk: palette.white,

  // Brand: `primary` marks icons, rings and dots; `primaryFill` is the soft button fill.
  primary: palette.apricot600,
  primaryFill: palette.apricot400,
  primaryHover: palette.apricot500,
  primarySoft: palette.apricot100,
  primarySofter: palette.apricot50,
  brandText: palette.apricot600,

  // Accent (Secret Note / relationship)
  accent: palette.mint500,
  accentSoft: palette.mint100,
  accentBorder: palette.mint200,

  // On a photo or blurred portrait (call screens)
  onMedia: palette.white,
  onMediaMuted: 'rgba(255,255,255,0.75)',
  onMediaGlass: 'rgba(255,255,255,0.16)',
  onMediaSoft: 'rgba(255,255,255,0.88)',
  /** Hairline round a glass chip on a photo. */
  onMediaHairline: 'rgba(255,255,255,0.28)',
  /** The solid round action sitting on a photo (the Today hero's chat button). */
  onMediaButton: 'rgba(255,255,255,0.92)',

  // Bond: the only place mint carries meaning (level progress, "voice ready").
  bond: palette.mint400,
  bondText: palette.mint600,
  bondSoft: palette.mint100,
  /** Bond mint that stays readable on a dark photo. */
  bondOnMedia: palette.mint200,

  // Diary
  paper: palette.cream200,
  paperLine: palette.cream300,
  paperText: palette.gray800,

  // Chat
  bubbleSelf: palette.apricot200,
  bubbleSelfText: palette.gray900,
  bubbleOther: palette.white,
  bubbleOtherText: palette.gray900,
  bubbleTranscript: 'rgba(245,240,234,0.92)',
  bubbleTranscriptText: palette.gray600,

  // Nav
  tabActive: palette.gray900,
  tabInactive: palette.gray500,

  // Status
  danger: palette.red,
  /** Red that stays readable as text on the cream canvas (Block, destructive rows). */
  dangerText: '#C93A3A',
  dangerSoft: palette.redSoft,
  success: palette.green,
  warning: palette.amber,
  info: palette.blue,
} as const;

/**
 * The night palette: every token of `colors`, re-tuned for a dark navy canvas. Bedtime uses it
 * today (owner's pick, 2026-10-14: the iOS Sleep look); dark mode (work queue item 15) will hand
 * it to every screen when the phone is in dark mode, so screens must read colours from tokens.
 */
export const nightColors: Record<keyof typeof lightColors, string> = {
  ...lightColors,
  bg: '#0E1230',
  bgPlain: '#0E1230',
  surface: '#1C2148',
  surfaceAlt: '#252B57',
  overlay: 'rgba(0,0,0,0.55)',
  scrim: 'rgba(0,0,0,0.35)',
  border: '#2B3160',
  borderStrong: '#3A4178',
  divider: '#232857',
  text: '#F4F2FF',
  textSecondary: '#A3A8C8',
  textMuted: '#8389AE',
  textFaint: '#5E6490',
  primary: palette.apricot300,
  primarySoft: '#3B2A26',
  primarySofter: '#2E2422',
  brandText: palette.apricot300,
  accentSoft: '#163F3A',
  accentBorder: '#1F5A52',
  bondText: '#5FE0C4',
  bondSoft: '#163F3A',
  bubbleSelf: '#56392F',
  bubbleSelfText: '#FFFFFF',
  bubbleOther: '#1C2148',
  bubbleOtherText: '#F4F2FF',
  bubbleTranscript: 'rgba(28,33,72,0.92)',
  bubbleTranscriptText: '#A3A8C8',
  tabActive: '#F4F2FF',
  tabInactive: '#8389AE',
  textOnInk: '#0E1230',
  dangerText: '#FF7A7A',
  dangerSoft: '#4A1F24',
};

/**
 * Dark mode follows the phone, read once at launch: every screen builds its styles from
 * `colors` when it loads, so switching the phone's theme applies on the next launch.
 * Paper (diary pages, polaroids, board notes) stays light in both themes, so text on it
 * uses paper ink (`paperText`, `palette.gray*`), never `text`, which turns light here.
 */
export const isDark = Appearance.getColorScheme() === 'dark';

export const colors: Record<keyof typeof lightColors, string> = isDark ? nightColors : lightColors;

/** Gradients used on hero surfaces (expo-linear-gradient `colors` prop). */
/**
 * Explore module tiles: a soft tint behind a deeper glyph of the same hue, so each
 * module is found by colour as well as shape. Mint stays with Contacts, the bond module.
 */
export const moduleTints: Record<string, { bg: string; fg: string }> = {
  store: { bg: palette.apricot100, fg: palette.apricot700 },
  dating: { bg: '#FFE3DE', fg: '#D2503F' },
  diary: { bg: '#F6E8D7', fg: palette.caramel700 },
  photo: { bg: '#DCEBFF', fg: '#2F7BD0' },
  contacts: { bg: palette.mint100, fg: palette.mint600 },
  gifts: { bg: palette.apricot100, fg: palette.apricot700 },
  calls: { bg: '#DDF5E7', fg: '#2E9963' },
  bedtime: { bg: '#E3E5FA', fg: '#4E56B8' },
  radio: { bg: '#FFF0CC', fg: '#B07A00' },
  board: { bg: '#F6E8D7', fg: palette.caramel700 },
};

export const gradients = {
  home: (isDark ? ['#0E1230', '#181D45'] : ['#FFF7EC', '#FFEEDB']) as readonly [string, string],
  banner: ['#FFD3B1', '#FFB37A'] as const,
  fab: ['#FFD3B1', '#FFB37A'] as const,
  /** The primary button: peach, lighter at the top. */
  primary: ['#FFD3B1', '#FFB37A'] as const,
  diary: ['#FFEBD6', '#FFF9F1', '#FFE6CC'] as const,
  secretNote: ['#EEFBF8', '#FFFFFF'] as const,
  call: ['#A9D3F5', '#8FB0C8', '#7E8E9A'] as const,
  levelUp: ['#EEFBF8', '#FFFFFF'] as const,
  incoming: ['rgba(0,0,0,0.55)', 'transparent', 'rgba(0,0,0,0.65)'] as const,
  avatarFallback: ['#FFC999', '#FF9F5A'] as const,
  night: ['#1E2A55', '#2E3B6B'] as const,
  /** The wake-up alarm's ringing screen: sunrise. */
  wake: ['#F6C89F', '#E9A27E', '#B9739A'] as const,
  /**
   * Left-to-right shade under the Today hero's copy, so white text reads on any scene.
   * Not decoration: it is the one gradient the flat design allows. Stops: `gradientStops`.
   */
  heroScrim: ['rgba(24,22,38,0.62)', 'rgba(24,22,38,0.28)', 'rgba(24,22,38,0)'] as const,
  /** The phone lock screen in Profile → Notifications' preview. */
  lockScreen: ['#2E3352', '#5B4A6E'] as const,
} as const;

/** `locations` for the gradients above that do not spread their colours evenly. */
export const gradientStops = {
  heroScrim: [0, 0.45, 0.7] as const,
} as const;

/** Deterministic pastel pair for an avatar with no image yet. */
export const avatarGradients = [
  ['#FFC999', '#FF9F5A'],
  ['#CFE6FF', '#6BB8FF'],
  ['#B5EDE2', '#3CCFB4'],
  ['#FFE3A3', '#FFB23F'],
  ['#E3BE9C', '#C98B5E'],
  ['#FFC7B8', '#FF8A70'],
] as const;

export type ColorToken = keyof typeof lightColors;
