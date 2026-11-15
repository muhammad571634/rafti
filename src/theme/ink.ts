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
  /** The separator between rows (0.5 pt). */
  line: 'rgba(84,84,88,0.6)',
  /** The faint rim that keeps a card's edge on the ground. */
  edge: 'rgba(255,255,255,0.08)',
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
  /** The user's side and money: the brand's peach. */
  accent: palette.apricot400,
  onAccent: '#3A1A06',
  danger: '#FF453A',
  unread: '#0A84FF',
} as const;

/** Radii: cards 28, tiles 32, fields 20, sheets 34; everything round is a pill. */
export const inkRadius = { card: 28, tile: 32, field: 20, sheet: 34, chip: 18, pill: 999 } as const;

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
  /** A figure on a card (days together, a level inside its rings): Title 1 in the system face. */
  figure: { ...system(28, 34, '700'), letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  /** A widget's headline number (a plan's time, a balance): Large Title in the system face. */
  figureLarge: { ...system(34, 41, '700'), letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  body: system(17, 22),
  bodyStrong: system(17, 22, '600'),
  /** Chips, segments, a secondary line (Subheadline). */
  sub: system(15, 20, '400', ink.text2),
  subStrong: system(15, 20, '600'),
  /** Section labels, field labels, timestamps (Footnote). */
  footnote: system(13, 18, '400', ink.text2),
  /** Capsules, icon labels (Caption 1). */
  caption: system(12, 16, '600', ink.text2),
});

export type InkRole = keyof typeof inkType;

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
