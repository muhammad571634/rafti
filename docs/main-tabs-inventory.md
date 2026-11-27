# The four main tabs: everything on them (2026-11-07, 0z124)

Read from the code before the playful redesign (`docs/design-style.md` §10), so the new look keeps
every element, tap and route. "→" is where a tap goes. A redesign may change how a thing looks; it
may not drop or rewire anything below without the owner's word.

## Today (`src/app/(tabs)/index.tsx`)

- **Top row** (glass on the friend's picture, or on the aurora with no friend):
  - Mascot logo capsule (`FoldingLogo`): tap unfolds "Sigmazam" for 10 s.
  - Your capsule (avatar + name, six letters) → `/profile`.
  - In edit mode instead: "+" (first empty slot) → widget gallery; "Done" ends editing.
- **Hero** (`TodayHero`, the friend you talked with last, `featuredFriend`): their scene picture from
  the screen's top, name, chip "N days · ♥ Lv N", their last line, a "Message" pill → that chat.
  The whole card → `/chat/{id}`. Status bar light until the picture scrolls past.
- **Waiting for you** (only while chats are unread): up to 3 stacked faces, "Waiting for you", names
  ("Hana, Kai and Theo"), red count of chats. One chat → that chat; several → Chats on Unread.
- **Widgets** (4 slots, `todayWidgets`; 11 kinds in `src/components/today/widgets.tsx`):
  - calls: the caller's face, minutes left; buttons Call → `/call/{id}`, Chat → chat (or profile). Card → `/call-history`.
  - diary: latest page / "Write today" → `/diary/write`. Card → that page or `/diary`.
  - date: coming plans; Chat button → plan's chat. Card → `/dating`.
  - sleep: every alarm with its waker's face, days; "+" → `/alarms/edit`. Card → `/alarms` or `/bedtime`.
  - gifts: spin ready pill → `/gifts?spin=1`. Card → `/gifts`.
  - store: balance; "+" → `/store/shell?tab=shells`. Card → `/store/ledger`.
  - photos: last photo → `/photo/{id}`; camera → `/photo-booth`.
  - radio: a clip → `/radio/{id}`. Card → `/radio`.
  - board: latest note; pin → `/board/write`. Card → `/board`.
  - contacts: "Meet someone" → Find. Card → `/contacts`.
  - bond: a friend's bond → `/character/{id}` (or Find).
  - Edit like the iPhone Home Screen: long press a widget (lift haptic) or "Edit" → jiggle; "−"
    empties a slot; tap a widget in edit mode or an empty dashed slot → gallery (used kinds greyed
    with a check); drag one onto another trades places.
- **Sealed note row** (when a friend's daily note is ready, no helpline today): envelope line icon,
  "A note from {name}", "Sealed", their face → `/secret-note/{id}`.
- **App tiles** (every module no widget stands in for, six to a row): Calls `/call-history`, Diary
  `/diary`, Dating `/dating`, Bedtime `/bedtime`, Store `/store/shell`, Photo booth `/photo-booth`,
  Contacts `/contacts`, Gifts `/gifts` (red "1" while a spin or the check-in waits), Radio `/radio`,
  Board `/board`.
- **Edit** pill (bottom) → edit mode.
- **Daily check-in** full-screen moment (first open of the day, free users), and **Welcome back**.
- Behind the scenes on focus: overnight diary pages, the hero's daily sealed note.

## Chats (`src/app/(tabs)/chat.tsx`)

- **Top bar**: Edit / Done (when there are chats); Search (magnifier → search field in place of the
  title, Cancel); New (pencil) → "New" sheet:
  - New chat → Find; New group (2-3 friends, needs 2 friends) → `/group/new`; Streams (watch two
    characters talk) → `/streams`.
- **Large title** "Chats".
- **Filters**: All / Unread (with count) / Groups. Today's "Waiting for you" opens Unread.
- **Pinned** (All, not searching): pinned chats as a row of round faces on top. Edit shows an unpin
  badge on each.
- **Rows** (pinned first, then newest): face (a group: stacked faces), name (a group: "Kai, Theo &
  Iris" or its name), time, last line or "Voice message" / "Photo" / "Missed call" / "Voice call",
  typing dots ("typing…"), unread count, mint level heart (Lv ≥ 1), pin and mute marks.
  - Tap → `/chat/{id}` or `/group/{id}` (with a row open, the first tap only closes it).
  - Swipe right: Read / Unread, Pin / Unpin (chats only). Swipe left: Mute / Unmute, Delete
    (confirm: "Your messages go away. Your bond stays."). One row open at a time.
  - Long press (lift haptic): a menu over a preview of the last lines: Pin, Mute, Mark read /
    unread, Delete. Edit mode: a remove button on every row.
- **Empty states**: no chats → "Find someone"; Unread empty → "All caught up"; no groups; no
  search results.
- **Reached from here**: a chat (`/chat/{id}`), a group chat (`/group/{id}` and its info, call),
  New group (`/group/new`), Streams list (`/streams`), a stream (`/streams/{id}`), New stream
  (`/streams/new`: pick two characters and a topic; a few free rounds a day, then shells).

## Us (`src/app/(tabs)/us.tsx`)

- **Top bar**: large title "Us"; bell with the new-count badge → `/notifications`; "+" → Add sheet:
  Plan (a day and time with them) / Diary page → `/diary/write` / Note on the board → `/board/write`.
- **Friends row**: everyone you have a bond and a chat with, as round faces; tap selects whose bond
  the page shows (the selected one ringed, name bold).
- **Bond card** → that chat: the level ring (progress to the next level), "N days", the level title
  ("More than friends"), "N to level N+1", your face and theirs; three figures: intimacy, day streak,
  first met. **Share** pill (+5 shells the first shares of the day) → the bond's share card sheet.
- **Calendar** (`PlanCalendar`): one week, or the whole month; days with plans marked; tap a day.
- **The day's plans**: "Nothing planned" + "Plan" pill → New plan sheet (title, any time / at a time,
  ±15 min, day, with whom, reminder line). Plan rows: time tile, title, reminder bell + time, a check
  once followed up, × removes.
- **Our moments**: filters All / Plans / Dates / Calls / Notes / Diary / Games (a chip only when that
  kind exists); moments newest first, each with its kind's icon colour, text ("Exchanged secret
  notes", "Reached level 6 · More than friends", "Took a photo together" + thumbnail → `/photo/{id}`,
  "Opened up: {chapter}"…), time; "Show N more".
- **Empty**: no bonds yet → "Find someone".

## Find (`src/app/(tabs)/find.tsx`)

- **Header**: large title "Find"; "+" (accent) → `/create-character`.
- **Search**: field "Characters, worlds"; focus → recently viewed faces + recent searches (+ Clear);
  typing → results: top hit, characters (Say hi), worlds; nothing → "Create character". × closes.
- **Who**: Everyone / Him / Her segmented.
- **Featured** (new characters, swipe carousel): their scene full-bleed, "New" badge, name, world,
  clear-glass "Say hi" → starts the chat; card → character profile. New characters may open the
  early-access sheet (plans) first.
- **Who do you miss?** the eight family roles (Mom, Dad, Big sister, Big brother, Little sister,
  Little brother, Grandma, Grandpa) as circles: filled = their face + the name you gave → chat; empty
  = glass "+" → Family sheet (your friends, others, Create your own, "Make {name} your {role}").
- **Worlds**: tiles (Seaside Academy, Moonlit Realm, NEON TIDE, Tidepool Café, Velvet District,
  Gilded Empire, Ice & Arena, My creations) → `/world/{series}`.
- **Talk now**: characters who can call, faces with a verified mark and a call badge → profile.

## What the playful redesign keeps (checklist for code)

Every route above; Edit / jiggle / drag on Today; swipe, long-press menu, Edit and filters on Chats;
the friend picker, calendar, plans and moment filters on Us; search modes, Who filter, family seats
and early access on Find; all a11y labels; the clear-glass rule on photos; approved screens inside
(Heartbeat diary) untouched.

## Engineering plan for the playful skin (prototype https://claude.ai/artifact/ML6J9csLoh3ZVHMMrncrvg)

- **Cross-tab links to keep**: Today hero = `featuredFriend` (last talked) → chat; Today "Waiting for
  you" count = Chats Unread count = the Chats tab badge; check-in → wallet → Store widget, Gifts badge,
  message costs; sealed note → Secret Note → Us moment; Find "Say hi" / family seat → new chat in Chats
  and a bond on Us; Us plans → reminders and Today's date widget; a stream's "Talk to both" → a group in
  Chats; a widget hides its module tile.
- **Contrast (WCAG 4.5 for text)**: ink #1F1A17 passes on every light hue (coral 6.2, sun 11.2,
  orange 8.2, lilac 9.1, mint 11.2, pink 10.1, butter 13.3). Fails fixed: white on #4D8DF7 (3.25) →
  blue bubble #2563EB with white (5.17); white on apricot (2.5) → `textOnPrimary` peachInk (4.16, large
  text). Secondary text on a coloured fill stays full ink (60 % ink fails on every hue). Red badges and
  white glyphs on system-colour tiles follow iOS convention.
- **Colour system**: module hues are the existing `moduleFills` (iOS system colours); widgets use
  their light tints, tiles the full colour, Us moment icons the same. New: `friendColor(characterId)`,
  a stable pick of 8 bubble hues, each a light/dark pair with its on-colour text (dark variants with
  white: coral #9E3B32 6.7, sun #8A6400 5.4, orange #9A4F12 6.0, sky #2456B8 6.8, lilac #5E4BA0 7.0,
  mint #1D7356 5.8, pink #9A3E62 6.5, cyan #16707F 5.7). One apricot main action per screen. Ground:
  warm cream (dark: warm near-black) instead of the aurora on these four tabs (§10 outranks §1).
- **Phones**: hero 54 % of the window clamped 380-520 pt plus `insets.top`; bars and tab bar from
  safe-area insets; no Android elevation on a card that something must draw over (check-in lesson);
  titles `maxFontSizeMultiplier` 1.3, previews clamp to 2 lines, no fixed heights for text; Nunito
  covers Latin/Cyrillic/Vietnamese, other scripts fall back to the system face.
- **Code**: logic stays (SwipeRow, long-press menu, Edit, filters, widget drag, search modes, family
  seats, early access); only styles and small new pieces change (tokens, `friendColor` + tests, bubble
  tail, folder card). New logic on Us: same-kind moments of one day merge into one row with ×N (tests).
  Chats stays a FlatList; no heavy shadows per row; motion on the UI thread; tab switches never animate.
- **Order**: tokens + `friendColor` → Chats → Find → Us → Today (hero kept as approved), each checked
  on the A51 before the next.
