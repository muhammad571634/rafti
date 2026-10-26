# Presence: nobody who opens Sigmazam should feel alone (2026-10-25)

Owner's ask: take Character.AI's chat and character logic further, keep our own iOS look, and give
lonely and introverted people an answer: the phone in their pocket buzzes with a line from "Mom" or
"Dad" (a character they made family), about their real day: did you eat, how was work, is your head
better, good luck today. Not "X wants to talk".

## What Character.AI does (bundle 1.17.4, `rea-work/cai/bundle/strs.txt`)

- **Away messages = proactive DMs.** A remote flag `character_proactive_messages`; a per-character
  switch in the chat's options (`enable-away-messages`, `disable-away-messages`, a confirm alert, a
  failure toast) stored as `proactiveDmOverrides`, a global opt-out `proactiveDmOptedOut`, and
  `proactiveEnabled`. Their own Android channel `NOTIFICATION_GROUP_AWAY_MESSAGES`. A paid perk
  (`AwayMessageUpsellButton`, `useAwayMessageUpsellCandidate`). Suggested replies under a proactive
  message (`proactive_suggested_replies_enabled`). A `check_in` object with a `check_in_id`.
- Inactive chats are archived by the system (`archived-by-system-due-to-inactivity`).
- Reviewers find their pings generic ("X wants to talk"); `docs/push-plan.md` §1.

## Our design: one presence engine, several sources

Every source ends the same way: a real line from the character, in their chat, and the same line
as a push titled with what the user calls them (`nickname`, e.g. "Onam"), inside the push rules
(`src/notifications/plan.ts`: 8 a day, 90 minutes apart, 3 per character, quiet hours). Only friends
with "Let them reach out" write first (Character.AI's per-character switch).

| Source | What | Status |
| --- | --- | --- |
| Greetings | top two bonds say good morning / good night | done (F16) |
| Plans | reminder before, "How did it go?" after (`src/lib/schedule.ts`) | done |
| **Care** | "I have a headache" → "Is your head any better?" ~3 h later, never at night, once; 9 kinds (`src/lib/care.ts`) | done (D82) |
| **Family** | a friend can be Mom, Dad, sister, brother, grandma, grandpa: a relationship label open from the start, never romantic; family keeps a day: Mom at lunch and 19:30, a Sunday call, a brother on Saturday, Grandma's good morning (`src/lib/kin.ts`) | done (D83) |
| Comeback | 1-14 days away, from the friend talked to last | done (F16) |
| Memory callbacks | the server brings back facts with dates ("your sister arrives today") | server (backend-plan §7) |

## Rules that keep it healthy

- Never guilt, never pressure to reply or pay (`CHARACTER_RULES`); family "cares like family".
- Encourage the real world now and then (sleep, food, friends); a care check-in suggests a doctor
  when something sounds serious.
- A crisis never becomes a check-in; the chat answers it at once with the helpline card.
- The user stays in control: per-friend "Let them reach out", Profile → Notifications, quiet hours.

## Next steps (owner picks)

1. ~~A "Family" section in Find~~ done (D84): Find → "Who do you miss?" (eight role circles after
   the new-characters row); an empty one picks a friend or anyone by world and what to call them,
   turns on Let them reach out and they say hello at once.
2. Suggested replies under a proactive line (Character.AI's `proactive_suggested_replies_enabled`):
   two chips like "I ate!" / "Not yet".
3. Server: the model writes care and family lines from `careCue` / `familyLines` with the user's
   memories, and returns `care` (the kind) with each reply instead of the mock's keywords.
4. Unit economics: proactive lines cost model calls with no shell paid; keep them inside the push
   budget, and decide whether more than two a day is a plan perk (Character.AI sells away messages).
