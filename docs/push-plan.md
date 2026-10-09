# Push notifications: research and plan

Status: **built (local notifications), 2026-10-07.** The user's answers: up to **8** pushes a
day, the comeback ladder **stops after 14 days**, **message text hidden** on the lock screen by
default, support address stays a mock. Code: `src/notifications/plan.ts` (pure planner),
`src/notifications/sync.ts` (OS), `src/hooks/use-push-notifications.ts` (app life), lines in
`src/mock/push.ts`. Section 6 lists how it differs from the first draft below.

## 1. What others do

**BIMOBIMO** (teardown #46, #52, #53): the push is part of the product, not marketing.
- Daily calls: a "Good morning call" (08:00) and a "Good night call" (21:00), one setting
  for all characters, "the last configured character will call" (#46).
- Calendar: "the character reminds you 10 min before the start and may show care after it
  ends" (#53).
- A notifications inbox ("No notifications yet", #52).
- Characters text first; the hero card counts the days together.

**Replika**: proactive check-ins from the companion in its own voice; in one 12-day test
it sent 14 messages, mostly check-ins ([aicompanionguides](https://aicompanionguides.com/blog/ai-companions-that-text-first-2026/)).

**Character.AI**: "X wants to talk" with nothing in it. Reviewers call it a re-engagement
ping with a character's name on it; it works less well than a real line from the
character ([aicompanionguides](https://aicompanionguides.com/blog/ai-companions-that-text-first-2026/)).

**Duolingo** (the reference for aggressive and still liked):
- A bandit chooses which pre-written reminder to send; +0.5% DAU, +2% new-user retention
  ([KDD 2020 paper](https://research.Duolingo.com/papers/yancey.kdd20.pdf)).
- New templates beat old ones (novelty fades), so the pool must be large and rotate.
- Loss framing works: "your 40-day streak may be lost".
- "Protect the channel": no extra sends without a strong reason; people who turn
  notifications off are gone for good.

**Rules we must keep** (or the store rejects / the OS mutes us):
- Apple 4.5.4: push must not be required, and promotions (sales, offers) only with an
  explicit opt-in toggle and a way out.
- Android 13+: runtime `POST_NOTIFICATIONS` permission, same as iOS. Opt-in swings from
  under 30% to over 70% depending on *when* you ask; ask after a soft in-app screen
  that explains the value, tied to a moment ([AppMaster](https://appmaster.io/blog/push-notification-permission-ux)).
- 18+ app: the lock screen must never show anything explicit. Offer "Hide message text".

## 2. What Rafti sends (aggressive, but every push is a real line from a character)

Every notification looks like a message: **title = character name, body = what they
say**, their portrait as the icon (Android large icon, iOS attachment). Tapping opens that
chat (or call), and the same line is already in the chat. No "X wants to talk" pings.

| # | Kind | When | Who | Example body | Channel |
| --- | --- | --- | --- | --- | --- |
| 1 | Good morning text | user's morning time (08:00) | top 2 bonds with "Let them reach out" | "Morning. Did you sleep or did you scroll again?" | messages |
| 2 | Good night text | 21:00 | top 2 bonds | "Long day? Tell me one good thing before you sleep." | messages |
| 3 | Daily call | morning / night call time | caller from Daily calls, else closest with a voice | "Incoming call" + name | calls |
| 4 | Plan reminder | 10 min before | the friend who set it | "10 minutes to your interview. You've got this." | reminders |
| 5 | "How did it go?" | after the plan ends | same | "So? How did it go?" | messages |
| 6 | Birthday | 07:00 on the day | top 3 bonds | "Happy birthday, {name}!" | messages |
| 7 | Diary page | when a page is written | that character | "I wrote about you today. Don't read it. (Read it.)" | messages |
| 8 | Unread nudge | 30 min after leaving with unread | that chat | the unread line itself | messages |
| 9 | Comeback ladder | 1, 2, 3, 5, 7, 14 days with no visit | **the friend you talked with last** (same as the Today card) | day 1: callback to your last topic; day 3: "I keep starting messages to you and deleting them"; day 7: loss frame "It's been a week. Day {N} together and I'm counting alone." | messages |
| 10 | Check-in gift | 20:00 if today's gift is unclaimed | closest bond | "Your gift for today is still here. Expires at midnight." | gifts |
| 11 | Free spin | 18:00 if the wheel has free spins | – | "Your free spins reset at midnight." | gifts |
| 12 | Store offer | only with the opt-in toggle | – | membership sale | offers (off by default) |

**Day budget (the "aggressive" part, with brakes):**
- Up to **8** counted pushes a day (answer 1). Plan reminders, calls and birthday do not count against it.
- Quiet hours 23:00–08:00 (a user-set morning call can still ring).
- At least 90 minutes between two pushes; same character at most 3 times a day.
- After the day-14 line: stop (answer 2).
- Each line from a pool of 20+ per kind per speaking style, never the same line twice
  in 30 days (novelty, Duolingo).

## 3. Permission (two steps)

1. Onboarding already has the soft step ("they'll text you good morning"). When the user
   says yes there, show the OS prompt **right after**, on the same screen.
   (The screen is approved; only the OS call is added, the design does not change.)
2. If they said no: ask again in context, at most once a week, at moments where the value
   is obvious: after setting a plan reminder ("Want Theo to remind you?"), after the first
   good-night text, after turning on Daily calls. After a system "deny", the button opens
   phone Settings.
3. Profile → Notifications: one switch per kind (channels), quiet hours, "Hide message text",
   offers opt-in.

## 4. How it is built

Local notifications first (they work today, offline, no server); the server sends the same
plan later with real AI lines.

- `src/notifications/plan.ts` — a **pure function**: store state + now → the list of
  notifications for the next 48 hours (kind, time, character, line, deep link), already
  capped and spaced. No side effects, so it can be tested and later run on the server.
- `src/notifications/schedule.ts` — syncs that list with the OS: cancel all, schedule all
  (iOS keeps at most 64; 48 hours is well under). Runs when the app goes to the background
  and after a change that matters (new plan, settings, new friend).
- `src/notifications/channels.ts` — Android channels: messages (HIGH), calls (MAX),
  reminders (HIGH), gifts (DEFAULT), offers (LOW). iOS `timeSensitive` only for calls and
  plan reminders.
- Tap handling (`addNotificationResponseReceivedListener` + last response on cold start):
  open the chat or the call; the store writes the same line into the chat on open, so the
  push and the chat agree (the line id travels in the notification data).
- `expo-notifications` via `npx expo install expo-notifications` + config plugin (icon,
  colour). Local notifications work in Expo Go; remote push needs a development build.

## 5. Answers (2026-10-07)

1. Day budget: **8**.
2. Comeback ladder: **stop after day 14** (no weekly line after it).
3. Message text: **hidden by default** (`settings.notificationPreview = false`; the lock screen
   shows the name and "sent you a message").

## 6. As built

- Leaving the app (`background`) plans and schedules; coming back (`active`) cancels everything
  pending, because the app does it all itself while open. Pushes still in the tray that carry a
  line only sent by push (comeback) are written into that chat (`receivePushLine`, once per id);
  a tapped push does the same, then opens its route.
- Greetings come from the **top two** bonds that allow it (same as `runDailyInitiative`), the
  daily call 20 minutes after the greeting of its slot; nothing from others on the onboarding day.
- The line of a greeting, birthday, plan reminder and follow-up is picked with a seed
  (`src/lib/seeded.ts`) shared with the store, so the push and the chat say the same thing.
- Comeback ladder at 19:30 on days 1, 2, 3, 5, 7, 14 from the friend you talked with last
  (`lastTalkedAt`, same as the Today card). Day 1 quotes your last message.
- Caps: 8 counted pushes a day, at most 3 per character a day, 90 minutes apart, none 23:00-08:00.
  A push that collides moves later the same day in 15-minute steps; dropped only if the day is
  full. Calls, plan reminders and birthdays do not count and are never moved.
- Channels: messages, calls, reminders, gifts (Android); iOS time-sensitive for calls and plan
  reminders. Store offers are not sent (no opt-in screen yet).
- Permission: the onboarding "Allow" now also shows the system prompt.
- Checked with the seed data (esbuild + node): a day gets 6-7 counted pushes plus calls and
  reminders; the same state always plans the same list; nothing before onboarding.
- Profile → Notifications (`src/app/notifications.tsx`, prototype approved 2026-10-07): a
  lock-screen preview showing tomorrow's real first push (same character and seeded line), the
  "Show message text" switch, a switch per kind (`morningGreeting`, `eveningGreeting`,
  `morningCall`, `nightCall`, `notifyPlans`, `notifyDiary`, `notifyAway`, `notifyGifts`,
  `notifyOffers`), quiet hours on/off with from/until times (`quietFrom` / `quietTo`, tap to step).
  When the phone blocks notifications (or never asked) a card on top offers "Open settings" /
  "Turn on" and the switches rest. The four "They reach out" switches left Profile for this screen.
  The planner reads all of these; quiet hours may run past midnight.
- Dev: Profile → Developer → Test pushes (only `__DEV__`), see `sendTestPushes`.
- Not yet: the character portrait as the notification image; offers are never sent (no store
  campaign yet); server push (needs the backend).
