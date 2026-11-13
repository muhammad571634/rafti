# Brief: translate the Cast 2.0 content into 13 languages

For any agent (Gemini in Antigravity, Claude). Read `AGENTS.md` first. Owner's ask (2026-11-10): the new cast's
text in every product language. Written by Claude, cast session (HANDOFF 0z192).

## What changed

The 55 old characters are gone; twelve new present-day people replaced them (`docs/cast-2.md`,
`src/mock/characters.ts`, `character-profiles.ts`, `character-stories.ts`). `npm run content:extract` wrote the
new English into `src/i18n/content/en.json`. In the other 13 files (`de es fr id it ja ko pt-BR ru th tr vi
zh-Hant`) the old keys were removed and the new ones were filled with **English copies**. Your job: replace those
English copies with real translations. Nothing else.

## Exactly what to translate, in each of the 13 files

1. `characters.<id>` for the twelve ids: `c_milo c_jace c_sam c_roman c_ethan c_clara c_caleb c_asher c_mia c_lena
   c_victor c_yuna`. Every field: `bio`, `tagline`, `greeting`, `opening`, `greetings[]`, `starters[]`, `likes[]`,
   `dislikes[]`, `backstory`, `tags[]`, `relation`, `arc.beats[].title`.
2. `radioGifts.<id>` for `rg_milo_beat rg_milo_sleep rg_sam_pep rg_ethan_morning rg_yuna_rain`: `title`, `lines[]`.
3. `diaryPages.cdp_castor_3.body[0]` and `body[1]`.

A string to translate is one that is still identical to `en.json` at the same path. Do not touch any other key:
everything else is already translated and checked.

## How to write it

- This is an adult (18+) app where people text characters who feel like real people of today: a best friend, a
  husband, an ex, a roommate, a boss. Write the way a person of today talks and texts in that language: natural,
  modern, never stiff, bookish or literal.
- `greeting`, `greetings` and `starters` are chat messages. The ones in lower case with little punctuation are
  casual texts: keep them casual (lower case where the language has case).
- `relation` is the short line under the name, "Your best friend", "Your ex": a short label in the same voice.
- `tags`, `likes`, `dislikes` are short labels, one to four words.
- Keep names as they are, in Latin letters: Milo, Jace, Sam, Roman, Ethan, Clara, Caleb, Asher, Mia, Lena, Victor,
  Yuna, Daniel.
- The character speaks to the reader as "you": use the informal, close "you" (du, tú, tu, ты, sen, kamu, 너…); in
  Japanese, Thai, Vietnamese and Chinese keep it friendly and casual.
- Keep every `*action*` with its asterisks, every emoji, and every array at its English length.
- Never add or drop meaning, never leave English behind.

## Checks and finish

1. `git fetch origin` and `git pull --ff-only origin local-work`; add your line to `.agents/now.md`.
2. After each language: `node scripts/check-content.mjs <code>` must say PASS, and its "identical to English" count
   must drop (only names and words that really are the same may stay identical).
3. When all 13 pass: `npm run check:content`. Commit only the 13 files by name
   (`git add src/i18n/content/de.json …`, never `git add -A`), message
   `i18n(content): Cast 2.0 characters in 13 languages`, then pull again and push to `local-work`.
4. Add one line under the newest HANDOFF block's "Still to do" saying it is done; remove your `.agents/now.md` line.
