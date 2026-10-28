// scripts/check-locales.mjs
// Validates all 13 translations (or a specified single locale) against en.json per docs/agent-tasks/translate-app.md

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const localesDir = path.join(rootDir, 'src', 'i18n', 'locales');

const ALL_LOCALES = [
  'es',
  'pt-BR',
  'fr',
  'de',
  'it',
  'ja',
  'ko',
  'zh-Hant',
  'id',
  'vi',
  'th',
  'ru',
  'tr',
];

const targetLocale = process.argv[2];
const localesToCheck = targetLocale ? [targetLocale] : ALL_LOCALES;

const PLURAL_RULES = {
  ja: ['_other'],
  ko: ['_other'],
  'zh-Hant': ['_other'],
  id: ['_other'],
  vi: ['_other'],
  th: ['_other'],
  ru: ['_one', '_few', '_many', '_other'],
  es: ['_one', '_other'],
  'pt-BR': ['_one', '_other'],
  fr: ['_one', '_other'],
  de: ['_one', '_other'],
  it: ['_one', '_other'],
  tr: ['_one', '_other'],
};

function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to read/parse ${filePath}: ${err.message}`);
  }
}

function flatten(obj, prefix = '') {
  const result = {};
  for (const [key, val] of Object.entries(obj)) {
    const current = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(result, flatten(val, current));
    } else {
      result[current] = val;
    }
  }
  return result;
}

function extractPlaceholders(str) {
  if (typeof str !== 'string') return [];
  const matches = str.match(/\{\{([^}]+)\}\}/g);
  return matches ? matches.map(m => m.trim()).sort() : [];
}

const enPath = path.join(localesDir, 'en.json');
const en = readJson(enPath);
const enFlat = flatten(en);

// Separate English keys into standard keys and plural base keys
const enPluralBases = new Map(); // baseKey -> { _one?: string, _other?: string }
const enStandardKeys = new Map(); // key -> string

for (const [key, val] of Object.entries(enFlat)) {
  if (key.endsWith('_one')) {
    const base = key.slice(0, -4);
    if (!enPluralBases.has(base)) enPluralBases.set(base, {});
    enPluralBases.get(base)._one = val;
  } else if (key.endsWith('_other')) {
    const base = key.slice(0, -6);
    if (!enPluralBases.has(base)) enPluralBases.set(base, {});
    enPluralBases.get(base)._other = val;
  } else {
    enStandardKeys.set(key, val);
  }
}

let totalErrors = 0;

for (const locale of localesToCheck) {
  const localeFile = path.join(localesDir, `${locale}.json`);
  if (!fs.existsSync(localeFile)) {
    console.error(`[FAIL] ${locale}: file missing: ${localeFile}`);
    totalErrors++;
    continue;
  }

  let localeJson;
  try {
    localeJson = readJson(localeFile);
  } catch (err) {
    console.error(`[FAIL] ${locale}: ${err.message}`);
    totalErrors++;
    continue;
  }

  const localeFlat = flatten(localeJson);
  const allowedPlurals = PLURAL_RULES[locale] || ['_one', '_other'];
  const localeErrors = [];

  // 1. Check standard keys
  for (const [key, enVal] of enStandardKeys.entries()) {
    if (!(key in localeFlat)) {
      localeErrors.push(`Missing standard key: "${key}"`);
      continue;
    }
    const locVal = localeFlat[key];
    if (typeof locVal !== 'string' || locVal.trim().length === 0) {
      localeErrors.push(`Empty or non-string value for key: "${key}"`);
      continue;
    }

    const enPH = extractPlaceholders(enVal);
    const locPH = extractPlaceholders(locVal);
    if (enPH.join(',') !== locPH.join(',')) {
      localeErrors.push(
        `Placeholder mismatch on "${key}": expected [${enPH.join(', ')}], got [${locPH.join(', ')}]`
      );
    }
  }

  // 2. Check plural keys
  for (const [base, enForms] of enPluralBases.entries()) {
    for (const suffix of allowedPlurals) {
      const fullKey = `${base}${suffix}`;
      if (!(fullKey in localeFlat)) {
        localeErrors.push(`Missing plural key: "${fullKey}"`);
        continue;
      }
      const locVal = localeFlat[fullKey];
      if (typeof locVal !== 'string' || locVal.trim().length === 0) {
        localeErrors.push(`Empty or non-string value for plural key: "${fullKey}"`);
        continue;
      }

      // Expected placeholders: compare with en._one if suffix === '_one', else en._other
      const expectedRef = (suffix === '_one' && enForms._one) ? enForms._one : enForms._other;
      const expectedPH = extractPlaceholders(expectedRef);
      const locPH = extractPlaceholders(locVal);

      // If suffix is _one and English _one had no count, but locale has count (or vice versa),
      // allow both count and no count for _one
      const expectedSet = new Set(expectedPH);
      const locSet = new Set(locPH);
      if (suffix === '_one') {
        expectedSet.delete('{{count}}');
        locSet.delete('{{count}}');
      }

      const expFiltered = Array.from(expectedSet).sort().join(',');
      const locFiltered = Array.from(locSet).sort().join(',');
      if (expFiltered !== locFiltered) {
        localeErrors.push(
          `Placeholder mismatch on plural "${fullKey}": expected [${expectedPH.join(', ')}], got [${locPH.join(', ')}]`
        );
      }
    }

    // Check that unwanted plural suffixes are NOT present
    const allPossibleSuffixes = ['_zero', '_one', '_two', '_few', '_many', '_other'];
    for (const s of allPossibleSuffixes) {
      if (!allowedPlurals.includes(s)) {
        const unwantedKey = `${base}${s}`;
        if (unwantedKey in localeFlat) {
          localeErrors.push(`Unwanted plural suffix for ${locale}: "${unwantedKey}"`);
        }
      }
    }
  }

  // 3. Check for extra keys in locale
  for (const key of Object.keys(localeFlat)) {
    if (enStandardKeys.has(key)) continue;

    // Check if it's a valid plural key
    let isValidPlural = false;
    for (const suffix of allowedPlurals) {
      if (key.endsWith(suffix)) {
        const base = key.slice(0, -suffix.length);
        if (enPluralBases.has(base)) {
          isValidPlural = true;
          break;
        }
      }
    }

    if (!isValidPlural) {
      localeErrors.push(`Extra unknown key: "${key}"`);
    }
  }

  if (localeErrors.length > 0) {
    console.error(`[FAIL] ${locale} (${localeErrors.length} errors):`);
    for (const err of localeErrors.slice(0, 15)) {
      console.error(`  - ${err}`);
    }
    if (localeErrors.length > 15) {
      console.error(`  ... and ${localeErrors.length - 15} more`);
    }
    totalErrors += localeErrors.length;
  } else {
    console.log(`[PASS] ${locale}: all keys and placeholders valid`);
  }
}

if (totalErrors > 0) {
  console.error(`\nTotal errors: ${totalErrors}`);
  process.exit(1);
} else {
  console.log(`\nLocale check passed!`);
  process.exit(0);
}
