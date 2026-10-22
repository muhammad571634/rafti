import { detectCrisis } from '../ai/safety';

/**
 * Radio clips (F27): a friend says the user's words in their voice. Pure on purpose, like
 * group-chat.ts: the server copies the limits, the price and the checks.
 */

/** A clip holds at most this many lines (approved prototype, 2026-10-15). */
export const CLIP_MAX_LINES = 5;
export const CLIP_LINE_MAX = 120;
export const CLIP_TITLE_MAX = 40;
/** Owner decision 2026-10-15: every 5 lines cost 1 shell, so a clip costs 1. */
export const LINES_PER_SHELL = 5;

export function clipCost(lineCount: number) {
  return Math.max(1, Math.ceil(lineCount / LINES_PER_SHELL));
}

/** Trimmed lines with single spaces, empty ones dropped, each and the list cut to size. */
export function cleanLines(lines: string[]): string[] {
  return lines
    .map((line) => line.replace(/\s+/g, ' ').trim().slice(0, CLIP_LINE_MAX).trim())
    .filter(Boolean)
    .slice(0, CLIP_MAX_LINES);
}

/** About how long a friend takes to say one line: 2.5 words a second and a short breath. */
export function lineSeconds(line: string) {
  const words = line.split(/\s+/).filter(Boolean).length;
  return Math.max(1.2, words / 2.5 + 0.6);
}

/** The clip's length in whole seconds (the mock voice; real builds read the audio file). */
export function clipDuration(lines: string[]) {
  return Math.max(1, Math.ceil(lines.reduce((sum, line) => sum + lineSeconds(line), 0)));
}

/** The line being said `elapsed` seconds in; the last line once the clip is over. */
export function lineAt(lines: string[], elapsed: number) {
  let end = 0;
  for (let i = 0; i < lines.length; i++) {
    end += lineSeconds(lines[i]);
    if (elapsed < end) return i;
  }
  return Math.max(0, lines.length - 1);
}

/** The name the user typed, or the first line when they left it empty. */
export function clipTitle(title: string, lines: string[]) {
  const typed = title.replace(/\s+/g, ' ').trim().slice(0, CLIP_TITLE_MAX).trim();
  if (typed) return typed;
  const first = lines[0] ?? '';
  return first.length > CLIP_TITLE_MAX ? `${first.slice(0, CLIP_TITLE_MAX - 1).trimEnd()}…` : first;
}

export type ClipProblem = 'noLines' | 'crisis';

/**
 * Why a clip cannot be recorded, or null. A line that reads like the user may be in danger
 * is not voiced; the screen shows the helpline instead. Rude words are the server's job.
 */
export function checkClip(lines: string[]): ClipProblem | null {
  const clean = cleanLines(lines);
  if (!clean.length) return 'noLines';
  if (clean.some((line) => detectCrisis(line))) return 'crisis';
  return null;
}

/** A friend's clip opens once the user's level with them reaches `unlockLevel`. */
export function clipUnlocked(unlockLevel: number | undefined, level: number | undefined) {
  return !unlockLevel || (level ?? 0) >= unlockLevel;
}

/**
 * The friend's level-gated clips that a step from level `from` to level `to` opens: the friend
 * sends each one to the chat when it opens (2026-10-22). Clips open to everyone are not sent.
 */
export function clipsOpenedBy<T extends { characterId: string; unlockLevel?: number }>(
  gifts: readonly T[],
  characterId: string,
  from: number,
  to: number,
): T[] {
  return gifts.filter((g) => g.characterId === characterId && !!g.unlockLevel && from < g.unlockLevel && to >= g.unlockLevel);
}
