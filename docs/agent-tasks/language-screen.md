# Agent task: finish the app language choice (after D125)

Read `AGENTS.md` and the top of `HANDOFF.md` first. Reply to the owner in Uzbek, in plain words
(they do not read code). Everything in the repo stays in English.

## What exists

- 14 locales in `src/i18n/locales/`, registered in `src/i18n/index.ts` (`SUPPORTED_LOCALES`,
  `deviceLocale()`, `setLocale()` saves the choice in AsyncStorage).
- Profile → Language row opens a `Sheet` with one `ListRow` per language and a checkmark
  (`src/app/profile.tsx`, around `languageOpen`). Keep this sheet and its look; do not redesign it.

## What to do

1. **"Automatic" first.** Add a first row, "Automatic" (new key `profile.languageAuto` in all
   14 files, translated), whose meta shows the phone's language name. Choosing it clears the
   saved choice, so the app follows the phone again (`deviceLocale()`). A saved choice must be
   undoable this way; today it sticks forever. The Language row's meta shows "Automatic" when no
   choice is saved.
2. **The characters follow the choice.** `User.locale` is set from the phone on every launch
   (`finishHydration` in `src/store/use-app-store.ts`, `phoneLanguage()`). When the user picked
   a language, use that instead, and update `user.locale` when they change it in the sheet.
   Do not touch `src/ai/reply-language.ts`: once the user writes, replies follow what they write.
3. **iOS per-app language** (Settings → Sigmazam → Language). Add `CFBundleLocalizations` with
   the 14 codes to `ios.infoPlist` in `app.json` (iOS names: `en, es, pt-BR, fr, de, it, ja, ko,
   zh-Hant, id, vi, th, ru, tr`). With "Automatic", `expo-localization` already returns the
   per-app language. Read https://docs.expo.dev/versions/v57.0.0/sdk/localization/ first.
4. **Long text check.** German and Russian strings run longest, Thai has no spaces. Search the
   screens for text in fixed-width boxes (`width:` on a container of `Text`, pills, tab labels,
   buttons, `numberOfLines={1}` without `ellipsizeMode`) and fix only real overflows (let text
   wrap, or shrink with `adjustsFontSizeToFit` on one-line pills). Do not change the design.
   List what you changed.

## Rules

- `docs/design-style.md` and the "minimal text" rule: no new subtitles or helper text.
- Do not touch the server, `src/ai/`, or the memory code (`src/lib/memory-*`, `src/store/memory-sync.ts`).
- Done means: `npx tsc --noEmit` clean, `npm test` passes, `npm run check:locales` passes.
  Add `### 0z18` to the top of `HANDOFF.md` and a `D126` row in `docs/flows.md`.
- Commit to `local-work` and push (pull first; other agents push there too).
