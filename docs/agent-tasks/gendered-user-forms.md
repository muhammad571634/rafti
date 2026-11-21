# Task: no translated content line may assume the user is a man

For any agent (written for Gemini 3.8 Flash High in Antigravity). Read `AGENTS.md`, then the top of `HANDOFF.md`
(0z58) first. Do **all five languages in this one task**: `ru`, `fr`, `es`, `it`, `pt-BR`.

## Why

Onboarding now asks how to address the user: she / he / they (`user.pronouns`). The English content is neutral
("you"), but the translations in `src/i18n/content/<code>.json` often picked masculine forms for "you" and for the
user's own "I": ru "Ты опоздал", "ты должен мне кофе"; fr "tu es venu", "soyez le bienvenu"; it "Sei pronto?",
"benvenuto"; pt-BR "Preparado?", "seja bem-vindo"; es "bienvenido". A woman reads these as mistakes. The other eight
languages were checked on 2026-10-30 and have no such forms (zh-Hant uses 你; ko, vi, th, ja, de, id, tr are clean).

## The rule

1. **Rewrite to wording that does not mark the user's gender.** No she/he variants, no code changes.
2. Keep the meaning, the tone, the character's voice and roughly the length. Keep every `{placeholder}`, every
   `*action*`, emoji, quote style and line breaks.
3. **Keep what is right:** a character's own gendered forms match that character (`gender` in
   `src/mock/characters.ts`: Kai is male, Hana is female). A line the **user** says to one character uses that
   character's gender for "you": ru starter to Kai "Оставил мне вкусненького?" is correct, leave it.
4. Agreement with a neutral noun is fine: ru "ты единственный человек", it "sei la persona giusta".
5. Change only strings that need it. Every other string stays byte-identical. Same keys, same array order and
   length (quiz answers are picked by index).
6. Never edit `src/i18n/content/en.json` (generated), `src/mock/*`, `src/ai/*`, `server/*`, or another language.

## Who speaks (decides which form is the user's)

| Path | Speaker | The user's gender shows in |
| --- | --- | --- |
| `characters.<id>.starters`, `truthsForThem.*.ask`, `daresForThem.*.ask`, `secretNotes.*.myNote`, `datePlaces.*.rounds.*.choices.*.text`, `diaryEntries.*.title/body`, `quizPacks.*.options` | the user | "I" forms (ru "я опоздал", it "sono stonato", pt "obrigado", fr "désolé") |
| `scenes.*.userRole`, `datePlaces.*.rounds.*.line` | narration about the user | "you" forms and nouns for the user (ru "Пассажир, который…") |
| everything else (bios, backstories, greetings, voice, worlds, quizLines, radioGifts, diary replies, lorebooks…) | a character | "you" forms and terms of address (ru "милый", fr "mon cher", it "caro") |

## Neutral wording that works

- **ru:** present or future tense instead of past ("Ты опоздал" → "Опаздываешь"); a noun as the subject ("ты
  впервые пришёл сюда" → "твой первый вечер здесь", "ты поел?" → "ужин у тебя сегодня был?"); "с тебя кофе"
  instead of "ты должен мне кофе"; "У тебя есть минутка?" instead of "Ты свободен?"; "Начнём?" instead of "Ты
  готов?"; "просто знай" instead of "чтобы ты знал"; drop "милый"/"дорогой" or use the user's name only if the line
  already has one.
- **fr:** "Te voilà" instead of "tu es venu"; "Bienvenue !" (the noun never agrees) instead of "sois/soyez le
  bienvenu"; "On y va ?" instead of "Tu es prêt ?"; "tu as besoin de repos" instead of "tu es fatigué"; keep
  "content de te voir" when the character is the one who is glad.
- **es:** "¿Empezamos?" instead of "¿Listo?"; "qué bueno verte" instead of "bienvenido"; "¿Te pesa el día?"
  instead of "¿Estás cansado?"; "la primera persona" instead of "el primero".
- **it:** "Ci sei?" instead of "Sei pronto?"; "che bello vederti" instead of "benvenuto"; "sei qui" instead of
  "sei venuto"; "sei ancora in piedi?" instead of "sei sveglio?"; "senza nessuno" instead of "da solo" (when it
  is the user).
- **pt-BR:** "Bora?" instead of "Preparado?"; "que bom te ver" instead of "seja bem-vindo"; "Bateu o cansaço?"
  instead of "Está cansado?"; "valeu" instead of the user's "obrigado"; "sem ninguém" instead of "sozinho" (when
  it is the user).

## Steps

1. `git pull` on `local-work` (other agents push to it too).
2. `node scripts/scan-gendered-you.mjs --count` and write the five numbers down (2026-10-30: ru 139, fr 18,
   es 8, it 79, pt-BR 26). `node scripts/scan-gendered-you.mjs ru` lists the candidates with path and speaker.
   The list is rough: many hits are right as they are (a character speaking about themself, rule 3).
3. **Do not stop at the list.** It misses lines without a pronoun (ru "Устал?", "Опоздал на автобус"). For each
   language read every string of `characters`, `voice`, `datePlaces`, `worlds`, `scenes`, `diaryEntries`,
   `diaryPages`, `secretNotes`, `radioGifts`, `truthsForYou`, `daresForYou`, `quizLines`, `lorebooks`.
4. Fix the five files.
5. Checks, all must pass: `npm run check:content`, `npm run check:locales`, `npx tsc --noEmit`, `npm test`.
   Run the scan count again.
6. Report in `docs/agent-tasks/gendered-user-forms-report.md`:
   - per language: number of strings changed, scan count before → after;
   - a table `path | before | after` for **every** change (the reviewer reads it line by line);
   - every scan hit still left, with a few words why it is right (e.g. "Kai about himself");
   - **out of scope, list only, do not fix:** generic lines that guess the **character's** gender, e.g. ru
     `datePlaces.ds_rain.rounds.4.choices.1.reply` "Он задерживает объятие" is used for every character.
7. Commit per language, e.g. `fix(i18n): ru content no longer assumes the user is a man`, then the report.
   Add a short note to the top of `HANDOFF.md` and update `docs/flows.md`. Fetch, pull, push to `local-work`.
