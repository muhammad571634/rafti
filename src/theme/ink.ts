import { StyleSheet, TextStyle } from 'react-native';

import { night, palette } from './colors';
import { fonts } from './typography';

/**
 * Ink: the one look every screen moves to (docs/design-ink.md, amended by docs/design-ink-polish.md
 * and docs/agent-tasks/design-audit-2026-11-15.md §8). The app is night only, so these are the night
 * values; screens read roles from here instead of writing sizes, colours and radii of their own.
 */
const ground = night.ground;

export const ink = {
  /** The screen. */
  ground: ground.ground,
  /** A card on the ground (records, groups of rows, tiles' frame). */
  card: ground.card,
  /** Chips, fields, round buttons, a secondary pill: Apple's fill on dark. */
  raised: 'rgba(118,118,128,0.24)',
  /** The chosen segment's thumb on a `raised` track (Apple's dark segmented control). */
  thumb: '#636366',
  /** The separator between rows (0.5 pt). */
  line: 'rgba(84,84,88,0.6)',
  /** The faint rim that keeps a card's edge on the ground. */
  edge: 'rgba(255,255,255,0.08)',
  /** Clear dark glass over photography (hero actions, voice pills, header buttons on photos). */
  photoGlass: 'rgba(20,20,26,0.48)',
  photoGlassRim: 'rgba(255,255,255,0.26)',
  /** Floating metadata badge over photography (level, mood). */
  photoBadge: 'rgba(9,9,13,0.52)',
  /** The dark fade at the foot of a photo card, under its badge. */
  scrim: 'rgba(9,9,13,0.6)',
  photoBadgeRim: 'rgba(255,255,255,0.16)',
  /** Subtle progress bar track on cards and over photos. */
  hairlineFill: 'rgba(255,255,255,0.12)',
  /** A bar pinned over the ground (the bottom dock): nearly opaque, so rows under it never ghost through. */
  dock: 'rgba(9,9,13,0.94)',
  /** The ground fading in from clear, under something floating at the bottom (the tab bar). */
  groundFade: ['rgba(9,9,13,0)', 'rgba(9,9,13,0.94)'] as readonly [string, string],
  /** Calm night rose pill for bond streaks. */
  streakFill: 'rgba(255,140,192,0.16)',
  streakText: '#FFA8D0',
  text: '#FFFFFF',
  /** Secondary text: 6.4:1 on the ground (polish §2; Apple's 0.6 read too faint on the A51). */
  text2: 'rgba(235,235,245,0.62)',
  /** The lowest any text may go (5.4:1). */
  text3: 'rgba(235,235,245,0.55)',
  /** Placeholders only. */
  placeholder: 'rgba(235,235,245,0.3)',
  /** The one filled pill per screen, and the words on it. */
  pill: '#FFFFFF',
  onPill: '#000000',
  /** The user's side and money: the brand's peach, the calm night tone (no glare). */
  accent: palette.apricotCalm,
  onAccent: '#3A1A06',
  danger: '#FF453A',
  unread: '#0A84FF',
} as const;

/** Radii: cards 28, tiles 32, fields 20, a list row's own card 20 (Chats), sheets 34; everything round is a pill. */
export const inkRadius = { card: 28, tile: 32, field: 20, row: 20, sheet: 34, chip: 18, pill: 999 } as const;

/** The side gutter of every Ink screen. */
export const inkGutter = 20;

const serif = (size: number, line: number, tracking: number): TextStyle => ({
  fontFamily: fonts.serif,
  fontSize: size,
  lineHeight: line,
  letterSpacing: tracking,
  color: ink.text,
});

const system = (size: number, line: number, weight: TextStyle['fontWeight'] = '400', color: string = ink.text): TextStyle => ({
  fontFamily: fonts.body,
  fontSize: size,
  lineHeight: line,
  fontWeight: weight,
  color,
});

/**
 * Type roles on the iOS Dynamic Type "Large" steps (polish §1): the serif says, the system face reads.
 * No other sizes in screens; if a role is missing, add it here.
 */
export const inkType = StyleSheet.create({
  /** A screen's title (Large Title). */
  display: serif(34, 41, -0.5),
  /** A question or a moment's headline (Title 1). */
  title: serif(28, 34, -0.4),
  /** A section or a card's line (Title 2). */
  card: serif(22, 28, -0.25),
  /** A smaller card's line (Title 3). */
  cardSmall: serif(20, 25, -0.2),
  /** A big count or a time. */
  numeral: { ...serif(72, 76, -1.5), fontVariant: ['tabular-nums', 'lining-nums'] },
  /** A clock or count that leads a moment (an alarm's list time, the next wake-up). */
  numeralMid: { ...serif(52, 58, -1), fontVariant: ['tabular-nums', 'lining-nums'] },
  /** A clock inside a row or a timer (an alarm row, the bedtime timer). */
  numeralSmall: { ...serif(36, 42, -0.6), fontVariant: ['tabular-nums', 'lining-nums'] },
  /** A figure on a card (days together, a level inside its rings): Title 1 in the system face. */
  figure: { ...system(28, 34, '700'), letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  /** A figure inside a row (a pack's shells, a price): Title 2 in the system face. */
  figureSmall: { ...system(22, 28, '700'), letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  /** A widget's headline number (a plan's time, a balance): Large Title in the system face. */
  figureLarge: { ...system(34, 41, '700'), letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  /** A quiet measure (how full your profile is): Large Title in the system face, light, as Apple's Health summaries. */
  figureThin: { ...system(34, 41, '300'), letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  /** Its unit beside it ("%"), Title 3 light. */
  figureThinUnit: system(20, 25, '300', ink.text2),
  body: system(17, 22),
  bodyStrong: system(17, 22, '600'),
  /** Chips, segments, a secondary line (Subheadline). */
  sub: system(15, 20, '400', ink.text2),
  subStrong: system(15, 20, '600'),
  /** Section labels, field labels, timestamps (Footnote). */
  footnote: system(13, 18, '400', ink.text2),
  /** A widget's small line (Footnote, semibold): 13 pt, a step over Caption for the A51's eyes (owner, 2026-11-16). */
  footnoteStrong: system(13, 17, '600', ink.text2),
  /** Capsules, icon labels (Caption 1). */
  caption: system(12, 16, '600', ink.text2),
  /** Small trait tags on a two-column card, side by side as PolyBuzz's (Caption 2, Apple's 11 pt floor). */
  tag: system(11, 14, '500', ink.text2),
  /** Editorial serif italic line: a friend's quote in a moment, an opening hook, a voice caption. */
  quote: {
    fontFamily: fonts.serifItalic,
    fontSize: 15,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.74)',
  },
});

export type InkRole = keyof typeof inkType;

/**
 * A role's face, size and weight without its colour: for shared parts whose text takes its colour
 * from elsewhere (a Txt `color`, a red row, words on a picture).
 */
export function inkFace(role: InkRole): TextStyle {
  const { color: _color, ...face } = inkType[role] as TextStyle;
  return face;
}

/** The italic, coloured part of a serif line ("New chapter: *the race*"). */
export const inkEm = (color: string): TextStyle => ({ fontFamily: fonts.serifItalic, color });

/**
 * Soft deep tints for tiles and folders (sky, sea, sun, dusk, night, rose): calm on the night
 * ground, never loud (owner, 2026-11-13). Each is a two-stop wash, top-left to bottom-right.
 */
export const inkTints = [
  ['#22364C', '#1B2C40'],
  ['#183B39', '#14312F'],
  ['#3E3322', '#342A1B'],
  ['#2E2944', '#272239'],
  ['#25294A', '#1F233F'],
  ['#40263A', '#361F31'],
] as const satisfies readonly (readonly [string, string])[];

/**
 * The six chat reactions' own hues (audit 2026-11-15 §6.5, prototype `docs/prototypes/reactions-apple.html`):
 * each glyph in the pick bar is drawn in its hue. On a message the disc takes the reactor's colour instead.
 */
export const inkReaction = {
  love: '#FF6B81',
  laugh: '#FFC94D',
  wow: '#6CC4FF',
  sad: '#9DB0FF',
  hyped: '#FF8A3D',
  thumbs: '#52D9A2',
} as const;

/**
 * Liquid Glass drawn without a live blur (owner's pick A, 2026-11-16, `docs/prototypes/tab-bar.html`): the Android
 * tab bar's dark glass. A Galaxy A51 cannot afford a blur layer per frame, so the glass is a near-opaque top-to-bottom
 * wash with a hairline rim and a lit top edge, no shadow; the current tab sits in a clear lens. Monochrome over colourful art
 * (HIG Tab bars). iPhone keeps the system bar, which is real Liquid Glass.
 */
export const inkGlass = {
  /** The glass, top to bottom, and where each stop sits. */
  fill: ['#2F2F37', '#1B1B21', '#131319'],
  fillStops: [0, 0.46, 1],
  /** The hairline edge all round, and the brighter line along the top. */
  rim: 'rgba(255,255,255,0.12)',
  topLight: 'rgba(255,255,255,0.22)',
  /** The current tab's lens and its rim. */
  lens: ['rgba(255,255,255,0.20)', 'rgba(255,255,255,0.09)'],
  lensRim: 'rgba(255,255,255,0.16)',
  /** The glass's flat equal (the bar's own fill under the wash, the badge's ring). */
  flat: '#1D1D23',
  on: '#FFFFFF',
  off: 'rgba(255,255,255,0.55)',
} as const;

/**
 * Liquid Peach Glass (approved prototype `find-liquid-peach-prototype.html`, 2026-11-22):
 * Matches the Android Liquid Glass tab bar's active peach lens for segments, filter chips,
 * and primary CTAs across the app (`+` icon buttons stay in their existing style per owner).
 */
export const inkPeachGlass = {
  /** Segments, filter chips, active lenses (matches Tab Bar `PEACH_LENS`). */
  fill: ['rgba(235,173,132,0.23)', 'rgba(235,173,132,0.10)'] as readonly [string, string],
  rim: 'rgba(235,173,132,0.40)',
  text: palette.apricotCalm,
  /** Primary CTAs ("Seç", "Create", "Continue"): slightly brighter luminous peach glass. */
  ctaFill: ['rgba(235,173,132,0.34)', 'rgba(235,173,132,0.15)'] as readonly [string, string],
  ctaRim: 'rgba(235,173,132,0.54)',
  ctaText: '#FCE2CE',
  /** Dark capsule track behind a segmented control. */
  trackFill: ['#252530', '#16161D', '#111117'] as readonly [string, string, string],
  trackStops: [0, 0.56, 1] as readonly [number, number, number],
  trackRim: 'rgba(255,255,255,0.13)',
  /** Flat tint when a gradient layer isn't used. */
  flat: 'rgba(235,173,132,0.18)',
} as const;
