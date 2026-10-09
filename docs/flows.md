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
| F4 Out of shells | done | Paywall keeps the typed message; since F17 it offers three equal ways on (an ad or the spin, a shell pack, Basic) | #2-#6 |
| F5 Store and history | done | Ledger for every shell, free daily shells expire at midnight, History screen (Shells / Call time) | #2-#8 |
| F7 Closeness v2 | done | Levels 0-100 in 5 stages, relationship labels, "How closeness works" sheet | #21-#23, #41 |
| F6 Calls | done | Call screen, text after a missed call; call minutes come with a plan since F17 (the 15-minute trial and the call-time balance were replaced) | #8, #29, #40, #46 |
| F9 Us and calendar | done | Month calendar of plans in Us, "+" for plan / diary / board, times parsed from chat, reminder 10 minutes before, "how did it go?" after, moment filters, message board with 7 papers | #49-#55, video B 35-37s |
| F10 Free gifts | done | Invite code +50 (copy, share, enter a friend's code once, 0/6 a week), daily share +6 from calls, board notes or invites, "+6 for sharing" banner | #26-#28, video B 13-14s |
| F11 Dates | done | Map of 5 places (level-locked), partner picker, 5 rounds of 3 answers with hearts, polaroid at the end (share +6), "Our dates" album, text after the date, diary page next morning | #9-#12, video A 13-21s |
| F12 Chat "+" games | done | "+" grid of eight tinted icons, couple quiz (3 packs, live reveal, score card in chat), truth or dare wheel, daily calls (who and when) | #42-#48 |
| F13 Find and profile | done | "All" first, a card per world with pages of three and page dots, world page, green phone badge for callable characters, flat search results | #56-#132 |
| F14 Profile and settings | done | Edit profile (photo, name, pronouns, birthday, job, 10 interests, about) with a completion meter, invite code card, free gifts row, delete account; birthday wishes and interest questions in chat; language row hidden while there is one language | #130-#133 |
| F15 Create character | done | Photo + rights tick, name, age (18+ enforced), gender, up to 5 traits, speaking style, what they are to you, story, first message, stock voice (free) or cloned voice (60 shells, consent tick), world, private or public (public waits for review); client checks for minors and explicit set-ups (`src/lib/create-character.ts`), server moderation later. Edit (2026-10-07): Settings → Edit character on your own creations opens the same form filled in (`?id=`); new photo or clips need the ticks again, a kept cloned voice is free, a public one goes back to review when what others see changes | #57-#58 |
| F17 Plans and limits | done | Store Plans / Shells tabs (Basic with 3 days free, 3 months, Yearly, Pro; starter pack before the first purchase), Profile → My plan with call and voice minutes left and top-ups, out-of-shells sheet with three equal ways on, free users' call sheet with a recorded voice line, out-of-minutes sheet (mid-call top-up resumes the call), "AI character" notice every 3 hours, fair-use line and locked composer; rules in `src/economy/plans.ts` (`docs/backend-plan.md` §13-14; prototype https://claude.ai/artifact/7efEmQx5jBq6YvhJF2dzpv) | #2-#8 |
| D1 Calm cards, step 1 | done | Character settings, Profile, History, Radio, Find restyled to `docs/design-style.md`; daily check-in popup off (shells arrive quietly). Next: Edit profile, Memories, Secret note, Board, Our dates, then the "medium" screens (`docs/design-audit.md`) | prototype https://claude.ai/artifact/LBoVbxLo3LkBedbjmGPQTf |
| D2 Calm cards, step 2 | done | Memories, Edit profile, Secret note, Board, Our dates restyled; `EmptyState` button is `secondary`; new empty-state art (Rafti listening to a seashell, Higgsfield) replaces the box. Next: the "medium" screens, Free gifts first, prototype each (`docs/design-audit.md`) | — |
| D3 Free gifts restyle | done | Check-in days in a white card (ink = collected, ring = tomorrow, offer pill on day 7); wheel unchanged with a status pill; video, share and invite as equal rows in one box (the sticky ad bar is gone); code row and "Have a code?". Next: Create character prototype | prototype https://claude.ai/artifact/ACXhyT5n4RFKXy5jsFCvr2 |
| D4 Create character restyle | done | Same form and rules, calm cards: h3 sections (Basics, Personality, How they talk, They are your, Their story, Voice, Category, Who sees them), grey chips / option buttons with ink selection, ink checkboxes, `Segmented` voice mode, white action bar with the error, button and a visibility line. Next: Contacts prototype | prototype https://claude.ai/artifact/39JVNxjNiCZkVHP8cvTgDb |
| D5 Contacts restyle | done | Card grid → rows sorted by level (avatar, name, mint bond label · Lv N, chevron); `Segmented` tabs; "Create a character" row replaces the dashed tile. Next: Photo Booth prototype | prototype https://claude.ai/artifact/NHyErhmApd5hygWMjFGGjE |
| D6 Photo Booth restyle | done | Look only; still a mock (no image model): 8 shells, +6 closeness, a photo moment on Us; the style is not used yet and shots live only on the screen. Header shows shells (the unused film count is gone). Next: Bedtime prototype | prototype https://claude.ai/artifact/CuA2RSMFXEjpDmWW9U1ER3 |
| D7 Bedtime restyle | done | Look only; still a mock (no audio, the timer only counts down; free). Night canvas kept; readers with names, 5 equal timer buttons, action bar (Sleep together / Stop). All "medium" screens in `docs/design-audit.md` are done | prototype https://claude.ai/artifact/HQ2SXLrXx9SLpCPAeb5yMP |
| D8 App flow, first three screens | done | From the app-flow prototype the owner approved only these: onboarding "meet" step as a 2x2 grid of select cards (same 4 picks, button "Start talking to Name", AI line under it); Chats with search behind a magnifier and the pencil to Find, bigger avatars, unread line and count in ink; Find with a 48px apricot "+" (create), Everyone / Him / Her as `Segmented`, grey world chips with ink selection, each world as two-column portrait cards (tap = profile, small "+" = add friend, mint tick = friend). Other prototype screens (Today, Us, Me tab, chat "+") are not built | prototype https://claude.ai/artifact/JTwiRZbdTJtV3czQF3ahdi |
| F16 Push notifications | done (local) | Planner for 2 days + comeback ladder (1-14 days) from the last friend, 8 a day, quiet 23-08, 90 min apart, lines identical to the chat, text hidden by default, system prompt after onboarding "Allow" (`docs/push-plan.md`). Profile → Notifications screen (preview, switch per kind, quiet hours). Server push later | #46, #52, #53 |

Live map of the same table (Uzbek): https://claude.ai/artifact/UChkXuUa9vNDyFHNTHHNUb
