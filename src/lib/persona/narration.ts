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

const tidy = (text: string) => text.replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();

/** Only what is said out loud: the voice note (TTS) never reads the narration. */
export function speechOnly(text: string) {
  return tidy(text.replace(ACTION, ' '));
}

/** Narration without its asterisks, for one-line previews. */
export function plainText(text: string) {
  return tidy(text.replace(/\*/g, ''));
}
