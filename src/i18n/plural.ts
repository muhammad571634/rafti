/**
 * Which plural form a count takes, for the languages the app speaks. Hermes on Android has no
 * `Intl.PluralRules`, and i18next then knows only "one" and "other": Russian never says "2 года",
 * and a language with one form falls back to English on a count of 1.
 */
type Category = 'one' | 'few' | 'many' | 'other';

const ONE_FORM = new Set(['ja', 'ko', 'zh', 'th', 'vi', 'id']);
const baseOf = (locale: string) => locale.toLowerCase().split(/[-_]/)[0];

export function pluralCategory(locale: string, count: number): Category {
  const n = Math.abs(count);
  const base = baseOf(locale);
  if (ONE_FORM.has(base)) return 'other';
  if (base === 'ru') {
    if (!Number.isInteger(n)) return 'other';
    const tens = n % 100;
    const units = n % 10;
    if (units === 1 && tens !== 11) return 'one';
    if (units >= 2 && units <= 4 && (tens < 12 || tens > 14)) return 'few';
    return 'many';
  }
  // French and Portuguese count zero with one.
  if (base === 'fr' || base === 'pt') return n < 2 ? 'one' : 'other';
  return n === 1 ? 'one' : 'other';
}

const categoriesOf = (locale: string): Category[] => {
  const base = baseOf(locale);
  if (ONE_FORM.has(base)) return ['other'];
  return base === 'ru' ? ['one', 'few', 'many', 'other'] : ['one', 'other'];
};

/** Fills in `Intl.PluralRules` where the engine has none; a real one stays. */
export function installPluralRules() {
  if (typeof Intl === 'undefined' || typeof Intl.PluralRules !== 'undefined') return;
  class PluralRules {
    private readonly locale: string;
    private readonly ordinal: boolean;
    constructor(locale: string, options?: { type?: string }) {
      this.locale = locale;
      this.ordinal = options?.type === 'ordinal';
    }
    select(count: number) {
      return this.ordinal ? 'other' : pluralCategory(this.locale, count);
    }
    resolvedOptions() {
      return { pluralCategories: this.ordinal ? ['other'] : categoriesOf(this.locale) };
    }
  }
  (Intl as unknown as { PluralRules: unknown }).PluralRules = PluralRules;
}
