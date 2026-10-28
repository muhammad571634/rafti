import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import id from './locales/id.json';
import it from './locales/it.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import ptBR from './locales/pt-BR.json';
import ru from './locales/ru.json';
import th from './locales/th.json';
import tr from './locales/tr.json';
import vi from './locales/vi.json';
import zhHant from './locales/zh-Hant.json';

const STORAGE_KEY = 'rafti.locale';

/**
 * Supported screen languages. Adding a language = drop `locales/<code>.json`, register it
 * here and in `SUPPORTED_LOCALES` - no screen has to change.
 */
export const resources = {
  en: { translation: en },
  es: { translation: es },
  'pt-BR': { translation: ptBR },
  fr: { translation: fr },
  de: { translation: de },
  it: { translation: it },
  ja: { translation: ja },
  ko: { translation: ko },
  'zh-Hant': { translation: zhHant },
  id: { translation: id },
  vi: { translation: vi },
  th: { translation: th },
  ru: { translation: ru },
  tr: { translation: tr },
};

export const SUPPORTED_LOCALES: { code: string; label: string; rtl?: boolean }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'pt-BR', label: 'Português (Brasil)' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh-Hant', label: '繁體中文' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'th', label: 'ไทย' },
  { code: 'ru', label: 'Русский' },
  { code: 'tr', label: 'Türkçe' },
];

export const FALLBACK_LOCALE = 'en';

/**
 * The phone's own language ("ja-JP"), whether or not the app's screens are translated into it yet:
 * the characters write in it before the user has written anything (`User.locale`, src/ai/reply-language.ts).
 */
export function phoneLanguage(): string {
  return Localization.getLocales()[0]?.languageTag ?? FALLBACK_LOCALE;
}

export function deviceLocale(): string {
  const tag = phoneLanguage();
  if (tag in resources) return tag;

  // Traditional Chinese variants: zh-TW, zh-HK, zh-MO, zh-Hant-TW
  const lowerTag = tag.toLowerCase();
  if (
    lowerTag.startsWith('zh-hant') ||
    ['zh-tw', 'zh-hk', 'zh-mo'].includes(lowerTag)
  ) {
    if ('zh-Hant' in resources) return 'zh-Hant';
  }

  const base = tag.split('-')[0];
  if (base in resources) return base;

  // Portuguese phones (pt, pt-PT) map to pt-BR
  if (base === 'pt' && 'pt-BR' in resources) return 'pt-BR';

  // Chinese phones without region
  if (base === 'zh' && 'zh-Hant' in resources) return 'zh-Hant';

  return FALLBACK_LOCALE;
}

export function phoneLanguageName(): string {
  const tag = phoneLanguage();
  const base = tag.split('-')[0].toLowerCase();
  const dev = deviceLocale();
  const match = SUPPORTED_LOCALES.find((l) => l.code === dev);
  if (match && (tag.toLowerCase().startsWith(dev.toLowerCase()) || base === dev.toLowerCase() || dev !== FALLBACK_LOCALE)) {
    return match.label;
  }
  try {
    return new Intl.DisplayNames([i18n.language], { type: 'language' }).of(tag) ?? match?.label ?? tag;
  } catch {
    return match?.label ?? tag;
  }
}

let initialised = false;
let savedLocale: string | null = null;
let savedLocaleLoaded = false;

export async function getSavedLocale(): Promise<string | null> {
  if (savedLocaleLoaded) return savedLocale;
  try {
    savedLocale = await AsyncStorage.getItem(STORAGE_KEY);
    savedLocaleLoaded = true;
    return savedLocale;
  } catch {
    return null;
  }
}

export function getSavedLocaleSync(): string | null {
  return savedLocale;
}

export function isAutomaticLocale(): boolean {
  return savedLocale === null;
}

export async function initI18n() {
  if (initialised) return i18n;
  initialised = true;

  savedLocale = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
  savedLocaleLoaded = true;

  await i18n.use(initReactI18next).init({
    resources,
    lng: savedLocale ?? deviceLocale(),
    fallbackLng: FALLBACK_LOCALE,
    compatibilityJSON: 'v4',
    interpolation: { escapeValue: false },
    returnNull: false,
  });

  return i18n;
}

/**
 * The app's own English words that are kept as data (a relationship label "Mom", a tier
 * "Beloved", an interest, a reply idea's label and line) in the screen language. The stored
 * value, the server and the prompts keep the English; only what the user sees and sends
 * changes, so old saves translate too. A phrase with no entry stays as it is.
 */
export function phrase(english: string): string {
  const table = (resources[i18n.language as keyof typeof resources]?.translation as { phrases?: Record<string, string> } | undefined)?.phrases;
  return table?.[english] ?? english;
}

export async function setLocale(code: string | null) {
  if (!code || code === 'auto') {
    savedLocale = null;
    savedLocaleLoaded = true;
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    const target = deviceLocale();
    await i18n.changeLanguage(target);
    return target;
  }
  savedLocale = code;
  savedLocaleLoaded = true;
  await AsyncStorage.setItem(STORAGE_KEY, code).catch(() => {});
  await i18n.changeLanguage(code);
  return code;
}

export default i18n;
