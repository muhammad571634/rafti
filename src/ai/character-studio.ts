import { mockDraftReply, mockFieldReply } from '../mock/character-drafts';

import { type DraftField, type DraftInput, type DraftResult, type FieldContext, parseDraft, parseField } from './character-draft';

/**
 * Where the create screen asks for a draft or one field. Today the mock provider answers after a
 * short wait; the server takes over with the same calls and shapes (`POST /characters/draft`,
 * `POST /characters/draft/field`, backend-plan §12.17). Either way the reply goes through the
 * same checks (`parseDraft`, `parseField`), so the screen sees what it would see in production.
 */

/**
 * Whether pictures are drawn from their looks yet (`POST /characters/portrait`). Off until the
 * image server runs: then no picture is drawn and none is charged for.
 */
export const PORTRAITS_AVAILABLE = false;

/** A picture drawn from their looks, as a URL; null when none came back (nothing is charged then). */
export async function requestPortrait(look: string): Promise<string | null> {
  void look;
  return null;
}

/** How long the mock "writes": long enough to follow the steps on screen. */
export const DRAFT_MS = 2600;
const FIELD_MS = 700;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function requestDraft(input: DraftInput): Promise<DraftResult> {
  await wait(DRAFT_MS);
  return parseDraft(mockDraftReply(input));
}

/**
 * One field written again, in `language` (the server's `buildFieldPrompt`); null when nothing
 * usable came back. `attempt` counts the taps on that field.
 */
export async function requestField(field: DraftField, character: FieldContext, language: string, attempt: number) {
  void language; // The mock writes English; the server prompt carries it.
  await wait(FIELD_MS);
  return parseField(field, mockFieldReply(field, character, attempt));
}
