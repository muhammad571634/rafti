# Today hero card: who it shows and why

The big card at the top of Today (`src/components/today-hero.tsx`). BIMOBIMO shows the
character you were last talking with there, so opening the app feels like coming back to
that person. Sigmazam does the same.

## Who is on the card

`featuredFriend()` decides, every time the store changes (no timer, no cache):

1. **Candidates:** every character you have a bond and a chat with (same rule as the Us
   tab). Blocked characters lose their chat, so they drop out by themselves.
2. **Order:** the one you **talked with last** comes first (`lastTalkedAt()`):
   - your newest message in that chat (text, voice, photo, sticker), or
   - the newest call that connected, whoever called.
   Their own first texts (good morning, birthday wish, missed call, a reply after a date)
   do not count: the card follows what *you* did, not the notifications.
   Pending (unsent) messages do not count.
3. **Tie or nobody yet** (fresh install, only greetings so far): the closest bond
   (highest closeness) wins.
4. **Picture:** the character's wide scene (`assets/heroes/c_<id>.jpg`) if there is one,
   else their tall scene (`assets/portraits/c_<id>.jpg`, the owner's Nano Banana art), else the
   portrait (`assets/avatars`, or the photo of a character you created), cropped to the card. A
   candidate with no picture at all is skipped.

## The chain (what moves the card)

| You do | Where it is written | Card |
| --- | --- | --- |
| Send a message in a chat | `sendMessage` → `appendMessage` (author `me`) | that character, at once |
| Call them, or pick up their call | `addCall` → a `call` message, not missed | that character |
| Miss their call | `call` message with `missed` | no change |
| They text first (morning, birthday, reminder) | message with author `them` | no change |
| Add a new friend | `addFriend` (greeting from them) | no change until you write |
| Clear the chat | messages gone | falls back to the next most recent |
| Block them | chat and bond removed | next most recent |
| Reset closeness | bond reset, chat kept | stays (the chat is still the latest) |

Today reads the store directly, so coming back from a chat shows the new person
immediately; there is nothing to refresh.

## On the card

The friend waiting for you (owner, 2026-11-03, Replika's feel): about half the screen tall
(`heroHeight`: 54% of the window, 380-520 pt; 300 pt before 0z107), a wide scene slid so the face
sits mid-frame (`sceneFocus`, shared with the chat ground). On top, the name and one clear-glass
chip with "N days" (the day you met is day 1) and the bond level, the progress to the next level
as a mint line along the chip's bottom edge. At the bottom, their newest written line in a
dark-glass bubble with its time (`waitingLine`: speech only, the narration when nothing is said
aloud; an echo of your own words is skipped; none when a helpline card sits up to 4 lines before
it or anywhere after it), then a dark-glass "Message" field with a mic. The whole card is one
button that opens that chat; the field is a cue, not a second control.

Alive, as Replika's friend is in their room (0z107): the picture breathes (scale 1 to 1.045 and
back, 7 s each way) while Today is on screen; a light over it follows the user's hour (`dayLight`:
dawn 5-8 peach, evening 17-21 rose, night 21-5 blue, none by day; read on each visit); a line
still unread types in for 1.4 s once a session before it shows. Reduce Motion: no breath, no
typing. Nothing here writes a character line: what shows is what the chat holds.

## The day's sealed note

Under the widgets, Today shows "<name>'s note · Sealed" while a secret note waits to be opened.
Until 2026-11-03 a note existed only once the user opened Secret note, so a new install never had
one there. Now the friend on the card writes it by themselves (`leaveDailyNote`, called when Today
comes into view; the rules in `dailyNoteStep`, `src/lib/daily-note.ts`): one a day, none while
another sealed note waits, none on a day with a helpline card in that chat; a note the busy model
left unwritten is asked again at most every 10 minutes. With the model on, its words only (a note
it had not finished stays unwritten after a restart, no stock line); the swap still costs shells.
It waits for launch to finish (`hydrated`: before that the chats are still loading and a helpline
card would be missed), asks again after midnight if Today stays open, and a sealed note from a friend
whose chat had a helpline card today stays off Today until tomorrow (`helplineToday`).

## Pictures

All 40 characters have a portrait and a wide scene (2026-10-07). Twelve of the newer ones (Alaric,
Celestine, Dorian, Erik, Isolde, Leander, Luca, Mara, Odile, Ronan, Teddy, Viv) have the owner's
close-up as their portrait and a tall scene in `assets/portraits` (2026-11-03, from `art-new/`);
Freya, Sasha, Priya, Oppa and Luna have none yet. A created character uses its
photo. New scenes: prompts in `docs/nano-banana-heroes.md` (attach the portrait only), files to
`assets/raw/heroes/c_<id>.png`, then `python scripts/build-brand-art.py characters`.
