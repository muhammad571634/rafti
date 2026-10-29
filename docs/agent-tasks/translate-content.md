# Task: translate the app's built-in content into the 13 languages

For any agent (Gemini 3.8 Flash in Antigravity, Claude). Read `AGENTS.md`, then the top of
`HANDOFF.md` (0z20, D128) first. Do the phases **in order, one commit each**; never mix phases.

## Why

D125 translated the screens (`src/i18n/locales/*.json`) and D128 translated the English kept as
data (`phrase()` + the `phrases` block). What is still English is the **built-in content** in
`src/mock/`: the official characters' bios, greetings and likes, the date places' rounds, the
worlds' quizzes, the couple-quiz packs, truth or dare, radio gifts, scenes, world books, the sample
diary. That is ~2,000 strings in English (measured 2026-10-28, not 560). The owner wants all of it
in all 13 languages (`es`, `pt-BR`, `fr`, `de`, `it`, `ja`, `ko`, `zh-Hant`, `id`, `vi`, `th`,
`ru`, `tr`).

## The rule (same as D128, do not invent another one)

1. **The data stays English.** `src/mock/*.ts`, the store, the server, the prompts (`src/ai/*`) and
   every id keep the English text. Never edit an English string in `src/mock/` to "fix" a
   translation, never translate anything in `src/ai/`, never translate a regex.
2. **Only what the user sees, or what lands in a chat, is translated**, by laying a translation
   over the English object at that moment (`overlay`, below). A missing or broken translation
   falls back to the English, so nothing can crash or go blank.
3. **One file per language:** `src/i18n/content/<code>.json`. `src/i18n/content/en.json` is
   **generated** from the mocks by a script, never written by hand. Every other file has
   exactly the same shape: same keys, same array lengths, same order.
4. **Arrays keep their order and length.** Quiz answers are picked by index (`partnerPick`,
   `answer: 0..3`), so option 2 in Russian must be option 2 in English.

## Phase 0: three small leftovers (one commit)

- `src/app/(tabs)/us.tsx:374`: the level-up moment shows the stored English tier ("Friend",
  "Beloved") because `moment.params.title` is passed as is. Pass
  `{ ...moment.params, ...(moment.params?.title ? { title: phrase(moment.params.title) } : {}) }`
  (`phrase` from `@/i18n`; a title that is not a phrase comes back unchanged).
- The four world names (`Character.series`: "Seaside Academy", "Moonlit Realm" and the other two,
  see `WORLDS[].series` in `src/mock/worlds.ts`) are ids. Add them to the `phrases` block of all
  14 locale files (en = the same English) and show them through `phrase(series)` everywhere a
  series is printed. Files that print it: `src/app/(tabs)/find.tsx` (group titles from
  `groupBySeries`), `src/app/character/[id]/index.tsx`, `src/app/world/[series].tsx`,
  `src/app/lore/index.tsx`, `src/app/lore/for/[characterId].tsx`, `src/app/onboarding.tsx`,
  `src/app/photo-booth.tsx`, `src/app/quiz/world/[world].tsx`, `src/app/quiz/[characterId].tsx`,
  `src/app/streams/new.tsx`, `src/components/chat/intro-card.tsx`,
  `src/components/find/family-sheet.tsx`, `src/components/group/friend-row.tsx`,
  `src/components/lore/lore-rows.tsx`. Only wrap the printed text; comparisons such as
  `c.series === world.series` stay English.
- Add `...WORLDS.map((w) => w.series)` to the `words` list in `src/i18n/phrases.test.ts`
  (`import { WORLDS } from '../mock/worlds'`; that file has only type imports, so the test loads it).

Check: `npm run check:locales`, `npx tsc --noEmit`, `npm test`.

## Phase 1: the machinery (one commit, no translations yet)

### 1a. Load the mocks in plain Node: `scripts/content-hooks.mjs`

The mocks import `@/…` paths and, through `@/theme`, `react-native`; plain Node cannot load them.
This hook (tested on 2026-10-28: every catalog below loads) maps `@/x` to `src/x` and stubs
React Native:

```js
// Lets scripts/content-extract.ts load src/mock/* in plain Node: '@/x' -> src/x, React Native stubbed.
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

const src = pathToFileURL(process.cwd() + '/src/').href;
register(
  'data:text/javascript,' +
    encodeURIComponent(`
      const SRC = ${JSON.stringify(src)};
      const STUB = 'data:text/javascript,' + encodeURIComponent("export const Appearance={getColorScheme:()=>'light'};export const Platform={OS:'ios',select:(o)=>o.ios??o.default};export const TextStyle=undefined;export const ViewStyle=undefined;export const ImageStyle=undefined;export const StyleSheet={create:(s)=>s,hairlineWidth:1};export default {};");
      export async function resolve(specifier, context, next) {
        if (specifier === 'react-native' || specifier.startsWith('@expo/') || specifier.startsWith('expo-')) return { url: STUB, shortCircuit: true };
        if (specifier.startsWith('@/')) specifier = SRC + specifier.slice(2);
        for (const s of [specifier, specifier + '.ts', specifier + '/index.ts']) {
          try { return await next(s, context); } catch {}
        }
        return next(specifier, context);
      }
    `),
);
```

Run with: `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --disable-warning=ExperimentalWarning --import ./scripts/content-hooks.mjs scripts/content-extract.ts`.
Add `"content:extract"` with that command to `package.json` scripts. Change nothing else in that
file, and run `git diff package.json` before committing: a lost line there once broke the build.

### 1b. The shape rule (extract and overlay must use exactly this)

- An **array whose items are all objects with a string `id`** (or, if no `id`, a string `key`)
  becomes an object keyed by that id: `{"c_kai": {…}, "c_elio": {…}}`.
- Any other array stays an array, same length, same order.
- An object keeps only the **text fields** listed below (recursively); everything else (ids,
  numbers, colours, icons, `hearts`, `answer`, `keywords`, `series`, `name` of a character…) is
  left out of the content file.
- Empty objects and arrays with nothing to translate are left out.

### 1c. `scripts/content-extract.ts` writes `src/i18n/content/en.json`

Top-level sections, the export each comes from, and its text fields:

| section | source | text fields |
| --- | --- | --- |
| `characters` | `characters` in `src/mock/characters.ts`, **only `isOfficial`** | `bio`, `tagline`, `greeting`, `opening`, `greetings`, `starters`, `likes`, `dislikes`, `backstory`, `tags` |
| `datePlaces` | `DATE_PLACES` (`dates.ts`) | `rounds` → `line`, `choices` → `text`, `reply` |
| `dateThemes` | `themePools` (`date-themes.ts`) | `text`, `reply`, `line` |
| `worlds` | `WORLDS` (`worlds.ts`, keyed by `key`) | `intro`, `right`, `wrong`, `match`, `differ`, `selfQuiz` → `text`, `options`; `quiz` → `text`, `options`; `dateRounds` → `line`, `choices` → `text`, `reply`; `frame` → `caption` |
| `quizPacks` | `QUIZ_PACKS` (`games.ts`) | `questions` → `text`, `options` |
| `quizLines` | `QUIZ_LINES` | `match`, `differ` |
| `selfQuiz` | `SELF_QUIZ` | `text`, `options` |
| `truthsForThem`, `daresForThem` | `TRUTHS_FOR_THEM`, `DARES_FOR_THEM` | `ask`, `answer` |
| `truthsForYou`, `daresForYou`, `secretNotePrompts` | `TRUTHS_FOR_YOU`, `DARES_FOR_YOU`, `secretNotePrompts` | the strings themselves |
| `radioGifts` | `radioGifts` (`radio.ts`) | `title`, `lines` |
| `scenes` | `officialScenes` (`scenes.ts`) | `title`, `setting`, `userRole`, `opening` |
| `lorebooks` | `officialLorebooks` (`lorebooks.ts`) | `name`, `about`, `entries` → `name`, `text` (**not** `keywords`) |
| `diaryPages` | `characterDiaryPages` (`diary.ts`) | `body` |
| `diaryEntries` | `diaryEntries` | `title`, `body`, `text` |
| `secretNotes` | `secretNotes` | `prompt`, `theirNote`, `myNote` |

Not translated, on purpose: character `name`, `look`, `definition`, `quirk`, `speakingStyle`
(prompt only, or names), lorebook `keywords` (they match the user's words; a later task).
`chat-background-art.ts` already uses `nameKey`. Write the JSON with 2-space indent and a final
newline; running the script twice must give the same file.

### 1d. `src/i18n/content.ts`: the overlay

```ts
import i18n from 'i18next';

import de from './content/de.json';
// … import all 14, as src/i18n/index.ts does for the locales

const CONTENT: Record<string, Record<string, unknown>> = { en, es, 'pt-BR': ptBR, fr, de, it, ja, ko, 'zh-Hant': zhHant, id, vi, th, ru, tr };

const idOf = (x: unknown) =>
  x && typeof x === 'object' && !Array.isArray(x) ? ((x as { id?: unknown }).id ?? (x as { key?: unknown }).key) : undefined;

/** The English `en` with every translated string of `tr` laid over it; anything missing or malformed keeps the English. */
export function overlay<T>(en: T, tr: unknown): T {
  if (tr == null) return en;
  if (typeof en === 'string') return (typeof tr === 'string' && tr.trim() ? tr : en) as T;
  if (Array.isArray(en)) {
    if (en.length && en.every((x) => typeof idOf(x) === 'string')) {
      if (typeof tr !== 'object' || Array.isArray(tr)) return en;
      return en.map((x) => overlay(x, (tr as Record<string, unknown>)[idOf(x) as string])) as T;
    }
    if (!Array.isArray(tr) || tr.length !== en.length) return en;
    return en.map((x, i) => overlay(x, tr[i])) as T;
  }
  if (en && typeof en === 'object') {
    if (typeof tr !== 'object' || Array.isArray(tr)) return en;
    const out: Record<string, unknown> = { ...(en as Record<string, unknown>) };
    for (const k of Object.keys(tr)) if (k in out) out[k] = overlay(out[k], (tr as Record<string, unknown>)[k]);
    return out as T;
  }
  return en;
}

const cache = new Map<string, unknown>();

/** A content section in the screen language, e.g. `localized('datePlaces', DATE_PLACES)`; same object while the language stays. */
export function localized<T>(section: string, en: T): T {
  const lang = i18n.language;
  const key = `${lang}:${section}`;
  if (!cache.has(key)) cache.set(key, overlay(en, CONTENT[lang]?.[section]));
  return cache.get(key) as T;
}

/** An official character as the user sees it; anyone else's character is theirs and unchanged. */
export function localCharacter<T extends { id: string; isOfficial?: boolean }>(c: T): T {
  if (!c.isOfficial) return c;
  return overlay(c, (CONTENT[i18n.language]?.characters as Record<string, unknown> | undefined)?.[c.id]);
}
```

`localCharacter` is not cached (characters change); it is cheap. Do not import `content.ts` from
`src/i18n/index.ts` (no cycle).

### 1e. `scripts/check-content.mjs` and `"check:content"`

Plain Node, no packages, exits 1 on any error, for every `src/i18n/content/<code>.json` against
`en.json`: the same keys (no extra, no missing), the same array lengths, every leaf a non-empty
string; the same placeholders in each string (`{name}`, `{place}`, `{answer}`, `{{char}}`,
`{{user}}`, `{{random_user_1}}`… compare the sets of `{…}` tokens); the same number of `*`
(actions such as `*grins*` stay in asterisks); the same emoji. Warn (exit 0) when more than 5% of
a file's strings are identical to the English. Per language: `node scripts/check-content.mjs ru`.

### 1f. A test: `src/i18n/content.test.ts`

Unit-test `overlay` only (import it from a small pure file if `content.ts` cannot load in
`node --test`; e.g. move `overlay` to `src/i18n/overlay.ts` and re-export it): string replaced,
blank kept English, array of wrong length kept English, id-keyed array matched by id, unknown keys
ignored, ids never overwritten.

Phase 1 is done when `npm run content:extract` writes `en.json`, a copy of it as `ru.json` passes
`check:content` (delete that copy before committing), and `tsc` and tests pass.

## Phase 2: use it on the screens (one commit, still no translations)

Wrap at the place of display, or where text is written into a chat; logic keeps the English.

- **Characters:** in a component that prints `bio`, `tagline`, `greeting(s)`, `opening`,
  `starters`, `likes`, `dislikes`, `backstory` or `tags`, read them from
  `const shown = localCharacter(character)` (find them with
  `grep -rnE "\.(bio|tagline|greeting|greetings|opening|starters|likes|dislikes|backstory|tags)\b" src/app src/components`).
  Known: `src/app/character/[id]/index.tsx`, `src/components/chat/intro-card.tsx`,
  `src/app/chat/[id].tsx:313` (starters), the Find cards, `src/app/(tabs)/find.tsx:103` (search:
  match the English **and** the shown tags). Not in `create-character.tsx` (the user's own).
- **The first message of a chat:** `openingFor` in `src/store/use-app-store.ts` (~line 5090) builds
  it from the character: pass `localCharacter(character)` there, so a new chat opens in the
  screen language. Messages already sent stay as they are.
- **Dates:** `src/app/dating.tsx`, `src/app/date/[placeId].tsx`, `src/app/date/album.tsx` read
  `localized('datePlaces', DATE_PLACES)` (and `datePlaceById` on that list). The store keeps
  `datePlaceById` for logic; where it writes a round's text into state or a chat, use the
  localized place. `themePools` in the store → `localized('dateThemes', themePools)` where rounds
  are generated.
- **Worlds:** `src/app/photo-booth.tsx`, `src/app/quiz/world/[world].tsx`,
  `src/app/quiz/[characterId].tsx`, and the store where `worldOf` / `worldByKey` give text →
  `localized('worlds', WORLDS)` (then find by `key` / `series` in that list).
- **Games:** `src/app/quiz/[characterId].tsx` (`QUIZ_PACKS`, `SELF_QUIZ`, `QUIZ_LINES`); the
  store's truth or dare (`TRUTHS_FOR_THEM`, `DARES_FOR_THEM`, `TRUTHS_FOR_YOU`, `DARES_FOR_YOU`).
- **Radio:** `src/components/radio/use-clips.ts` and the store → `localized('radioGifts', radioGifts)`.
- **Scenes:** `src/app/scenes/[conversationId].tsx` and the store → `localized('scenes', officialScenes)`.
- **World books:** `src/app/lore/index.tsx`, `src/app/lore/[id].tsx`, `src/app/lore/for/[characterId].tsx`,
  `src/app/character/[id]/settings.tsx` → `localized('lorebooks', officialLorebooks)`. The prompt
  keeps the English books.
- **Sample diary and notes:** the store copies `characterDiaryPages`, `diaryEntries`,
  `secretNotes` into saved state on first launch, so lay the translation over by id **on the diary
  screens** (`overlay(entry, CONTENT[lang].diaryEntries?.[entry.id])`; add small helpers next to
  `localCharacter`). `secretNotePrompts` (`use-app-store.ts` ~2244): pick from
  `localized('secretNotePrompts', secretNotePrompts)`.

Do not change layout, colours or animations (`AGENTS.md`). Check: `tsc`, `npm test`; with only
`en.json` present the app must look exactly as before.

## Phase 3: translate (one language per commit)

Work on one language at a time, section by section, in the order of `en.json`; after each
section run `node scripts/check-content.mjs <code>`. Commit and push each finished language
(`git fetch` and `git pull --rebase origin local-work` first: other agents push too).

How to translate (you are writing an adult companion app's characters, not a manual):
- Natural, modern, spoken language a native speaker of that age would text. Never word for word.
- Keep each character's voice: shy stays shy, teasing stays teasing, a poetic prince stays
  poetic. Read the whole character before translating any of its lines.
- `ja`: characters speak casually (タメ口), their own way; `ko`: characters 반말, narration
  해요체; `zh-Hant`: Taiwan usage; `es`: neutral Latin American; `pt-BR`: Brazilian; `ru`, `fr`,
  `de`, `it`, `tr`, `id`, `vi`, `th`: casual "you" between close friends (ты, tu, du, tu, sen,
  kamu, cậu/mình, เธอ).
- Gender: a line keeps the gender of whoever says it (`characters.ts` has `gender`); for the user,
  pick wording that fits anyone where the language allows.
- Keep exactly: placeholders (`{name}`, `{place}`, `{answer}`, `{{char}}`, `{{user}}`),
  `*actions*` in asterisks, emoji, quotation marks around spoken words (use the language's own
  quotes: «», 「」, „“ …), the order and number of quiz options.
- Keep under the English limits where they exist: tagline 50 characters, starters 100,
  greetings / openings 200 (CJK: count characters). Short labels (quiz options, choices) stay short.
- Character names, the brand "Sigmazam" and "shells" (use the word the locale files already use)
  as in the existing `src/i18n/locales/<code>.json`.
- Culture: the places are fictional; melon bread, onsen, idols stay what they are, explained only
  if a native reader would not get it.
- Use your own knowledge to translate; do not call any paid API.

Done for a language when `check:content <code>` passes with no "identical to English" warning
except names and loanwords, and you have read 20 random strings back for tone.

## Phase 4 (later, ask the owner first): the mock voice

Approved 2026-10-29; the full brief is `docs/agent-tasks/translate-voice.md`.

`src/mock/reply-writer.ts`, `chat.ts`, `group.ts`, `temper.ts`, `push.ts`, `threads.ts`,
`kin.ts`, `care.ts`, `brief.ts`, `day-ask.ts`, `week.ts`, `steer.ts`, `streams.ts`,
`diary-writer.ts`, `reply-ideas.ts` (`ideaAnswer`), `character-drafts.ts`, and
`src/lib/morning-chain.ts` stand in for the model when the server does not answer. They are
pools of lines, many written as functions (`(name) => \`…${name}…\``). Translating them means
turning each into a template with `{name}`-style placeholders in a `voice` section and filling
it in code. Their English **regexes that read the user's words** (`care.ts`, `threads.ts`
`mockOutcome`, `day-ask.ts` `moodOf`, `morning-chain.ts` `readMorningReply`) are not translated;
the server's model replaces them. Plan this phase separately before writing code.

## Every commit

- `npx tsc --noEmit`, `npm test`, `npm run check:locales`, `npm run check:content` (from Phase 1).
- A short note in `HANDOFF.md` (new top entry) and a row in `docs/flows.md`.
- Commit messages and code comments in English; push to `local-work`.
- After a push, send it to the owner's phone:
  `npx eas-cli update --channel preview --environment preview --message "<what>" --non-interactive`
  (PowerShell: `$env:EXPO_TOKEN = [Environment]::GetEnvironmentVariable('EXPO_TOKEN','User')` first).
- Report to the owner in Uzbek: what changed, how many strings, what is still English.
