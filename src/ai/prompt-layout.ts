/**
 * The server prompt as ordered parts (Character.AI teardown item 7, after their Prompt Poet). The
 * provider's prompt cache is a prefix match: one changed byte re-bills everything after it. So every
 * part says how often it changes, and the prompt runs from what never changes to what changes on
 * every reply:
 *
 *   global     the rules, the same in every chat
 *   character  their persona and their world, the same in every chat with them
 *   chat       the user, the reply language and style, pinned memories: changes when someone edits them
 *   history    the chat itself, append-only, cut in steps (`historyStart`)
 *   turn       bond, scene, this message's memories and lore, the cue, the hints: new every reply
 *
 * A cache point ends each system tier and the history: four, Claude's maximum. The turn tier comes
 * after the history and is never cached: a line that changes now and then costs its own few tokens
 * there, where in the prefix every change would re-bill the whole history behind it. Pure and
 * provider-neutral; the server's adapter maps a layout onto its provider's request
 * (backend-plan §12.23).
 */

export type Tier = 'global' | 'character' | 'chat' | 'turn';

/** From never changes to changes every reply: the order the parts take in the prompt. */
export const TIERS: readonly Tier[] = ['global', 'character', 'chat', 'turn'];

export interface PromptPart {
  /** What it is, for logs and tests: 'rules', 'persona', 'user', 'pinned', 'bond', 'lore', 'cue' … */
  name: string;
  tier: Tier;
  text: string;
}

/** A part from its lines; one with no text is left out of the prompt. */
export const part = (name: string, tier: Tier, lines: readonly string[]): PromptPart => ({ name, tier, text: lines.join('\n') });

/** The parts in tier order, each tier in the order its builder gave them, empty ones dropped. */
export const orderParts = (parts: readonly PromptPart[]) => TIERS.flatMap((tier) => parts.filter((p) => p.tier === tier && p.text.trim()));

/** The whole prompt as one text, for single calls and tests: the parts in tier order, a blank line between. */
export const joinParts = (parts: readonly PromptPart[]) => orderParts(parts).map((p) => p.text).join('\n\n');

/** One turn of the history: the user's side or the character's. */
export interface HistoryTurn {
  role: 'user' | 'assistant';
  text: string;
}

/** How the history is cut (`historyStart`): counts are turns, the budget is characters (about 4 to a token in English). */
export interface HistoryWindow {
  /** Turns always kept, when the chat has them. */
  keep: number;
  /** How far the cut moves at once. */
  step: number;
  /** The most text the history carries before the cut moves on by more steps. */
  budget: number;
  /** Fewest turns kept even over the budget: the thread of the talk is worth more than a few cents. */
  floor: number;
  /** Turns of the chat before `turns[0]`, for a server that loads only the recent end. */
  offset: number;
}

export const HISTORY_WINDOW: HistoryWindow = { keep: 20, step: 20, budget: 24_000, floor: 6, offset: 0 };

/**
 * Where the history starts, as an index into `turns` (Character.AI's cache-aware truncation). A window
 * that slid on by one every reply would change the bytes right after the system prompt each time, so
 * the history would never be read from the cache. Here the cut sits on a multiple of `step` turns
 * counted from the chat's first turn, and moves only when the chat has grown by another step; in
 * between, every reply reads the history from the cache and pays only for its new turns. The history
 * holds `keep` to `keep + step - 1` turns; over the budget (long Story replies) the cut moves on by
 * more whole steps, never below `floor` turns. A reply right at the cut is left out too, as the
 * model's input starts on the user's side.
 */
export function historyStart(turns: readonly HistoryTurn[], window: Partial<HistoryWindow> = {}) {
  const { keep, step, budget, floor, offset } = { ...HISTORY_WINDOW, ...window };
  const total = offset + turns.length;
  let cut = Math.max(offset, Math.floor(Math.max(0, total - keep) / step) * step);
  const size = (from: number) => turns.slice(from - offset).reduce((sum, turn) => sum + turn.text.length, 0);
  while (size(cut) > budget && total - cut - step >= floor) cut += step;
  let start = cut - offset;
  while (turns[start]?.role === 'assistant') start++;
  return start;
}

/** A prompt laid out for the cache, for the server's adapter to send. */
export interface PromptLayout {
  /** One block per system tier that has text, in tier order; each ends at a cache point. */
  system: { tier: Exclude<Tier, 'turn'>; text: string }[];
  /** The history from its cut, oldest first; a cache point on its last turn. */
  history: HistoryTurn[];
  /** This reply's own lines, after the history and never cached ('' when there are none). */
  turn: string;
  /** Turns left out before the history starts. */
  cut: number;
}

export function layoutPrompt(parts: readonly PromptPart[], turns: readonly HistoryTurn[] = [], window?: Partial<HistoryWindow>): PromptLayout {
  const ordered = orderParts(parts);
  const text = (tier: Tier) => ordered.filter((p) => p.tier === tier).map((p) => p.text).join('\n\n');
  const start = historyStart(turns, window);
  return {
    system: (['global', 'character', 'chat'] as const).map((tier) => ({ tier, text: text(tier) })).filter((block) => block.text),
    history: turns.slice(start),
    turn: text('turn'),
    cut: start,
  };
}
