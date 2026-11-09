# Delete and cleanup: what exists, what is missing, the plan (0z180, 2026-11-09)

Owner's ask: "I don't see delete anywhere: removing a character, taking it out of my friends, clearing
the board, the diary and the like, deleting what I don't like or need. Where and how?"

## What exists today (store action → where the user reaches it)

| Thing | How the user deletes it today |
|---|---|
| A chat | Chats tab: swipe the row left → Delete (asks first). Keeps the friend, memories, plans: like iOS Messages |
| Start a chat over | Friend's chat settings → Clear chat (a fresh opening line) |
| One message | Hold the message → Delete |
| A memory | Friend → Memories → delete |
| A plan | Us: the plan's sheet → remove; a plan card in a chat → its sheet |
| An alarm | Alarms list (swipe) and the alarm editor |
| A group / a member | Chats swipe; the group's info screen |
| Personas, scenes, lorebooks and entries, streams, quizzes, frames, date themes, radio clips | each one's edit screen |
| A thread (what the friend follows up on) | Mind → the thread's sheet → forget |
| A friend, everything at once | Friend's chat settings → Block (asks first; wipes chat, memories, plans, notes, board, photos, radio, dates; lists them in Profile → Blocked) |
| The account | Profile → Delete account |

## Missing

1. **Remove a friend without blocking.** Only Block exists, and it also hides them from Find.
2. **Delete a character the user made.** `addCharacter` / `updateCharacter` exist; no delete anywhere.
3. **A diary page.** `deleteDiaryEntry` exists in the store; no screen calls it.
4. **A board note.** `postBoardNote` only.
5. **A photo** (Photo Booth, a photo's page).
6. **Notes** (secret notes, daily notes).
7. **Call history** (Recents).

## Bug found on the way (Block leaves data behind)

`blockCharacter` clears chats, memories, plans, notes, board, photos, radio, dates, but not:
- `alarms` with that friend (`Alarm.characterId`): the blocked friend still wakes the user;
- `threads` (`Thread.characterId`): follow-ups, and their pushes, can still come from them;
- `calls` (`CallRecord.characterId`): their calls stay in Recents;
- `diary` replies (`DiaryEntry.reply.characterId`).
Fix in the same pass: one `forgetFriend(characterId)` cleanup used by Block, Remove friend and
Delete character, with its scheduled notifications cancelled, and a test that no slice of state
keeps the id afterwards.

## Plan (Apple HIG: swipe in lists, hold for a context menu, a red destructive row at the bottom of
## a settings screen, an action sheet to confirm what cannot be undone)

| Thing | Where | How | Confirm |
|---|---|---|---|
| Remove a friend | Friend's chat settings, red row above Block; Contacts: swipe left | `forgetFriend` without `blockedIds`: they stay in Find, can be added again | Action sheet: "Remove Hana? Your chat, memories, plans and notes with her are deleted." |
| Delete a made character | Contacts → Created by you: swipe left; its edit screen: red row at the bottom | `forgetFriend` + remove the character (and its server copy if shared later) | Action sheet, names what goes |
| A diary page | Hold the page → Delete; the page's own view: trash in the toolbar | `deleteDiaryEntry` | Action sheet (a written page cannot come back) |
| A board note | Hold the note → Delete (the friend's answer goes with it) | new `deleteBoardPost` | Action sheet |
| A photo | Photo page: trash in the toolbar; grid: hold → Delete | new `deletePhoto` | Action sheet |
| A note | Hold → Delete | new `deleteNote` | Action sheet |
| Call history | Recents: swipe a row; header "Clear" | new `deleteCall`, `clearCalls` | "Clear all" asks; one row does not |

Rules: every delete that loses something the user wrote or the friend made asks first; nothing is
ever deleted by a single tap; deleted friends' pushes are cancelled; the 14 locales get every new
string; each chain is walked on the A51 with the worst case (many items, the last item, a friend in a
group, a friend with an alarm on).
