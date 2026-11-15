/**
 * Big titles wrap by words; a single word longer than the line (German "Mitteilungseinstellungen",
 * Russian compound labels) would otherwise break mid-word, because Android's hyphenator follows the
 * phone's language, not the app's. Such a title stays on one line and shrinks to fit instead.
 */
const LONG_WORD = 14;

/** True when a title is one unbroken word long enough to overflow a large title's line. */
export function fitsOnOneLine(title: string): boolean {
  const text = title.trim();
  return text.length > LONG_WORD && !/\s/.test(text);
}

/** Text props for a large title: one shrinking line for a long single word, normal wrapping otherwise. */
export function titleFit(title: unknown): { numberOfLines?: number; adjustsFontSizeToFit?: boolean; minimumFontScale?: number } {
  if (typeof title !== 'string' || !fitsOnOneLine(title)) return {};
  return { numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: 0.55 };
}
