import { mockDraftReply, mockFieldReply } from '../mock/character-drafts';

import { accessToken } from './account';
import { type DraftField, type DraftInput, type DraftResult, type FieldContext, parseDraft, parseField } from './character-draft';
import { apiBase, serverStudio } from './server';

/**
 * Where the create screen asks for a draft or one field. With Real AI on (`real`), the server's
 * model writes it (`POST /v1/characters/draft`, `POST /v1/characters/draft/field`, B1.4b), and a
 * busy or slow server says so (0z149: before, a stock draft took its place unseen, the
 * model-first rule's opposite). With the model off, the mock answers after a short wait. Either
 * way the reply goes through the same checks (`parseDraft`, `parseField`).
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

export async function requestDraft(input: DraftInput, real = false): Promise<DraftResult> {
  if (real && apiBase()) {
    const fromServer = await serverStudio.draft(input, await accessToken());
    return fromServer ?? { ok: false, problem: 'busy' };
  }
  await wait(DRAFT_MS);
  return parseDraft(mockDraftReply(input));
}

/**
 * One field written again, in `language` (the server's `buildFieldPrompt`); null when nothing
 * usable came back or the server is busy. `attempt` counts the taps on that field (the mock's variety).
 */
export async function requestField(field: DraftField, character: FieldContext, language: string, attempt: number, real = false) {
  if (real && apiBase()) {
    const fromServer = await serverStudio.field(field, character, language, await accessToken());
    // undefined: the server did not answer; never a stand-in in its place.
    return fromServer ?? null;
  }
  await wait(FIELD_MS);
  return parseField(field, mockFieldReply(field, character, attempt));
}
