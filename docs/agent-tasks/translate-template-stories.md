# Brief: translate the story templates' new shown words into 13 languages

For any agent (Gemini in Antigravity, Claude). Read `AGENTS.md` first. Written by Claude 1 (HANDOFF 0z331),
after the owner's "Ha, boshla" on deepening the 100 story templates. Earlier brief for the card words:
`docs/agent-tasks/translate-templates.md` (same files, same tone rules; read its "How to write it").

## What changed

Every story template (`src/lib/templates.ts`) now has a story (`src/lib/template-stories/*.ts`): history, mask,
exception, quirk, likes, dislikes and a three-beat arc. Most of it is for the model only and stays English. Three
parts are shown on screens: the friend's **likes** and **dislikes** (profile and the chat's intro card) and the
three **beat titles** (the story path on the profile, the level-up takeover, Us moments).

They live in `src/i18n/content/<lang>.json` under `templates.<id>.story`. In the 13 files (`de es fr id it ja ko
pt-BR ru th tr vi zh-Hant`) they are **English copies**. Replace them with translations. Nothing else.

Until a language is translated, the app leaves likes and dislikes out in that language (an English copy counts as
untranslated, `localTemplateStory` in `src/i18n/content.ts`), and beat titles show in English.

## Exactly what to translate, in each of the 13 files

`templates.<id>.story` for all 100 ids:

| Key | What it is | Length rule |
| --- | --- | --- |
| `likes` (2-4 items) | things they love, short noun phrases | each **at most 40 characters**, no commas |
| `dislikes` (2-4 items) | things they can't stand | each **at most 40 characters**, no commas |
| `arc.beats[0..2].title` | a chapter title of their story, 1-4 words | **at most 34 characters** |

Keep the array lengths. A comma inside an item breaks Create's "tea, rain, jazz" field, so rephrase instead.
"their" in English means the user's ("their laugh" = the user's laugh): write it as "your laugh" in the natural
form of that language, since the card speaks about the user to the user.

## Checks

- `npm run check:content` passes (keys and array lengths).
- `npx tsc --noEmit` passes.
- Do not run `npm run content:extract`: it rewrites other sections.
- Commit only the 13 content files, by name.
