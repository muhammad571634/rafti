# Brief: translate the 100 story templates into 13 languages

For any agent (Gemini in Antigravity, Claude). Read `AGENTS.md` first. Owner's ask (2026-11-19): "Gemini does the
translation; prepare it for him." Written by Claude 1 (HANDOFF 0z303). Background: `docs/agent-tasks/template-library.md`.

## What changed

Find has a new Stories section: 100 story templates (`src/lib/templates.ts`) on ten trope shelves. A user says hi
to one, or makes it their own in Create. `npm run content:extract` wrote their English into
`src/i18n/content/en.json` under `templates`. In the other 13 files (`de es fr id it ja ko pt-BR ru th tr vi
zh-Hant`) the same `templates` section holds **English copies**. Your job: replace those English copies with real
translations. Nothing else.

The app reads them through `localTemplate` (`src/i18n/content.ts`): a translated string shows at once, an English
copy shows as English. The model already answers in the user's language; these are the words on the cards, the
sheet, the scene card and the first message.

## Exactly what to translate, in each of the 13 files

`templates.<id>` for all 100 ids (`t_noah` … `t_robin`), these 8 strings each:

| Key | What it is | Length rule |
| --- | --- | --- |
| `hook` | the line on the Find card: who they are to you, with the knot | keep it one sentence |
| `card.relation` | a short label under the name ("Your best friend", "Your ex") | **at most 30 characters** |
| `card.tagline` | the knot in one line | **at most 50 characters** |
| `card.bio` | who they are, 1-2 sentences | at most 400 |
| `card.mask` | how they act versus what they hide (the model reads it) | at most 240 |
| `card.scenario` | where the two are as the chat opens | at most 300 |
| `card.opening` | their first action, in `*asterisks*` | **at most 90** |
| `card.greeting` | their first chat message | at most 200 |

The limits are Create's (Make it yours opens the template in Create; a longer string is cut there). If a
translation runs long, shorten it in that language; never cut a word in half.

## How to write it

- An adult (18+) app where people text characters who feel like real people of today. Write the way a person of
  today talks and texts in that language: natural, modern, never stiff, bookish or literal.
- The character speaks to the reader as "you": the informal, close "you" (du, tú, tu, ты, sen, kamu, 너…); in
  Japanese, Thai, Vietnamese and Chinese keep it friendly and casual.
- Keep names exactly as they are, in Latin letters (Noah, Kira, Cassian…).
- Keep `{{char}}` and `{{user}}` exactly as they are; keep every `*action*` with its asterisks and every emoji.
- Gender: each template's `gender` is in `src/lib/templates.ts` (`'m'`, `'f'`, or `''` for the five "any" comfort
  templates: `t_sky t_river t_quinn t_ash t_robin`). Use the right grammatical gender for him / her; for the five
  "any" ones write gender-neutral where the language allows (or the neutral form your language uses for an unknown
  person).
- Never add or drop meaning, never leave English behind, never add anything explicit.

## Checks before you finish

1. `npm run check:content` passes (keys, placeholders, asterisks, emojis); the "identical to English" warning
   count must drop by about 800 per file.
2. A quick length check: every `card.relation` <= 30, `card.tagline` <= 50, `card.opening` <= 90 characters
   (a few lines of node over the JSON is enough).
3. `npx tsc --noEmit` and `npm test` still pass (you only touched JSON, so they should).
4. Russian on the A51 if the phone is free: Find → Stories, open three cards, one Make it yours. Labels wrap to two
   lines at most, nothing cut with "…" mid-word.

## Files allowed

Only `src/i18n/content/{de,es,fr,id,it,ja,ko,pt-BR,ru,th,tr,vi,zh-Hant}.json`, and only the `templates` section in
each. Do not run `npm run content:extract` again (it would also rewrite the `voice` section, which has unrelated
drift; leave that for its owner). Commit only those files, by name; a HANDOFF block with your agent name; push to
`local-work`.

## Done means

All 13 files carry real translations of all 100 templates, the checks above pass, one commit, one HANDOFF block.
