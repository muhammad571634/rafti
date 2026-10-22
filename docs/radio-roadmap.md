# Radio: how it works now, and what may come later

Written 2026-10-22 at the owner's request: keep the logic for later, including a possible feed and
public clips. Everything here is mock in the app today (no audio, a timer runs); the server makes the
real voice with TTS (`docs/backend-plan.md` §12.14).

## 1. How it works now

| Piece | Rule | Code |
| --- | --- | --- |
| Friends' clips ("gifts") | Seeded per character; shown only for friends the user chats with. Some wait for a level (6 = "More than friends", 16 = "Beloved") | `src/mock/radio.ts`, `clipUnlocked` |
| A level opens a clip | The friend sends it: a voice message in the chat (transcript = the lines), and Radio marks it **New** until it is played or opened. Only level-gated clips are sent; open ones are just there | `clipsOpenedBy` (tested), `addIntimacy`, `newRadioGifts`, `markRadioGiftHeard` |
| The user's own clips | Pick a friend, 1-5 lines, optional name; 5 lines = 1 shell; crisis lines are not voiced (helpline card); the server rejects abuse and refunds | `makeRadioClip`, `checkClip` |
| Send to chat | The user's clip goes to that friend's chat as the user's voice message, free | `shareRadioClip` |
| Sounds | Background tracks (rain, fire, waves, café, lullaby), one thing plays at a time | `useRadioPlayer` |
| **Clip as the alarm voice** | An alarm with a friend can use one of that friend's clips (the user's own, or an open gift) instead of the stock "good morning". The editor lists them under "Their Radio clips"; the clip player has "Wake me with this" (a new alarm with the friend and clip chosen). While it rings, the clip plays and its current line is on screen; the chat still gets the wake-up question, so "Reply to wake up" works as before | `Alarm.clipId`, `alarms/edit.tsx`, `alarms/ring.tsx` |

No public feed: clips live only with the user and in the chat.

## 2. Server work the alarm clip needs

- **iOS:** a notification can only play a sound that is in the app bundle or in `Library/Sounds`, at most 30 s
  (`.caf`, `.wav`, `.aiff`). When an alarm gets a clip, download the clip's audio, convert it, save it to
  `Library/Sounds/<clipId>.caf`, and schedule the alarm notification with that sound. Longer clips are cut to
  30 s for the notification; the full clip plays once the app opens on the ring screen. On iOS 26+ the
  AlarmKit framework can show a real system alarm; check it when the native alarm module is built.
- **Android:** a notification channel per sound (a channel's sound cannot change after it is made), or the
  full-screen intent that opens the ring screen and plays the file in the app (`modules/alarm-screen`).
- If the clip is deleted, the alarm falls back to the stock line (the editor already hides deleted clips).

## 3. Ideas for later (not built)

1. **The friend records on their own** (beyond level-ups): a birthday clip, a morning clip after a hard day
   the user talked about, a "missed you" clip after days away. Server job with a TTS budget per user per
   month; a push "Theo recorded something for you" opens the player.
2. **Bedtime lullaby:** a friend's clip as Bedtime's sound (Pro, like the whispers), ending with a fade.
3. **A feed** (three levels, decide one at a time):
   - **A. Friends only (now).**
   - **B. A public feed of user-made clips**, as BIMOBIMO has (tags, public/private, cover, likes). Apple
     guideline 1.2 then applies to user-generated content: a filter for objectionable content, a way to
     report it, a way to block users, contact details, and acting on reports within 24 hours. Also: no real
     people or copyrighted characters in titles or covers, age rating checked again, a moderation queue
     (text is checked before TTS already; covers need image moderation), rate limits, and the cost of
     playback storage.
   - **C. Public clip links:** share one clip outside the app as a short audio page with "Hear more on
     Sigmazam". Ties into invites: the link carries the sender's invite code, so a friend who joins from it
     counts as an invite (paid only when they come back the next day, D48).
4. **Data model when a feed comes:** `radio_clips` gains `visibility` (`private` | `friends` | `public`),
   `tags text[]`, `cover_url`, `likes_count`, `reports_count`; new tables `clip_likes(user_id, clip_id)` and
   `clip_reports(id, clip_id, reporter_id, reason, status)`.

Decisions for the owner when the time comes: which feed level (B or C first), whether public clips cost more
shells than private ones, and whether official characters' gift clips can be shared publicly.
