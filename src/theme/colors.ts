/**
 * Rafti palette — "Cocoa & Mint", built around Rafti the sea otter.
 * Raw values live in `palette`; screens should only use the semantic `colors` map
 * so a future dark theme / re-skin is a one-file change.
 */
export const palette = {
  // Apricot — the whole Home + navigation identity
  apricot50: '#FFF3E6',
  apricot100: '#FFE6CC',
  apricot200: '#FFD2A8',
  apricot300: '#FFB985',
  apricot400: '#FF9F5A',
  apricot500: '#F58B42',
  apricot600: '#E8742A',
  apricot700: '#C95F1C',

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

export const colors = {
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
  textOnPrimary: palette.white,
  textOnDark: palette.white,

  // Brand
  primary: palette.apricot600,
  primaryHover: palette.apricot700,
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

  // Bond: the only place mint carries meaning (level progress, "voice ready").
  bond: palette.mint400,
  bondText: palette.mint600,

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
  dangerSoft: palette.redSoft,
  success: palette.green,
  warning: palette.amber,
  info: palette.blue,
} as const;

/** Gradients used on hero surfaces (expo-linear-gradient `colors` prop). */
export const gradients = {
  home: ['#FFF7EC', '#FFEEDB'] as const,
  banner: ['#FFC999', '#FF9F5A'] as const,
  fab: ['#FFB272', '#E8742A'] as const,
  diary: ['#FFEBD6', '#FFF9F1', '#FFE6CC'] as const,
  secretNote: ['#EEFBF8', '#FFFFFF'] as const,
  call: ['#A9D3F5', '#8FB0C8', '#7E8E9A'] as const,
  levelUp: ['#EEFBF8', '#FFFFFF'] as const,
  incoming: ['rgba(0,0,0,0.55)', 'transparent', 'rgba(0,0,0,0.65)'] as const,
  avatarFallback: ['#FFC999', '#FF9F5A'] as const,
  night: ['#1E2A55', '#2E3B6B'] as const,
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

export type ColorToken = keyof typeof colors;
