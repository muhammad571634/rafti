# Brief: translate group stories (Gemini)

Scope: the `groupStories` section of `src/i18n/content/en.json` (3 stories: name, hook, knot,
userRole, members.<id>.who, beats[].title / setting) into the 12 content files that lack it:
de, es, fr, id, it, ja, ko, pt-BR, th, tr, vi, zh-Hant. `ru.json` is done (the reference for tone).

Rules:
- Same keys and array lengths as en; member names stay as written (Mia, Zara, Lina, Rio, Eli, Max,
  Oscar, Bea, Remy, Nina); "OPERATION RING" may be translated as a group-chat name in caps.
- Comedy, warm, short; "you" is the user (informal where the language has it, as in the templates).
- `userRole` keeps the "You: …" shape in the language's own words.
- Do not touch any other section or file; append the section before the file's closing brace.

Checks: `npm run check:content`, `npm run check:locales`, `npx tsc --noEmit`. Commit only those 12
files. Done = all 13 non-English files carry `groupStories` and the checks pass.
