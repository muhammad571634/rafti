import type { Scene } from '@/types';

/**
 * The words a moment's share poster may carry (owner 2026-11-08: a shared picture advertises the
 * character, never the user). A friend's first line can use the user's name; the poster then shows
 * where the two of them are instead, and only the title when that names them too. Pure, so it is
 * tested without a phone.
 */
export interface PosterWords {
  title: string;
  /** Their first line, when it does not name the user. */
  line?: string;
  /** Where the two of them are, when there is no line to show and it does not name the user. */
  setting?: string;
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Whether `text` holds any of the user's names as a whole word, in any case and any script. */
export function namesUser(text: string | undefined, names: readonly string[]): boolean {
  if (!text) return false;
  return names.some((raw) => {
    const name = raw.trim();
    if (name.length < 2) return false;
    // Word edges by letters and digits in any script (`\b` only knows Latin).
    return new RegExp(`(^|[^\\p{L}\\p{N}])${escape(name)}($|[^\\p{L}\\p{N}])`, 'iu').test(text);
  });
}

/** The user's names to keep off a poster: the full display name and each part of it (and of each persona's name). */
export function userNames(displayName: string | undefined, personaNames: readonly string[] = []): string[] {
  const all = [displayName ?? '', ...personaNames].flatMap((name) => [name, ...name.split(/\s+/)]);
  return [...new Set(all.map((name) => name.trim()).filter((name) => name.length >= 2))];
}

export function posterWords(scene: Pick<Scene, 'title' | 'setting' | 'opening'>, names: readonly string[]): PosterWords {
  const line = scene.opening?.trim();
  if (line && !namesUser(line, names)) return { title: scene.title, line };
  const setting = scene.setting?.trim();
  if (setting && !namesUser(setting, names)) return { title: scene.title, setting };
  return { title: namesUser(scene.title, names) ? '' : scene.title };
}
