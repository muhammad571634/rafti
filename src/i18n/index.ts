import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';

const STORAGE_KEY = 'rafti.locale';

/**
 * English ships today. Adding a language = drop `locales/<code>.json`, register it
 * here and in `SUPPORTED_LOCALES` - no screen has to change.
 */
export const resources = {
  en: { translation: en },
} as const;

export const SUPPORTED_LOCALES: { code: string; label: string; rtl?: boolean }[] = [
  { code: 'en', label: 'English' },
  // Planned, in reference-app order:
  // { code: 'ko', label: '한국어' },
  // { code: 'ja', label: '日本語' },
  // { code: 'zh-Hant', label: '繁體中文' },
  // { code: 'es', label: 'Español' },
  // { code: 'pt', label: 'Português' },
  // { code: 'id', label: 'Bahasa Indonesia' },
  // { code: 'pl', label: 'Polski' },
  // { code: 'ru', label: 'Русский' },
  // { code: 'uz', label: "O'zbekcha" },
  // { code: 'ar', label: 'العربية', rtl: true },
];

export const FALLBACK_LOCALE = 'en';

function deviceLocale(): string {
  const tag = Localization.getLocales()[0]?.languageTag ?? FALLBACK_LOCALE;
  if (tag in resources) return tag;
  const base = tag.split('-')[0];
  return base in resources ? base : FALLBACK_LOCALE;
}

let initialised = false;

export async function initI18n() {
  if (initialised) return i18n;
  initialised = true;

  const stored = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);

  await i18n.use(initReactI18next).init({
    resources,
    lng: stored ?? deviceLocale(),
    fallbackLng: FALLBACK_LOCALE,
    compatibilityJSON: 'v4',
    interpolation: { escapeValue: false },
    returnNull: false,
  });

  return i18n;
}

export async function setLocale(code: string) {
  await i18n.changeLanguage(code);
  await AsyncStorage.setItem(STORAGE_KEY, code).catch(() => {});
}

export default i18n;
