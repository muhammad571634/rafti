export interface Segment {
  kind: 'speech' | 'action';
  text: string;
}

/** One stacked block inside a chat bubble (Variant A, 0z290): an aside/action or spoken text (which may hold inline emphasis). */
export type BubbleBlock =
  | { kind: 'action'; text: string }
  | { kind: 'speech'; segments: Segment[] };

const ACTION = /\*([^*]+)\*/g;
const MAX_PARTS = 24;
const MAX_PART_CHARS = 2000;

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
const joinText = (a: string, b: string) => (/[。！？]["'»”’)\]]*$/.test(a) ? `${a}${b}` : `${a} ${b}`);

/** Action text with any stray asterisks removed so a structured action never renders raw stars. */
export const cleanActionText = (text: string) => tidy(text.replace(/\*/g, ''));

/** Validates and normalizes structured bubble parts from the model or network; merges adjacent same-kind parts. */
export function cleanSegments(raw: unknown): Segment[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: Segment[] = [];
  for (const item of raw) {
    if (out.length >= MAX_PARTS) break;
    if (!item || typeof item !== 'object') continue;
    const { kind, text } = item as { kind?: unknown; text?: unknown };
    if ((kind !== 'speech' && kind !== 'action') || typeof text !== 'string') continue;
    const cleaned = (kind === 'action' ? cleanActionText(text) : tidy(text)).slice(0, MAX_PART_CHARS);
    if (!cleaned) continue;
    const prev = out[out.length - 1];
    if (prev && prev.kind === kind) prev.text = joinText(prev.text, cleaned);
    else out.push({ kind, text: cleaned });
  }
  return out.length ? out : undefined;
}

/** Canonical flat text for history, search, sync and older clients: actions wrapped in *asterisks*, speech plain. */
export function partsToText(parts: readonly Segment[]): string {
  let out = '';
  for (const part of parts) {
    const chunk = part.kind === 'action' ? cleanActionText(part.text) : tidy(part.text);
    if (!chunk) continue;
    const formatted = part.kind === 'action' ? `*${chunk}*` : chunk;
    out = out ? joinText(out, formatted) : formatted;
  }
  return out;
}

/** Only what is said out loud: the voice note (TTS) never reads the narration. */
export function speechOnly(text: string) {
  return tidy(text.replace(ACTION, ' '));
}

/** Only spoken segments of structured parts (immune to parentheses or missing asterisks). */
export function speechFromParts(parts: readonly Segment[]): string {
  let out = '';
  for (const part of parts) {
    if (part.kind !== 'speech') continue;
    const chunk = speechOnly(part.text);
    if (!chunk) continue;
    out = out ? joinText(out, chunk) : chunk;
  }
  return out;
}

/** What a message says out loud: prefers explicit `parts`, falls back to stripping *asterisks* from `text`. */
export function messageSpeech(message: { text?: string; parts?: readonly Segment[] }): string {
  return message.parts?.length ? speechFromParts(message.parts) : speechOnly(message.text ?? '');
}

/** Narration without its asterisks, for one-line previews. */
export function plainText(text: string) {
  return tidy(text.replace(/\*/g, ''));
}

const SENTENCE_END = /(?:[.!?…。！？:—]\s*["'»”’)\]]*|\n)\s*$/;

/** Single-word *emphasis* tucked inside a spoken sentence stays inline instead of splitting the sentence into blocks. */
function isInlineEmphasis(prev: Segment | undefined, action: string, next: Segment | undefined): boolean {
  if (prev?.kind !== 'speech' || next?.kind !== 'speech') return false;
  if (!prev.text.trim() || !next.text.trim()) return false;
  if (SENTENCE_END.test(prev.text) || /^\s*\n/.test(next.text)) return false;
  return !/\s/.test(action);
}

/**
 * Turns a message's structured `parts` (or legacy `*action*` text) into stacked blocks inside one
 * bubble (Variant A, 0z290): stage directions in their own quiet block, spoken text cleanly trimmed
 * without leading-space indent.
 */
export function bubbleBlocks(message: { text?: string; parts?: readonly Segment[] }): BubbleBlock[] {
  if (message.parts?.length) {
    const out: BubbleBlock[] = [];
    for (const part of message.parts) {
      const text = part.kind === 'action' ? cleanActionText(part.text) : tidy(part.text);
      if (!text) continue;
      if (part.kind === 'action') {
        const prev = out[out.length - 1];
        if (prev?.kind === 'action') prev.text = joinText(prev.text, text);
        else out.push({ kind: 'action', text });
      } else {
        const prev = out[out.length - 1];
        if (prev?.kind === 'speech') prev.segments.push({ kind: 'speech', text: ` ${text}` });
        else out.push({ kind: 'speech', segments: [{ kind: 'speech', text }] });
      }
    }
    return out;
  }

  const raw = segments(message.text ?? '');
  const out: BubbleBlock[] = [];
  const pushSpeech = (seg: Segment) => {
    const prev = out[out.length - 1];
    if (prev?.kind === 'speech') prev.segments.push(seg);
    else out.push({ kind: 'speech', segments: [seg] });
  };

  for (let i = 0; i < raw.length; i++) {
    const part = raw[i];
    if (part.kind === 'action') {
      const action = cleanActionText(part.text);
      if (!action) continue;
      if (isInlineEmphasis(raw[i - 1], action, raw[i + 1])) {
        pushSpeech({ kind: 'action', text: action });
      } else {
        out.push({ kind: 'action', text: action });
      }
    } else {
      if (!part.text.trim()) {
        if (out[out.length - 1]?.kind === 'speech') pushSpeech(part);
        continue;
      }
      pushSpeech(part);
    }
  }

  // Trim boundary whitespace on each speech block so a block right after an action never indents by a leading space.
  return out
    .map((block) => {
      if (block.kind === 'action') return block;
      const segs = block.segments.map((s) => ({ ...s }));
      if (segs.length) segs[0].text = segs[0].text.replace(/^[ \t\n]+/, '');
      if (segs.length) segs[segs.length - 1].text = segs[segs.length - 1].text.replace(/[ \t\n]+$/, '');
      const kept = segs.filter((s) => s.text.length > 0);
      return kept.length ? { kind: 'speech' as const, segments: kept } : null;
    })
    .filter((b): b is BubbleBlock => b !== null);
}

/** Word count across stacked bubble blocks, matching `cutBlocks`. */
export const blockWords = (blocks: readonly BubbleBlock[]) =>
  blocks.reduce((n, b) => n + (b.kind === 'action' ? words(b.text).length : segmentWords(b.segments)), 0);

/** Reveals stacked bubble blocks word by word without cutting a block's structure. */
export function cutBlocks(blocks: readonly BubbleBlock[], count: number): BubbleBlock[] {
  const out: BubbleBlock[] = [];
  let left = count;
  for (const block of blocks) {
    if (left <= 0) break;
    if (block.kind === 'action') {
      const taken = words(block.text).slice(0, left);
      if (!taken.length) continue;
      left -= taken.length;
      out.push({ kind: 'action', text: taken.join('').trimEnd() });
    } else {
      const total = segmentWords(block.segments);
      const taken = cutSegments(block.segments, left);
      if (!taken.length) continue;
      left -= Math.min(left, total);
      out.push({ kind: 'speech', segments: taken });
    }
  }
  return out;
}
