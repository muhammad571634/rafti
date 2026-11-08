import { Appearance } from 'react-native';

import { friendHueIndex } from '../lib/friend-color';

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
  /** The brand's ink: peach text and small icons on a light ground, readable (owner 2026-11-08). */
  apricot800: '#A8531F',
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
  cream100: '#FFFAF1',
  cream200: '#FBF1DF',
  cream300: '#F0E2C6',

  // Caramel — Rafti's fur, warm shadows
  caramel300: '#E3BE9C',

  // Neutrals: warm lines, ink-blue text
  white: '#FFFFFF',
  gray100: '#F5F0EA',
  gray300: '#DAD1C6',
  gray400: '#B3B5C1',
  gray500: '#8D90A0',
  gray600: '#6B6F82',
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
  /** Fades the chat behind a message being edited, so the field stands out. */
  veil: 'rgba(255,255,255,0.72)',
  /** The floating tab bar's frosted fill, its hairline and the current tab's capsule. */
  glass: 'rgba(255,255,255,0.94)',
  glassLine: 'rgba(0,0,0,0.10)',
  glassActive: 'rgba(120,120,128,0.14)',

  // Lines
  border: '#E5E5EA',
  /** An inset well inside a card (Gifts' code box, Photo Booth's and the frame editor's trays). */
  well: '#F2F2F7',
  /** The empty part of a progress bar. */
  track: '#E5E5EA',
  borderStrong: '#D1D1D6',
  divider: '#EFEFF4',

  // Text
  text: '#1C1C1E',
  textSecondary: '#636366',
  textMuted: '#8E8E93',
  textFaint: '#AEAEB2',
  textOnPrimary: palette.peachInk,
  /** Text or icon on an ink fill (unread count, ticked box, selected segment). */
  textOnInk: palette.white,

  // Brand (owner, 2026-11-08): one peach, #FFC497, the alarm editor's on colour, for buttons, the
  // chosen state, dots and rings in both themes; never the deep Claude-like orange (#EF8A4E). Small
  // peach text and icons on a light ground use `brandText`, the same hue made readable.
  primary: palette.apricot300,
  primaryFill: palette.apricot300,
  primarySoft: palette.apricot100,
  primarySofter: palette.apricot50,
  // Tinted text: a step darker than `primary` so it reads on white (3.8:1 vs 2.5:1).
  brandText: palette.apricot800,

  // Accent (Secret Note / relationship)
  accent: palette.mint500,
  accentSoft: palette.mint100,

  // On a photo or blurred portrait (call screens)
  onMedia: palette.white,
  onMediaMuted: 'rgba(255,255,255,0.75)',
  onMediaGlass: 'rgba(255,255,255,0.16)',
  onMediaSoft: 'rgba(255,255,255,0.88)',
  /** Hairline round a glass chip on a photo. */
  onMediaHairline: 'rgba(255,255,255,0.28)',
  /** The solid round action sitting on a photo (the Today hero's chat button). */
  onMediaButton: 'rgba(255,255,255,0.92)',
  /** Their line on a picture (the Today card, a chat on an Art wallpaper): dark glass under white words. */
  onMediaBubble: 'rgba(22,22,28,0.62)',
  /** A field drawn on a picture (the Today card's "Message", the composer on an Art wallpaper). */
  onMediaField: 'rgba(28,28,34,0.58)',
  /** Under white words that sit straight on a picture (times, notes), so a bright patch never swallows them. */
  onMediaShadow: 'rgba(0,0,0,0.6)',
  /** The Today card's light over their picture, following the user's hour (Replika's room light); none by day. */
  heroDawn: 'rgba(255,164,110,0.16)',
  heroEvening: 'rgba(255,112,84,0.14)',
  heroNight: 'rgba(16,24,72,0.34)',

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
  // Your bubble wears the brand's one peach, their bubble is white with a faint rim (owner, 2026-11-08: calm, alive).
  bubbleSelf: palette.apricot300,
  bubbleSelfText: palette.gray900,
  bubbleOther: '#FFFFFF',
  bubbleOtherRim: 'rgba(31,26,23,0.07)',
  bubbleOtherText: palette.gray900,
  bubbleTranscript: 'rgba(242,242,247,0.92)',
  bubbleTranscriptText: '#636366',

  // Nav
  tabActive: '#1C1C1E',

  // Status
  danger: palette.red,
  /** Green that stays readable as text (a credit in Shell history): iOS's accessible green. */
  successText: '#248A3D',
  dangerSoft: palette.redSoft,
  success: palette.green,
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
  veil: 'rgba(0,0,0,0.62)',
  glass: 'rgba(30,30,32,0.94)',
  glassLine: 'rgba(255,255,255,0.14)',
  glassActive: 'rgba(255,255,255,0.12)',
  border: '#38383A',
  well: 'rgba(118,118,128,0.24)',
  track: '#3A3A3C',
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
  bondText: '#5FE0C4',
  bondSoft: '#163F3A',
  bubbleSelf: '#56392F',
  bubbleSelfText: '#FFFFFF',
  bubbleOther: '#262628',
  bubbleOtherRim: 'rgba(255,255,255,0.06)',
  bubbleOtherText: '#FFFFFF',
  bubbleTranscript: 'rgba(28,28,30,0.92)',
  bubbleTranscriptText: '#AEAEB2',
  tabActive: '#FFFFFF',
  textOnInk: '#000000',
  successText: '#30D158',
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
  veil: 'rgba(14,18,48,0.7)',
  border: '#2B3160',
  well: 'rgba(255,255,255,0.08)',
  track: '#2B3160',
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
  bondText: '#5FE0C4',
  bondSoft: '#163F3A',
  bubbleSelf: '#56392F',
  bubbleSelfText: '#FFFFFF',
  bubbleOther: '#1C2148',
  bubbleOtherRim: 'rgba(255,255,255,0.06)',
  bubbleOtherText: '#F4F2FF',
  bubbleTranscript: 'rgba(28,33,72,0.92)',
  bubbleTranscriptText: '#A3A8C8',
  tabActive: '#F4F2FF',
  textOnInk: '#0E1230',
  successText: '#30D158',
  dangerSoft: '#4A1F24',
};

/**
 * Dark mode follows the phone, read once at launch: every screen builds its styles from
 * `colors` when it loads, so switching the phone's theme reloads the app (`useThemeReload`).
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
  /** Baked into assets/images/aurora-*.png: re-run scripts/build-aurora.py after changing them. */
  blobs: ['#FFC9A3', '#C9C2FF', '#A8EBDD', '#FFD6E4'] as readonly string[],
  glass: 'rgba(255,255,255,0.46)',
  glassOn: 'rgba(255,255,255,0.78)',
  /** Top highlight and outer edge of a glass control (iOS 27: brighter rims, darker edges). */
  glassRim: 'rgba(255,255,255,0.85)',
  glassEdge: 'rgba(0,0,0,0.10)',
  /**
   * Today's widgets (owner, 2026-11-04, from a Payme screenshot): one milky colour for every widget,
   * ink on it, instead of a saturated block per module; opaque enough that the aurora's peach and
   * lavender do not make neighbours differ. A plain fill, not a blur: cheap on Android.
   */
  frost: 'rgba(255,255,255,0.72)',
  frostRim: 'rgba(255,255,255,0.9)',
  /** The selected segment's thumb. */
  thumb: '#FFFFFF',
  textMuted: '#5C5C63',
  /** Solid content on the aurora (the Chats list card); glass stays on controls. */
  card: '#FFFFFF',
  separator: 'rgba(60,60,67,0.16)',
  /** Tint of the soft shadow under cards and glass on the aurora (black in dark mode). */
  shadow: '#3C285A',
  /** Unread dots and "typing…" on the aurora: the brand's ink (owner 2026-11-08). */
  tint: palette.apricot800 as string,
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
  frost: 'rgba(255,255,255,0.12)',
  frostRim: 'rgba(255,255,255,0.24)',
  thumb: 'rgba(255,255,255,0.24)',
  textMuted: '#B4B4BE',
  card: '#1C1C1E',
  separator: 'rgba(84,84,88,0.5)',
  shadow: '#000000',
  tint: '#FFB27A',
  bubble: 'rgba(44,44,46,0.92)',
  ring: 'rgba(255,255,255,0.14)',
};

export const aurora = isDark ? auroraDark : auroraLight;

/**
 * Each module's own colour (owner's ask, 2026-10-24, from HIG Color and Branding). Apple gives an
 * app one accent colour for actions and status, and each kind of content its own hue (Health's
 * categories, Settings' icons). Our accent is the logo's apricot (`colors.primary`: buttons,
 * selection, unread dots), so no module wears orange except the Store, which takes the brand
 * itself, as the App Store wears Apple's blue. Mint stays the bond's.
 *
 * `moduleColors` is the app-icon gradient (Today's tiles and widgets): light at the top, deep at
 * the bottom where a widget's white text sits (3.5:1 or more).
 */
export const moduleColors: Record<string, readonly [string, string]> = {
  calls: ['#4CD964', '#17903D'],
  diary: ['#C9A47A', '#8C6A44'],
  date: ['#FF5A7E', '#E0194B'],
  sleep: ['#7A77FF', '#3F3CC4'],
  store: ['#FFA36B', '#D96526'],
  photo: ['#4F8DFF', '#0052D9'],
  contacts: ['#A8A8B0', '#6B6B72'],
  gifts: ['#FF6259', '#D92A20'],
  radio: ['#C86BF5', '#8A2FCC'],
  board: ['#5AC8FA', '#1A7FC9'],
  bond: ['#3CCFB4', '#13866F'],
  // Only ever an icon (the sealed note row), never under text.
  note: ['#FFD84D', '#F0A800'],
};

/**
 * iOS system colours (UIColor.systemRed … systemGray) with the variants iOS gives them in dark
 * mode, plus the tertiary fill and a switch thumb. Every Settings-style tile, status colour and
 * call control takes its hue from here, never from a new hex, so dark mode gets Apple's tones.
 */
export const systemColors = isDark
  ? {
      red: '#FF453A',
      orange: '#FF9F0A',
      yellow: '#FFD60A',
      green: '#30D158',
      mint: '#63E6E2',
      teal: '#40C8E0',
      cyan: '#64D2FF',
      blue: '#0A84FF',
      indigo: '#5E5CE6',
      purple: '#BF5AF2',
      pink: '#FF375F',
      brown: '#AC8E68',
      gray: '#98989D',
      gray2: '#636366',
      fill: 'rgba(118,118,128,0.24)',
      thumb: '#636366',
    }
  : {
      red: '#FF3B30',
      orange: '#FF9500',
      yellow: '#FFCC00',
      green: '#34C759',
      mint: '#00C7BE',
      teal: '#30B0C7',
      cyan: '#32ADE6',
      blue: '#007AFF',
      indigo: '#5856D6',
      purple: '#AF52DE',
      pink: '#FF2D55',
      brown: '#A2845E',
      gray: '#8E8E93',
      gray2: '#AEAEB2',
      fill: 'rgba(118,118,128,0.12)',
      thumb: '#FFFFFF',
    };

/**
 * The same hues as flat iOS system colours, with their dark-mode variants, for Settings-style row
 * tiles (chat "+" menu, Us moments, notifications, Shell history, the publish sheet), as iOS pairs
 * a gradient app icon with a flat Settings icon of the same colour.
 */
export const moduleFills: Record<string, string> = {
  calls: systemColors.green,
  diary: systemColors.brown,
  date: systemColors.pink,
  sleep: systemColors.indigo,
  store: isDark ? palette.apricot500 : palette.apricot600,
  photo: systemColors.blue,
  contacts: systemColors.gray,
  gifts: systemColors.red,
  radio: systemColors.purple,
  board: systemColors.cyan,
  bond: systemColors.mint,
  note: systemColors.yellow,
};

/**
 * The Store on the aurora (canvas "Store: Plans and Shells", 2026-10-22): the colours the canvas
 * uses beyond the aurora tokens. Peach is the brand (buy buttons, offer tags), violet is Pro.
 */
export const storeColors = isDark
  ? {
      ring: 'rgba(235,235,245,0.3)',
      tint: '#FFB27A',
      onTint: '#3A1A06',
      faint: '#636366',
      peachSoft: '#3A2416',
      peachInk: '#FFB27A',
      violetSoft: '#2E1A3C',
      violetInk: '#D9A6F5',
      inkTag: palette.white,
      inkTagText: '#1C1C1E',
      greyTag: systemColors.fill,
      proColumn: 'rgba(166,75,214,0.16)',
      proInk: '#D9A6F5',
      cta: palette.apricot400,
      ctaInk: '#3A1A06',
      bar: 'rgba(5,6,15,0.62)',
      barSolid: 'rgba(5,6,15,0.94)',
      barLine: 'rgba(255,255,255,0.14)',
    }
  : {
      ring: 'rgba(60,60,67,0.3)',
      tint: palette.apricot300,
      onTint: palette.peachInk,
      faint: '#AEAEB2',
      peachSoft: palette.apricot100,
      peachInk: '#A8531F',
      violetSoft: '#F3E8FB',
      violetInk: '#8E3BB8',
      inkTag: '#1C1C1E',
      inkTagText: palette.white,
      greyTag: systemColors.fill,
      proColumn: 'rgba(91,63,217,0.07)',
      proInk: '#5B3FD9',
      cta: palette.apricot400,
      ctaInk: palette.peachInk,
      bar: 'rgba(251,246,241,0.72)',
      barSolid: 'rgba(251,246,241,0.94)',
      barLine: 'rgba(0,0,0,0.12)',
    };

/** Gradients used on hero surfaces (expo-linear-gradient `colors` prop). */
export const gradients = {
  /** The primary button: peach, lighter at the top. */
  primary: [palette.apricot200, palette.apricot300] as const,
  call: ['#A9D3F5', '#8FB0C8', '#7E8E9A'] as const,
  /** The wake-up alarm's ringing screen: sunrise. */
  wake: ['#F6C89F', '#E9A27E', '#B9739A'] as const,
  /**
   * Left-to-right shade under the Today hero's copy, so white text reads on any scene.
   * Not decoration: it is the one gradient the flat design allows. Stops: `gradientStops`.
   */
  heroScrim: ['rgba(24,22,38,0.62)', 'rgba(24,22,38,0.28)', 'rgba(24,22,38,0)'] as const,
  /** The Today card's shade, top to bottom: the name on top, their line and the field at the bottom. */
  portraitCardScrim: ['rgba(15,18,32,0.45)', 'rgba(15,18,32,0)', 'rgba(15,18,32,0.2)', 'rgba(15,18,32,0.86)'] as const,
  /** The Today picture from the screen's top: dark under the status bar and top row, clear on the face, dark under the words. */
  heroTopScrim: ['rgba(15,18,32,0.55)', 'rgba(15,18,32,0)', 'rgba(15,18,32,0.12)', 'rgba(15,18,32,0.9)'] as const,
  /**
   * Top to bottom over an Art wallpaper in a chat: dark under the header, the picture clear, then
   * dark under the conversation, the controls and the composer. Stops: `gradientStops`.
   */
  pictureScrim: ['rgba(10,10,14,0.6)', 'rgba(10,10,14,0.05)', 'rgba(10,10,14,0.3)', 'rgba(10,10,14,0.82)', 'rgba(10,10,14,0.94)'] as const,
  /** Where the conversation ends on a picture (iOS has no fading edge): a soft dark valley. */
  pictureEdge: ['rgba(10,10,14,0)', 'rgba(10,10,14,0.5)', 'rgba(10,10,14,0)'] as const,
  /** Pro's own colour: violet into peach, on the Pro card, the Pro pill and a chosen Pro plan. */
  pro: ['#5B3FD9', '#A64BD6', '#F0795A'] as const,
} as const;

/** `locations` for the gradients above that do not spread their colours evenly. */
export const gradientStops = {
  heroScrim: [0, 0.45, 0.7] as const,
  portraitCardScrim: [0, 0.24, 0.4, 1] as const,
  heroTopScrim: [0, 0.22, 0.46, 1] as const,
  pictureScrim: [0, 0.2, 0.4, 0.66, 1] as const,
  pictureEdge: [0, 0.38, 1] as const,
} as const;

/**
 * The playful layer's ground and controls (design-style §10, owner 2026-11-07): warm cream instead
 * of the aurora on the four main tabs (warm near-black in dark mode), ink pills, soft chips.
 */
export const playful = isDark
  ? {
      ground: '#1A1613',
      ink: '#FFFFFF',
      /** A pill or chip that is off. */
      chip: 'rgba(255,255,255,0.10)',
      /** A pill that is on, and its text. */
      chipOn: '#FFFFFF',
      chipOnText: '#1F1A17',
      /** Round top-bar buttons. */
      round: 'rgba(255,255,255,0.10)',
      /** A dashed outline: an empty seat or slot waiting to be filled. */
      dash: 'rgba(255,255,255,0.28)',
      /** Inside an empty seat. */
      well: 'rgba(255,255,255,0.06)',
      card: '#2A2420',
      /** A group's bubble: one soft mint for every group. */
      group: { fill: '#1D5A47', ink: '#FFFFFF' },
      /** Streams' own tile in the pencil sheet. */
      plum: '#3A2C55',
      plumInk: '#FFFFFF',
      /** The red count chip (Unread) and the LIVE chip. */
      red: systemColors.red,
      /** Today's "Waiting for you" bubble and the sealed note's envelope, and what reads on them. */
      sun: '#8A6400',
      sunInk: '#FFFFFF',
      /** The floating tab bar's fill, a tab that is off, and the fade under the bar. */
      bar: 'rgba(42,36,32,0.95)',
      tabOff: 'rgba(255,255,255,0.62)',
      groundFade: ['rgba(26,22,19,0)', 'rgba(26,22,19,0.94)'] as const,
    }
  : {
      ground: '#FBF6EE',
      ink: '#1F1A17',
      chip: '#F3EEE6',
      chipOn: '#1F1A17',
      chipOnText: '#FFFFFF',
      round: 'rgba(31,26,23,0.07)',
      dash: 'rgba(31,26,23,0.22)',
      well: 'rgba(255,255,255,0.5)',
      card: '#FFFFFF',
      group: { fill: '#BDEBD7', ink: '#1F1A17' },
      plum: '#2B2140',
      plumInk: '#FFFFFF',
      red: systemColors.red,
      sun: '#FFC93C',
      sunInk: '#1F1A17',
      bar: 'rgba(255,255,255,0.95)',
      tabOff: 'rgba(31,26,23,0.6)',
      groundFade: ['rgba(251,246,238,0)', 'rgba(251,246,238,0.94)'] as const,
    };

/** A fill and the text that reads on it (WCAG 4.5 or more, docs/main-tabs-inventory.md). */
export interface Hue {
  fill: string;
  ink: string;
}

const INK = '#1F1A17';
/**
 * The eight friend hues: a friend's bubble in Chats, their ring on pinned faces and on Us. Light
 * ones carry ink (the blue carries white); the dark-mode set is deeper, all with white.
 */
export const friendHues: readonly Hue[] = isDark
  ? [
      { fill: '#9E3B32', ink: '#FFFFFF' },
      { fill: '#8A6400', ink: '#FFFFFF' },
      { fill: '#9A4F12', ink: '#FFFFFF' },
      { fill: '#2456B8', ink: '#FFFFFF' },
      { fill: '#5E4BA0', ink: '#FFFFFF' },
      { fill: '#1D7356', ink: '#FFFFFF' },
      { fill: '#9A3E62', ink: '#FFFFFF' },
      { fill: '#16707F', ink: '#FFFFFF' },
    ]
  : [
      { fill: '#FF6B5B', ink: INK },
      { fill: '#FFC93C', ink: INK },
      { fill: '#FF9A3C', ink: INK },
      { fill: '#2563EB', ink: '#FFFFFF' },
      { fill: '#C7B2F5', ink: INK },
      { fill: '#8FE0C0', ink: INK },
      { fill: '#FFB0C8', ink: INK },
      { fill: '#FFE07A', ink: INK },
    ];

/** A character's own hue, the same on every screen (`friendHueIndex`). */
export const friendColor = (characterId: string): Hue => friendHues[friendHueIndex(characterId, friendHues.length)];

/**
 * Today's widgets in the playful skin (four-tab prototype): each module's own light tint with ink
 * on it, deep tints with white in dark mode. Hues follow `moduleFills`, so a widget, its tile and
 * its Us moment read as one thing.
 */
export const moduleTints: Record<string, string> = isDark
  ? {
      calls: '#1E3A26',
      diary: '#3A2E22',
      date: '#4A1F2B',
      sleep: '#26254A',
      store: '#4A2E1E',
      photo: '#1D2D4A',
      contacts: '#2E2E33',
      gifts: '#4A2220',
      radio: '#37244A',
      board: '#163A44',
      bond: '#163F3A',
      note: '#4A3E10',
    }
  : {
      calls: '#CDEFD6',
      diary: '#EFE3D3',
      date: '#FFD9E2',
      sleep: '#DCDBF8',
      store: '#FFE3CF',
      photo: '#D6E6FF',
      contacts: '#E6E6EA',
      gifts: '#FFDAD7',
      radio: '#EEDCFA',
      board: '#C9EEF9',
      bond: '#CBF2E9',
      note: '#FFF0B8',
    };

/** A world's folder on Find: the front and its text, and the back panel with the tab (a shade deeper). */
export interface WorldHue extends Hue {
  back: string;
}

const worldHuesLight: Record<string, WorldHue> = {
  'Seaside Academy': { fill: '#7CC4F5', back: '#6BA9D3', ink: INK },
  'Moonlit Realm': { fill: '#B9A4F0', back: '#9F8DCE', ink: INK },
  'NEON TIDE': { fill: '#FF7AB6', back: '#DB699D', ink: INK },
  'Tidepool Café': { fill: '#FFD25C', back: '#DBB54F', ink: INK },
  'Velvet District': { fill: '#FF6B5B', back: '#DB5C4E', ink: INK },
  'Gilded Empire': { fill: '#FFB347', back: '#DB9A3D', ink: INK },
  'Ice & Arena': { fill: '#8EDBD0', back: '#7ABCB3', ink: INK },
};
const worldHuesDark: Record<string, WorldHue> = {
  'Seaside Academy': { fill: '#1F5F8B', back: '#194C6F', ink: '#FFFFFF' },
  'Moonlit Realm': { fill: '#4B3C99', back: '#3C307A', ink: '#FFFFFF' },
  'NEON TIDE': { fill: '#9A2F6B', back: '#7B2656', ink: '#FFFFFF' },
  'Tidepool Café': { fill: '#8A6400', back: '#6E5000', ink: '#FFFFFF' },
  'Velvet District': { fill: '#9E3B32', back: '#7E2F28', ink: '#FFFFFF' },
  'Gilded Empire': { fill: '#93560F', back: '#76450C', ink: '#FFFFFF' },
  'Ice & Arena': { fill: '#16707F', back: '#125A66', ink: '#FFFFFF' },
};
/** User creations and any world without its own colour: warm sand. */
const otherWorld: WorldHue = isDark
  ? { fill: '#4A403A', back: '#3B332E', ink: '#FFFFFF' }
  : { fill: '#E4DCD2', back: '#C4BDB5', ink: INK };

/** The folder colours of the worlds (the four-tab prototype), each with ink that reads on it. */
export const worldHue = (series: string): WorldHue => (isDark ? worldHuesDark : worldHuesLight)[series] ?? otherWorld;

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
