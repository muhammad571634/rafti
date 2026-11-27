# Task: translate the app's screens into 13 languages

For any agent (Gemini / Antigravity, Claude). Read `AGENTS.md` first. Do only this task; touch no
other file than the ones listed here.

## Goal

The app already picks its screen language from the phone, with English as the fallback
(`src/i18n/index.ts`). Only English exists today: `src/i18n/locales/en.json` (~2050 strings).
Add these 13, decided by the owner on 2026-10-28 (file name = code):

| code | language | notes |
| --- | --- | --- |
| `es` | Spanish | neutral Latin American |
| `pt-BR` | Portuguese (Brazil) | |
| `fr` | French | |
| `de` | German | words run long: keep button labels short |
| `it` | Italian | |
| `ja` | Japanese | casual-polite (です/ます in system lines, natural in chat labels) |
| `ko` | Korean | 해요체 |
| `zh-Hant` | Chinese (Traditional, Taiwan) | |
| `id` | Indonesian | |
| `vi` | Vietnamese | |
| `th` | Thai | |
| `ru` | Russian | |
| `tr` | Turkish | |

Not now: Arabic (needs right-to-left layout), Hindi, Polish, Uzbek.

## Files

- New: `src/i18n/locales/<code>.json` for each language, the same key tree as `en.json`.
- Edit `src/i18n/index.ts` only to register them: import each file, add it to `resources`, and
  replace the commented `SUPPORTED_LOCALES` list with the 14 real ones (`label` in the language
  itself: "Español", "日本語"…). Keep `FALLBACK_LOCALE = 'en'` and the `deviceLocale` logic; make
  sure "pt-BR" and "zh-Hant-TW" phones find their files (match the full tag, then the base, then
  `zh-Hant` for zh-TW / zh-HK / zh-MO).
- New: `scripts/check-locales.mjs` (plain Node, no packages) that compares every locale with
  `en.json` and exits 1 on any problem. Add `"check:locales": "node scripts/check-locales.mjs"` to
  the root `package.json` scripts; change nothing else in that file.

## Rules for every string

1. Same keys as `en.json`, nothing missing, nothing extra. Values are strings, as in English.
2. Keep every `{{placeholder}}` exactly (`{{count}}`, `{{name}}`, `{{date}}`, `{{time}}`,
   `{{level}}`…): same names, none added or dropped. Never translate what is inside the braces.
3. Plurals use i18next v4 suffixes. English has `_one` / `_other` (40 keys). Give each language
   its own CLDR forms: `ja ko zh-Hant id vi th` only `_other`; `ru` `_one _few _many _other`;
   `es pt-BR fr de it tr` `_one _other`. The checker accepts these sets per language.
4. Do not translate: "Sigmazam", character names (Kai Arden, Prince Aurelian…), world names
   (Seaside Academy, Moonlit Realm, NEON TIDE, Tidepool Café), "Pro", "Basic". Translate
   "shells" (the in-app currency) as one consistent word per language and use it everywhere.
5. Same meaning and tone: short, warm, plain (`docs/design-style.md`: headings, numbers, icons,
   little helper text). Never longer than needed; UI labels stay as short as the English.
6. Keep emoji, `\n` and punctuation such as "·" where the English has them.
7. Adults only app (18+): keep romance and flirty lines as they are, no softening, no additions.

## How

- Translate in chunks of about 100 keys so nothing is skipped; keep the key order of `en.json`.
- Run `npm run check:locales`, then `npx tsc --noEmit` and `npm test`; all must pass.
- Do not run web screenshots against Metro on port 8081 (it breaks the owner's Expo Go).

## Git

- Work on a branch from `origin/local-work`. Before pushing: `git fetch` and rebase on
  `origin/local-work`; other agents push there too.
- One commit per language is fine ("i18n: Japanese"), or one for all. Push to `local-work`.
- Add a short note at the top of `HANDOFF.md` (what was added, that `check:locales` passes) and a
  row in `docs/flows.md`.

## Done when

All 13 files exist, `check:locales`, `tsc` and tests pass, and a phone set to Japanese (or any of
the 13) shows the app's screens in that language after a reload. The Profile → Language screen
and iOS per-app language settings are a separate task (Claude), not part of this one.
