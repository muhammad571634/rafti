# Group stories (0z317)

PolyBuzz's multi-role character, our way: one card on Find, two or three friends, one comedy told in
scenes like a film. Owner, 2026-11-21: "the user should feel they fell into this group in real life,
like a film; the process moves forward, scene after scene".

## Shape (`src/lib/group-stories.ts`)
- A story: name, hook + knot (the card), the user's role, a `premise` only the model reads (the secret
  the story turns on: the bet, Grandma's rule, the second proposal), 2-3 members, 5 beats.
- A member: name, gender, age, traits, voice, `who` (one line on the sheet), `bio` and `backstory`
  (persona for the model, incl. what they think of the others and hide).
- A beat: `title` + `setting` (the scene card, translated), `goal` (model only: what has to happen
  before the cut), `lead` (who opens it).

## Flow
1. Find → Stories → Groups chip: `GroupStoryGrid` (faces side by side, 3:4 face, people count).
   The book opens `GroupStorySheet`: hook, knot, members, first scene, the user's role. No button.
2. Card tap: `startGroupStory` makes the members once per story (`fromTemplate` = `<story>:<member>`,
   handle `@stories`, no one-to-one chats) and a `GroupChat` with `story: { id, beat: 0, turns: 0 }`;
   a second tap opens the same group.
3. `openStoryScene`: a `scene` card (title, setting; the first adds the user's role), then the lead
   speaks (`beatOpenCue`) and another member answers (`groupReactCue`), before the user writes.
4. While it plays every member turn carries `storyCue` (4 lines: premise + role, the scene, the goal,
   a sitcom tone) ahead of the turn's own cue, through the existing group `cue` (server keeps 8), so no
   server change. A crisis turn is `plain` (no story). Each user message counts a turn and always
   brings a second member in.
5. The user calls the cut: the Next scene chip over the input, lit after `BEAT_TURNS` (6) messages;
   a message's price. After the last beat a `sceneEnd` card; the group goes on as an ordinary group.

## Words
Card, sheet and scene cards are content (`groupStories` in `src/i18n/content/<lang>.json`, read by
`localGroupStory`): en and ru written; the other 12 fall back to English until translated
(`docs/agent-tasks/translate-group-stories.md`). Every spoken line comes from the model in the user's
language. UI strings: `stories.tropes.groups`, `group.nextScene` (14 locales).

## Cost
No new call kind: a story group's user message costs two member replies (one model call each), as a
group message where someone joins in; each scene opening is two calls; the story cue adds ~180 input
tokens per member call (turn part, not cached). See `docs/cost-ledger.md`.

## Next
- More stories (6-8), art for members, Create for groups, the user's choice in the last scene
  remembered by the members afterwards.
