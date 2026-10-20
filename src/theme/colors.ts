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

  // Surfaces: iOS system grounds (owner's pick, 2026-10-16). `bg` is the grouped grey behind
  // cards, `bgPlain` the white of a plain list (Chats).
  bg: '#F2F2F7',
  bgPlain: palette.white,
  surface: palette.white,
  surfaceAlt: '#EBEBF0',
  overlay: 'rgba(0,0,0,0.4)',
  scrim: 'rgba(0,0,0,0.2)',
  /** The floating tab bar's frosted fill, its hairline and the current tab's capsule. */
  glass: 'rgba(255,255,255,0.94)',
  glassLine: 'rgba(0,0,0,0.10)',
  glassActive: 'rgba(120,120,128,0.14)',

  // Lines
  border: '#E5E5EA',
  borderStrong: '#D1D1D6',
  divider: '#EFEFF4',

  // Text
  text: '#1C1C1E',
  textSecondary: '#636366',
  textMuted: '#8E8E93',
  textFaint: '#AEAEB2',
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
  bubbleOther: '#E9E9EB',
  bubbleOtherText: palette.gray900,
  bubbleTranscript: 'rgba(242,242,247,0.92)',
  bubbleTranscriptText: '#636366',

  // Nav
  tabActive: '#1C1C1E',
  tabInactive: '#8E8E93',

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
 * Dark mode: every token of `colors` on iOS's black grounds (owner's pick, 2026-10-16), so
 * screens must read colours from tokens.
 */
export const nightColors: Record<keyof typeof lightColors, string> = {
  ...lightColors,
  bg: '#000000',
  bgPlain: '#000000',
  surface: '#1C1C1E',
  surfaceAlt: '#2C2C2E',
  overlay: 'rgba(0,0,0,0.6)',
  scrim: 'rgba(0,0,0,0.4)',
  glass: 'rgba(30,30,32,0.94)',
  glassLine: 'rgba(255,255,255,0.14)',
  glassActive: 'rgba(255,255,255,0.12)',
  border: '#38383A',
  borderStrong: '#48484A',
  divider: '#2C2C2E',
  text: '#FFFFFF',
  textSecondary: '#AEAEB2',
  textMuted: '#8E8E93',
  textFaint: '#636366',
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
  bubbleOther: '#262628',
  bubbleOtherText: '#FFFFFF',
  bubbleTranscript: 'rgba(28,28,30,0.92)',
  bubbleTranscriptText: '#AEAEB2',
  tabActive: '#FFFFFF',
  tabInactive: '#8E8E93',
  textOnInk: '#000000',
  dangerText: '#FF6961',
  dangerSoft: '#3A1D1D',
};

/**
 * Bedtime's own palette: the dark navy of the iOS Sleep look (owner's pick, 2026-10-14). It was
 * dark mode's palette until dark mode moved to iOS black; Bedtime keeps it in both themes.
 */
export const sleepColors: Record<keyof typeof lightColors, string> = {
  ...lightColors,
  glass: 'rgba(28,33,72,0.94)',
  glassLine: 'rgba(255,255,255,0.10)',
  glassActive: 'rgba(255,255,255,0.12)',
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

/**
 * The aurora ground (owner's pick, 2026-10-21): the app's default ground from now on. Light is
 * a dawn of peach, lavender, mint and pink on warm white; dark is a northern light of teal,
 * violet, deep blue and plum on near-black. Controls on it use the glass tokens below, so the
 * colour shows through them (HIG Materials: Liquid Glass needs a rich layer underneath).
 */
const auroraLight = {
  base: '#FBF6F1',
  blobs: ['#FFC9A3', '#C9C2FF', '#A8EBDD', '#FFD6E4'] as readonly string[],
  glass: 'rgba(255,255,255,0.46)',
  glassOn: 'rgba(255,255,255,0.78)',
  /** Top highlight and outer edge of a glass control (iOS 27: brighter rims, darker edges). */
  glassRim: 'rgba(255,255,255,0.85)',
  glassEdge: 'rgba(0,0,0,0.10)',
  /** The selected segment's thumb. */
  thumb: '#FFFFFF',
  textMuted: '#5C5C63',
  /** Solid content on the aurora (the Chats list card); glass stays on controls. */
  card: '#FFFFFF',
  separator: 'rgba(60,60,67,0.16)',
  /** Unread dots and "typing…" on the aurora. */
  tint: '#EF8A4E',
  /** The pinned chat's bubble ("Race you…", the typing dots). */
  bubble: 'rgba(255,255,255,0.9)',
  /** The light ring round a pinned avatar. */
  ring: 'rgba(255,255,255,0.7)',
};

const auroraDark: typeof auroraLight = {
  base: '#05060F',
  blobs: ['#0F7F72', '#4B32B8', '#123A8C', '#7A2466'],
  glass: 'rgba(255,255,255,0.10)',
  glassOn: 'rgba(255,255,255,0.22)',
  glassRim: 'rgba(255,255,255,0.28)',
  glassEdge: 'rgba(0,0,0,0.6)',
  thumb: 'rgba(255,255,255,0.24)',
  textMuted: '#B4B4BE',
  card: '#1C1C1E',
  separator: 'rgba(84,84,88,0.5)',
  tint: '#FFB27A',
  bubble: 'rgba(44,44,46,0.92)',
  ring: 'rgba(255,255,255,0.14)',
};

export const aurora = isDark ? auroraDark : auroraLight;

/**
 * Today's module tiles (owner's pick, 2026-10-21): each clay icon sits on an iOS app-icon
 * squircle in its own colour, lighter at the top, deeper and quieter in dark mode (HIG App
 * icons: dark icons are more subdued, colour backgrounds keep contrast).
 */
export const moduleTiles: Record<string, readonly [string, string]> = isDark
  ? {
      store: ['#5A3A24', '#3A2416'],
      photo: ['#22405E', '#14283C'],
      contacts: ['#1C4A42', '#112E29'],
      gifts: ['#5A2440', '#3A1629'],
      radio: ['#584218', '#38290F'],
      board: ['#3E2E5E', '#271C3C'],
      calls: ['#1E4A2E', '#122E1C'],
      diary: ['#4E3C2A', '#30241A'],
      date: ['#5A2E28', '#3A1C18'],
      sleep: ['#2C2A5E', '#1B1A3C'],
    }
  : {
      store: ['#FFE7D2', '#FFC69A'],
      photo: ['#DDEEFF', '#A9D2FF'],
      contacts: ['#DDF7F1', '#A6E9DA'],
      gifts: ['#FFE2EE', '#FFB3CF'],
      radio: ['#FFF1D2', '#FFD98F'],
      board: ['#EEE6FF', '#CDB8FF'],
      calls: ['#DDF6E5', '#A8E6BD'],
      diary: ['#F7ECDD', '#E6CBA6'],
      date: ['#FFE3DC', '#FFB6A4'],
      sleep: ['#E4E3FF', '#B9B6FF'],
    };

/**
 * Today's widgets. Calls is iOS graphite (systemGray6 dark), Sleep a night sky; the other
 * widgets are plain cards (`colors.surface`).
 */
export const widgetTones = {
  calls: isDark ? '#2C2C2E' : '#1C1C1E',
  sleep: ['#2A2D6E', '#12143A'] as const,
};

/** Tinted widgets (Gifts, Store, Radio, Board, Contacts): gradient, title ink, line ink. */
export const widgetTints: Record<string, { bg: readonly [string, string]; ink: string; sub: string }> = isDark
  ? {
      gifts: { bg: ['#5A2440', '#2E1222'], ink: '#FFFFFF', sub: '#F2B8CF' },
      store: { bg: ['#5A3A24', '#2E1C10'], ink: '#FFFFFF', sub: '#F2CBA8' },
      radio: { bg: ['#584218', '#2A1F08'], ink: '#FFFFFF', sub: '#F2D9A0' },
      board: { bg: ['#3E2E5E', '#1E1630'], ink: '#FFFFFF', sub: '#CFC2F2' },
      contacts: { bg: ['#1C4A42', '#0E2420'], ink: '#FFFFFF', sub: '#A8E6D8' },
    }
  : {
      gifts: { bg: ['#FFE2EE', '#FFB9D3'], ink: '#5A1634', sub: '#8A3A5C' },
      store: { bg: ['#FFEBDA', '#FFC9A0'], ink: '#5A2A0C', sub: '#8A4A1E' },
      radio: { bg: ['#FFF4DA', '#FFDE9C'], ink: '#4A3300', sub: '#7A5A10' },
      board: { bg: ['#F1EAFF', '#D4C2FF'], ink: '#2E1E5A', sub: '#5A4A8A' },
      contacts: { bg: ['#E2F8F2', '#AEEBDD'], ink: '#0E3E35', sub: '#2E6A5E' },
    };

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
  home: (isDark ? ['#000000', '#000000'] : ['#F2F2F7', '#F2F2F7']) as readonly [string, string],
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
