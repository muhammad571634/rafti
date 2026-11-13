# Task: translate the Worlds 2.0 content into the 13 languages

For any agent (written for Gemini 3.8 Flash High in Antigravity). Read `AGENTS.md`, then the top of `HANDOFF.md`
(0z70). Do **all 13 languages in this one task**, one commit per language, in this order:
`es`, `pt-BR`, `fr`, `de`, `it`, `ru`, `tr`, `id`, `vi`, `th`, `ja`, `ko`, `zh-Hant`.

## Why

Worlds 2.0 (0z68) added 15 characters, 3 worlds, and a story, season and events for all 7 worlds.
`src/i18n/content/en.json` has them; the other 13 files do not, so these strings show in English:
**1,285 strings, about 11,800 words, per language.** `npm run check:content` fails for every language until its
strings are in. That is expected here: each language turns green as you finish it.

| Section | What is new |
| --- | --- |
| `characters` | `worldRole` and `arc.beats[].title` for the old 40; everything for `c_ronan`, `c_isolde`, `c_mara`, `c_luca`, `c_viv`, `c_leander`, `c_alaric`, `c_dorian`, `c_celestine`, `c_odile`, `c_erik`, `c_teddy`, `c_freya`, `c_sasha`, `c_priya` |
| `worlds` | `story` for all 7; everything for `velvet`, `gilded`, `arena` (quizzes, date rounds, photo frame) |
| `scenes` | `scene_world_*`, the entry scene of each world |
| `lorebooks` | new entries in the old worlds' books (one rewritten: `lore_moonlit_8.text`), the three new books |
| `voice` | `voice.world`, and `voice.reply.share` for the three new worlds |

## How (for each language)

```
git fetch origin local-work && git pull --rebase origin local-work
node scripts/content-todo.mjs export ru     # .content-todo/ru.json: only what is missing, in English
# translate .content-todo/ru.json in place: replace every English string, keep every key
node scripts/content-todo.mjs merge ru      # puts the answers into src/i18n/content/ru.json, says how many are left
node scripts/check-content.mjs ru
```

- Never edit `src/i18n/content/<code>.json` by hand, and never rewrite a string it already has.
- It is safe to work in parts: a merge skips strings still in English, and `export` then lists what is left.
- In an exported array, `null` is an item the language already has. Leave it as `null`.
- Once only real names and loanwords are left (for example `PRISM`), run `merge <code> --final`, which accepts them.
- `node scripts/content-todo.mjs` with no arguments shows what each language still lacks.

Do not edit `src/mock/`, `src/ai/` or `en.json`. If an English line looks wrong, list it in your report.

## How to translate

Follow "How to translate" in `docs/agent-tasks/translate-content.md` (Phase 3): natural spoken language, never word
for word, each character's voice, the per-language register, placeholders, `*actions*`, emoji, option order and
length limits. In addition:

**Names first.** Translate the `lorebooks` part of the file before the rest, and keep one form of every invented
name everywhere (The Orchid, the crown stone, the Eclipse, the Silver Guard, the Thorn Gate…). Where the language's
file already has a name, reuse it (ru "Серебряная стража", ja 「白銀の近衛兵」). Brands stay in Latin letters (PRISM,
TIDEWATCH). World names are already in `phrases` in `src/i18n/locales/<code>.json`: use those.

**Who speaks decides the gender.**

| Where | Who it is | What to do |
| --- | --- | --- |
| `characters.<id>.*` | that character (table below) | write their gender directly, no `{g:}` |
| `worlds.*.story.ties`, `chapters`, `events.*.note`, `lorebooks` | narration about named people | use each person's gender from the table |
| `worlds.*.story.events.*.line`, `voice.world.*`, `voice.reply.share.*` | any friend in that world | `{g:female form\|male form}` for every word that shows their gender |
| `worlds.*.dateRounds.*`, `worlds.*.story.events.*.round.*` (`line`, `reply`) | any friend in that world | same `{g:…}`; the English says "they" |
| any `choices[].text` | the user | neutral wording, never `{g:}` |
| `worlds.*.story.userRole`, and "you" in `premise`, chapters and notes | the user, of any gender | wording that fits anyone (see `docs/agent-tasks/gendered-user-forms.md`) |
| `scenes.scene_world_<world>` | the friend in `entry.characterId` in `src/mock/world-stories.ts` | no `{g:}` |

`{g:}` anywhere else fails `check:content`, because it would show on screen as written. The female form always
comes first. Exception to neutral: `gilded`'s `userRole` is "The villainess", a role in the story: keep it as is.

| World | Women | Men |
| --- | --- | --- |
| `seaside` | Hana, Iris, Tessa | Kai, Elio, Theo, Rowan, Jun, Noah, Felix |
| `moonlit` | Seraphine, Lyra | Aurelian, Castor, Zarek, Vesper, Rhys, Kael, Orin, Corvin |
| `neon` | Ari, Cass | Ezra, Seren, Kiro, Minu, Haze, Rio, Dex, Juno |
| `tidepool` | Sol, Ivy, Nadia | Adrian, Lucas, Marco, Gideon, Ren, Hugo, Cole |
| `velvet` | Isolde, Mara, Vivienne (Viv) | Ronan, Luca |
| `gilded` | Celestine, Odile | Leander, Alaric, Dorian |
| `arena` | Freya, Sasha, Priya | Erik, Teddy |

**Each world has its own sound.** `velvet`: noir, dry, few words; tension and loyalty, never more graphic than the
English. `gilded`: formal court speech, politeness that can cut. `arena`: locker-room plain, with the hockey words a
fan in that language really uses. `seaside`, `tidepool`: warm and everyday. `moonlit`: fantasy, a little old-fashioned.
`neon`: quick, online, idol-fan words.

**Short labels stay short.** They sit on one or two lines on a phone: `worldRole` (English up to 44 characters), chapter
titles (24), `arc.beats[].title` (33), `userRole.title`, `events.*.title`, `events.*.when`.

`arc.beats[].title` is a teaser shown on the profile once it opens ("The ice pack in his bag"), not a sentence.
Translate it as a small mystery and do not give away more than the English does.

## Done for a language

`node scripts/check-content.mjs <code>` prints PASS, `node scripts/content-todo.mjs` shows 0 for it, and you have read
20 random new strings back for tone and gender. Then commit `src/i18n/content/<code>.json` alone, as
`feat(i18n): <code> Worlds 2.0 content`, and push to `local-work` (fetch and rebase first: other agents push too).

## Done for the task

- `npm run check:content` passes for all 13, `npm run check:locales`, `npx tsc --noEmit`, `npm test`.
- A new top entry in `HANDOFF.md`, and D135 in `docs/flows.md` set to `done`.
- Send it to the owner's phone: in PowerShell, `$env:EXPO_TOKEN = [Environment]::GetEnvironmentVariable('EXPO_TOKEN','User')`,
  `$env:CI = '1'`, then `npx eas-cli update --channel preview --environment preview --non-interactive --message "Worlds 2.0 in 13 languages"`.
- Report to the owner in Uzbek: how many strings per language and anything still in English.

Use your own knowledge to translate; do not call any paid API.
