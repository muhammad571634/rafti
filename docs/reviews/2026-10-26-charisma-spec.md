# Review: `docs/character-charisma-spec.md` (Gemini, 2026-10-26)

Reviewer notes for any agent. Gemini (Antigravity) works beside Claude as a reviewer; the owner's
rule: its findings are suggestions, Claude checks each against the code, Apple HIG and the owner's
past decisions, takes what helps and builds it **for every character**, never for a hand-picked few.

## Taken (built in D96)

| Idea | How it was built |
|---|---|
| ↻ versions should not read alike | `redoCue` (`src/lib/chat-turns.ts`): the earlier versions go to the model as already said, the new one is the same person taking another angle; `ChatPromptInput.redo`. The mock avoids every earlier version, not only the one on screen. All chats. |
| A sensory first line | `Character.opening`, a short `*action*` before the main greeting (`withOpening`), shown in Mixed and Story chats, left out in Talk. Written for the whole official cast (41; the user-built Oppa has none); quick create writes one, the create form has the field. |
| An endearing flaw | `Character.quirk`, in the persona prompt ("show it now and then, never announce it"); the whole official cast, quick create, the form. Kind and healthy only. |

## Not taken, and why

| Idea | Why not |
|---|---|
| Five new tempers (`teasing_tsundere`, `protective_brooding`…) | The app has five tempers (D86, `src/lib/temper.ts`) wired into texts first, the push budget and the comeback ladder. |
| The sample taglines ("loses all composure when your name lights up his phone", "guards your messages", a possessive Kael) | Possessive or jealous framing breaks the presence rules (never guilt, threats or jealousy) and the store age rating. |
| Taglines instead of categories on Find and Today | No "Vet · Tidepool Café" line exists; Find shows the world, the bios already carry the charm, the owner just approved the Find card and wants minimal text. |
| `avatarFocalPoint` | Avatars are separate crops already (`assets/avatars`). |
| A fixed tone order for ↻ (comforting, then playful, then thoughtful) | Too rigid; the model picks the angle from the earlier versions instead. |
