# Community library: user-made characters in Find (0z300, Claude 1)

Owner's "Ha, boshla" (2026-11-19) on `docs/polybuzz-live-test.md` §4.3. This reverses
business-plan §12 decision 4 ("no UGC market at launch") for preview builds; production stays off
until the owner turns it on after seeing moderation work (`COMMUNITY_OPEN`, below).

## What the user gets

- **Create**: a "Share in Find" switch on their own character (off by default). Saving with it on
  publishes the character; the form says "Checking…" and then "In Find" or why not.
- **Find**: a "From the community" shelf under the official cast: cards with the hook line, chips
  and a chat count, newest or most chatted. A tap shows the card (name, tagline, bio, scene,
  greeting) with **Say hi** and **Report**.
- **Say hi** copies the character into the user's own list (a local copy, `fromCommunity: id`) and
  opens the chat; the count goes up once per user. Edits by the creator later reach new adders only.
- **Report** on the card and on an added community character's profile: one per user, three
  different reporters hide it until a person looks.
- No creator names or photos are shown (anonymous by design, as the share posters).

## Data (migration `b14_community_characters`)

- `community_characters`: id, owner (auth user, cascade on delete), the creator's local id (unique
  per owner), `card jsonb` (only shareable text fields, no image, voice or private notes), status
  `live | rejected | hidden | removed`, `reason`, `chats`, `reports`, timestamps. RLS on, service
  role only.
- `community_reports` (character, reporter, reason; one per reporter) and `community_adds`
  (character, user; one per user) keep the counts honest.

## Moderation

1. The app's own check before sending (`contentProblems`: minors, explicit words).
2. The server's model review on every publish and edit: real person, minor, explicit, hate,
   illegal harm → `rejected` with the reason; otherwise `live` at once. Fan characters pass
   (owner, 0z293). The model being busy → `rejected: busy`, the user can try again.
3. Reports: 3 distinct reporters → `hidden`. A person sets `removed` (takedown, Terms §5) or `live`.
4. Images stay out of the library in this phase (no uploads): cards use the gradient initials.

## Gate

`COMMUNITY_OPEN` (app) is on for dev and preview builds (`SHOW_DEV`), off in production. The server
routes work on every server; without the gate the app never calls them.

## Phases

1. Server: migration, db methods, routes (publish, unpublish, list, get, add, report), the review
   call, tests.
2. App: types, store actions, the Create switch, the Find shelf and card sheet, report.
3. Owner: apply the migration, deploy; then OTA and drive it on the A51 (publish, see it, add from
   another account if possible, report).

Later: images (upload + likeness check), creator profiles, search, ranking by retention.
