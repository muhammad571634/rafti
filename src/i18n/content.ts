import i18n from 'i18next';

import de from './content/de.json';
import en from './content/en.json';
import es from './content/es.json';
import fr from './content/fr.json';
import id from './content/id.json';
import it from './content/it.json';
import ja from './content/ja.json';
import ko from './content/ko.json';
import ptBR from './content/pt-BR.json';
import ru from './content/ru.json';
import th from './content/th.json';
import tr from './content/tr.json';
import vi from './content/vi.json';
import zhHant from './content/zh-Hant.json';
import { phrase } from './index';
import { overlay } from './overlay';
import { setContentSource, setPhraseSource, setVoiceSource } from './voice';

export { overlay };

/**
 * Built-in content translations keyed by language code.
 * New languages are registered here as they are added in Phase 3.
 */
export const CONTENT: Record<string, Record<string, unknown> | undefined> = {
  de,
  en,
  es,
  fr,
  id,
  it,
  ja,
  ko,
  'pt-BR': ptBR,
  ru,
  th,
  tr,
  vi,
  'zh-Hant': zhHant,
};

const cache = new Map<string, unknown>();

i18n.on?.('languageChanged', () => {
  cache.clear();
});

setVoiceSource((section, en) => {
  const lang = i18n.language || 'en';
  const key = `${lang}:voice:${section}`;
  if (!cache.has(key)) cache.set(key, overlay(en, (CONTENT[lang]?.voice as Record<string, unknown> | undefined)?.[section]));
  return cache.get(key) as typeof en;
});

setPhraseSource(phrase);

/** A content section in the screen language, e.g. `localized('datePlaces', DATE_PLACES)`; same object while the language stays. */
export function localized<T>(section: string, enVal: T): T {
  const lang = i18n.language || 'en';
  const key = `${lang}:${section}`;
  if (!cache.has(key)) cache.set(key, overlay(enVal, CONTENT[lang]?.[section]));
  return cache.get(key) as T;
}

setContentSource(localized);

/** An official character as the user sees it; anyone else's character is theirs and unchanged. */
export function localCharacter<T extends { id: string; isOfficial?: boolean }>(c: T): T {
  if (!c.isOfficial) return c;
  const lang = i18n.language || 'en';
  return overlay(c, (CONTENT[lang]?.characters as Record<string, unknown> | undefined)?.[c.id]);
}

/**
 * A story template in the screen language (content section `templates`, keyed by id: the hook and the
 * card's words). English, as written in `src/lib/templates.ts`, until the content batch translates it.
 */
export function localTemplate<T extends { id: string; hook: string; card: object }>(template: T): T {
  const lang = i18n.language || 'en';
  const words = (CONTENT[lang]?.templates as Record<string, { hook?: string; card?: object }> | undefined)?.[template.id];
  if (!words) return template;
  return { ...template, hook: words.hook ?? template.hook, card: overlay(template.card, words.card) };
}

interface GroupStoryWords {
  name?: string;
  hook?: string;
  knot?: string;
  userRole?: string;
  members?: Record<string, { who?: string }>;
  beats?: { title?: string; setting?: string }[];
}

/**
 * A group story's words on screen in the screen language (content section `groupStories`, by id): the
 * card, the members' lines and the scene cards. English, as in `src/lib/group-stories.ts`, until
 * translated. What only the model reads stays English.
 */
export function localGroupStory<T extends { id: string; name: string; hook: string; knot: string; userRole: string; members: { id: string; who: string }[]; beats: { title: string; setting: string }[] }>(story: T): T {
  const lang = i18n.language || 'en';
  const words = (CONTENT[lang]?.groupStories as Record<string, GroupStoryWords> | undefined)?.[story.id];
  if (!words) return story;
  return {
    ...story,
    name: words.name ?? story.name,
    hook: words.hook ?? story.hook,
    knot: words.knot ?? story.knot,
    userRole: words.userRole ?? story.userRole,
    members: story.members.map((m) => ({ ...m, who: words.members?.[m.id]?.who ?? m.who })),
    beats: story.beats.map((b, i) => ({ ...b, title: words.beats?.[i]?.title ?? b.title, setting: words.beats?.[i]?.setting ?? b.setting })),
  };
}

/** Overlay for a diary entry by id. */
export function localDiaryEntry<T extends { id: string }>(entry: T): T {
  const lang = i18n.language || 'en';
  return overlay(entry, (CONTENT[lang]?.diaryEntries as Record<string, unknown> | undefined)?.[entry.id]);
}

/** Overlay for a character diary page by id. */
export function localDiaryPage<T extends { id: string }>(page: T): T {
  const lang = i18n.language || 'en';
  return overlay(page, (CONTENT[lang]?.diaryPages as Record<string, unknown> | undefined)?.[page.id]);
}

/** Overlay for a secret note by id. */
export function localSecretNote<T extends { id: string }>(note: T): T {
  const lang = i18n.language || 'en';
  return overlay(note, (CONTENT[lang]?.secretNotes as Record<string, unknown> | undefined)?.[note.id]);
}
