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

/** Scripts written without spaces between words (Chinese, Japanese, Thai) may break anywhere. */
const NO_SPACES = /[฀-๿぀-ヿ㐀-鿿豈-﫿]/;

/**
 * True when the laid-out lines split a word across a line end ("Regne" / "rische Straße"): a line
 * that ends in a letter or digit followed by one that starts with one. Lines from `onTextLayout`.
 */
export function breaksMidWord(lines: readonly string[]): boolean {
  if (lines.length < 2 || NO_SPACES.test(lines.join(''))) return false;
  for (let i = 0; i < lines.length - 1; i++) {
    if (/[\p{L}\p{N}]$/u.test(lines[i]) && /^[\p{L}\p{N}]/u.test(lines[i + 1])) return true;
  }
  return false;
}

/** The smallest a word-safe text shrinks to before it lets a word break. */
export const WORD_SAFE_FLOOR = 0.6;

/** The next, smaller scale while a word still breaks; null once it fits or the floor is reached. */
export function nextWordScale(scale: number): number | null {
  const next = Math.round((scale - 0.08) * 100) / 100;
  return next >= WORD_SAFE_FLOOR ? next : null;
}
