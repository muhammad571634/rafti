/**
 * The Ink kit (docs/design-ink.md §2, docs/agent-tasks/design-audit-2026-11-15.md): every screen that
 * moves to the Ink look is built from these parts and the roles in `@/theme/ink`, never from sizes,
 * colours or radii of its own. Extend a part here rather than styling around it in a screen.
 */
export { GlowCard, type GlowCardProps } from './glow-card';
export { listReorder } from './motion';
export { InkScreen, type InkScreenProps } from './ink-screen';
export { InkSegmented, type InkSegmentedOption, type InkSegmentedProps } from './ink-segmented';
export { InkChip, type InkChipProps } from './ink-chip';
export { INK_DOCK_SPACE, InkDock } from './ink-dock';
export {
  InkFriendPill,
  type InkFriendPillProps,
  InkGlassPill,
  type InkGlassPillProps,
  InkIconButton,
  type InkIconButtonProps,
  InkNavBar,
  type InkNavBarProps,
} from './ink-nav-bar';
export { InkEm, InkText, type InkTextProps } from './ink-text';
export { PhotoGlassPill, type PhotoGlassPillProps } from './glass-pill';
export { PillButton, type PillButtonProps, type PillKind } from './pill-button';
export { Tile, tileTint, type TileProps } from './tile';
export { REACTION_BADGE_SIZE, ReactionBadge, type ReactionBadgeProps, ReactionGlyph, type ReactionGlyphProps } from './reaction-glyph';
