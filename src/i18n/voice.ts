/** Where a mock gets its lines; content.ts plugs in the screen language, tests keep the English. */
let source: <T>(section: string, en: T) => T = (_section, en) => en;

export function setVoiceSource(fn: <T>(section: string, en: T) => T) {
  source = fn;
}

/** A mock's line pools in the screen language, e.g. `voice('care', CARE)`; English when there is no translation. */
export const voice = <T,>(section: string, en: T): T => source(section, en);

let contentSource: <T>(section: string, en: T) => T = (_section, en) => en;

export function setContentSource(fn: <T>(section: string, en: T) => T) {
  contentSource = fn;
}

/** A content section in the screen language (`localized`), for code that must also load in plain Node. */
export const content = <T,>(section: string, en: T): T => contentSource(section, en);

let phraseFn: (english: string) => string = (s) => s;

export function setPhraseSource(fn: (english: string) => string) {
  phraseFn = fn;
}

/** Translates an English phrase via the phrase table, or falls back to English. */
export const phrase = (english: string): string => phraseFn(english);

/**
 * A template with its placeholders filled: `{name}`-style values, and `{g:female|male}` picked by
 * the speaker's gender (first form when unknown). An unknown placeholder is left as written.
 */
export function fill(template: string, values: Record<string, string | number> = {}, gender?: string) {
  return template
    .replace(/\{g:([^|}]*)\|([^}]*)\}/g, (_m, f: string, m: string) => (gender === 'male' ? m : f))
    .replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole));
}
