import type { PhotoFrame, UserFrame } from '../types';

/**
 * Photo Booth frames the user makes (F29): pieces to pick from, never an uploaded image, so
 * there is nothing to moderate. A world's frame is won in its world quiz (src/lib/quiz.ts).
 */

export const FRAME_NAME_MAX = 24;
export const FRAME_CAPTION_MAX = 24;
export const FRAME_STICKERS_MAX = 2;

/** Card colors and the ink that reads on each. */
export const FRAME_COLORS = [
  { id: 'white', bg: '#FFFFFF', ink: '#2A2E45' },
  { id: 'pink', bg: '#FFB8CB', ink: '#8E2A4E' },
  { id: 'sky', bg: '#BFE0F7', ink: '#24506E' },
  { id: 'mint', bg: '#C7EBD9', ink: '#24614A' },
  { id: 'butter', bg: '#FFE6A3', ink: '#6E5212' },
  { id: 'night', bg: '#2A2E45', ink: '#F5E7A8' },
] as const;

export const FRAME_PATTERNS = ['none', 'dots', 'stripes', 'check'] as const;

/** Clay icons a frame may carry. */
export const FRAME_STICKERS = ['sparkles', 'sun', 'music', 'cake', 'fish', 'camera'] as const;

const colorOf = (id: string) => FRAME_COLORS.find((c) => c.id === id) ?? FRAME_COLORS[0];

/** The look a user's frame gives a picture. */
export function frameLook(frame: Pick<UserFrame, 'color' | 'pattern' | 'stickers' | 'caption'>): PhotoFrame {
  const color = colorOf(frame.color);
  return {
    bg: color.bg,
    pattern: frame.pattern,
    patternColor: color.id === 'white' ? 'rgba(42,46,69,0.10)' : 'rgba(255,255,255,0.55)',
    ink: color.ink,
    stickers: frame.stickers.slice(0, FRAME_STICKERS_MAX),
    caption: frame.caption.trim() || undefined,
  };
}

/** Adds or removes a sticker; a third one replaces the oldest. */
export function toggleSticker(stickers: string[], id: string) {
  if (stickers.includes(id)) return stickers.filter((s) => s !== id);
  return [...stickers, id].slice(-FRAME_STICKERS_MAX);
}
