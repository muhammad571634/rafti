/**
 * Inner thoughts (owner, 2026-11-18, canvas "Inner thoughts" pick A): under their newest reply the user
 * may peek at what the friend really thinks and did not say, the side behind their mask (Cast 2.0
 * `mask`). The model adds an optional `thought` field to the reply it already writes; no extra call.
 * Built once for every character, official or made by the user, in every language. When the user
 * opens one, the next reply hears it once, so the friend may notice ("did you just read my mind?").
 */
import { part, type PromptPart } from './prompt-layout';

/** A thought is one short sentence: longer ones are cut at a word. */
export const THOUGHT_CHARS_MAX = 160;

export const THOUGHT_RULES_LINES = [
  'INNER THOUGHT: the user can peek at what you really think behind your reply.',
  '- Add "thought":"..." to the same JSON: one short sentence, at most 20 words, in the language of your messages, in your own voice, first person: what you truly think or feel right now and did not say. It is the side behind your mask: the worry under the joke, the want under the shrug, the opinion you kept back, what you noticed and let pass.',
  '- It adds something your messages do not say: never repeat or sum them up, no *asterisks*, never spoken to the user, never a question to them.',
  '- Stay who you are, within the same limits as your messages. Leave it out in a crisis.',
];

/** Near the end, where the model looks last: the cached rule alone is easy to forget on a light model. */
export const THOUGHT_TURN_LINE = 'Also add "thought": the one thing you really think right now and did not say.';

/** The model's `thought` field: one trimmed line without wrapping quotes, or nothing. The server and the app both run it. */
export function cleanThought(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  let text = value.replace(/\s+/g, ' ').trim();
  // A model that quotes its own thought: "…" or «…».
  text = text.replace(/^["'“”«»„]+|["'“”«»„]+$/g, '').trim();
  if (!text || /^\*.*\*$/.test(text)) return undefined;
  if (text.length > THOUGHT_CHARS_MAX) text = `${text.slice(0, THOUGHT_CHARS_MAX).replace(/\s+\S*$/, '')}…`;
  return text;
}

/**
 * The thought the user just opened: their newest reply with a thought, opened, and the user wrote after
 * it. Heard once, by the next reply only: once they have answered the user's line, it is over (a push
 * line of theirs before the user wrote does not end it). Pure, so `node --test` can load it.
 */
export function openedThought(lines: readonly { author: string; kind?: string; card?: string; thought?: string; thoughtRead?: boolean }[]): string | undefined {
  const at = lines.findLastIndex((m) => m.author === 'them' && m.kind === 'text' && !m.card && !!m.thought);
  if (at < 0 || !lines[at].thoughtRead) return undefined;
  const after = lines.slice(at + 1);
  const wrote = after.findIndex((m) => m.author === 'me' && m.kind !== 'system');
  if (wrote < 0 || after.slice(wrote + 1).some((m) => m.author === 'them' && m.kind === 'text' && !m.card)) return undefined;
  // It comes back from the phone: cleaned again like the model's own field.
  return cleanThought(lines[at].thought);
}

export const openedThoughtLine = (thought: string) =>
  `They just opened your hidden thought on your last reply: "${thought}". If it fits, you may show you noticed, once and lightly (caught, flustered, teasing, or owning it); never explain how they saw it.`;

/** The standing rule, cached with the other rules, and its reminders; a call is spoken, so it has none. */
export const thoughtParts = (spoken: boolean, lines: Parameters<typeof openedThought>[0]): PromptPart[] => {
  const opened = spoken ? undefined : openedThought(lines);
  return [
    part('thoughtRules', 'global', spoken ? [] : THOUGHT_RULES_LINES),
    part('thoughtNow', 'turn', spoken ? [] : [...(opened ? [openedThoughtLine(opened)] : []), THOUGHT_TURN_LINE]),
  ];
};
