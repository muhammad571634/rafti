# Rafti flows: status and order

The app is built as one daily loop: first launch → chat → closeness → dates and calls →
the next morning's diary page → coming back → chat again. Every flow feeds the next.

Work the flows **in this order**. After each one: update the status here, add a short note to
`HANDOFF.md`, commit and push to `local-work`.

BIMOBIMO screenshot numbers (`#N`) map to files in `rafti-research/teardown/screens.md`
(`#1-#99`, `#101` in `rafti-research/`; `#100`, `#102-#133` in `rafti-research-2/`).

| Flow | Status | What is in the app | BIMOBIMO refs |
| --- | --- | --- | --- |
| F8 Heartbeat diary | done | Cover carousel, calendar popover, character pages, rules sheet; pages are written the morning after a chat or date (`src/mock/diary-writer.ts`) | #13-#15, video A 22-29s |
| F1 Onboarding | done | Hello → 18+ birth year → name → first friend → notifications → +100 shells → first chat (`src/app/onboarding.tsx`) | none (list style from #56) |
| F2 Home / coming back | done | "Today" section under the hero: new diary pages, today's plans, notes, spin; bigger, bolder type scale | #1, #26 |
| F3 Chat core | done | Reply bursts, day chips, long-press menu with Rafti reaction stickers, copy, delete, "-1" price pulse | #33-#39 |
| F4 Out of shells | done | Paywall offers ad + spin in place, keeps the typed message | #2-#6 |
| F5 Store and history | done | Ledger for every shell, free daily shells expire at midnight, History screen (Shells / Call time) | #2-#8 |
| F7 Closeness v2 | done | Levels 0-100 in 5 stages, relationship labels, "How closeness works" sheet | #21-#23, #41 |
| F6 Calls | done | Call time balance, 15-minute trial, time left on the call screen, text after a missed call | #8, #29, #40, #46 |
| F9 Us and calendar | done | Month calendar of plans in Us, "+" for plan / diary / board, times parsed from chat, reminder 10 minutes before, "how did it go?" after, moment filters, message board with 7 papers | #49-#55, video B 35-37s |
| F10 Free gifts | done | Invite code +50 (copy, share, enter a friend's code once, 0/6 a week), daily share +6 from calls, board notes or invites, "+6 for sharing" banner | #26-#28, video B 13-14s |
| **F11 Dates** | **next** | Exists. To build: map, rounds of choices, polaroid at the end, diary "date" page | #9-#12, video A 13-21s |
| F12 Chat "+" games | partial | Secret note, bedtime exist. To build: couple quiz, truth or dare, daily call times | #42-#48 |
| F13 Find and profile | partial | Exists. To improve: grouped list, search | #56-#132 |
| F14 Profile and settings | partial | Exists. To build: completion %, invite code, language, delete account | #130-#133 |
| F15 Create character | partial | Exists. To build: moderation, voice consent, no real people | #57-#58 |

Live map of the same table (Uzbek): https://claude.ai/artifact/UChkXuUa9vNDyFHNTHHNUb
