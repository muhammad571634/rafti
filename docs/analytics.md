# Product analytics (0z282)

Why: until now the server knew what each model call cost (`usage_events`) and nothing about what
people do. The PolyBuzz read (`docs/polybuzz-core.md` §5.1) put this first: every hook, prompt and
price change must be measured, not guessed. First-party only: our server, our database, no other
company's SDK, no ad id (privacy policy "App activity").

## How it flows

1. **The phone** (`src/lib/analytics.ts`): `track(name, props)` adds an event to a saved queue
   (AsyncStorage, at most 500, the oldest go first). It is sent in batches of 50 to `POST /v1/events`
   when 20 wait, once a minute while open, and on going to the background. A session is the time
   between `app_open`s: a launch, or a return after 30 minutes away. Off (Profile → Share usage
   data, `settings.shareUsage`): the queue is emptied and nothing is kept. Delete account: a new
   install id, an empty queue.
2. **What counts as an event**: the store is not sprinkled with calls. `src/hooks/use-analytics.ts`
   (root layout) sends a `screen` per route and hands every store change to
   `src/lib/analytics-diff.ts`, which reads the events from the difference (a new line of yours, a
   failed reply, a thumbs, a call, a level, a new own character, onboarding done, a plan, a check-in,
   another version of a reply). Direct calls only where no state changes: onboarding steps
   (`onboarding.tsx`), a push tapped (`use-push-notifications.ts`), the shells sheet
   (`paywall-sheet.tsx`).
3. **The catalog** (`src/lib/analytics-events.ts`, shared with the server): event names and the props
   each may carry. Props are for counting: ids, numbers, flags, a screen name. **Never message words,
   names or anything the user typed.** The server cuts each text to 64 characters and keeps at most 8
   props. A new event name needs no server change (any `^[a-z][a-z0-9_]{1,39}$` is taken).
4. **The server** (`/v1/events` in `server/src/app.ts`): signed-in accounts only, 600 batches a day,
   a batch sent twice is kept once (`unique (user_id, client_id)`), bad events dropped and counted.
5. **The database** (`supabase/migrations/*_b13_app_events.sql`): `public.app_events`, service role
   only, cascades with the account, purged after 13 months.

## Reading the numbers

Views in the `analytics` schema (Supabase SQL editor, or the MCP's read-only SQL). Filter
`channel = 'production'` for real users; `preview` is the owner's and testers' APK, `dev` Expo Go.

| View | Answers |
|---|---|
| `analytics.daily` | active accounts, sessions, messages and senders per day |
| `analytics.retention` | per first-day cohort: users, back on day 1, 7, 30 |
| `analytics.first_day` | per cohort, on day one: onboarded, sent 1 / 5 / 20 messages, saw the shells sheet |
| `analytics.onboarding` | accounts reaching each onboarding step (30 days): where people stop |
| `analytics.paywall` | the shells sheet by why and where it opened; plans started by plan |
| `analytics.screens` | screen views and users per screen (30 days) |
| `analytics.experiments` | per experiment arm: users and how many came back the next day |

Example: `select * from analytics.retention where channel = 'production' order by cohort desc limit 14;`

## Experiments

`experiment('name', ['control', 'new'], weights?)` in `src/lib/analytics.ts` gives the install's
arm (stable per install, independent between experiments) and records one `exposure` a session.
Compare arms in `analytics.experiments`. Every batch also carries the install's `bucket` (0-99) for
ad-hoc splits. End an experiment by removing the call (and the losing code) in the same change.

## Rules

- Add an event only with a question it answers; name it `noun_verb` in the past (`message_sent`).
- Add it to `EVENTS` with its props; prefer reading it in `analytics-diff.ts` from a state change.
- No words, names, typed text, photo or voice contents, ever. Ids of characters are fine.
- Storage cost is in `docs/cost-ledger.md` row 22.
