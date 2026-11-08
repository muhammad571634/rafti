/**
 * The friend's own reaction on the user's latest message (owner, 2026-11-08, canvas v3: "alive"):
 * now and then, as a person in a chat app does, they put a sticker on what you said before they
 * answer. The model adds an optional `react` field to the reply it already writes; no extra call.
 * Built once for every character, official or made by the user, in every language.
 */
import { part, type PromptPart } from './prompt-layout';

/** The chat's six stickers (`REACTION_STICKERS` in `src/assets/brand/registry.ts`, same names). */
export const REACTS = ['love', 'laugh', 'wow', 'sad', 'hyped', 'thumbs'] as const;
export type React = (typeof REACTS)[number];

export const REACT_RULES_LINES = [
  'REACTING: like a person in a chat app, you may put one sticker on their latest message before you answer.',
  '- Add "react":"love|laugh|wow|sad|hyped|thumbs" to the same JSON only when their message truly lands that way on you: something sweet to you (love), a real joke (laugh), surprising news (wow), sad news of theirs (sad), something they did or will do that excites you (hyped), a plan or yes you like (thumbs).',
  '- Most messages get none: small talk, questions and plain answers never do. Never react to a message about wanting to die or to hurt themselves.',
];

/** The model's `react` field: one of the six names, or nothing. The server and the app both run it. */
export function cleanReact(value: unknown): React | undefined {
  return typeof value === 'string' && (REACTS as readonly string[]).includes(value) ? (value as React) : undefined;
}

/**
 * Near the end, where the model looks last: with the cached rule alone a light model reacted to news
 * and jokes but passed over sweet words and sad news (probe, 2026-11-08).
 */
export const REACT_TURN_LINE = 'Their latest message: sweet to you, a real joke, big news, sad news of theirs, or a plan you like? Then put "react" on it; otherwise leave it out.';

/** The standing rule, cached with the other rules, and its reminder; a call is spoken, so it reacts with nothing. */
export const reactParts = (spoken: boolean): PromptPart[] => [
  part('reactRules', 'global', spoken ? [] : REACT_RULES_LINES),
  part('reactNow', 'turn', spoken ? [] : [REACT_TURN_LINE]),
];
