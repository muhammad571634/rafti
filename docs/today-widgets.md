# Today's widgets: what each one does

Four slots on Today, filled from eleven kinds by the user (long press or Edit: jiggle, "−", "+",
drag to swap). Any module can be a widget; the modules no widget stands in for stay as app tiles
below, so all ten are always one tap away. Code: `src/components/today/widget-models.tsx` (data),
`src/components/today/widgets.tsx` (drawing), `src/lib/today-widgets.ts` (pure picks, tested).

## Why it is built this way (references, 2026-11-07)

- **Apple HIG, Widgets** (JSON endpoint read 0z131): "Choose simple ideas that relate to your app's
  main purpose"; "Prefer dynamic information that changes throughout the day"; buttons and toggles
  "offer additional functionality without launching the app"; "Deep link to details and actions
  that directly relate to the widget's content"; "Replicating an app icon offers little additional
  value"; "Show content quickly without hiding stale data behind placeholder content".
- **Duolingo's Android widget** (APK pulled from the A51 with REA, 0z131): one streak widget in two
  sizes, a state machine (extended / frozen / inactive), 354 widget drawables of the mascot in
  different moods picked by state and time of day, a precomputed timeline of states (server-driven,
  cached), refresh on time-zone change and app update, a reward for adding the widget.
- **Pinterest boards** ("ios widgets app ui", "cute mascot widget"): a contact card with call /
  message buttons; a balance with action pills; a music card that plays in place; a sentence instead
  of fields ("It's 3° now in Tokyo. Will be rainy and cold."); Fito's bear whose mood follows the
  streak ("Don't let it break"); a step app's milestones with a claim button on each.
- BIMOBIMO's home has no widgets (hero + 9 tiles, teardown #1): nothing to take there.

## The contract every widget keeps

1. **One job**, named by its module; the whole card opens the exact thing it shows (a page, a photo,
   a clip), not the module's front door, unless it shows nothing yet.
2. **One or two buttons** that do the next step without a detour (call, chat, write, +, play).
3. **States, not a fixed face.** Each kind has: empty (an invitation that still looks like the
   widget), live (the newest real thing), and where it applies a "waiting for you" state that comes
   first (a missed call, new diary pages, today's free spin).
4. **It reads only its own data** and **wakes itself** when its content changes with the clock
   (`changesAt` from the pick, one timer, plus a refresh when the app comes back).
5. **Nothing endless.** No looping motion on a widget (`docs/performance.md`).

## The eleven kinds

| Kind | Waiting first | Live | Empty | Card opens | Buttons | Wakes at |
|---|---|---|---|---|---|---|
| Calls | a friend's missed call in the last day: their face with a red mark, "Missed call · 14:05" (0z131) | the friend to ring (the card's friend if they have a voice, else the latest who does), call minutes left | "Hear their voice" | call history | call back / call, chat | the missed call turns a day old |
| Diary | today's unread pages: count and who wrote them, never their words | the last page's first lines and whose page | "Write today's page" | the newest page, else the diary | write (when nothing is new) | the day changes |
| Date | — | the next plan whole (time, day, title on two lines, who), then the one after | "Plan something" | Dating | chat with the plan's friend | the next timed plan of today starts (0z131) |
| Sleep | — | the next alarm large, who wakes you, its days (a lone repeating one), two more as rows | "Set a wake-up" | alarms, else Bedtime | new alarm | the next alarm rings (0z131) |
| Gifts | today's free spin: "1 free" and a Spin pill | the check-in week as dots | — | Gifts | Spin | the day changes |
| Store | — | the shell balance; while today's free shells last, "40 free left · gone at midnight" (0z131) | — | the shell history | + (buy) | the day changes |
| Photos | — | your newest Photo Booth picture | the friend's scene, "Take one together" | the photo | camera | — |
| Radio | a friend's clip a level just opened | your newest clip, else any open gift | "Tune in" | Radio | play (opens the clip) | — |
| Board | the friend's answer to your note | your newest note itself | "Pin a note" | the board | write | — |
| Contacts | — | how many friends, the three you talked with last | — | Contacts | meet someone (Find) | — |
| Bond | — | the card's friend: level and a bar to the next | "Meet someone" | their profile | — | — |

## Next, in this order (each against the references above)

1. **Mood by state** (Duolingo, Fito): the friend's face on Calls, Diary, Date and Bond reads the
   state (waiting for you, quiet for days, a level close) with one-shot motion on arrival, never a loop.
2. **Play in place** on Radio (the Pinterest music card, HIG buttons without launching the app).
3. **A sentence on Date and Sleep** ("Coffee with Hana in 40 min", "Hana wakes you at 7:00").
4. **Milestones on Bond** with the next reward visible (the step app's claim buttons), only once
   the economy says what a level gives.
