import i18n from 'i18next';

import en from './content/en.json';
import { overlay } from './overlay';

export { overlay };

/**
 * Built-in content translations keyed by language code.
 * New languages are registered here as they are added in Phase 3.
 */
export const CONTENT: Record<string, Record<string, unknown> | undefined> = {
  en,
};

const cache = new Map<string, unknown>();

/** A content section in the screen language, e.g. `localized('datePlaces', DATE_PLACES)`; same object while the language stays. */
export function localized<T>(section: string, enVal: T): T {
  const lang = i18n.language;
  const key = `${lang}:${section}`;
  if (!cache.has(key)) cache.set(key, overlay(enVal, CONTENT[lang]?.[section]));
  return cache.get(key) as T;
}

/** An official character as the user sees it; anyone else's character is theirs and unchanged. */
export function localCharacter<T extends { id: string; isOfficial?: boolean }>(c: T): T {
  if (!c.isOfficial) return c;
  return overlay(c, (CONTENT[i18n.language]?.characters as Record<string, unknown> | undefined)?.[c.id]);
}

/** Overlay for a diary entry by id. */
export function localDiaryEntry<T extends { id: string }>(entry: T): T {
  return overlay(entry, (CONTENT[i18n.language]?.diaryEntries as Record<string, unknown> | undefined)?.[entry.id]);
}

/** Overlay for a character diary page by id. */
export function localDiaryPage<T extends { id: string }>(page: T): T {
  return overlay(page, (CONTENT[i18n.language]?.diaryPages as Record<string, unknown> | undefined)?.[page.id]);
}

/** Overlay for a secret note by id. */
export function localSecretNote<T extends { id: string }>(note: T): T {
  return overlay(note, (CONTENT[i18n.language]?.secretNotes as Record<string, unknown> | undefined)?.[note.id]);
}
