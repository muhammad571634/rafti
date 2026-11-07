# Task: translate the mock voice (Phase 4 of translate-content)

For any agent (Gemini 3.8 Flash in a terminal, Claude). The owner approved this phase on
2026-10-29. Read `AGENTS.md`, the top of `HANDOFF.md`, and **all of**
`docs/agent-tasks/translate-content.md` first: Phases 0-3 are done and this task reuses their
machinery (`overlay`, `content-extract`, `check-content`) and their translation rules. Do the
steps **in order, one commit each**; never mix steps. Reply to the owner in Uzbek.

## Why

Phases 0-3 translated the built-in catalog (characters, dates, worlds, games…) into the 13
languages. What the user still sees in English is the **mock voice**: the pools of lines that
stand in for the model when the server does not answer. Every chat reply, push, check-in, family
line, alarm morning chain, diary page and character draft still comes out in English on a Russian
or Japanese phone. About 700 strings (rough count, 2026-10-29) in these 17 files:

| file | what it says | main exports |
| --- | --- | --- |
| `src/mock/reply-writer.ts` | every chat reply (greet, react by emotion, comfort, tease, share by world, story beats `*{name} …*`, interest questions) | `writeMockReply` |
| `src/mock/chat.ts` | missed call, morning / evening greetings, birthday, call lines, plan ack / reminder / follow-up, after a date, board and photo replies | `missedCallLines` … `photoReply` |
| `src/mock/group.ts` | group chat hellos, replies, reactions, comebacks, voice / photo / join lines | `group*` |
| `src/mock/temper.ts` | "may I text you?" ask and answer, temper comebacks | `askLine`, `askAnswer`, `temperComeback` |
| `src/mock/push.ts` | comeback ladder, diary and gift nudges | `comebackLines`, `diaryNudgeLines`, `giftNudgeLines` |
| `src/mock/threads.ts` | thread touches (before / after an exam…), quests and offers, break and night lines | `mockTouchLine`, `mockQuest`, `mockBreakLine`, `mockNightLine` |
| `src/mock/kin.ts` | family members' everyday lines and first hello | `lifeLine`, `familyHello` |
| `src/mock/care.ts` | check-in after "I have a headache" etc. | `careLine` |
| `src/mock/brief.ts`, `week.ts`, `day-ask.ts` | morning brief, weekly line, evening "how was your day?" | `briefLine`, `weekLine`, `dayLine` |
| `src/mock/steer.ts` | lines after Continue / time skip | `mockSteerLines` |
| `src/mock/streams.ts` | two friends' stream lines (`{other}`, `{topic}`) | `mockStreamLine` |
| `src/mock/diary-writer.ts` | the friend's diary page the next morning (openers, quote lines, closers) | `writePage` |
| `src/mock/reply-ideas.ts` | the answer to a tapped reply idea | `ideaAnswer` |
| `src/mock/character-drafts.ts` | Create character: the AI draft and its chat replies | `mockDraft`, `mockDraftReply`, `mockFieldReply` |
| `src/lib/morning-chain.ts` | wake-up question, the alarm chain lines, the chips | `wakeQuestion`, `CHAIN_LINES`, `CHIPS` |

Not in scope, leave in English and untouched: the seeded demo chats
(`conversations`, `messagesByConversation` in `chat.ts`: saved history), anything in `src/ai/`
(prompts), and every **regex that reads the user's words** (see "Never translate" below).

## The rules (same as translate-content, plus three)

1. **English stays the source and the logic.** The English lines stay in the `.ts` files they are
   in now; the server, the prompts and every comparison keep English. Translations are laid over
   at the moment a line is said, through the same `overlay`.
2. **A missing or broken translation falls back to the English**, never a crash or a blank.
3. **Arrays keep their order and length**, so a seed picks the same line in every language
   (the push and the chat say the same line because they share the seed).
4. **New: no sentence is built by gluing pieces.** Word order differs between languages
   (`*${name} ${beat}.*`, `` `${OPENER}${line}` ``, `` `${activity} today, nice.` ``,
   `.replace('{title}', d.dateTitle.toLowerCase())`). Every line a translator sees is one
   whole template with named placeholders: `"*{name} {beat}.*"` becomes its own template key
   so Japanese can write `"*{name}は{beat}。*"`. Never `.toLowerCase()` a placeholder value in
   code (German nouns, Turkish İ); if English needs lower case, write the English template so it
   reads well without it.
5. **New: the speaker's gender.** Many pools are said by any character. Where a language must
   mark the speaker's gender (ru, pt-BR, fr, es, it: "я рада / рад", "obrigada / obrigado",
   "contente / content"…), the translation may use `{g:female form|male form}` inside the
   template, e.g. `"Я так {g:рада|рад} тебя слышать"`. `fill` (below) resolves it by the speaker's
   `gender`; with no gender known it takes the **first** form, so put the more neutral form first
   when there is one. English never uses `{g:…}`. Prefer wording that needs no gender at all;
   use `{g:…}` only when the language forces it.
6. **New: tapped chips.** `CHIPS` in `morning-chain.ts` are compared by text in the store
   (`text === CHIPS.before30`, `readYesNo(text)`). After translation the user taps the localized
   chip, so the store must first map a tapped chip back to its English key
   (`chipKey(text)`: matches the English **or** the localized chip, returns the key) and run the
   English logic on that. A typed answer still goes through the English regexes unchanged.

### Never translate (the server's model replaces these later)

Regexes and word lists that read what the user typed: `care.ts` detection in `src/lib/care.ts`,
`threads.ts` (`BIG`, `TASK`, `WISH`, `RESULTS`, `GOAL`, `GOING`, `TITLES`, `mockOutcome`,
`mockMove`, `localPlan`), `day-ask.ts` `moodOf`, `morning-chain.ts` (`readMorningReply`,
`readMorningTime`, `readActivity`, `ACTIVITIES` regexes, `readYesNo`), `character-drafts.ts`
(`MALE`, `FEMALE`, `AGE`). Do not touch them, do not "add Japanese words" to them.

The English **labels** those readers return (`readActivity` → `'Gym'`) are said in a line, so the
line gets a template and the label gets a translation: a `voice.morning.activities` map keyed by
the English label (`"Gym": "Спортзал"`), looked up with the English as fallback.

## Step A: the machinery (one commit, no translations yet)

### A1. `src/i18n/voice.ts`: a pure lookup the mocks can import

The mocks must stay loadable in plain Node (`npm test`, `content:extract`), so they must not
import `i18next`, `content.ts` or JSON. Add a tiny pure module:

```ts
/** Where a mock gets its lines; content.ts plugs in the screen language, tests keep the English. */
let source: <T>(section: string, en: T) => T = (_section, en) => en;

export function setVoiceSource(fn: <T>(section: string, en: T) => T) {
  source = fn;
}

/** A mock's line pools in the screen language, e.g. `voice('care', CARE)`; English when there is no translation. */
export const voice = <T,>(section: string, en: T): T => source(section, en);

/**
 * A template with its placeholders filled: `{name}`-style values, and `{g:female|male}` picked by
 * the speaker's gender (first form when unknown). An unknown placeholder is left as written.
 */
export function fill(template: string, values: Record<string, string | number> = {}, gender?: string) {
  return template
    .replace(/\{g:([^|}]*)\|([^}]*)\}/g, (_m, f: string, m: string) => (gender === 'male' ? m : f))
    .replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole));
}
```

In `src/i18n/content.ts`, at load, plug it in using the same `cache` as `localized` (cleared on
`languageChanged`):

```ts
setVoiceSource((section, en) => {
  const lang = i18n.language || 'en';
  const key = `${lang}:voice:${section}`;
  if (!cache.has(key)) cache.set(key, overlay(en, (CONTENT[lang]?.voice as Record<string, unknown> | undefined)?.[section]));
  return cache.get(key) as typeof en;
});
``` `content.ts` is already imported by
the app before any mock line is said (check that; if not, import it from `src/i18n/index.ts`'s
caller, not from `index.ts` itself: no cycle).

Unit-test `fill` in `src/i18n/voice.test.ts`: values filled, unknown placeholder kept, `{g:a|b}`
with `male`, `female`, `undefined`, two `{g:}` in one line, `{{char}}` left alone.

### A2. Turn every pool into plain templates, file by file

In each of the 17 files:

- Each pool becomes **plain data**: strings or nested objects / records / arrays of strings.
  Functions become templates: `(name) => \`Happy birthday, ${name}!\`` →
  `'Happy birthday, {name}!'`; `(quote, days) => …` → `'… "{quote}" …'`, `'Day {days} …'`.
  A function with a branch (`quote ? A : B`) becomes two keys (`withQuote`, `noQuote`).
- Put all of a file's pools in **one exported English object** at the top of the file, named
  `<FILE>_VOICE` (`CARE_VOICE`, `KIN_VOICE`, `REPLY_VOICE`, `MORNING_VOICE`…), keys in
  camelCase, the English text **unchanged** (same words, same punctuation, same emoji, same
  order). Records keyed by `Temper`, `Emotion`, `CareKind`, `KinGroup`, world name… stay
  records with the same keys (world names as keys are fine: they are keys, not text).
- Each exported function reads its pools through `voice('<section>', <FILE>_VOICE)` **at call
  time** (not at module load: the language can change) and fills with `fill(...)`. Keep every
  exported function's name, parameters and return type; add an optional `gender?: CharacterGender`
  last parameter only where the speaker is known and a template could use `{g:}`, and pass it
  from the call sites (store, `notifications/plan.ts`) that have the character.
- `reply-writer.ts`: its `recent.includes(l.toLowerCase())` repeat check works on any language;
  keep it. `interestAsk` gets the interest through `phrase(interest)` (the user's interests are
  stored in English). Story beats become whole templates (`storyOpen: '*{name} {beat}.*'`…).
- `threads.ts` `mockTouchLine`: the temper opener becomes part of the template
  (`openers: { teasing: 'Oi! {line}', shy: 'Um… {line}', other: '{line}' }`), not concatenation.
- `morning-chain.ts`: `CHAIN_LINES` and `CHIPS` keep their names and shape for callers, but read
  through `voice`; make them getters or small functions if needed (callers in
  `store/use-app-store.ts` and `notifications/alarms.ts`). Add `chipKey` (rule 6) and use it at
  every chip comparison in the store. `askTime` becomes two templates (`askTimeGym`,
  `askTime: '{activity} today, nice. What time are you heading out?'`) with the activity label
  from `activities`.
- `diary-writer.ts`: `{title}` and `{quote}` stay placeholders; drop `.toLowerCase()` on the date
  title (rule 4). `{quote}` is the user's own words and stays as they wrote it.
- `character-drafts.ts`: only the lines and generated fields; `ROLES`, `STYLE_VOICE` from
  `src/lib/create-character.ts` are logic: if a draft field shows one of them, translate at the
  template, not in `create-character.ts`.

**English must not change by one character.** Before you start A2, write a scratch script (do
not commit it) that calls every exported function with fixed inputs and seeds and prints the
output; run it before and after A2 and diff: the English output must be identical. Existing
tests must pass without edits to their expectations.

### A3. Extract: a `voice` section in `en.json`

In `scripts/content-extract.ts` import the 17 `*_VOICE` objects and add one top-level section
`voice: { reply, chat, group, temper, push, threads, kin, care, brief, week, dayAsk, steer,
streams, diary, ideas, drafts, morning }` (section names = the `voice('<section>', …)` names).
Unlike the catalog sections, **every string leaf is kept** (no field filter). Keep 2-space indent,
final newline, deterministic output. `npm run content:extract` rewrites `en.json`; the 13 language
files then miss `voice`, which is fine for this commit **only if** `check:content` accepts a
missing whole section as "not translated yet" (warn, exit 0). Make it so: a missing top-level
section warns; a present section must match exactly as today.

Teach `scripts/check-content.mjs` the `{g:…|…}` token: strip `{g:…}` before comparing placeholder
sets, and fail if a `{g:` has no `|` or is not closed. Also check, in the `voice` section, that
`{{char}}`-style tokens are untouched (they already are).

### A4. Pushes follow the language

Pushes are planned ahead (`src/notifications/sync.ts` calls `planPushes`). Find what triggers a
re-sync and make a language change trigger it too (after `setLocale`), so a push already
scheduled in English is replaced by the new language's line. Alarm notifications
(`syncAlarms`, `CHAIN_LINES.checkIn`) the same.

### A5. Done when

`npx tsc --noEmit`, `npm test`, `npm run check:locales`, `npm run content:extract` then
`npm run check:content` all pass; the English diff from A2 is empty; a copy of `en.json`'s
`voice` section pasted into `ru.json` passes `check:content ru` (remove it before committing);
on web (`node scripts/ensure-expo.mjs`, never a second server) a chat reply, a care line and
the morning chain still read exactly as before. Commit:
`feat(i18n): phase 4a - mock voice templates and voice section`.

## Step B: translate (one language per commit)

Same order as Phase 3: `es`, `pt-BR`, `fr`, `de`, `it`, `ja`, `ko`, `zh-Hant`, `id`, `vi`, `th`,
`ru`, `tr`. Add only the `voice` section to `src/i18n/content/<code>.json` (do not touch the other
sections). Work sub-section by sub-section in the order of `en.json`; after each run
`node scripts/check-content.mjs <code>`.

All of Phase 3's "How to translate" rules apply (natural texting, never word for word; casual
"you"; `ja` タメ口, `ko` 반말, `zh-Hant` Taiwan usage, `es` neutral Latin American…; keep
placeholders, `*actions*`, emoji, the language's own quotes; use the shell word and names from
`src/i18n/locales/<code>.json`; no paid API). For the voice in particular:

- **Who says it decides the tone.** Records keyed by temper (`warm`, `teasing`, `sulky`,
  `clingy`, `shy`), by emotion, by family role (`parent`, `sibling`, `grandparent`) keep that
  voice: a sulky line stays curt, a grandparent stays warm and a little old-fashioned, a sibling
  teases. In `ko` a grandparent may speak softly in 반말 to a grandchild; in `ja` a parent does
  not use keigo to their child.
- **Short stays short.** These are text bubbles and push bodies: keep each line about as long
  as the English (CJK: about half the characters). Chips (`morning.chips`) stay 1-3 words.
- **Gender** only through `{g:female|male}` when the language forces it (rule 5); `ja`, `ko`,
  `zh-Hant`, `id`, `vi`, `th`, `tr`, `de` almost never need it. For the user, wording that fits
  anyone.
- **Placeholders are other people's words.** `{quote}` and `{m}` are the user's own words, `{topic}`
  a stream topic, `{title}` a plan or date title: put quotes around them the way the English does
  and do not inflect them (no case endings glued onto `{name}` in ru, tr, ko particles: write
  `{name}` where no ending is needed, or rephrase; in `ko` pick the particle that reads either
  way, e.g. `{name}(이)가`, only if nothing better fits).
- `{g:…}` forms, emoji and `*actions*` count exactly as `check:content` says.

Done for a language when `check:content <code>` passes with no "identical to English" warning in
`voice` except names, emoji-only lines and loanwords, and you have read 30 random voice lines
back aloud in your head as the character for tone. Commit per language:
`feat(i18n): phase 4b - <language> (<code>) mock voice`.

## Every commit

Same as translate-content.md "Every commit": `tsc`, `npm test`, `check:locales`,
`check:content`; a new top entry in `HANDOFF.md` (what changed, how many strings, what is still
English, `NEXT:`) and the matching row in `docs/flows.md`; `git fetch` and
`git pull --rebase origin local-work` before pushing to `local-work`; then the EAS update to the
owner's phone with the command in translate-content.md. Never write a key or token into a file
or the chat.

## If you are unsure

Stop and ask the owner (in Uzbek) instead of guessing when: a line only makes sense in English
(a pun, a rhyme): write a line with the same feeling, never a literal one; a call site cannot know
the speaker; a change would touch an approved screen (`HANDOFF.md`), a regex, or `src/ai/`.
