# Task: shared lines follow the character's gender

For any agent (written for Gemini 3.8 Flash High in Antigravity). Read `AGENTS.md`, then the top of `HANDOFF.md`
(0z64) first. The earlier task `gendered-user-forms.md` made lines neutral about the **user**; this one is about
the **character**. Do all languages listed below in this one task.

## Why

Characters are female or male (`gender` in `src/mock/characters.ts`: Hana, Iris, Tessa, Lyra… are female). Many
lines are **shared**: any character may say them. The English is neutral ("I was hoping", "They laugh"), but the
translations picked one gender: ru "Я так рад", "Я надеялся" (Hana says it too); fr "Il rit", ru "Он задерживает
объятие", zh-Hant "他笑了" in a date with a female character.

The app now fills `{g:female|male}` with the **speaking character's** gender in these sections only:
`voice.*`, `datePlaces.*`, `dateThemes.*`, `worlds.*.dateRounds.*`. Anywhere else `npm run check:content` fails on
`{g:`, because there it would show on screen as written.

## The rule

1. In the sections above, every word that shows the character's gender becomes `{g:female form|male form}`.
   **Female form first.** Split only the word or words that differ: ru `Я так {g:рада|рад}`, `{name}
   {g:засмеялась|засмеялся}`; fr `{g:Elle|Il} rit`; de `{g:Sie|Er} lacht`; it `{g:lei|lui}`; pt-BR
   `{g:ela|ele}`; zh-Hant `{g:她|他}`.
2. Where it reads as well, use `{name}` or wording without a pronoun instead of a split.
3. No `|`, `{` or `}` inside a form, no nesting. Keep every other `{placeholder}`, `*action*`, emoji, quote style
   and line break.
4. **Never put `{g:}` in a line the user says.** It follows the character, not the user. User lines in these
   sections: every `.text` in `datePlaces`, `dateThemes` and `worlds.*.dateRounds` (the user's answer; `line` and
   `reply` are narration and the character), `voice.morning.chips.*`, `voice.drafts.starters|moreStarters.*`,
   `voice.drafts.voices.*.other`. If such a line marks the user's
   gender (ru `dateThemes.openers.sweet.0.1.text` "«Я так рад, что это именно ты»"), word it neutrally as in
   `gendered-user-forms.md` (ru "«Как хорошо, что это именно ты»").
5. A "you" form for the user stays neutral (the earlier task). Only the character's own forms get `{g:}`.
6. de: `sie`/`ihr` may also be "they" or the formal "Sie". Split only where it means the character.
7. Lines that belong to one character (`characters.*`, `diaryPages.*`, `radioGifts.*`) never get `{g:}`: they use
   that character's gender directly.
8. Change only strings that need it; every other string stays byte-identical. Same keys, same array order and
   length. Never edit `en.json`, `src/mock/*`, `src/ai/*`, `server/*`.

## Steps

1. `git pull` on `local-work`.
2. Write the counts down (2026-10-30):
   - `node scripts/scan-gendered-you.mjs --self --count`: the character about itself in shared lines
     (ru 104, fr 21, es 3, it 18, pt-BR 13).
   - `node scripts/scan-gendered-you.mjs --date --count`: dates calling the character he or she
     (ru 128, de 171, fr 130, es 2, it 15, pt-BR 42, zh-Hant 129).
   - `node scripts/scan-gendered-you.mjs --count`: user lines (ru 10, fr 8, es 1, it 18, pt-BR 12; most are
     right already, see `gendered-user-forms-report.md`; new ones are the date `.text` lines).
   - `node scripts/scan-gendered-you.mjs --cast --count`: a female character's own lines in the masculine (0).
   Without `--count` each lists path and text, e.g. `node scripts/scan-gendered-you.mjs --date de`.
3. **Do not stop at the lists.** They miss forms without a pronoun (ru past tense "Соскучился", "Пришёл"; fr/es/it/
   pt-BR adjectives). Read every string of `voice`, `datePlaces`, `dateThemes`, `worlds.*.dateRounds` in ru, fr,
   es, it, pt-BR, de, zh-Hant. ja, ko, th, vi, tr, id: only check the date narration for he/she words (彼/彼女,
   그/그녀, anh ấy/cô ấy, เขา/เธอ) and split them the same way.
4. Fix the files, one commit per language, e.g. `fix(i18n): ru shared lines follow the character's gender`.
5. Checks, all must pass: `npm run check:content`, `npm run check:locales`, `npx tsc --noEmit`, `npm test`.
   Run the four scans again.
6. Report in `docs/agent-tasks/gendered-character-forms-report.md`:
   - per language: strings changed, each scan count before → after;
   - a table `path | before | after` for **every** change;
   - every scan hit still left, with a few words why it is right (e.g. "about the user, neutral", "de: sie = they").
7. Add a short note to the top of `HANDOFF.md` and update `docs/flows.md` (row D133). Fetch, pull, push to
   `local-work`.
