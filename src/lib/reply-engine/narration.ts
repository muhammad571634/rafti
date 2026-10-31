export interface Segment {
  kind: 'speech' | 'action';
  text: string;
}

const ACTION = /\*([^*]+)\*/g;

/** "*leans in* You came." → an action span and a spoken one, for the bubble to style apart. */
export function segments(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const match of text.matchAll(ACTION)) {
    const before = text.slice(last, match.index);
    if (before) out.push({ kind: 'speech', text: before });
    out.push({ kind: 'action', text: match[1] });
    last = match.index + match[0].length;
  }
  const rest = text.slice(last);
  if (rest) out.push({ kind: 'speech', text: rest });
  return out;
}

/** A part's words with the spacing around them, so cut parts read exactly as written. */
const words = (text: string) => text.match(/\s*\S+\s*/g) ?? [];

/** How many words the parts hold, counted as `cutSegments` counts them. */
export const segmentWords = (parts: readonly Segment[]) => parts.reduce((n, part) => n + words(part.text).length, 0);

/**
 * The first `count` words of the parts, each keeping its kind: a line revealed word by word
 * (`src/lib/reveal.ts`) shows a half-said *action* in italics, never a stray asterisk.
 */
export function cutSegments(parts: readonly Segment[], count: number): Segment[] {
  const out: Segment[] = [];
  let left = count;
  for (const part of parts) {
    if (left <= 0) break;
    const taken = words(part.text).slice(0, left);
    if (!taken.length) continue;
    left -= taken.length;
    out.push({ ...part, text: taken.join('') });
  }
  return out;
}

const tidy = (text: string) => text.replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();

/** Only what is said out loud: the voice note (TTS) never reads the narration. */
export function speechOnly(text: string) {
  return tidy(text.replace(ACTION, ' '));
}

/** Narration without its asterisks, for one-line previews. */
export function plainText(text: string) {
  return tidy(text.replace(/\*/g, ''));
}
