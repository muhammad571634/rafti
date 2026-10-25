# HANDOFF — keyingi sessiya shu fayldan boshlasin

## ▶ NEXT STEP — start here (2026-10-07, back to Claude Desktop)

The user worked this day in cloud Claude Code and now continues in **Claude Desktop on Windows**
(`C:\Users\joray\BIMOBIMO`). Everything from the cloud session is on `local-work` (last commit
before this note: `db8f827`). Reply to the user in Uzbek; code, comments, commits and agent docs in
English (`AGENTS.md`). Their preferences are in "Foydalanuvchi afzalliklari" below.

### 0y. Aurora ground and the new Find (2026-10-21)

Owner's method from now on: check Apple's own guidance first (HIG pages, read through
`https://developer.apple.com/tutorials/data/design/human-interface-guidelines/<page>.json`, since the
HTML pages are empty to fetchers), agree the logic, prototype, then code. Goal: an iOS-inspired app
that is solid and close to a work of art. "Aurora Glass" is not an Apple term; the owner means an
aurora ground under Liquid Glass, and picked it (light and dark) as **the default ground for every
screen where it fits** (rules in `docs/design-style.md` §1). Done: `src/components/ui/aurora.tsx`
(`AuroraBackground`, `AuroraGlass` = `expo-glass-effect` GlassView on iOS 26+), `aurora` tokens,
`Screen background="aurora"`, aurora tones for `SearchBar` and `Segmented`, and Find rebuilt from the
canvas prototype (flows.md D27). Checked on web, light and dark, search too. Not touched: an
uncommitted `src/app/_layout.tsx` import of `@/lib/winphone-ios-shim` that someone else added.
Then Find's search mode (recents) and the World page were coded from the canvas too (flows.md D28),
checked on web in light and dark. `src/components/character-card.tsx` is now unused (kept for now).
Today is rebuilt as widgets on the aurora (flows.md D29; the owner swapped the free-spin card for a more
useful one: Calls). The owner has more prompts and inspiration images queued.
The owner asked that built screens look like their prototypes on Android too (Expo Go): fixed in D30
(stronger aurora, glass tab bar). Today widgets are user-editable (D31); drag-to-swap is untested by hand on a
phone yet.
Today header (D32): Sigmazam logo, wallet and a mascot capsule with the name (six letters) in one row; the owner
wants every screen to fit all iPhone and Android widths, so size from `useWindowDimensions`, not percentages + gaps.
Chats is on the aurora too (D33: filters, typing bubble, long-press menu). The owner wants code to match the
canvas colours exactly. Us is on the aurora too (D34, level ring). All four tabs now share the aurora; next:
inner screens one at a time, prototype first. Screen map with every screen's status (db-backed, update it as screens
finish): https://claude.ai/artifact/Mv1gJHu1TTxNS55aZjkkYw. Profile and Notifications done (D35; Notifications now open
from the bell on Us). The owner now works down the map's "Today: modules" list in its order (not Store first).
Calls done (D36): call history, voice call, incoming call and group call coded from the canvas row "Today modules:
Calls"; shared Mute / End / Speaker and call glass in `src/components/call/call-controls.tsx`, iOS system red/green
in `systemColors`. Date map: the owner approved prototype B (dates as Apple Wallet event tickets, canvas
`DateWallet.dc.html`; the star-map variant A was rejected as "only new colours") but said to keep the old code for
now. Date rounds and the own-date form are coded from the canvas (D37); ticket looks live in
`src/components/date/ticket.tsx`, ready for the Dates (Wallet) screen. Next on the map: Date map code when the owner
asks. Our dates album coded without a prototype at the owner's word (D38). The Dates screen itself is now coded
as Wallet tickets (D39), so the whole Date area is done.
Bedtime: the owner likes the screen as it is; only its top card changed, to a large animated sleeping mascot (D40).
Alarms (list + editor) moved to Bedtime's navy in the iOS Clock look, with a Next alarm card (D41); the ringing
screen is unchanged.
Store coded from the canvas row "Store: Plans and Shells" (D42). The owner's order: what Pro gives first (a Pro
card and a Basic / Pro table with locks, "FOMO"), prices last. The owner asked to say Pro "runs a stronger model";
all plans run the same model, so that line was left out as untrue (App Store 2.3 / 3.1). If the backend ever gives
Pro a stronger model, add a "Most capable model" row then. The owner checked the Store in Expo Go: matches the
canvas. From here the owner wants the map's screens coded straight, no prototypes: My plan and Shell history (D43),
Photo Booth and Frame editor (D44), Contacts (D45), Gifts (D46), Radio (D49). Owner decisions the same day: **no
ads anywhere** (D47); invites pay 50 each only when the friend is back the next day, sharing pays nothing (D48);
Radio clips can be an alarm's voice and a level-up sends the opened clip (D50; later ideas and a possible feed in
`docs/radio-roadmap.md`). Next on the map: Board, Secret note, Alarm ringing. Board, Secret note (D51) and Alarm ringing (D52) done; then the forms: Edit profile and Notification settings as iOS Settings pages (D53); Couple quiz and Onboarding were approved earlier and stay. Create character is an iOS form too (D54). The shared `Toggle` thumb is now white in dark mode too, as UISwitch (owner asked). World quiz moved to the aurora (D55). Write a quiz is an iOS form (D56). **Intro + onboarding (2026-10-24, D58):** the owner picked the 2.5 s intro and onboarding B (story cards) from the canvas; A (chat) was dropped. The intro plays on first launch only, before hello (the plan the owner approved; showing it on every launch would be a separate change). Intro motion lives in three places with the same keyframes: canvas `Intro.dc.html`, `src/components/onboarding/intro.tsx` and the Remotion project `C:/Users/joray/sigmazam-motion` (renders `out/intro.mp4`); change them together. The owner had the shell removed from the gift scene. Untested on the phone yet. **SDK 58 (2026-10-23):** Expo Go on the phone moved to SDK 58, so the project went from SDK 57 to 58 (`npx expo install expo@^58.0.0 --fix`; npm needs `--legacy-peer-deps` because datetimepicker's optional react-native-windows peer wants RN 0.85). RN 0.88 makes the Strict TypeScript API the default; fixed the real way, no `react-native-legacy-deep-imports` opt-out: refs use `ViewInstance` / `ScrollViewInstance` / `TextInputInstance`, list slots get `undefined` instead of `null`, chat wallpapers are typed as Metro asset ids (`number`), and the custom tab bar uses SDK 58's `emitter` + `navigateToTab` (the `navigation` prop is gone). `expo-asset` added (expo-audio peer, expo-doctor). The owner had the unrelated "WinPhone Studio" add-on removed: the untracked `metro.config.js` (forced `.ios` files on web), `src/lib/winphone-ios-shim.ts` and its import in `src/app/_layout.tsx` (both files kept in the session scratchpad, not in the repo). Expo Go checks now use `isRunningInExpoGo()` from `expo` (`src/notifications/native.ts`, `alarm-android.ts`): `ExecutionEnvironment.StoreClient` missed Expo Go 58, so `expo-notifications` (new `ExpoTopicSubscriptionModule`) and Notify Kit (`NotifeeApiModule`, called on every alarm tick) threw on the phone. `npm start` runs `expo start --go`: the old SDK 57 development build on the phone caught the dev-client QR. Left on the map: only Couple quiz and Onboarding, both approved earlier: ask the owner before touching them. **Today colours (2026-10-24, D59):** the owner had the bottom tiles' 3D icons and the black / white widgets replaced: each module now has one iOS hue (`moduleColors`) and a white Ionicons glyph (`MODULE_ICON`), shared by its tile and its widget; the sealed note row has a gold one too. The owner checked it on the phone (Expo Go): good. **One colour per module (D60):** after reading HIG Color and Branding the logo's apricot is the app's one accent (actions, selection, unread, the Store tile) and every module keeps one hue and glyph on every screen (`ModuleIcon` / `moduleTile`, rules in `docs/design-style.md` §1). **Last 3D UI icons out (D61):** empty states use a grey SF Symbol (ContentUnavailableView), the paywall and minutes sheets use module tiles; kept on purpose: the shell currency, the Store's Pro/shell art, Photo Booth stickers, Couple quiz (approved, ask first). **Couple quiz (D62)** is in the iOS look too (the owner asked), so all 54 map screens are done. **Palette pass 1 (D63):** the accent left plain text (streaks, "In review", weekday letters) and iOS orange left every non-warning tile; `systemColors` is now the full iOS set with dark tones. **Palette pass 2 (D64):** hand-written colours went from 573 to 325 (the rest is content art, on-photo white and scrims, listed in `docs/design-style.md` §1); every iOS hue reads `systemColors`, so dark mode has Apple's dark tones; the Store's palette is `storeColors` in the theme. **Haptics (D65):** one `haptic` module by HIG meaning with a Profile → Haptics switch (rules in `docs/design-style.md` §6b); untested on a phone. **Cleanup (D66):** dead colour tokens and the unused character card are gone; `docs/design-audit.md` is the 2026-10-24 review. The owner's review queue is finished; still open: the largest text size on fixed-height cards and the phone checks listed there. The owner checked dark mode and the palette on the phone: good. **D67:** the pale square inside the Find button on Android was the `elevation` shadow showing through the glass; glass shadows use `boxShadow` on Android now (checked on the phone over adb). Rules in `docs/design-style.md` §4. **Character.AI teardown (2026-10-24):** the owner had the app studied on the phone (adb, bundle, screens) and from its public blog; findings and a seven-item proposal are in `docs/character-ai-teardown.md`. The owner chose item 1 first: regenerate, swipe between versions, edit and rewind in the chat. **D68 done:** prototype on the canvas, then code (one-to-one chats; group chat later). Untested by hand on the phone beyond the ↻ row: tap ↻, swipe, Edit and Rewind there. **D69 done:** item 2, Memories in three tabs (Story / them / You) with a bar split by tab, and Pin to Memories in the chat's long-press menu for your own lines and theirs (prototype `MemTabs` first). Untested on the phone: pin, the badge, the tabs and the v10 migration of saved memories. **D70 done:** item 3, quick create, Character.AI's creation chain at the owner's word (logic theirs, look ours; no prototype, the owner said code straight): idea + sparks → a checked draft in the form, ✦ per field, more openings, private sample dialog with "Add from your chat", first lines as chat chips, 3 free drafts a day (`src/economy/quick-create.ts`). Untested on the phone. **D71 done:** Personas (Character.AI port item 2): up to 5 "me"s besides the profile, one default for new chats, any chat its own ("You are" in chat settings), carried into the prompt; Profile → Personas. On Windows run `node scripts/regen-route-types.mjs` after adding routes (the dev server's watcher types sub-folder routes wrong). Untested on the phone. **D72 done:** Scenes, played inside the one chat (chat + → Scene; six app scenes free, own ones a plan perk; a bar with End), and plan perks in `src/economy/perks.ts` after the owner asked that every feature make sense in unit economics (`backend-plan.md` §12.18). **Drawn picture price (2026-10-25, owner's yes):** a character created without a photo gets one picture drawn from their looks: 15 shells, or free from a plan (10 per 30 days), charged only when a picture comes back; off until the image server runs (`PORTRAITS_AVAILABLE` in `src/ai/character-studio.ts`). **D73 done (2026-10-25, cloud session):** World books, Character.AI's Lorebook (teardown item 4; the owner said "start with Lorebook", coded straight in the existing iOS-form look like D71/D72, design pass later). Each official world has a read-only book (always-known lines, places / things / events / groups / rules, and the cast as people, `src/mock/lorebooks.ts`; keep its facts in step with the bios and world quizzes); the user's own books link to any friend (free 1 × 15 entries, plan 5 × 50, `PERKS`). An entry joins a reply only when its name or a keyword comes up in the chat's last 8 lines (max 4 entries / 1200 characters, `src/lib/lorebook.ts`, tested); `buildCharacterPrompt` carries YOUR WORLD after the persona and WORLD NOTES last. Screens: Profile → World books, a book, book and entry editors, chat settings → World books ("<name>'s world": what came up in the chat now, their world, your books with an on/off mark). Server plan `backend-plan.md` §12.19. Checked on web, light and dark; the mock replies do not use lore (the server will). It was pushed to `claude/edit-check-ai-logic-pem6z6` (= `local-work` + D73, D74 and D75), not to `local-work`: on the laptop run `git fetch origin` and `git merge --ff-only origin/claude/edit-check-ai-logic-pem6z6` on `local-work` before going on, then `node scripts/regen-route-types.mjs` (new routes under `/lore` and `/streams`), and clear Metro's cache if it says "Unable to resolve module" (see the rules above). **Untested on the phone; the owner will check these in Expo Go with the laptop session:** (1) Profile → World books, open Moonlit Realm and scroll its entries; (2) + New world book, link a friend, Save, then New entry with a keyword; (3) in that friend's chat write the keyword, then chat settings → World books shows the entry under In the chat now with "Came up"; (4) the round mark turns the book off and on for that friend; (5) the same screens in dark mode; (6) the keyboard does not cover the fields of the book and entry editors (they copy the scene editor's `KeyboardAvoidingView`, offset 90). Fix what the phone shows. **D74 done (2026-10-25, same cloud session and branch):** Streams, Character.AI's Stream (the owner confirmed what it is: two characters talk about a topic while the user watches; coded straight in the existing look, design pass later). Chats → pencil → Streams: a list, a new stream (topic with idea pills, two characters: friends first, then everyone by world) and the viewer (the group chat's bubbles and typing row; Stop / Go on; Keep going; "Chat with … in a group"; Talk to both when full). One server call per line from the speaker's own persona (`buildStreamLinePrompt`); rounds of 8 then 6 lines up to 26; 1 free round a day (5 with a plan), then 2 shells (`src/economy/streams.ts`); server plan `backend-plan.md` §12.20. Also fixed `MessageBubble`: with nothing to press it was drawn as a disabled button (0.45 opacity). **Phone checks for D74 (Expo Go):** (1) Chats → pencil → Streams; (2) New stream: tap an idea, pick two, Start (the first round of the day is free); (3) typing then lines, the list follows the newest line; Stop, then Go on; (4) Keep going after the free round costs 2 shells (History shows Stream); (5) "Chat with … in a group" opens their group; (6) close the app mid-stream: it goes on at the next launch; (7) dark mode. **D75 done (2026-10-25, same session and branch):** Continue and time skip (teardown item 5; the owner gave a free hand on the logic). » next to ↻ under their newest reply lets them go on; the chat "+" menu's Time skip moves the story on (a little later, that evening, the next morning, a week later). Each leaves a marker that is the user's turn (↻ redoes only the reply after it; a rewind can take it back), costs what a message does, adds no closeness, waits while a reply is coming or after a crisis reply, and stops after 3 in a row until the user writes (`src/lib/chat-steer.ts`). Server: the cue goes last (`steerCue`), a skip shows in the history as `[Time skip: …]`, and is story time only (real plans are not done); plan `backend-plan.md` §12.21. **Phone checks for D75 (Expo Go):** (1) » under their reply: a continue arrives, one shell goes; (2) ↻ right after it redoes only that part; (3) after three in a row » is gone until you write; (4) "+" → Time skip → The next morning: a clock line, then their reply; (5) the sheet says why it waits while they type; (6) dark mode. **D76 done (2026-10-25, laptop):** teardown item 6, Reply style (Talk / Mixed / Story) and Reply length (Short / Auto / Long) per chat, in chat settings as two iOS segmented controls, plus a mood that carries between replies and one follow-up text when the user goes quiet after a question. The phone session's skeleton (branch `ccr-cbd2e9f1-iwref7`, on old `main`, not merged) was ported by hand to `src/lib/reply-engine/` (tested), `src/ai/reply-style.ts` and `src/mock/reply-writer.ts` (it replaces `replyBursts`); server notes `backend-plan.md` §12.22. A local, unfinished world-books draft that clashed with D73 is in `git stash` (`stash@{0}`), not in the tree. **Phone checks for D76 (Expo Go):** (1) chat settings → Story + Long, then a message: one block with italic *actions*; (2) Talk + Short: plain short lines; (3) "I had a bad day": comfort first; (4) with Let them reach out on, leave a question unanswered ~2 min: one more text, only once; (5) dark mode. The owner went through the phone checks in Expo Go on 2026-10-25: fine for now, they will check again later. **D77 done (2026-10-25):** teardown item 7, the prompt layout for caching (server side, nothing on screen): every prompt part has a tier by how often it changes (rules → persona and official world → the chat's own settings and pins → turn), the history sits between the chat tier and the turn tier and is cut on whole 20-turn steps, and what changes between replies (bond, scene, lore notes, recalled facts, cues, hints) goes after it, so a warm chat reads the whole prefix from the cache (`src/ai/prompt-layout.ts`, `src/ai/chat-prompt.ts`; adapter, TTLs and estimate in backend-plan §12.23). Every teardown item is now done. **D78 done (2026-10-25):** the owner said the new screens did not feel like iOS; an iOS design pass on D69-D76's screens (flows.md D78, HIG Buttons / Lists and tables / Segmented controls / Color): one `AddRow` (accent ⊕, count, lock at the limit) instead of green ⊕ rows plus a duplicate "+" in the bar; persona pronouns as a segmented control; world rows with the world's picture and the cast with their faces; helper paragraphs behind ⓘ; a glyph per scene; Streams' empty state as a grey SF Symbol; New stream's ideas in one swipeable row and the pair as two seats; disabled bar buttons iOS grey. **Phone checks (Expo Go):** (1) Profile → Personas, New persona: pronouns tap and tap again; (2) Profile → World books: pictures, ⓘ sheet, open Seaside (faces); (3) chat "+" → Scene: glyph tiles; (4) Chats → pencil → Streams → New stream: swipe the ideas, pick two, tap a face to take it out; (5) dark mode. The owner likes D78: keep these screens as they are. **D79 done (2026-10-25):** Continue in group chats: » under the members' newest lines, two members trade a line without the user (`continueSpeakers`), the one-to-one rules and price (flows.md D79). **Phone checks for D79 (Expo Go):** (1) in a group, » under their newest lines: two members talk, one shell goes; (2) after three in a row » is gone until you write; (3) dark mode. **D80 done (2026-10-25):** the owner handed the whole time skip over ("I don't get its logic; it's yours"). Kept explicit (Character.AI's is one fixed command where the model picks how far) and completed: the four spans, the running scene's next moment (first in the sheet, and ⏩ on the scene bar opens it), and the user's own words ("After the concert", 40 characters, checked); groups get Time skip in the "+" menu (flows.md D80, backend-plan §12.21). **Phone checks for D80 (Expo Go):** (1) chat "+" → Time skip: type "After the concert", tap the arrow: a clock line with your words, then their reply; (2) start a scene, tap ⏩ on its bar: "Next moment" is first; (3) in a group, "+" → Time skip → The next morning: one member picks up, another answers; (4) dark mode. **D81 done (2026-10-25):** a group chat picks its background as a one-to-one chat does (group info → Chat background; shared `BackgroundPicker`). The owner had seen the old "+" list in a group: the phone kept a bundle from before Metro's restart; reload Expo Go. **Phone checks for D81:** group info → Chat background → pick a classic one and an art one: the group chat shows it. Next: the owner picks; the Character.AI port and its parked ideas are all done. Note for agents: a headless browser on the web build shares Metro with the phone; it pushed Metro to 1.2 GB and hung it on 2026-10-25, so do not screenshot the web build while the owner is on Expo Go.

### 0x. iOS look, step 3: the chat room (2026-10-16)

Owner approved the chat prototype (canvas artboard `Chat.dc.html`) and set the direction: every
screen goes iOS/Apple style, chat and Chats first, in small steps; the palette is a later task.
Plan for the chat: 1 room (done), 2 long-press menu (keep the mascot reaction stickers and their
motion), 3 "+" menu, 4 chat settings as an iOS contact card, 5 search/background/memories/profile,
6 in-chat sheets, 7 group chat + info, 8 the Chats "new chat" sheet.
Done here: `src/app/chat/[id].tsx` header is glass over the list (tap the friend = chat settings),
`bg_plain` is iOS white/black and the default (store v9 migrates `bg_blossom`), bubbles/day
labels/receipts/system lines/voice bubble/typing/quick replies/input restyled
(`src/components/chat/*`, run logic in `runs.ts`, used by the group chat too); `bubbleOther` is
iOS grey. **Suggested replies are a TEST**: `src/mock/suggestions.ts` picks 2 from a fixed pool;
owner wants to work on them in depth later (model-written replies that fit the line, cost rules,
when to show). Checked on web, light and dark.
Step 2 done too: `src/components/chat/message-menu.tsx` replaces the long-press sheet in the chat
and the group (blur, mascot stickers in a glass capsule, Copy / Report / Delete); the owner asked
for no message copy under the reactions. Step 3 done: the "+" menu is `src/components/chat/attach-menu.tsx` (iOS icons chosen by the
owner over the 3D ones, only in this menu). Blur fix: on the phone (Android) the menus did not blur: expo-blur draws only a tint there unless
`blurMethod="dimezisBlurView"` and a `blurTarget` ref to a `BlurTargetView` are given. Both menus are
now overlays inside the screen (not a Modal window), the chat and group content sit in a
`BlurTargetView`, and Android back closes an open menu (`useBackToClose`). Web looked fine because
it uses CSS blur. Step 4 done: chat settings are an iOS contact card (`settings.tsx`); every old action kept, the
Chat settings sheet is inline; switches are RN `Switch` so each platform draws its own (owner asked
about App Store risk: native controls are what Apple asks for). Step 5 done: search, background, memories and profile are iOS style
(flows.md D18). Navigation follows iOS: a background pick, a search hit and the profile's Message go
back to the chat already in the stack (`router.dismissTo`), not a new copy; a search hit scrolls to
the message and tints it. Owner's links (2026-10-16): SF Symbols are used through `expo-symbols`
(`SFIcon`, iPhone only, Ionicons elsewhere, as Apple's licence allows); SF Pro is not bundled (it is
already the iPhone system font, and its licence forbids Android); HealthKit does not fit the app.
**Sign in with Apple is required** (App Store 4.8) as soon as the backend adds any third-party login
(Google etc.): put its button first, per Apple's HIG. Step 6 done: all sheets are iOS floating sheets
(flows.md D19; owner: "hammasiga qo'lla", iOS 27 look). New dependency
`@react-native-community/datetimepicker` (config plugin in `app.json`; in Expo Go, a new build picks it
up too): the daily-call time opens the system picker. iOS 27 per WWDC 2026 coverage keeps Liquid
Glass with a darker edge and brighter highlights, so `glassLine` is a bit darker. Step 7 done: group chat, group info, group search and
New group (flows.md D20). Group typing is now a per-member list (several can type at once; see the
comment on `scheduleGroupReplies`); the real backend should keep that contract: start a member's
typing when their reply job starts, stop it when their last line lands. Gotcha: `Txt` applies its
`color` prop before `style`, so a style with `color` silently wins; keep colours out of shared row
styles. Step 8 done: the Chats pencil sheet (flows.md D21). The scroll-edge pass is done too (flows.md D22). The chat
and Chats plan is complete. **Owner's order from here (2026-10-17):** Us tab and every screen it opens
(1 Us main, 2 publish + new-plan sheets, 3 board write, 4 photo viewer, 5 diary screens only with
the owner's explicit yes: the Heartbeat diary is an approved screen), then Find, then Today, and
last, calmly, the palette (grounds, buttons) once every screen is done. Prototype each step first.
Us 1 done (flows.md D23): the Us tab; moments use system-colour icons, no 3D art (owner). Us 2 done (D24): the Add and New plan
sheets. Us 3-4 done (D25): board note and photo. Us 5 done (D26): diary chrome, with the owner's yes;
not checked on web yet (the 8081 dev server stopped serving pages, a second server was killed for
low memory). Us is complete. Next: Find.

### 0w. iOS look, step 2: the Chats screen (2026-10-16)

Built from the same approved prototype (artboard `Main.dc.html`). `src/app/(tabs)/chat.tsx`: glass
Edit and new-chat buttons (`shadows.glassButton`), large title, search field always shown (no mic:
the app has no speech search), pinned chats as big avatars on top (bubble with the last line while
unread), plain rows with an unread dot instead of the count. Swipe left (`ReanimatedSwipeable`):
Mute/Unmute (iOS indigo), Pin (peach), Delete (confirm); a tap on an open row only closes it.
Edit: red remove circle per row, unpin badge on each pinned avatar. Store: `setChatPinned`,
`setChatMuted`, `deleteChat` (chat and messages go, the bond stays; Find starts a new chat).
Groups have no `pinned` field, so they swipe to Mute and Delete only. Checked on web, light and
dark (swipe, pin, Edit). Next: owner's pick (iOS look for Today or Us, or back to the audit queue).

### 0v. iOS look, step 1: grounds and the glass tab bar (2026-10-16)

Owner wants the app to feel like Apple's own apps (prototype
https://claude.ai/artifact/WTWWPXiX17USrgcgYAdRQg approved: "Find stays outside, liquid glass tab
bar, bold tab labels, iOS background"). Done: `colors` light grounds are iOS (`bg` #F2F2F7,
`bgPlain` white, iOS greys and separators); dark mode is iOS black (`nightColors`); Bedtime keeps
the old navy as `sleepColors`. Tab bar: `(tabs)/_layout.ios.tsx` uses `NativeTabs`
(`expo-router/unstable-native-tabs`, SF Symbols, Find `role="search"`, badge dot for unread);
`(tabs)/_layout.tsx` (Android, web) draws a floating frosted pill + round Find button
(`colors.glass*`, `shadows.glass`); both use `useTabsGate`/`useUnreadTotal`
(`src/hooks/use-tabs-gate.ts`). `TAB_BAR_HEIGHT` is 84 (room for the floating bar). Fonts did not
change (owner meant bold tab labels only). The iOS bar is untested here (no iPhone); it needs a
new iOS build. Next: the Chats screen itself from the same prototype (pinned avatars on top,
unread dot, swipe actions).

### 0u. BIMOBIMO architecture map (2026-10-16)

Owner asked how BIMOBIMO works inside and what to take. `docs/bimobimo-architecture.md`: static
look at the APK (manifest + Dart/Rust string dump; REA did not connect, Apktool did): Flutter +
GetX, REST + SSE chat with async reply jobs, Tencent RTC calls, FCM, Play Billing, AdMob tickets,
~210 API paths by area, and a gap table. It confirms `docs/backend-plan.md`. Proposed order:
backend B1, scheduled TTS morning/night calls, memory kinds on Memories, then Moments.

### 0t. Palette: soft peach replaces the terracotta orange (2026-10-15)

Owner: the old `#E8742A` looked like Claude's colour; they asked for something light, thin and
gentle. Picked "Yumshoq shaftoli" (prototype https://claude.ai/artifact/6NCYZdea8yv156PyNg4jnx).
`src/theme/colors.ts`: the apricot scale is now peach (`#FFF7F0` ... `#C96A32`). `primary`
(`#EF8A4E`, dark `#FFC497`) marks icons, rings, dots and brand text; new `primaryFill`
(`#FFB37A`) is every solid peach fill (send, badges, selected days, Spin, store tags), and
`textOnPrimary` is ink brown `#6A2F0C` because white vanishes on peach. `Button` primary draws
`gradients.primary` (`#FFD3B1` to `#FFB37A`); `accent` keeps white text; `soft` uses `brandText`.
Dark mode: `primarySoft #3B2A26`, own bubble `#56392F`. Notification accent in `app.json` is
`#EF8A4E` (new build). Checked on web, light and dark.

### 0s. Rebrand: Rafti is now Sigmazam (2026-10-15)

The owner's logo (`docs/branding/download.png`: "SiGMAZAM", a cream mascot with an orange hair
swoosh peeking over the G) replaces the Rafti name. Written as text: "Sigmazam"; the name comes
from the Turkish word *siğmazam* (owner, 2026-10-15).
- `docs/branding/icon-art.png`: the mascot over the G alone, 1024px, made on Higgsfield
  (`xai/grok-imagine-image-2.0`, the logo as reference, $0.08).
- `scripts/build-sigmazam-brand.py` makes every asset from those two: `assets/brand/sigmazam-logo.png`
  and `sigmazam-mark.png` (transparent; the cut keeps the cream body by flood-filling the background
  from the border, and drops the logo's shadow), the iOS icon, Android adaptive layers (cream
  background `#FDF6EE`), the monochrome icon (also the notification icon: solid orange parts,
  half-alpha body, open eyes), the splash wordmark (240 wide) and the favicon.
- In the app: `BRAND.logo` in the Today top bar (replaces the Fredoka "Rafti" text + otter),
  `BRAND.mark` greets on onboarding ("Hi, I'm Sigmazam"), every "Rafti" in `en.json`, push and
  alarm fallbacks, the crash title and `CHARACTER_RULES` say Sigmazam. `app.json` name is
  Sigmazam; slug, scheme `rafti`, package `com.rafti.app` and storage keys stay (changing them
  reinstalls the app as a new one and loses saved data). Icons and splash need a new build.
- Mascot art redrawn (owner: livelier, the logo's bright apricot, no spark dashes, a different idea
  for each moment): `docs/branding/art/*.png` (Higgsfield, 6 x $0.08) -> `BRAND.sticker` (winking
  die-cut, default avatar), `empty` (a magnifying glass), `reward` (catching a glowing
  shell), `levelUp` (bursting out of hearts with a crown), `bedtime` (asleep in a crescent moon),
  `diaryCover` (writing at a desk). Old otter files and the unused home banner are gone; the
  empty state's seashell glow and ripples went with the shell (float, shadow and tap squash stay);
  The empty-state art was redrawn without the box (owner): peeking through a magnifying glass.
  `build-brand-art.py` no longer writes the mascot pieces, splash or icons.
- Chat reactions redrawn (6 x $0.08, `docs/branding/art/reaction-*.png`): love hugs a heart, laugh
  rolls back in tears, wow with paws on cheeks, sad under a rain cloud, hyped in a party hat, thumbs
  in sunglasses. `src/components/chat/reaction-sticker.tsx` moves each to its feeling (heartbeat,
  shake, pop, slow sway, jump, cool nod): looping in the picker (chat and group chat), twice then
  still under a message, still with reduced motion. No otter art is left in the app. Docs now say Sigmazam too (dated audits and the old-status
  notes below keep Rafti as history; repo, `rafti-research`, slug and storage keys keep `rafti`).
- Owner wants the app palette moved off the dark apricot `#E8742A` ("looks like Claude") toward the
  logo's bright apricot `#F58B49`; white text needs a deeper button shade (about `#F27B3D`). Do it
  as its own task with a prototype.
- `assets/icons/` had been deleted in the working tree by another agent (the app imports its
  registry); restored from git. `assets/icons 3D/*.jpg` is deleted too, unused, left uncommitted.

### 0r. REMIND THE OWNER — saved tasks (2026-10-15, owner: "write them down, remind me later")

At the start of the next session, before anything else, remind the owner of these three in Uzbek
and ask which one to start (each with a prototype first, as usual):
1. [x] Radio clips. Done 2026-10-15 (F27, prototype https://claude.ai/artifact/1kNCV5gCbYDJ3jHgVoA4wG
   approved: shells, level-gated friend clips, no public feed). `src/app/radio/` (index = Clips | Sounds,
   `make.tsx`, `[id].tsx` player), `src/lib/radio-clips.ts` (+ tests), `src/components/radio/`
   (`useRadioPlayer`, `useRadioClips`), store `radioClips` + `makeRadioClip` / `deleteRadioClip` /
   `shareRadioClip`, friend clips in `src/mock/radio.ts`, ledger reason `radio`. Checked on web.
2. [x] User-made date themes. Done 2026-10-15 (F28, prototype https://claude.ai/artifact/Cjj8tcHHjNHe5XK8aW9wjv
   approved: free to make, 2 shells a round per play, Flirty Lv 6 / Sweet Lv 16, only you see them).
   Map card "Your own" + sheets in `src/app/dating.tsx`, make/edit `src/app/date/theme.tsx`, the date
   screen plays `activeDate.theme`; `src/lib/date-themes.ts` (+ tests), `src/mock/date-themes.ts`
   (round pools, `THEME_ARTS`), store `dateThemes` + `saveDateTheme` / `deleteDateTheme` /
   `beginThemeDate`. Also fixed: "You need 1 shell" in the out-of-shells sheet. Checked on web.
3. [x] Quizzes and frames. Done 2026-10-15 (F29, prototype https://claude.ai/artifact/DXZmjXUYG61wzJV3SBaaXx;
   owner: free, private, and "a world's frame is won in a game"). Owner rule for all content from now on:
   every character keeps their own world, voice and habits, and the LLM writes scenes, rounds and questions
   from one persona prompt (`src/ai/content-prompts.ts`). Mock per world in `src/mock/worlds.ts`. Quiz:
   `src/app/quiz/[characterId].tsx` (weekly self quiz, world quiz row, 5 packs, your quizzes),
   `src/app/quiz/write.tsx`, `src/app/quiz/world/[world].tsx` (4 of 5 wins the frame). Frames:
   `src/components/photo-booth/frame-card.tsx`, `BoothPicture` reads `photo.frame`, frame row and locked
   sheet in `src/app/photo-booth.tsx`, `src/app/frame/edit.tsx`. Store `userQuizzes`, `wonFrames`, `frames`
   + `saveQuiz`/`deleteQuiz`/`finishWorldQuiz`/`saveFrame`/`deleteFrame`; `finishQuiz` now takes the total.
   Date rounds start with a round from the friend's world. Checked on web.
Also on hold: the Backend (real AI), `docs/backend-plan.md`.
Also saved for later (owner liked both, 2026-10-15):
4. [x] Done 2026-10-15 with the new mascot (owner: "use the mascot in the daily check-in too"):
   `src/components/peeking-mascot.tsx` (`BRAND.peek`, head and paws drawn on Higgsfield, body cut flat)
   climbs up from behind an edge, ducks and pops up every ~6 s, hops on a tap (light haptic), sits
   still with reduced motion. On the Free gifts "Daily check-in" card (the check-in popup is off
   since 2026-10-09, so that card is where people see it) and on `DailyRewardSheet` if the popup
   comes back. Original note: Rafti peeks over the top edge of the check-in sheet (slides up from behind
   the card, small squash, paws on the edge, now and then ducks and pops up again; a tap makes him
   hop). Prototype https://claude.ai/artifact/SFsyqQWjSeYMQezTD9JZcT, artboard "3 · Daily check-in —
   peek" (the other six moods there were NOT wanted). Idea from BIMOBIMO's screen recording: their
   cat peeks over the check-in popup and its ears pop up (a pose change); elsewhere their mascot is
   still art. Build in `src/components/daily-reward-sheet.tsx` with Reanimated; the sheet itself
   still opens without animation (owner rule), only Rafti moves; respect reduced motion.
5. [ ] Live scenes: 5-second looping clips on the Today hero (Kai, Aurelian, Sol, Seren, Theo).
   Groundwork on branch `feat/live-scenes` (expo-video, `LiveScene`, `scripts/build-live-scenes.py`);
   test clip https://d3u0tzju9qaucj.cloudfront.net/a93ad07f-0007-492f-8a38-3504a22c6791/920c7dff-949c-4b3b-9e33-c6838871da99.mp4
   (Higgsfield `kling-video/omni/first-last-frame`, std, 5 s, first = last frame). Needs the CDN
   domain allowed in the cloud environment to download clips, and a new phone build (native module).

### 0c-queue. Owner's work queue (2026-10-13, do in this order, one at a time, keep each simple)

Found in the 2026-10-13 review after the credit plans; the owner approved all 16 and the order.
Logic
1. [x] 18+ gate at the root: deep links and pushes never open a screen before onboarding.
   Done: `OnboardingGate` in `src/app/_layout.tsx` (blank cover until data is loaded, then
   `router.replace('/onboarding')` for any route outside onboarding; covers new routes without
   listing them). Checked on web: `/store/shell`, `/character/c_kai`, `/chat/...` go to onboarding;
   an onboarded user opens them as before.
2. [x] Plan memories with an absolute date ("Exam - Thu, Oct 15"), not "the day after tomorrow".
   Done: `planMemoryLine` (`src/lib/plan-memory.ts`, tested) writes "Exam - Wed, Oct 14, 17:00.";
   the chat reply still says "tomorrow". Old memories keep their old text.
3. [x] Memories: edit a memory's text (prototype first).
   Done (prototype https://claude.ai/artifact/8V2dcCgBTZKUu3EsNbuU3p, approved): a tap on a memory's
   text opens the add sheet as "Edit memory", filled in; `editMemory` keeps source, date and pin and
   uses the crisis guard (`rememberableText`). Locked memories have no text to tap. Checked on web.
4. [x] Message storage: cap or move messages out of the one AsyncStorage key (~2 MB Android limit).
   Done: `src/lib/storage-caps.ts` (tested), used in `partialize`: the save keeps the newest 300
   messages per chat and 4,000 overall, and the newest 3,000 ledger lines (the ledger also grew by
   one line per message for 183 days). ~191 bytes a message, so the worst case is about 1.1 MB. The
   screen keeps the full history until the next launch. Real fix later: SQLite or the server.
5. [x] Hide "public" in Create character until moderation (business-plan: no UGC at launch).
   Done: `SHARING_OPEN = false` in `src/app/create-character.tsx` hides "Who sees them"; every
   creation (new or edited) saves private; the caption reads "Only you can see them". The review
   code stays for when the server queue exists. Checked on web.
6. [x] Review and merge the Story Continuity PR (`story-continuity-rebased`).
   Done: merged into local-work (builder `src/lib/story-continuity.ts` + 16 tests, `MemoryItem`
   `type/importance/status/supersededBy`, 3 docs). The builder is not wired to replies; the backend
   uses it. Memories screen, the 20-limit and the profile/settings counts now show only active
   memories (`isActiveMemory`). Backend note: for a free user pass only `memoryAccess(...).open` to
   the builder, so locked memories never reach the prompt.
Docs
7. [x] business-plan.md §4-§5 to the credit model (Basic / Pro / Pro yearly, Pro-only features).
   Done: §0, §4 (plans table with Free, trial, packs, what shells buy and what is Pro only), §5 (net per
   plan from §15.10, 55/30/15 mix, ~$14.2 net revenue and ~$9.7 profit per payer, free MAU $0.17,
   break-even ~2% at 10k MAU, new revenue table), KPI ARPPU >= $12, decision 2, terms line.
8. [x] README "How the app behaves" to the current rules.
   Done: the table now states the credit model, free shells at midnight, the plans and trial, Pro-only
   features, the memory limit, gifts, safety (18+ gate, AI notice, crisis), storage caps; `npm test` in
   Run; Store / My plan / History in Screens; RevenueCat and the continuity builder in the backend
   seams. The stale "members chat for free" comment in `src/mock/misc.ts` is fixed too.
9. [-] Legal: memory export; account deletion that will also cover server data.
   Owner (2026-10-13): skip memory export for now. Note: business-plan §7 lists it as a legal item
   (EU data portability), so add it before an EU launch. Server-side deletion comes with the backend.
From BIMOBIMO (our own look and words)
10. [x] Chats list: closeness heart with the level; a sad face after a long silence.
   Done (prototype https://claude.ai/artifact/S2YsDCX1euvfZ2X7NxtpUH, approved): the Today mint chip
   moved to `src/components/bond-chip.tsx` and sits after each name on the Chats tab (level 1+, as on
   Today; the row label says "bond level N"). The sad face is left out: the BIMOBIMO teardown §6 lists
   it as a guilt pattern we do not use.
11. [x] Chat header status line, e.g. "Together 12 days".
   Already in the app: the chat header reads "AI character · 🧡 N days" (the streak).
12. [~] Wake-up alarm (owner 2026-10-13: for every plan, any time, iOS Clock style, a real ring with
    a melody; prototype https://claude.ai/artifact/JYkzQxvxXUV9x9brU1DhZn v3, approved with the
    wake-up task). Stage 1 done (branch `feat/wake-up-alarms`): `Alarm` type, `src/lib/alarms.ts`
    (next ring, a week of rings, repeat names; tested), store `alarms` + `saveAlarm/deleteAlarm/
    setAlarmEnabled` (persisted), screens `/alarms` (list, switch, swipe to delete) and `/alarms/edit`
    (modal: time wheel `src/components/alarms/time-wheel.tsx`, Repeat / Label / Who / Sound pages,
    Reply to wake up, Snooze, Delete), a Bedtime "Alarms" row open to every plan, and
    `src/notifications/alarms.ts` (local notifications with an `alarm:` id, an Android `alarms`
    channel, never cleared on open, re-synced on every change and open; they ring with the app open).
    Stage 2 done (branch `feat/alarm-ring-chain`): the ring screen `/alarms/ring` (prototype D; Reply,
    Snooze 9 min x3, hold 3 s to turn off; Stop when there is no task), the wake session in the store
    (`wake`, `ringAlarm`, `snoozeWake`, `stopWake`, `pickChip`, `wakeTick`), `AlarmRuntime` in the root
    layout (an in-app clock every 5 s, so it rings with the app open, also on web and Expo Go, and the
    looping melody via expo-audio), the orange "Alarm on" bar and quick-reply chips in the chat, 5 own
    melodies (`scripts/build-alarm-sounds.py` -> `assets/sounds/alarms/*.wav`), and the morning chain
    (prototype https://claude.ai/artifact/YKTHLBfcC9sTHnK6CoR8UC, approved; `src/lib/morning-chain.ts`,
    tested): a reply of 3+ words turns it off and is free (also the chips, for 30 min); a time ->
    "text you at 9:10?" -> a plan with `remindAt`; an activity -> "what time?"; sleepy -> a check-in
    in 5 (or 10) min; else a warm line. The wake question uses today's plan. Notifications: ring taps
    open `/alarms/ring?id=&at=`, plus the snooze ring and the check-in when the app is closed.
    Checked on web: ring, "ok" refused (free), "work, I leave at 9.30" -> offer -> Yes -> Work 09:30
    with a 09:10 reminder, snooze and re-ring, sleepy -> 10 more min -> "Up yet?". All with 0 shells.
    Stage 3, Android (2026-10-14; the owner picked Android, iOS AlarmKit needs an Apple account and
    an EAS build, later): `react-native-notify-kit` (the maintained Notifee fork; Notifee was archived
    in April 2026) in `src/notifications/alarm-android.ts` hands every ring (7 days + the snooze ring)
    to AlarmManager as an alarm clock, with a full-screen intent, `category: alarm` and our melody
    looping (one channel per melody, `ring_<sound>`, made by `createAlarmChannel` on the alarm stream so
    vibrate/silent mode does not mute it; Android fixes a channel's sound). The app opens,
    `AlarmRuntime`'s clock finds the due alarm, silences the notification and plays the melody itself.
    The local module `modules/alarm-screen` (Kotlin) shows the ring screen over the lock screen only
    while it rings, and "Reply" asks to unlock first (chats stay private). Melodies were renamed to
    underscores (Android resource names) and are bundled by the expo-notifications `sounds` option;
    iOS notifications play them too. `allowAlarms` opens the exact-alarm settings when they are off.
    `app.json`: `android.package` `com.rafti.app`, USE_FULL_SCREEN_INTENT, SCHEDULE_EXACT_ALARM.
    Build: `npx expo run:android` with the phone on USB (`/android` is generated, git-ignored), then
    `npx expo start --dev-client`. Play Store note: full-screen intent is allowed for alarm apps only;
    declare the alarm feature in the Play listing.
    `AlarmScreenPackage` shows the activity over the lock screen as soon as an alarm launches it;
    `AlarmRuntime` turns that off when nothing rings. Tested on the owner's Samsung A51 (Android 13,
    vibrate mode, screen locked) 2026-10-14: rings, ring screen over the lock screen, melody, reply in
    the chat turns it off. Found in the phone's log: `ringAlarm` merged a new ring into the same
    alarm's earlier session (< 30 min, already awake), so a re-set alarm only gave one note and no
    screen (and `AlarmRuntime` pushed/closed the ring screen in a loop). Now a ring after the alarm
    was saved again is a new session. Note: the phone ran a release build (JS inside the APK, no
    Metro), so the 22:34 test above ran the old code; the fix ships with the next release build.
    The phone's app is a release build so alarms work without the PC: after JS changes rebuild with
    `npx expo run:android --variant release --no-bundler`. Minor, left: "No task registered for key app.notifee.notification-event"
    on a cold start (the background handler registers on first use; harmless).
    Bedtime redrawn in the iOS Sleep look (owner's pick B; flows D7). `nightColors` in
    `src/theme/colors.ts` holds every token for a dark canvas: dark mode (item 15) will reuse it.
    The stale 8082 server was stopped on the owner's word (2026-10-14).
    Gotcha: a running `expo start` rewrites `.expo/types/router.d.ts` badly when files outside
    `src/app` change (`/../lib/...` paths) and `tsc` then fails on new routes; delete the file, restart
    your server, wait for the file, then run `npx tsc --noEmit`.
13. [x] Photo Booth makes and keeps a real picture (Pro pays for it).
   Done 2026-10-14 (prototype https://claude.ai/artifact/S4BPNvFGt2tGPd6HnWwU4z; owner: draw it on the
   phone, a Send button, no save to the phone). `takePhoto(characterId, style)` uses the Pro allowance
   and returns a `BoothPhoto` kept in `photos` (persisted; removed with a block). The picture is not a
   file: `src/components/photo-booth/booth-picture.tsx` draws it from the record (friend's avatar and
   hero art, crops, blend layers via `mixBlendMode`, which works on iOS too, unlike `filter`).
   `sendPhoto` sends it once as an image message with `photoId`; the friend answers (`photoReply`,
   free). The Us photo moment carries `photoId` and shows the picture. Viewer: `/photo/[id]`.
   Typed routes: the running dev server wrote `/photo/[id]` as a static route, so links use
   `{ pathname: '/photo/[id]', params }`, which compiles either way. An image model can replace the
   drawing later behind the same record.
14. [x] Reply-language lock: the character always answers in the user's language.
   Done 2026-10-15 (owner's pick: the language the user writes in, no settings row). The app has no
   real AI yet, so this is the backend seam: `lockedReplyLanguage` (`src/ai/reply-language.ts`,
   tested) sets the chat's lock from the user's first message and moves it only after 2 messages in a
   row in a new language (too-short messages never move it; "pt-BR" = "pt"); `CHARACTER_RULES` has a
   LANGUAGE block (one language in every bubble, also in the character's own messages, no mixing even
   for a foreign persona); `buildCharacterPrompt(..., replyLanguage)` adds `REPLY LANGUAGE`, falling
   back to the app language. Server: detect each user message's language into `messages.lang`, keep
   the lock in `conversations.reply_language` (backend-plan §4). content-policy "Language" section.
15. [x] Dark mode (2026-10-15, owner: straight to code, no prototype).
   Follows the phone, read once at launch (`isDark` in `src/theme/colors.ts`): `colors` becomes
   `nightColors` (the Bedtime palette), so every screen that reads tokens turns dark; switching the
   phone's theme applies on the next launch (styles are built at import). `app.json`
   `userInterfaceStyle: "automatic"` (native setting: needs a new build, `npx expo run:android
   --variant release --no-bundler`). Also: `Screen`'s status bar follows the theme; the root window
   colour via `expo-system-ui`; chat wallpapers turn into deep shades of their hue (`dark: isDark`)
   and the art-wallpaper veil darkens; Date's `gradients.home`; polaroid stays white paper with its
   own ink; My diary's front card turns `surfaceAlt`; the diary page date uses paper ink. Rule: text
   on light paper uses paper ink (`paperText`, `palette.gray*`), never `colors.text`. New token
   `textOnInk` (white by day, navy at night) for text and icons on ink fills (unread count, ticked
   boxes, selected chips and segments, play buttons, "Best value"); the shell pill, the chat day chip
   and AI notice, and the lucky wheel have dark versions (light mode unchanged). Checked on web with
   a dark colour scheme: Today, Chats, chat, Find, Us, Profile, Diary, Store, Gifts, character
   profile, Create character; light mode re-checked (Today, chat). Not themed: notification
   previews and photo art (meant to look like a phone or a photo).
   The Antigravity Java extension (Red Hat) respawns ~11 java processes (~3.5 GB) that froze the
   laptop; killing them does not hold, the owner should disable the extension in Antigravity.
16. [x] Group chat with 2-3 characters (2026-10-15, cloud session after the terminal one closed).
   Prototype https://claude.ai/artifact/YJ8Q51sPuknSPopxjiwv88 approved with its decisions (1 shell a
   message, every plan, levels and memories stay in one-to-one chats, any world); the owner then asked
   for everything the prototype left out of v1 too, so all of it is built. Data: `GroupChat` in
   `groups` (persisted), messages in `messages[groupId]` with `Message.characterId` (so the storage
   caps cover them; Today and the diary writer only read conversations). Store: `createGroup`,
   `sendGroupText/Voice/Image`, `playGroupTruthOrDare`, `addGroupCall`, `renameGroup`,
   `addGroupMember`, `removeGroupMember`, `setGroupMuted`, `deleteGroup`, transient `groupTyping`;
   `markRead`, `setActiveConversation` (AI notice), `deleteMessage` and `reportMessage` know groups;
   `blockCharacter` takes them out of every group and ends a group left with one. Who answers:
   `pickResponders` (`src/lib/group-chat.ts`, tested): a named member first (two named: both), else
   the one who spoke least recently; every other message a second member joins in by name (mock
   lines `src/mock/group.ts`). Crisis: helpline card + one warm answer, no plan, no memory. Backend
   seam: `buildGroupPrompt` (`src/ai/rules.ts`, tested; backend-plan §12.13). Screens: Chats tab
   (groups in the list with `GroupAvatar`, pencil sheet New chat / New group, tab badge counts
   groups), `/group/new`, `/group/[id]` (name over each member's run, "X is typing", "+" sheet:
   voice, photo and truth or dare in the group; secret note, quiz, date (`/dating?partner=`) and
   daily calls ask "Who with?" and open that member's flow; diary as usual), `/group/[id]/info`
   (rename, members sheet: profile / your chat / remove while 2 stay; add while there is room; Mute;
   Delete with a confirm), `/group/[id]/call` (Pro call minutes, same paywall and top-up sheets, the
   speaker lit up, the call lands as one line in the group). `MessageBubble` got `senderName` and
   `aiNoticeText`, `TypingRow` a `label`, `TruthOrDareSheet` an `onPlay`; `DayChip` moved to
   `src/components/chat/day-chip.tsx`. There is no "gift to a character" feature in the app (Free
   gifts are shells for the user), so nothing to add there. Checked on web (375x812, light and dark):
   create, replies, named member, truth or dare, Who with, remove/add member, rename, delete, group
   call on the trial.
The 2026-10-13 queue is finished (9 skipped by the owner). Next: the saved tasks in 0r above.

### 0p. 2026-10-14 — animated Rafti mascot (Reanimated 3)

- Prototype approved in `design-prototypes/rafti-mascot/index.html`.
- Implemented in `src/components/ui/mascot.tsx`: 60-120fps GPU-driven breathing float with subtle
  scale, ground shadow, seashell acoustic ripple waves and warm glow aura for `name="empty"`
  (EmptyState), plus interactive squash & stretch spring tap with light haptic feedback.
  No other files or business logic touched. `src/components/ui/mascot.tsx` clean in tsc.
- Claude review 2026-10-15 (owner asked to check Gemini's work), fixed: the glow and the ground
  shadow were hard-edged discs (the prototype fades them), now `react-native-svg` radial fades; the
  ground shadow showed under every bobbing art (Reward, Level up, Bedtime), now only `empty`; the
  float style dropped `transform` when `bob` turned off (Bedtime pause could keep the last tilt) and
  the loop kept running, now it stops and settles; `style` moved to the outermost view. Checked on web
  (`/alarms` empty state, no console errors).
- Same session (also from Gemini, uncommitted until 2026-10-15): scroll lists and bottom bars on ~25
  screens add `insets.bottom` (`Screen` pads only the top), so the last row clears the home indicator.

### 0d. 2026-10-13 — owner decisions after the audit (`docs/audit-2026-10-13.md`)

1. **Done (branch `fix/memory-crisis-guard`, merged into local-work 2026-10-13):** crisis text never becomes a
   lasting memory. `src/ai/memory-guard.ts` (pure) is used by `addMemory` (manual, plan and diary
   memories), by `addDiaryEntry` (a page with a crisis line anywhere leaves no memory) and on every
   load (`merge` drops crisis memories saved by older builds). The chat helpline card and reply are
   unchanged. `detectCrisis` now reads curly apostrophes (phone keyboards). Tests: `npm test`;
   test files are left out of the app `tsc` and typechecked with `npm run typecheck:test`
   (`tsconfig.test.json`, Node types only there).
2. **Next task, decided:** memory quality is the same on every plan. The Store copy that says
   otherwise is not changed yet; list the files and copy options first, then wait for approval.
3. **Next task, decided:** free users get no automatic real call. Propose a voice note from the
   free voice-line library (backend-plan §13.5) and list the functions and tests before coding.
4. Still open from the audit: backend-plan §4 vs §14.2 schema and the free-shell bucket (document
   separately); diary replies, board replies and voice transcripts do not check for crisis yet.

### 0e. 2026-10-13 — crisis text in plans, voice, board and diary (branch `fix/crisis-paths`)

Built on `fix/memory-crisis-guard`; merged into local-work 2026-10-13 after the owner tested it on the phone. Closes the crisis part of 0d item 4.
- Chat: a crisis message never becomes a plan ("I'm going to kill myself tomorrow" used to make a
  "Kill myself" plan with an 08:00 reminder push, a follow-up and a line on Us). Helpline card + warm
  reply as before.
- Voice transcript, board note, shared diary page and a plan added in Us: crisis text gets the
  helpline card (and a `crisisReplies` line) in that character's chat; board replies never quote
  it, diary replies no longer say "tell me the longer version", Us keeps no such plan.
- On load, `merge` drops crisis plans and their Us moments saved by older builds
  (`src/ai/crisis-guard.ts`); `receivePushLine` never writes a crisis push line into the chat.
  Pending OS pushes are cancelled on the next app open (`clearPushes`) and re-planned from the
  cleaned state; one planned before the fix can still fire if the app is not opened first.
- Open: a private crisis diary page (shared with nobody) gets no help (needs UI); the phrase list
  is English-only and narrow (Uzbek is not detected); no new UI or copy was added.

### 0f. 2026-10-13 — per-character chat art wallpapers

- Implemented locally on `feat/credit-plans` from the approved `design-prototypes/chat-backgrounds/` preview.
- The background picker keeps all six classic gradients and adds a separate Art collection with 30 original wallpapers; image captions are removed and selection stays per character through the existing relationship store.
- The picker previews the current wallpaper above the image-only grid. Chat art now covers the message list and composer area with a light readability veil; message behavior, header controls, and Today are unchanged.
- The 30 full-size source PNGs stay in the prototype wallpaper folder; the app uses visually checked JPEG copies in `assets/images/chat-wallpapers/` (about 6.1 MB total instead of 56.2 MB).
- `npx tsc --noEmit` passes; all 30 image files and accessibility labels are present. Metro responds on ports 8081 and 8082, but no phone is attached to this local session for a screenshot check.
- Committed on `feat/credit-plans` (e151cf8) and merged into local-work with the credit plans. Free-plan locks checked on web: call button and call screen open the Pro sheet, a message costs 1 shell and the reply is text only.

### 0j. 2026-10-13 — free plan memory limit (branch `feat/free-memory-limit`, merged into local-work)

- `src/economy/memory-limit.ts` (`FREE_MEMORY_LIMIT = 20`, `hasFullMemory`, `splitMemories`, tested) and
  the store selector `memoryAccess`. Pinned first, then the newest 20 stay open; the oldest lock first;
  locked memories stay saved and any plan or the trial opens them all.
- Memories screen (prototype https://claude.ai/artifact/CEexinhaHmUsATByxKJu7S, owner approved A+B):
  free users see "N of 20 open" with a bar on top, locked rows with no text at the end, and a bottom
  bar "Unlock with Basic"; a locked row or the bar opens the unlock sheet ("Get Basic — $9.99"). Checked
  on web with 23 memories: 20 open + 3 locked; after Basic all 23 open and the lock is gone.
- Not built: option C (a chat line when the 20 fill up). Server side (§15.10) must send only the open
  20 to the AI prompt.

### 0k. 2026-10-13 — Photo Booth is Pro only (branch `feat/photo-booth-pro`, merged into local-work)

- backend-plan §15.10: pictures come only from Pro's allowance (30 a period, 3 on the trial) and are
  never sold for shells. `takePhoto` returns `'locked'` without Pro or the trial and `'usedUp'` when the
  period's pictures are gone; no shells are spent. `photoQuota` (plans.ts, tested) gives left, total and
  the reset date.
- Screen (prototype https://claude.ai/artifact/WZQ6jJY8JzmqUQryg6az5N, approved): free and Basic see a
  "Pro" pill, a lock on "Take a photo" and "Comes with Pro"; the tap opens `PhotoPaywallSheet` (Pro
  offer, pictures first; starting the trial takes the picture). Pro sees pictures left in the header,
  "N of 30 left · Resets <date>" and, when used up, a disabled "Back on <date>". Store cost list: Photo
  Booth reads "With Pro". `photoBooth.closer` copy removed. `shellCosts.photoBooth` stays only for old
  ledger rows.
- Checked on web: Basic with 2,099 shells is locked; the trial shoots 3 and then waits; shells unchanged.

### 0l. 2026-10-13 — Bedtime is Pro only (branch `feat/bedtime-pro`, merged into local-work)

- Plans promised "Bedtime whispers every night" for Pro; it was open to everyone. Now `hasPro`
  (plans.ts, tested: Pro, Pro yearly or the trial; not Basic) gates "Sleep together".
- Free and Basic (prototype https://claude.ai/artifact/Y7D1uQBygDuRBJZEeg6RXi, approved): "Pro" pill in
  the header, a lock on the button, "Comes with Pro"; the tap opens `CallPaywallSheet` with
  `kind="bedtime"` (whisper sample, "Bedtime comes with Pro", Bedtime / calls / shells). Starting the
  trial starts the timer. Calls keep `kind="call"` (unchanged). Pro works as before and never uses the
  voice-reply minutes.
- Checked on web: free user locked; trial starts the timer; voice minutes stay at 0.
- Left from the Pro list: "New characters first".

### 0m. 2026-10-13 — New characters first (branch `feat/new-characters-first`, merged into local-work)

- There was no idea of a "new" character before. `Character.releasedAt` (official only; the server sets
  it when a character goes live). `src/economy/early-access.ts` (tested): not visible before release;
  Pro and the trial can add it from release day; everyone else after `EARLY_ACCESS_DAYS = 7` (owner
  approved); then it is an ordinary character.
- Mock: `c_hugo` released 2 days ago, `c_cole` 4 days ago (relative, so the row always shows).
- UI (prototype https://claude.ai/artifact/Eh1sTEJfUc7jPvy91w7Gn6, approved): Find "New" row on top
  (newest first); `CharacterCard` `fresh` prop: "Pro first" + lock on add, or "New" for Pro. World pages
  and the profile ("Pro first" line, lock on Add friend, "Pro now · everyone on <date>") share
  `useEarlyAccess` (`src/components/plans/early-access.tsx`). `PhotoPaywallSheet` became
  `ProPaywallSheet` (`kind: 'photo' | 'newCharacter'`).
- The gate is in the UI only; `addFriend` itself does not check. The server must refuse early adds.
- Checked on web: free user sees the lock and the sheet, nothing is added; the trial adds Cole and opens
  the chat; Pro sees "New".
- All Pro promises on the Plans tab now work.

### 0n. 2026-10-13 — remove the time-based Today heading

- Removed the top “Good morning / Good afternoon / Good evening / Still up?” greeting from Today, including its reserved spacing and unused locale strings. The hero and all Today content remain in place.

### 0. Sync the local folder first

```
cd C:\Users\joray\BIMOBIMO\rafti
git status                      # package-lock.json may be modified locally: not the user's, discard it
git checkout -- package-lock.json
git fetch origin
git checkout local-work
git pull origin local-work
npm install
npx tsc --noEmit                # must be clean
```

`../rafti-research` (branch `claude/bimobimo-teardown`) has the BIMOBIMO teardown; its
`AGENT-START.md` section 6 is out of date (says F9) — this file wins.

### 0c. 2026-10-12 — story continuity builder (branch `strategy/story-continuity-v1`)

- ChatGPT wrote a product strategy, an architecture note and `src/lib/story-continuity.ts` on an old
  base; the branch is now rebased onto `local-work`. Approved decisions (business-plan, backend-plan
  §13–§15) win over the ChatGPT strategy; a precedence note sits at its top.
- The builder is pure and not wired anywhere: mock replies are unchanged and stay mock.
  It follows backend-plan §7/§12.1–12.3 (30 messages, all pinned facts, 8–12 relevant active facts,
  0.6/0.3/0.1 ranking, only active facts). `MemoryItem` got optional `type`, `importance`, `status`
  and `supersededBy` for that; extraction and archiving stay server work (12.1-12.2).
- Tests: `npm test` (Node's built-in `node:test`, no new packages; `scripts/ts-test-hooks.mjs`
  resolves `.ts` imports). 16 tests cover determinism, limits, other characters' memories, dedup,
  pinned facts, low-information messages, bad dates, URIs, app-only rows and the consent note.
  Test files are left out of the app `tsc`; `npm run typecheck:test` checks them (`tsconfig.test.json`).
- Merged into `local-work` on 2026-10-13 (queue item 6).

### 0a. Session 2026-10-09 (cloud) — backend plan additions, docs only

- The user shared `rafti_codex_ready.zip` (Codex, 2026-10-08): the code in it equals old `main`
  (16 characters); only a context pack of docs was new. Its own `AGENTS.md` was NOT taken (ours wins).
- `docs/backend-plan.md` §12 now holds the 6 new ideas from that pack, adapted to the current app
  (40 characters, Closeness v2): memory type/importance, memory lifecycle (superseded facts),
  structured persona JSON, relationship event stream, a prompt block per mode, a mock LLM provider.
  Plus 6 of ours: repetition guard, batching quick user messages, `memory_uses`, per-user daily cost
  cap, an eval set with prompt versions, memory privacy and "forget this". §4 and §11 updated to match.
- No code or design touched. Backend is still "not now" (see 0b); the plan waits for the user.
- `docs/audit-2026-10-09.md` (Uzbek, the user asked for it): audit of `src/` at `0b63fd5` —
  architecture, mock AI flow, LLM seams, memory, relationship, voice/call, economy, top 10
  production risks. Two small bugs found there are not fixed yet: Android back on the call
  screen skips `hangUp` (call time not charged) and diary pages / comeback pushes can quote a
  crisis message.
- `docs/backend-plan.md` §13 (user's direction): unit economics on 2027 prices, new plan limits
  (calls 60/150/180 min, voice replies 30/90/120 min, no live voice for free users, 3-day store
  trial instead of the 15-minute call trial), free tier ~40 shells/day with country-based ad
  rewards, invisible per-message model routing that is the same on every plan (users never see
  model names or tiers), and in-app conversion moments. Approved on 2026-10-09 (§15, items 5–6);
  no code changed.
- Later the same day the user handed over the founder role ("choose the business model, build it end to
  end"). Done:
  - `docs/business-plan.md` (Uzbek): market, competitors, positioning, subscription-first revenue,
    launch order (CA/AU/NZ → US/UK → CIS via Telegram), payouts and legal entity from Uzbekistan,
    break-even model, KPIs, compliance (NY GBL 47, CA SB 243, age laws), roadmap with B3 (payments)
    moved before B2.
  - `docs/backend-plan.md` §14 explains how plans and limits work in the backend and the UI; §15 holds
    the decisions. A yearly plan ($79.99, Basic limits) was added as a founder decision.
  - Prototype of the plan screens for approval (Design canvas, 6 artboards):
    https://claude.ai/artifact/7efEmQx5jBq6YvhJF2dzpv. Do not build these screens before the user
    approves them.
  - Fixed: diary pages and comeback pushes no longer quote a crisis message (a heavy day gets a gentle
    page with no quote); the call screen books the time talked however it closes (Android back
    included); creating a character charges the 60-shell voice clone only when the character is
    actually made, and leaving the screen cancels it.
  - Next: B0 once the user opens the accounts (§15.4) and makes the repo private.
- The user approved the prototype and the screens are now built (F17 "Plans and limits", done):
  - Rules live in `src/economy/plans.ts` (pure, server-portable): plans, the 3-day trial, periods,
    minutes (plan first, then packs bought with shells; packs last 90 days; no rollover), fair use
    300 messages a day. The store wallet keeps a mock `subscription` and `packs`; Membership and the
    call-time balance are gone (persist v7 moves a running membership to the same plan from today).
  - Store: Plans / Shells tabs (`/store/shell?tab=shells&plan=pro`), Basic with Monthly / 3 months /
    Yearly, Pro, fine print, Restore; a one-time starter pack (300 for $0.99) until the first purchase.
  - `src/app/my-plan.tsx` (Profile → My plan): member, trial and free views, minutes left with bars,
    top-ups (10 min calls 120 shells, 10 min voice 100), manage and restore. Dev builds: Profile →
    Developer → End plan.
  - Sheets in `src/components/plans/`: free user's call sheet (mock 6-second voice sample, trial
    starts the call), out-of-minutes sheet (before a call, and mid-call where adding minutes
    resumes it). Out-of-shells sheet redone with three equal ways on (ad or spin, shells, Basic).
  - Chat: "AI character" under the name, the "{name} is an AI character, not a real person." line at
    session start and every 3 hours, voice replies only with plan minutes (a once-a-day note links
    to My plan when they run out), fair-use line and a locked composer until 00:00. Call screen:
    "N min left" pill from 2 minutes.
  - Checked on web at 375×812 (screens, trial → call, top-up → resume, paywall → store, v6 → v7
    migration). Purchases are mocked: real builds plug StoreKit / Play Billing (RevenueCat) into
    `subscribe`, `topUpMinutes` and `addShells` (backend-plan §14).
- The user liked the F17 look and made it the design method for the whole app: `docs/design-style.md`
  (rule added to `AGENTS.md`). Backend waits; first the frontend flows are fixed and older screens
  are brought to this style. `docs/design-audit.md` grades every screen (fits / small / medium /
  approved) and gives the order: shared pieces first, then the daily check-in as a sheet on Today,
  then the "medium" screens one by one with a prototype each. Approved screens only on request.
- Codex review on PR #4 (owner agreed 2026-10-09): a new install now starts empty (no sample chats,
  bonds, diary pages or calls; 0 shells until the welcome gift), with only the friend picked in
  onboarding. Development builds: Profile → Developer → "Load sample chats" adds the old sample
  history. Leaving a paid date ends it (`leaveDate`); blocking drops pending board replies. Real-person
  photo checks wait for server moderation (backend plan), not the client.
- Calm cards step 1 built (prototype approved: https://claude.ai/artifact/LBoVbxLo3LkBedbjmGPQTf):
  Character settings, Profile, History, Radio and Find now follow `docs/design-style.md`
  (`SectionLabel tone="section"`, line icons in 36px grey tiles, white cards with 1px borders,
  `Segmented` for tabs, ink selection). Profile drops the invite-code card ("Invite +50" sits on the
  Free gifts row; the code lives on Free gifts). Find: who-to-show button beside search, one chip
  row of worlds, four characters per world with "See all". The daily check-in sheet was redesigned
  and moved to Today, then the owner asked for no popup at all: check-in shells now arrive quietly
  (`claimDailyLogin` no longer sets `dailyReward`; set it again to bring the sheet back).

- Calm cards step 2 (2026-10-10, Desktop; the user said to go on in the same style without a new
  prototype): Memories (no header subtitle), Edit profile (h3 sections, white "+" chip, ink meter and
  camera badge, bordered About box), Secret note (no header avatar, h3 "Your note", white action bar),
  Board (line "+" icon button, `bgPlain`), Our dates (`bgPlain`). `EmptyState` uses a `secondary`
  button and the new empty-state art: the user asked to replace Rafti's empty box, so Rafti now
  listens to a seashell (Higgsfield, grok-imagine-image-2.0, 1 image ≈ $0.08; raw in
  `../BIMOBIMOdesignraw/empty_state.png/rafti-empty-shell.jpg`, cut with `key_out`). Next: the
  "medium" screens, Free gifts first, each with a prototype.

- Free gifts restyled (2026-10-10, prototype approved: https://claude.ai/artifact/ACXhyT5n4RFKXy5jsFCvr2):
  `src/app/gifts.tsx`. Check-in days sit in one white card; the wheel (and its spin animation) is
  unchanged, with a status pill ("1 free spin" / "Watch to spin" / "Back tomorrow"); video, share
  and invite are equal rows with secondary buttons in one "More shells" box, so the sticky ad bar
  and the big orange Invite button are gone (the wheel's Spin is the one orange control). Invite
  code row with copy, then "Have a code?". `ShellBadge tone="neutral"` is the grey header pill.
  Next "medium" screen: Create character (prototype first).

- Create character restyled (2026-10-10, prototype approved: https://claude.ai/artifact/39JVNxjNiCZkVHP8cvTgDb):
  only the look of `src/app/create-character.tsx` changed (state, checks, charging and edit mode are
  as before). Sections with h3 titles, sub-field labels in grey, no red asterisks (the error line in
  the action bar names what is missing), chips grey → white with a 2px ink border when chosen, ink
  checkboxes, line camera / mic icons instead of clay art, `Segmented` for stock vs cloned voice,
  bottom action bar (error, Create button, "Only you can see them" / review note).
  Next "medium" screen: Contacts (prototype first).

- Contacts restyled (2026-10-10, prototype approved: https://claude.ai/artifact/NHyErhmApd5hygWMjFGGjE):
  `src/app/contacts.tsx` is a list now, closest first (level, then intimacy), with `Segmented`
  All / Created by you and a "Create a character" row on top; the empty "Created by you" tab
  offers Create instead of Find. The owner said to leave the Create character button as it is
  (it does not look dimmed on an empty form; not touched). Next "medium" screen: Photo Booth.

- Photo Booth restyled (2026-10-10, prototype approved: https://claude.ai/artifact/CuA2RSMFXEjpDmWW9U1ER3):
  white preview card (portrait on grey, "You & Name", style), With (avatars with names, ink ring),
  Style as 2×2 option buttons, "Your photos" after the first shot, action bar "Take a photo · 8".
  The header shows the shell balance; the film count was shown but never spent, so it is gone.
  Still a mock: no image is generated, the style is not sent anywhere, shots vanish when the
  screen closes; a shot spends 8 shells, adds 6 closeness and a photo moment on Us. A real build
  needs an image model and a saved gallery (backend). Next "medium" screen: Bedtime.

- Bedtime restyled (2026-10-10, prototype approved: https://claude.ai/artifact/HQ2SXLrXx9SLpCPAeb5yMP):
  the night canvas stays; header has no subtitle; under the scene a status line ("Sleep with Kai"
  or the running clock with "Kai is whispering"); Who (avatars with names, white ring) and Sleep
  timer (5 equal buttons) as h3 sections; action bar with Sleep together / Stop (secondary) and a
  line on when it stops. Still a mock: free, no audio plays, the timer just counts down; real
  builds stream a whisper track with expo-audio (backend voices). With this, every "medium" screen
  in `docs/design-audit.md` follows the calm-cards style; only the approved screens differ, and
  they change only when the owner asks.

- App-flow prototype (11 screens, 2026-10-10): https://claude.ai/artifact/JTwiRZbdTJtV3czQF3ahdi.
  The owner approved only three screens for code, "touch nothing else, keep the logic":
  onboarding "meet" step (2x2 select cards; `src/app/onboarding.tsx`, other steps and the progress
  bar untouched), Chats tab (search opens from the magnifier, pencil goes to Find, ink unread
  count drawn locally; shared `CountBadge` unchanged), Find tab (48px apricot create button,
  `Segmented` Everyone / Him / Her replacing the cycling button, local world chips, portrait cards
  per world; `CharacterRow` is still used by the world page). Search, filters, blocked list, add
  friend, "See all" and routes work as before. The rest of the prototype (Today, Me tab instead of
  Us, chat "+" Do together, Kai's space) waits for the owner.

- World page (2026-10-10): `src/app/world/[series].tsx` now uses the Find portrait cards. The card
  moved to `src/components/character-card.tsx` (`CharacterCard`, `CARD_GAP`) and Find imports it;
  behaviour is unchanged (filters, blocked list, add friend, profile route, counts). The unused
  `CharacterRow` was deleted. Edits are written one whole file at a time because the owner's phone
  hot-reloads every save (a split edit once showed "HeaderIcon doesn't exist" until a reload).

- Notifications, dating map and diary (2026-10-10, prototype https://claude.ai/artifact/3hXyMMNHVDaa6v9SpDt4RQ;
  owner: N1, N2, D1, H1-H4 "1:1, keep the logic"; D2-D4 untouched):
  - N1 `src/app/notifications/index.tsx`: an inbox, nothing new recorded. `src/lib/inbox.ts`
    (`buildInbox`, pure) reads character diary pages, missed incoming calls, plans whose reminder
    went out, level-up moments, answered board notes and today's unused free spin (last 14 days).
    Store: `inboxSeenAt` (persisted, null on new installs) + `markInboxSeen()`; unread = newer than it.
    Rows open the diary page, the chat, Us, the profile, the board or Gifts.
  - N2 `src/app/notifications/settings.tsx` (was `src/app/notifications.tsx`): same switches and
    quiet-hour logic; line icons, one-line hints, From/Until buttons; `LockPreview` is a grey card.
  - D1 `src/app/dating.tsx`: white place cards (art on tint, lock badge, price or level), partner
    pill with level, white action bar. Partner sheet, place sheet, paywall and rounds unchanged;
    Rooftop moved to x 0.24 so cards do not overlap.
  - H1 `src/app/diary/index.tsx`: same cards/sort/calendar logic; covers lean ±7° and fade, arrows
    step through them, grey date pill with calendar icon, My diary uses the diary cover art, action
    bar. The blurred backdrop behind the carousel was removed to match the prototype.
  - H2 diary page: own header with avatar, round pager, ruled paper with date, mint mood and
    signature, "Chat with X" + source line. The page's info button was dropped (rules live on H1).
  - H3 diary write: everything inline (mood chips, ruled handwriting paper, B/U/S/I and photos,
    "Who can read it?" row, Save in the action bar); the save sheet is gone, empty Save still leaves.
  - H4 `DiaryRulesSheet`: sticker, "How the diary works", three steps in one box, Got it.
  - Typed routes: after moving `notifications.tsx` into a folder the running Metro kept writing a
    stale `.expo/types/router.d.ts` (`/notifications/index`). Restart Metro (`npx expo start -c`)
    if tsc complains about `/notifications`.

### 0f. 2026-10-13 — Plans tab: same memory on every plan (branch `fix/plans-memory-copy`)

- Owner decision (backend-plan §15.8): memory quality is the same on every plan; paid plans add only
  call and voice minutes. Preview approved, then built in `src/components/plans/plan-picker.tsx` and
  `en.json`: the Plans subtitle reads "Every plan gets the same memory quality. Paid plans add call and
  voice minutes."; "Remembers everything you share" (Basic) and "Deepest memory" (Pro) are gone, keys
  `plans.remembers` / `plans.deepestMemory` deleted. Nothing else on the screen changed.
- Checked on web at 375×812 against the approved preview; merged into local-work 2026-10-13.

### 0g. 2026-10-13 — free users get a voice note, not a call (branch `feat/free-voice-note`)

- Owner decision 3 (prototype approved): without a plan or trial nothing rings. `canRing` in
  `src/economy/plans.ts` (tested). `runDailyInitiative` leaves the caller's voice note + its text in
  their chat instead (line from the greeting lists, never the same as that friend's text greeting);
  the push planner sends "sent you a voice note" (`voiceNote` kind, messages channel, not
  time-sensitive) instead of "Incoming call"; Notification settings call rows read "Good-morning /
  Good-night voice note" for free users. Plan and trial users: unchanged.
- Correction to the audit (B9): `ring()` already refused users with no call minutes, so free users were
  never rung in the app; the real problem was the "Incoming call" push that led to nothing.
- Checked on web: free → voice note in chat, no ring; Basic → `/call/incoming/<id>`, no voice note.

### 0h. 2026-10-13 — all free shells burn at midnight (branch `feat/free-shells-expire`)

- Owner decision (backend-plan §15.9): check-in, wheel, ads, share and invite go into today's free bucket
  (`creditFree`, `src/economy/shells.ts`, tested) and burn to zero at midnight (`expireFreeShells`,
  unchanged). Bought shells and the one-time welcome gift (100) never expire. BIMOBIMO has no shell welcome
  gift (only +15 call minutes, teardown #8). History copy: "Free shells are spent first…".
- Checked on web: 150 free → 0 after midnight; 500 with 100 free → 400.
- Open: memory on the free plan (owner leans to none; see the 2026-10-13 chat).

### 0i. 2026-10-13 — credit model and the new plans (built on branch `feat/credit-plans`, not merged)

- backend-plan §15.10–12: every message costs 1 shell for everyone (no unlimited chat); plans are Basic
  monthly $9.99 (2,000 shells/mo, full memory, chat only), Pro monthly $29.99 and Pro yearly $239.99
  (5,000 shells/mo, 3 h calls, 2 h voice, 30 photos, Bedtime, new characters first). Basic yearly and
  Quarterly go. Plan shells arrive monthly and never burn. Free plan: 20 memories per character, the rest
  locked. Later: web checkout (US first) and higher local prices where tax is inside the price (AU/NZ/UK/EU).
- Next build: `src/economy/plans.ts` (plans, monthly shell grants, Pro quotas), message charge for members,
  memory limit + lock card, Plans tab per the approved prototype.

### 0b. Session 2026-10-07 evening (Desktop) — done and waiting

User's answers to the options: 1 Backend = **not now** (frontend design not finished);
2 Edit character = **done**; 3 fixes = **done** (clean, in the shared component);
4 Push = **research + plan written, waiting for approval**; plus the Today card must follow
the last conversation = **done**.

- Today hero: the character you last wrote to / spoke with on a call (`lastTalkedAt`,
  `featuredFriend`); rules and the chain in `docs/today-hero.md`. 24 characters have no wide
  scene yet: ready prompts in `docs/nano-banana-heroes.md` (user makes them in Nano Banana).
- Edit character: Settings → Edit character (own creations only) → `/create-character?id=`.
  Not clicked through with a real photo on web (the web image picker could not be fed in the
  test); validation, prefill and the not-found guard were checked.
- Fixed: `EmptyState compact` collapsed on web (`flex: 0` → `flex-basis: 0%`), which made the
  mascot overlap the History card; History call tab no longer shows the shells hint.
- Push **built** (F16, local notifications): user chose 8 a day, stop after day 14, text hidden by
  default; support e-mail stays a mock. How it works and what is left: `docs/push-plan.md` §6.
  The user tests on the phone in parallel. Note: after `npx expo install`, the first web bundle
  took minutes; restart the dev server if the page stays blank.
- Profile → Notifications screen built from the approved prototype (artifact
  https://claude.ai/artifact/1Zm9bcWHmJ1XXNr8kCtypx). Gemini is building the Android dev build
  (`docs/agent-tasks/android-dev-build.md`; its result goes at the end of that file).
- Hero scenes: all 40 characters have one. Unused renders sit untracked in
  `assets/raw/heroes-review/` and `assets/raw/heroes-rejected/` (the user's to keep or delete).
- Home reordered at the user's request (2026-10-07): Today card → 10 module icons (4 columns,
  large clay art on the bare canvas, no label) → Chats → Today rows → Daily gift. Logic unchanged.
- Home below the icons made minimal (2026-10-07, user's request): Chats and Today as bold `h2`
  headings in ink (`SectionLabel tone="title"`), plain rows on the canvas with no card, no lines,
  no grey tiles (`ListRow size="large"`, clay art `tile={false}`). The Daily gift card left Home
  (deleted; the gift claims itself on launch and the 7-day ladder lives on Gifts, whose icon gets a
  dot while today's gift waits). Today lists only plans still ahead, soonest first.
- **House style since 2026-10-07 (user's wish, "ChatGPT-like"):** no cards, shadows or divider
  lines on screens; sections get bold ink headings (`SectionLabel tone="title"`), rows are
  `ListRow size="large"` on the bare canvas, icons bare (`ClayIcon tile={false}`, `IconTile
  background="transparent"`). Done: Today, Chats, Find, world list, Us, Profile, character profile
  and settings, Store (pack/plan cards keep a thin border: they are choices). Not touched: Diary,
  Onboarding (approved), the chat thread, sheets.
- Next candidates: the notification image
  (portrait), hero scenes when the user sends them (`docs/nano-banana-heroes.md`).

### 1. DONE (2026-10-07, Desktop): the 23 character portraits are wired in

All 40 characters now have a portrait (`assets/avatars/c_<id>.png`, raws in
`assets/raw/avatars/c_<id>.jpg`); checked in Find, a world list and a profile at 375x812.
Nadia had two takes; the user picked `802fb1e0…` (the unused one stays untracked in
`assets/images/`). Next: offer the section 2 options below (and, optionally, hero scenes).

The original instructions, kept for reference:

The user has **finished all portraits in Nano Banana** and will hand them over (in chat or as files).

1. Each portrait goes to `assets/raw/avatars/c_<id>.png` (or `.jpg`). Ids, in the order of
   `docs/nano-banana-portraits.md`: c_jun, c_noah, c_tessa, c_felix, c_vesper, c_rhys, c_lyra,
   c_kael, c_orin, c_corvin, c_haze, c_rio, c_dex, c_ari, c_juno, c_cass, c_marco, c_ivy,
   c_gideon, c_ren, c_hugo, c_nadia, c_cole. (c_rowan is already in.) If the user sends files
   with other names, match them by the face/description in `docs/characters-plan.md` and ask
   when unsure — never guess silently.
2. Look at each image before using it: an adult, not Kai's face, no text or logo. Report any that
   look off and ask for a redo instead of shipping it.
3. `python scripts/build-brand-art.py characters` — crops to 512px squares into
   `assets/avatars/c_<id>.png` and rewrites `assets/avatars/registry.ts` from what is in
   `assets/avatars/` (the existing 17 stay). Commit the raw files too.
4. `npx tsc --noEmit`, then `npx expo start --web` (`.claude/launch.json` → `bimobimo-web`,
   375×812): check Find (all four worlds, Everyone / Him / Her) and a character profile.
5. Update `docs/characters-plan.md` status, a line here, commit and push to `local-work`
   (standing permission), tell the user in Uzbek what was done.

Optional after that: hero scenes (16:9, Today card). The prompt is in `docs/characters-plan.md`
("Shared hero scene prompt" + each character's `{PLACE}`); attach the character's new portrait
plus `assets/heroes/c_sol.jpg`. Files go to `assets/raw/heroes/c_<id>.png`, same build command.
Not asked for yet — offer, don't do.

### 2. Then offer the user these, in this order (they choose)

1. **Backend** — the real AI (Claude API), moderation and voices. Plan: `docs/backend-plan.md`
   (Uzbek); open decisions in its section 12, first one: which Claude model for chat.
   Character rules for the model are ready in `src/ai/rules.ts`.
2. **Edit a created character** (F15 follow-up): there is no edit screen yet.
3. Small fixes: History "Call time" empty state — the mascot overlaps the rule card
   (`src/app/store/ledger.tsx`); the support address `SUPPORT_EMAIL` in `src/ai/safety.ts` is a
   placeholder — ask the user for the real one.
4. Push notifications (`expo-notifications` is not installed; reminders, birthday wishes and
   morning messages only arrive while the app is open).

### 3. What exists now (all on `local-work`)

- Flows F1-F15 done: `docs/flows.md`.
- Cast: 40 originals, 10 per world, `gender` on every character, Find filter Everyone / Him / Her
  (`src/mock/characters.ts`, `docs/characters-plan.md`; faces are a global mix by the user's decision).
- 18+ content rules approved: `docs/content-policy.md` (human) and `src/ai/rules.ts` (model).
  Built: Report in chat, Block (character settings) / Unblock (Profile → Blocked), helpline card
  after crisis messages (`src/ai/safety.ts`), "AI" mark on profiles, Profile → Support.
- F15 create character: traits, speaking style, role, stock or cloned voice, 18+ and rights checks
  (`src/app/create-character.tsx`, `src/lib/create-character.ts`).
- 3D clay icons: four sheets wired everywhere listed in `docs/icons-3d.md`.
- Build script: `python scripts/build-brand-art.py icons | characters` (cloud-friendly modes).

### 4. Gotchas

- Metro sometimes serves an old bundle after edits: stop the server and start it with `--clear`
  (on Windows also delete `%TEMP%\metro-cache` and `%TEMP%\metro-file-map-*`).
- Expo typed routes can go stale and break `tsc`: delete `.expo/types/router.d.ts` and restart.
- Approved screens are not to be redesigned (Diary, Onboarding, Home).
- Android Expo Go cannot run `expo-notifications` (throws on import). Never import it at the top
  level; use `notificationsModule()` from `src/notifications/native.ts`. Real push testing needs a
  development build (`npx expo run:android` over USB; the Android SDK is installed on this PC).

---

## Cloud session log (2026-10-07) — details of what was built

### Earlier top block (kept for detail)
Foydalanuvchi lokal Claude Desktop'dan (Windows, `C:\Users\joray\BIMOBIMO`) **bulutdagi Claude Code**'ga o'tdi.
Ish **chalg'imasdan** shu tartibda davom etadi. Lokal xotiradagi qoidalar ham shu faylga ko'chirildi
(pastdagi "Foydalanuvchi afzalliklari" bo'limi), boshqa joyga qarash shart emas.

1. **F1-F14 tayyor (F14 Profil 2026-10-07, bulut sessiyasida).** Holat jadvali va tartib: [`docs/flows.md`](docs/flows.md).
   3D ikonkalar 2-, 3- va 4-to'plami ulandi. Personajlar katalogi (b): 40 ta personaj kodda, portretlar
   kutilmoqda (Rowan sinovi birinchi). Pastdagi 4-bandga qarang.
2. **Har bir F oqimini qurish tartibi** (shu tarzda ishlandi, foydalanuvchiga yoqdi):
   1. `docs/flows.md` dagi BIMOBIMO `#N` skrinshotlarini oching (`../rafti-research/`, indeks
      `teardown/screens.md`). Faqat shu oqimnikini oching, 133 tasini emas.
   2. Ilovadagi mavjud kodni ko'ring, nima bor va nima yo'qligini ajrating.
   3. Butunlay yangi ekran bo'lsa, avval HTML prototip (claude.ai Artifact) ko'rsating va tasdiq oling.
      Mavjud ekranni kengaytirish bo'lsa, to'g'ridan-to'g'ri kodga ruxsat bor ("next" = davom et).
   4. Kod yozing. Mantiq zanjirga ulanadi: oqim avvalgi va keyingi oqimga ta'sir qiladi
      (chat → kundalik, uchrashuv → yaqinlik + ertasi kundalik, reja → eslatma, ulashish → +6).
   5. `npx tsc --noEmit` toza o'tadi; `npx expo start --web` va brauzerda 375×812 tekshiriladi.
   6. Bu faylga qisqa yozuv, `docs/flows.md` holatini yangilang.
   7. `local-work` ga commit va push (foydalanuvchi har tugagan oqim uchun doimiy ruxsat bergan).
   8. Foydalanuvchiga o'zbekcha, qisqa: nima qilindi, BIMOBIMO'dan farqi, keyingi qadam.
3. **F14 Profil — kodda tayyor** (BIMOBIMO #130, #131, #133). Foydalanuvchi "to'liq tayyorla" dedi, prototipsiz qurildi:
   - `src/app/profile.tsx`: katta avatar va ism, "Edit profile" kartasi foiz chizig'i bilan, taklif kodi kartasi
     (nusxa + "+50 ›" → Free gifts, u yerda qoidalar va "Have a code?"), Account: Membership, Free gifts;
     til qatori faqat 2+ til bo'lsa ko'rinadi; eng pastda "Delete account" → markaziy tasdiq oynasi →
     `deleteAccount()` store'ni boshlang'ich holatga qaytaradi (`getInitialState`) va `/onboarding` ga o'tadi
     (server hisobni keyin o'chiradi);
   - `src/app/edit-profile.tsx`: rasm (image picker, 2 MB gacha), Name, Pronouns, Birthday (oy+kun; yil 18+
     javobidan, o'zgarmaydi), Job, Interests (24 tadan 10 tagacha), About me (150). Har qator o'z sheet'ida
     saqlanadi, "Save changes" yo'q. Sheet'lar: `src/components/profile/field-sheets.tsx`, foiz chizig'i
     `completion-meter.tsx`, qoidalar va ro'yxat `src/lib/profile.ts` (`profileCompletion`: 7 qism);
   - zanjir: tug'ilgan kunda ertalab (7:00 dan) eng yaqin 3 do'st tabrik yozadi, yiliga bir marta
     (`birthdayLines`, `user.birthdayWishedYear`); erkin javoblarning ~20% qiziqishlardan biri haqida savol bilan
     tugaydi (`interestLines`). Server AI bo'lganda profil promptga beriladi.
   - Bulutda Metro fayl o'zgarishini ko'rmay qolishi mumkin: `npx expo start --web --clear` bilan qayta ishga tushiring.
4. **Ochiq ishlar (foydalanuvchi bilan kelishilgan, unutmang):**
   - **3D clay ikonkalar — 2-to'plam ulandi (2026-10-07):** `assets/raw/icons-3d-sheet-2.jpg` (sovg'a, do'kon,
     do'stlar, radio, igna, oy, kamera, kalendar, lupa, kompas, nota, qulf). Skript endi bir nechta varaqni
     o'qiydi (`ICON_SHEETS`). Ulangan joylar: Home Explore (10 tasi), Home Today qatorlari, Us "+" va momentlar,
     Free gifts, Profil "They reach out"; `ClayIcon` ga `dot` va `radius` qo'shildi. 3-to'plam ham ulandi
     (`icons-3d-sheet-3.jpg`): Date xaritasi, quiz to'plamlari, quyosh (ertalab), samolyot (ulashish), uchqunlar
     (tanishuv), yurak-strelka (daraja). Mock'larda `emoji` o'rniga `icon: ClayIconName`. 4-to'plam ham ulandi
     (`icons-3d-sheet-4.jpg`, keng varaq; shisha ikonkalar `GLASS_ICONS` bilan kesiladi): Radio, foto budka,
     Contacts "Add one", "Our dates", xotiralar, personaj sozlamalari, Daily calls, quiz natijasi, History "Call
     time", bo'sh chatlar (`EmptyState icon`). Hammasi: [`docs/icons-3d.md`](docs/icons-3d.md).
   - Ko'rildi, tuzatilmagan: History "Call time" bo'sh holatida maskot rasmi tepadagi qoida kartasiga tegib turadi.
   - **Personajlar katalogi** (foydalanuvchi so'ragan, 2026-10-07): BIMOBIMO'dagi real idol/franchise personajlar
     bizda TAQIQ (huquq va App Store xavfi). Katalog ikki yo'l bilan o'sadi: (a) F15 da foydalanuvchi
     personajlarini "hammaga ochiq" qilish + moderatsiya + shikoyat; (b) Rafti original personajlarini 16 → ~50 ga
     oshirish (har dunyoda 8-10), rasmlarni foydalanuvchi Nano Banana'da chizadi, bio'ni agent yozadi.
     **(b) tanlandi va kodda (2026-10-07):** 24 yangi personaj, har dunyo 10 tadan, jami 40
     (`src/mock/characters.ts`, reja va promptlar `docs/characters-plan.md`). `Character.gender` qo'shildi, Find'da
     Everyone / Him / Her filtri (BIMOBIMO'da bunday filtr yo'q, katalogi deyarli faqat erkaklar).
     Rasmlar kutilmoqda: birinchi sinovda bo'sh `{...}` li umumiy prompt ikki namuna bilan berilib, Kai chiqdi —
     endi tayyor promptlar bor (portretga faqat `c_kai.png`, sahnaga yangi portret + `c_sol.jpg`).
     Rasm kelganda: `assets/raw/avatars/c_<id>.png|jpg` (sahna: `assets/raw/heroes/`) ga qo'ying va
     `python scripts/build-brand-art.py characters` — portret 512px bo'lib `assets/avatars/` ga tushadi, registry
     o'zi yangilanadi. Rowan (`c_rowan`) birinchi bo'lib ulandi, sinov muvaffaqiyatli.
   - **Kontent qoidalari (18+):** [`docs/content-policy.md`](docs/content-policy.md) — ochiq, lekin chegaralari bor
     (romantika va kuchli xarakterlar ha; aniq jinsiy kontent "fade to black", voyaga yetmaganlar, real odamlar,
     zo'ravonlikni romantika qilish yo'q). Foydalanuvchi tasdiqladi va qurildi
     (2026-10-07): chatda Report (sabablar oynasi, `reports`), personaj sozlamalarida Block (bog'lanishni o'chiradi,
     Find'dan yashiradi; Profil → Blocked'da qaytarish), Profil → Support (`SUPPORT_EMAIL` — vaqtinchalik manzil,
     haqiqiysini qo'yish kerak), inqiroz xabaridan keyin yordam liniyasi kartasi (`src/ai/safety.ts`), profilda "AI"
     belgisi. LLM uchun qoidalar: `src/ai/rules.ts` (server keyin system promptga qo'yadi + moderatsiya).
   - **F15 Personaj yaratish — kodda tayyor (2026-10-07):** `src/app/create-character.tsx` qayta qurildi. BIMOBIMO
     tuzilmasi (rasm, ovoz klipi, tavsif, salom, ko'rinish) + standart (Character.AI/Talkie): xarakter belgilari (5 tagacha),
     gapirish uslubi, munosabat turi, tayyor ovoz (bepul) yoki klon (60 chig'anoq + rozilik belgisi), rasm huquqi
     belgisi, yosh 18+ majburiy. `checkCreation` (`src/lib/create-character.ts`): voyaga yetmagan va aniq jinsiy
     so'zlarni rad etadi; asosiy moderatsiya serverda. Ommaviy personaj `review: 'pending'` (profilda "Public after
     review"). Yangi `Character` maydonlari: `age`, `speakingStyle`, `role`, `voicePreset`, `visibility`, `review` —
     `buildCharacterPrompt` ularni ishlatadi. Keyin: tahrirlash, rasmni AI bilan chizish (server), tayyor ovozlarni
     tinglash (TTS bo'lganda).
   - **Yuzlar (foydalanuvchi qarori):** global ilova, har dunyoda turli kelib chiqish; har bir portret promptida
     kelib chiqish yozilgan (`docs/characters-plan.md`).
   - **Til qoidasi (foydalanuvchi, 2026-10-07):** kod, izohlar, commitlar va agentlar uchun hujjatlar faqat ingliz
     tilida (AGENTS.md ga yozildi). Foydalanuvchiga javob o'zbekcha.
   - Push bildirishnomalar yo'q (`expo-notifications` o'rnatilmagan): reja eslatmalari hozircha faqat chatda.
5. **Dizayn qoidalari** (2026-10-09 dan asosiy uslub: `docs/design-style.md`): interfeys faqat ingliz tilida; oddiy, zamonaviy minimal; matn minimal (sarlavha, raqam,
   ikonka — tushuntirish matnlari yo'q); asosiy matnlar katta va qalin (`src/theme/typography.ts`); bitta asosiy
   to'q sariq tugma; mint faqat munosabat uchun; tasdiqlangan ekranlarni (Diary, Onboarding, Home) qayta chizmang.
   Yozish maydoni bor sheet'larda `Sheet avoidKeyboard`, maydonga `autoFocus` qo'ymang.
6. **Muhit (bulut):**
   - Repo: `muhammad571634/rafti` (public), branch **`local-work`**. Strategiya hujjatlari: private
     `muhammad571634/rafti-research`, branch `claude/bimobimo-teardown` — repo yonidagi `../rafti-research/` ga
     klon qilinadi (agar ruxsat bo'lmasa, foydalanuvchidan GitHub kirishini so'rang). `#100`, `#102-#133`
     skrinshotlari `muhammad571634/rafti-research-2` da.
   - Expo typed routes ba'zan eskirib `tsc` yiqiladi (`/board/index` yoki yangi marshrut ko'rinmaydi): dev serverni
     to'xtatib, Metro keshi (`$TMPDIR/metro-cache`, `metro-file-map-*`) va `.expo/types/router.d.ts` ni o'chirib,
     qayta ishga tushiring. Marshrutga o'tishda `{ pathname: '/x/[id]', params }` shakli bunga chidamliroq.
   - `package-lock.json` lokalda o'zgargan holda qolgan edi, commit qilinmagan (foydalanuvchiniki emas, tegmang).

## Foydalanuvchi afzalliklari (lokal xotiradan ko'chirildi, 2026-10-07)
- **Animatsiya:** popup/sheet'lar animatsiyasiz darhol chiqadi; yozyapti nuqtalari, ovoz to'lqini va boshqa
  harakatlar qoladi. "Animatsiyani o'zgartir" desa — faqat ko'rsatilganini o'zgartiring, qolganini so'rang.
- **Minimal matn:** ekranlarda faqat sarlavha, ism, raqam, ikonka. Qoida tushuntirish kerak bo'lsa — ikonka
  ortidagi info sheet'da, qisqa. Tugma matnlari qisqa ("Claim +60").
- **Rasmlar:** foydalanuvchi Gemini (Nano Banana) da o'zi chizadi — prompt bering, uslub namunasini biriktirishni
  ayting. Alternativa: Higgsfield API (`HF_CREDENTIALS` env, `xai/grok-imagine-image-2.0`, ~$0.08/rasm; foydalanuvchi
  uni "Hugging Face" deb ataydi). Qoida: bitta sinov rasm, ko'rsating, keyin soni va narxi aytilgan to'plam.
- **Animatsiya fayllari:** faqat LottieFiles (HyperFrames rad etilgan). Web uchun `@lottiefiles/dotlottie-react` kerak.
- **Personajlar:** real odamlar va boshqa kompaniya qahramonlari yo'q; hamma personaj kattalar (18+).
- **Javob uslubi:** o'zbekcha, qisqa; tugagach "nima qilindi / BIMOBIMO'dan farqi / keyingi qadam".


## Ish qoidalari (foydalanuvchi bilan)
- Foydalanuvchi o'zbek tilida yozadi — javoblar o'zbekcha. Kod izohlari inglizcha.
- `AGENTS.md`: Expo SDK 57 — kod yozishdan oldin https://docs.expo.dev/versions/v57.0.0/ ga qarash.
- Ish branch'i `local-work`. Har tugagan oqimdan keyin commit va push (foydalanuvchining doimiy ruxsati).
  `main`ga PR keyinroq (`gh` o'rnatilmagan: PR'ni foydalanuvchi `.../pull/new/<branch>` havolasi bilan ochadi).
- Repo PUBLIC: https://github.com/muhammad571634/rafti (foydalanuvchi ataylab shunday tanlagan).
  Bu repoda git muallifi lokal sozlangan: `muhammad571634 <jorayevmuhammad496@gmail.com>`.
- Rasmlarni foydalanuvchi Gemini (Nano Banana) da o'zi chizadi: promptni ber, Rafti stikerini uslub
  namunasi qilib biriktirishini ayt. Tayyor rasm `../BIMOBIMOdesignraw/<name>.png/` papkasiga yoki repodagi
  `assets/raw/` ga tushadi; ko'rib, yaroqli bo'lsa `python scripts/build-brand-art.py`.
- Har o'zgarishdan keyin: `npx tsc --noEmit` + brauzerda tekshirish
  (`.claude/launch.json` → `bimobimo-web`, port 8081, mobil o'lcham 375×812).
- Metro "Unable to resolve module" bersa (ayniqsa `git checkout`dan keyin): serverni to'xtatib,
  `%TEMP%\metro-cache` va `%TEMP%\metro-file-map-*`ni o'chirib, qayta ishga tushir.

## Hozirgi holat (2026-10-07) — YANGI SESSIYA SHU YERDAN BOSHLASIN
- **Ish branch'i: `local-work`.** Unda Today redesign'i:
  - hero karta (`today-hero.tsx`) va kunlik sovg'a kartasi (`daily-gift-card.tsx`);
  - Explore **B varianti**: rangli Phosphor duotone ikonkalar, foydalanuvchi tanlagan;
  - `assets/heroes/` (16 ta hero rasm).
- Phosphor ikonkalari bittalab importlanadi (`phosphor-react-native/src/icons/X`). `tsc` ularni tekshirmasligi
  uchun `tsconfig.json`da `lib/typescript/icons` ga yo'l berilgan.
- **Mahsulot strategiyasi private reposida:** `muhammad571634/rafti-research`, branch `claude/bimobimo-teardown`.
  - `HANDOFF.md`;
  - BIMOBIMO tahlili: `teardown/` (133 skrinshot indeksi bilan);
  - spetsifikatsiya: `spec/rafti-product-spec.md`;
  - dizayn va oqimlar rejasi: `spec/design-plan.md`.

  **Har bir yangi dizayn ishi shu hujjatlardan boshlanadi.**
- **F8 Heartbeat Diary — kodda tayyor (2026-10-07).** Prototip foydalanuvchi tomonidan tasdiqlangan:
  https://claude.ai/artifact/DtV8DUHfbUTYjf5RMiWD2T
  - `src/app/diary/index.tsx`: muqovalar karuseli ("My diary" birinchi, keyin suhbati bor personajlar),
    orqa fon oldingi muqovaning xira rasmi, "New page" belgisi, sahifasi yo'q personaj kulrang + "No page yet",
    pastdagi bitta tugma kartaga qarab o'zgaradi (Write / Read / Open last page / Chat with X), saralash.
  - Sana tugmasi kichik kalendar oynasini ochadi (`src/components/diary/calendar-popover.tsx`, foydalanuvchi yuborgan BIMOBIMO kundalik
    kalendari tuzilishida: Cancel + Confirm, qo'shni oy kunlari xira; sahifa bor kunlarda nuqta). Tanlangan kun
    kartalarni o'sha kunga qarab ko'rsatadi.
  - `src/app/diary/page/[characterId].tsx`: personaj sahifasi (Caveat qo'lyozma, chiziqli qog'oz, kayfiyat, qaysi
    suhbatdan keyin yozilgani, sahifalar orasida o'tish, "Reply to X in chat" → chat `draft` parametri bilan ochiladi).
  - `src/app/diary/mine.tsx`: foydalanuvchining o'z sahifalari (avvalgi `diary/index` shu yerga ko'chdi).
  - `src/components/diary/rules-sheet.tsx`: "How their diary works" oynasi. Rasm hozircha Rafti stikeri.
  - Ma'lumot: `CharacterDiaryPage` turi, `mock/diary.ts` dagi `characterDiaryPages` (keyin server yozadi),
    store'da `characterDiary` (persist qilinmaydi) va `diaryPagesRead` (persist).
  - Yangi paket: `@expo-google-fonts/caveat` (`fonts.hand`, `type.hand`, `type.handTitle`).
- **Zanjir (2026-10-07):** ilova bitta kunlik halqa sifatida quriladi. Xarita va har oqim holati:
  https://claude.ai/artifact/UChkXuUa9vNDyFHNTHHNUb
  - Ulangan: kecha suhbat/uchrashuv bo'lsa, ertalab personaj kundalik yozadi (`src/mock/diary-writer.ts`,
    store'da `writeDueDiaryPages`, ilova ochilganda va Diary ekraniga kirilganda chaqiriladi).
  - **F1 Onboarding — kodda tayyor** (prototip tasdiqlangan: https://claude.ai/artifact/M4ci9hVBBQMbtDkeuxBcUF):
    `src/app/onboarding.tsx`. Salom → 18+ yil → ism → birinchi do'st (Kai, Aurelian, Sol, Seren) → bildirishnoma
    → +100 (`WELCOME_SHELLS`) → birinchi chat (personaj ismingiz bilan savol beradi). `(tabs)/_layout` onboarding
    tugamaguncha `/onboarding` ga yo'naltiradi; store v4 migratsiyasi eski foydalanuvchilarni o'tkazib yuboradi.
    1-kun check-in onboarding ichida jim beriladi; personajlar tashabbusi (qo'ng'iroq, salom) onboarding'dan keyin.
    Bildirishnoma hozircha faqat sozlama (`expo-notifications` hali o'rnatilmagan).
  - `shortName()` (`src/lib/format.ts`): "Prince Aurelian" → "Aurelian". Gaplarda ism uchun shuni ishlating.
- **Til qarori (2026-10-07):** butun interfeys hozircha faqat ingliz tilida (asosiy til). Boshqa tillar keyin
  `src/i18n/locales/` orqali qo'shiladi; til tanlash tugmasi bitta til bo'lganda ko'rinmaydi.
  - **F2 Home — kodda tayyor:** "Today" bo'limi hero kartadan keyin darhol turadi. Unda bugun yozilgan, hali
    o'qilmagan kundalik sahifalar ("Theo wrote about you", to'q sariq nuqta bilan), chatda aytilgan bugungi
    rejalar, maxfiy xatlar va g'ildirak bor. Home ochilganda navbatdagi kundalik sahifalar yoziladi.
  - **F3 Chat yadrosi — kodda tayyor** (BIMOBIMO #34-#39):
    - javob 1-4 ta qisqa xabar bo'lib birma-bir keladi, oralarida "yozyapti" (`replyBursts`, `scheduleReply`);
    - kun ajratgichlari: Today / Yesterday / sana;
    - xabarni uzoq bosish menyusi: 6 reaksiya, Copy (`expo-clipboard`), Delete for me; reaksiya pufak burchagida;
    - xabar yuborilganda chig'anoq belgisidan "-1" ko'tarilib yo'qoladi (narx ko'rinadi);
    - ro'yxatdan o'tilgan kuni boshqa personajlar o'zi qo'ng'iroq qilmaydi (birinchi kun yangi do'stniki).
  - **F4/F5 — kodda tayyor** (BIMOBIMO #2-#8):
    - har bir chig'anoq harakati tarixga yoziladi (`ledger`, `LedgerEntry`, store'dagi `log()`; 6 oy saqlanadi);
    - kunlik check-in chig'anoqlari (`wallet.free`) birinchi sarflanadi va yarim tunda tugaydi, tarixda
      "Unused free shells expired" bo'lib yoziladi; sotib olinganlar tugamaydi (`expireFreeShells`);
    - `/store/ledger` ekrani: kunlar bo'yicha, bir kunda bitta personaj bilan xabarlar bitta qatorga yig'iladi;
      do'kon sarlavhasidagi chek belgisi orqali ochiladi; Home'dagi sovg'a kartasida "N free left · gone at midnight";
    - paywall: reklama (+10) va g'ildirak chatdan chiqmasdan; yozilgan matn saqlanadi;
    - ketma-ket yuborilgan xabarlarga javoblar navbat bilan keladi, aralashmaydi (`replyingUntil`).
  - **Rafti reaksiya stikerlari — ulandi:** xom varaq `assets/raw/reactions-sheet.jpg` (Nano Banana, 3x3).
    `scripts/build-brand-art.py` dagi `build_reactions()` 6 tasini kesadi (fon kulrang qog'oz, oq die-cut chegara
    saqlanadi) → `assets/brand/reaction-{love,laugh,wow,sad,hyped,thumbs}.png`, registry'da `REACTION_STICKERS`.
    Chat menyusi va pufak burchagidagi reaksiya shu stikerlar.
  - **F7 Munosabat v2 — kodda tayyor** (BIMOBIMO #21-#23, #41): darajalar 0-100, 5 bosqich (`TIERS` in
    `src/mock/user.ts`): Stranger 0, Friend 1-5, More than friends 6-15, Beloved 16-49, Family 50-100.
    `levelThreshold(n) = 2*n^2.3` (1 xabar ~2 intimacy). Har bosqich yorliqlar ochadi (romantik: Crush, Partner,
    Soulmate...; BIMOBIMO'dagi aka/opa yorliqlari olinmadi), `relationship.label`, `setRelationshipLabel`.
    Level-up oynasi faqat yangi bosqichda chiqadi. Personaj sozlamalarida munosabat kartasi (daraja, progress,
    yorliq tanlash), kontaktlarda va sozlamalarda "How closeness works" oynasi (`closeness-sheet.tsx`).
    Store v5 migratsiyasi darajalarni intimacy'dan qayta hisoblaydi. Date ssenariylari darajalari 1/3/6/10/16.
  - **F6 Qo'ng'iroqlar — kodda tayyor** (BIMOBIMO #8, #29, #40, #46):
    - qo'ng'iroq vaqti alohida balans: `wallet.callSeconds`; onboarding'da 15 daqiqa sinov (`CALL_TRIAL_SECONDS`),
      obunalar 2/8/6 soat qo'shadi (`membershipPlans[].callMinutes`); store v6 eski foydalanuvchilarga sinov beradi;
    - qo'ng'iroq ekrani "Live call · 14:57 left", vaqt tugasa o'zi yakunlanadi, balans 0 bo'lsa "Get more call time";
    - chatdagi qo'ng'iroq tugmasi birinchi marta (yoki vaqt tugaganda) sinov haqida oyna ochadi (`user.callIntroSeen`);
    - tarix ekrani ikki bo'limli: Shells | Call time (`LedgerEntry.unit = 'seconds'`);
    - javob berilmagan qo'ng'iroqdan keyin personaj chatga yozadi (`missedCallLines`); vaqt bo'lmasa personaj
      qo'ng'iroq qilmaydi.
  - **F9 Us va kalendar — kodda tayyor** (BIMOBIMO #49-#55; prototip tasdiqlangan:
    https://claude.ai/artifact/VFqxdBJ4mnTbzLtQh6zXu3):
    - Us tabida "Coming up" o'rniga oy kalendari (`src/components/us/plan-calendar.tsx`): reja bor kunda nuqta,
      kun bosilsa pastda o'sha kunning rejalari (vaqt, eslatma vaqti, bajarilgani);
    - "+" → `PublishSheet`: Plan (`plan-sheet.tsx`: nom, kun, ixtiyoriy vaqt ±15 daq), Diary (`/diary/write`),
      Board (`/board/write`). Qo'lda qo'shilgan reja haqida personaj chatda yozadi (`planAddedLine`);
    - chatdagi `detectPlan` endi vaqtni ham oladi ("at 3pm", "15:30", "at 7" = 19:00); `ScheduleItem.time`,
      `followedUp`, `source`;
    - `runTimers()` (store): vaqtli rejada 10 daqiqa oldin, vaqtsizda ertalab 8:00 da eslatma; tugagach
      (vaqtli: +2 soat, vaqtsiz: 20:00) "how did it go?" xabari, 36 soatdan keyin so'ramaydi
      (`src/lib/schedule.ts` → `planStep`). Ilova ochiq bo'lsa har 30 soniyada, ochilganda va foreground'da chaqiriladi.
      Push bildirishnoma hali yo'q (`expo-notifications` o'rnatilmagan);
    - "Our moments" filtri: All / Plans / Dates / Calls / Notes / Diary (faqat bor turlar). Yangi moment turlari
      `plan`, `board`;
    - **Message board** (BIMOBIMO doskasi tuzilishida, rasmlarsiz): `src/app/board/write.tsx` — kimga (sheet),
      300 belgi, Clear, 7 ta qog'oz uslubi (`src/components/board/stationery.tsx`, hammasi SVG + Phosphor bilan
      kodda chizilgan), "Pin it" 2 chig'anoq (`shellCosts.boardNote`, ledger `board`). 8 soniyadan keyin personaj
      chatda javob beradi, +6 intimacy. `src/app/board/index.tsx` — ilingan eslatmalar panjarasi (eski "oxirgi
      xabarlar" doskasi o'rniga). Store'da `boardPosts` (persist);
    - Home'dagi bugungi reja qatorida vaqt: "15:00 · Theo will remind you".
  - **F10 Bepul sovg'alar — kodda tayyor** (BIMOBIMO #26-#28):
    - Free gifts ekranida "Invite friends · +50": o'z kodi (`src/lib/invite.ts`, 6 belgi, 0/O/1/I yo'q,
      akkauntdan hosil qilinadi; server keyin haqiqiy kod beradi), nusxa olish, haftalik progress 0/6
      (`user.inviteCredits`, server to'ldiradi), "Invite" ulashish oynasini ochadi;
    - "Have a code?": do'st kodini bir marta kiritish, +50 (`redeemInvite`: invalid / own / used), ledger `invite`;
    - "Daily share": +6 kuniga bir marta (`claimShareReward`, `daily.shareDay`, ledger `share`). Hisoblanadi:
      qo'ng'iroqni ulashish (call ekrani), doska eslatmasini ulashish (board kartasidagi belgi), taklif.
      Hammasi `shareForReward()` orqali; webda share oynasi bo'lmasa matn nusxalanadi;
    - har qayerda ulashilganda tepada "+6 for sharing" banneri (`share-reward-banner.tsx`, root layout'da);
    - Discord/Instagram/TikTok qatorlari qo'shilmadi: Rafti'ning rasmiy akkauntlari hali yo'q.
    - Diqqat: `board/index.tsx` tahrir qilinganda Expo typed routes ba'zan `/board/index` deb yozadi va tsc
      yiqiladi. Tuzatish: serverni to'xtatish, `%TEMP%\metro-cache`, `metro-file-map-*` va
      `.expo/types/router.d.ts` ni o'chirish, qayta ishga tushirish.
  - **Reja oynasi (F9) foydalanuvchi talabi bilan yangilandi:** ekranning ~72% balandligi, sarlavha h1 va
    do'stning avatari, katta qalin matnlar; kun tanlash uchta teng tugma (Today | Tomorrow | kalendar, boshqa
    kun tanlansa tugmada sana), vaqt katta raqam va katta ± tugmalari. Kalendar `CalendarPopover` ning
    `allow="future"` rejimi (Diary'da o'zgarish yo'q). Oyna faqat ochilganda tozalanadi.
  - **Klaviatura (foydalanuvchi talabi):** reja oynasi ochilganda klaviatura o'zi chiqmaydi (autoFocus yo'q).
    `Sheet` ga `avoidKeyboard` qo'shildi: oyna klaviatura ustidagi joydan baland bo'lmaydi, ichi scroll bo'ladi
    (Android oynani o'zi kichraytiradi, iOS'da `KeyboardAvoidingView`). Yozish maydoni bor har yangi sheet shu
    parametrni ishlatsin. `useKeyboardVisible()` (`src/hooks`) — klaviatura ochiqligida reja oynasi balandligini bo'shatadi.
  - Doskaga eslatma yuborilgach oldingi ekranga qaytiladi (`router.back()`), shunda typed routes xatosiga bog'liq emas.
  - **F11 Date — kodda tayyor** (BIMOBIMO #9-#12; prototip tasdiqlangan:
    https://claude.ai/artifact/XQk64zfZuwBGR9vT8QPszv):
    - `src/app/dating.tsx` — xarita: 5 joy (`src/mock/dates.ts`, `DATE_PLACES`: joy, emoji, narx, daraja, xaritadagi
      o'rni, 5 raund × 3 javob, har javob 0-3 yurak). Dengiz, nuqtali yo'l, daraxtlar SVG bilan kodda. Daraja yetmasa
      joy kulrang + qulf; bu sherik bilan borilgan joy yalpiz hoshiyali. Tepada sherik tanlash sheet'i va balans;
      joy bosilsa oyna (raundlar, daraja, narx, "Start date with X");
    - `src/app/date/[placeId].tsx` — raundlar: personaj hero rasmi, raund nuqtalari, yuraklar, sahna matni, 3 javob,
      javobdan keyin personaj reaksiyasi va "Next"; oxirida polaroid (`src/components/date/polaroid.tsx`, Caveat),
      yakun (sweet/warm/funny), Share (`shareForReward`, kunlik +6), Back to chat. ✕ "Leave X here?" so'raydi,
      swipe-back o'chirilgan. Ekran faqat to'langan uchrashuvni o'ynaydi (`activeDate`, `beginDate` qo'yadi,
      `finishDate` tozalaydi) — to'g'ridan-to'g'ri havola bepul o'ynatmaydi;
    - `finishDate`: yaqinlik `INTIMACY.date + yuraklar`, `dates` (persist, `DateRecord`), `dating` moment (ertasi kundalik
      sahifasi shundan), personaj chatda kayfiyatga qarab yozadi (`afterDateLine`);
    - `src/app/date/album.tsx` — "Our dates": polaroidlar panjarasi;
    - eski `dateScenarios` va `startDate` olib tashlandi (uchrashuv endi chatda emas, o'z ekranida).
    - Qilinmadi: foydalanuvchilar yaratadigan mavzular (P3), joylar uchun rasm (hozir emoji tile).
  - **F12 Chat "+" o'yinlari — kodda tayyor** (BIMOBIMO #42-#48; prototip tasdiqlangan:
    https://claude.ai/artifact/Vr4YPbc6z9LZLGmrfXzRS8):
    - "+" endi 4×2 panjara, Explore B uslubidagi rangli Phosphor duotone ikonkalar (`moduleTints`: voice, secretNote,
      quiz, truthOrDare qo'shildi): Voice, Photo, Secret note, Couple quiz, Truth or dare, Date, Daily calls, Diary.
      Foydalanuvchi emoji ikonkalarni yoqtirmadi — shu uslub tanlandi;
    - **Couple quiz** `src/app/quiz/[characterId].tsx`: 3 to'plam × 5 savol (`src/mock/games.ts`), personaj javobi
      `partnerAnswer` (personaj+savol bo'yicha barqaror hash), javob tanlangach darhol ochiladi; natija chatga system
      karta ("💞 First date · 4/5"), personaj izohi (`quizReply`), yaqinlik `2 + 2×moslik`, `quiz` moment (Us filtri "Games");
    - **Truth or dare** `src/components/chat/truth-or-dare-sheet.tsx`: SVG g'ildirak (Reanimated aylanish), personajga
      tushsa siz Truth/Dare tanlaysiz — savol chatga ketadi, u javob beradi (+3); sizga tushsa u chatda savol beradi;
    - **Daily calls** `src/components/chat/daily-calls-sheet.tsx`: kim qo'ng'iroq qiladi (ovozi bor do'stlar),
      ertalab/kechki vaqt (±30 daq.) va o'chirgichlar. `settings.morningCallTime`, `nightCallTime`, `callerId`;
      `runDailyInitiative` endi shu vaqtdan boshlab 4 soat ichida qo'ng'iroq qiladi (`inWindow`).
  - **F13 Find — kodda tayyor** (BIMOBIMO #56, #59): mavjud ekran kengaytirildi (prototipsiz, HANDOFF qoidasi bo'yicha):
    - "All" tabi birinchi va standart; har bir dunyo alohida karta: sarlavha, soni, "›" → `src/app/world/[series].tsx`
      (hamma personajlar, "N characters · M can call"); kartada 3 tadan sahifalar (gorizontal paging) va nuqtalar;
    - avatarda yashil telefon belgisi = ovozi bor, qo'ng'iroq qilsa bo'ladi (`Avatar badge="call"`; Onboarding'dagi
      belgi o'zgarmadi);
    - qidiruv kartalarni olib tashlab, barcha dunyolardan tekis "N found" ro'yxatini ko'rsatadi;
    - `CharacterRow` umumiy komponentga chiqdi (`src/components/character-row.tsx`).
  - **F14 Profil — kodda tayyor** (tafsilot eng tepadagi KEYINGI QADAM 3-bandida).
- **Tipografiya (foydalanuvchi talabi, 2026-10-07):** asosiy matnlar kattaroq va qalinroq, interfeys oddiy,
  zamonaviy minimal. `src/theme/typography.ts`: body 16/22, small 14/19, title 17 bold, h1 30 heavy,
  h2 24 heavy. Yangi ekranlar shu o'lchamlardan foydalanadi, o'lchamni joyida qo'lda kattalashtirmang.
- **Keyingi ish:**
  - qoida oynasi uchun Rafti kundalik yozayotgan rasm (1 ta sinov, keyin `assets/brand/`);
  - shu uslubdagi Secret note, Gifts va Date qoida oynalari;
  - keyin `design-plan.md` dagi P0 oqimlari (F1–F5).
- **Higgsfield API** (bulut muhitida `HF_CREDENTIALS` environment variable bor):
  - `GET https://api.higgsfield.ai/models` modellar ro'yxatini beradi (84 ta, 17 tasi rasm);
  - `POST https://api.higgsfield.ai/<slug>`, header `Authorization: Key $HF_CREDENTIALS`;
  - holatni kuzatish: `GET /requests/<id>/status`;
  - uslub namunasi bilan rasm: `alibaba/qwen-image-3/edit`. Maydonlar: `prompt`, `image_urls` (ochiq URL, masalan repodagi
    `raw.githubusercontent.com/.../assets/brand/tile-diary.png`), `aspect_ratio` (`1:1`…), `resolution` (`1k`/`2k`);
  - natija rasmlari `d3u0tzju9qaucj.cloudfront.net` da. Bu domen bulut muhitining Allowed domains ro'yxatida bo'lishi kerak;
  - birinchi sinov rasmi (diary qoida oynasi uchun Rafti) chizildi, lekin CDN yopiq bo'lgani uchun hali yuklab olinmadi.

## Avvalgi holat (2026-10-06, kechroq)
- PR #3 (`redesign`) `main`ga merge qilindi (`4625509`). `redesign` branch'i `main`ga tenglashtirildi.
- **Backend rejasi yozildi: `docs/backend-plan.md`** — foydalanuvchi tasdig'ini kutmoqda.
  - Tavsiya: Supabase (Postgres + pgvector, Auth, Storage, Realtime) + o'z serverimiz
    (Node + Hono + pg-boss, Fly.io), Claude API, RevenueCat, AdMob SSV, keyin LiveKit.
  - Bosqichlar B0–B6. B0 — poydevor, B1 — haqiqiy chat.
  - Muhim topilma: hozirgi iqtisodda bepul chig'anoq ko'p (kuniga ~130 xabar) va "unlimited" a'zolik
    LLM xarajatini qoplamasligi mumkin. Raqamlar rejaning 9-bo'limida.
  - B1'dan boshlab Expo Go yetmaydi, EAS development build kerak.
  - Ochiq savollar (12-bo'lim): stack, chat modeli, server kodi shu repodami yoki private repoda, hisoblar.

## Oldingi holat (2026-10-06)
- Chat redesign va to'liq ilova redesign'i (0–3-bosqich) TUGADI, `redesign` branch'ida:
  `77e07ae` (0–1), `e352a8e` (2), `ac2cd56` (3). `redesign` `mobile-ux-audit` ustiga qurilgan,
  shuning uchun PR `main`ga ikkala ishni ham olib kiradi.
  PR havolasi: https://github.com/muhammad571634/rafti/pull/new/redesign (push tugagach).
- Dizayn qoidalari (har yangi ekranda shu qoidalarga amal qil):
  - Fon `colors.bgPlain`. Kartochka va soya o'rniga `ListRow` va `Divider` ishlatiladi.
  - Bitta o'rik `Button primary`. Yalpiz (`colors.bond`/`bondText`) faqat munosabat uchun.
  - Chiziqli Ionicons va `IconTile`. Matn sentence case'da. Gradient yo'q.
  - Komponentlar: `src/components/ui` (ListRow, IconTile, Divider, SectionLabel, CountBadge, Button secondary).
- Foydalanuvchi qoidalari:
  - Avval rasm yoki prototip (`show_widget`), tasdiqdan keyin kod.
  - Faqat ko'rsatilgan animatsiyani o'zgartir (popup'lar animatsiyasiz, qolganlari qoladi).
- Bash'da heredoc ichida `'` bilan murakkab buyruqlar yiqiladi. i18n uchun skript:
  JSON patch'ni faylga yoz, keyin `python scripts/i18n_set.py "$(cat patch.json)" [o'chiriladigan.kalit]`.
  Skript CRLF va 2 bo'shliqli formatni saqlaydi.

## Oldingi holat (2026-10-05)
- **Rafti** — AI kompanion ilova (BIMOBIMO/Beemo'dan ilhomlangan, lekin o'z brendi va IP'si).
  Expo SDK 57 / RN 0.86 / expo-router / zustand. Tavsif — `README.md`.
- UI, iqtisod (chig'anoq), qo'ng'iroqlar, diary, secret note va boshqalar ishlaydi.
  **AI hali mock** (`src/store/use-app-store.ts` + `src/mock/*`), backend yo'q.
- Maskot: **Rafti** — yalpiz sharfli suv samuri (eski nomi "Popo", nemis/ispan tilidagi
  ma'nosi sabab almashtirildi). Valyuta: **shells** (chig'anoq).
- Personajlar: 16 ta original, kattalar (18+), 4 dunyo, 2D anime portretlar (`assets/avatars`).
- Git:
  - `main` = PR #1 merge qilingan (butun ilova + rebrend).
  - `mobile-ux-audit` branch push qilingan, **PR hali ochilmagan**:
    https://github.com/muhammad571634/rafti/pull/new/mobile-ux-audit
- Foydalanuvchi telefonda Expo Go orqali sinab ko'rgan — ishlagan.

## Brend
- Palitra "Kakao va yalpiz": o'rik `#FF9F5A`, yalpiz `#3CCFB4`, osmon `#6BB8FF`,
  krem fon `#FFF7EC`, karamel `#C98B5E`, matn `#2A2E45` (`src/theme/colors.ts`).
- Xom rasmlar: `C:\Users\joray\BIMOBIMOdesignraw\` — har bir `*.png` aslida PAPKA,
  ichida Gemini `.jpg`; eng yangisi olinadi. Namuna: `_refs\ref_popo_square.png`,
  kanvaslar `_refs\canvas_1x1.png`, `canvas_3x4_vertical.png`, `canvas_wide_banner.png`.
  `mascot_main.png` ISHLATILMAYDI.

## Qilingan ishlar (2026-09-29, 2-sessiya)
- `scripts/build-brand-art.py`: xom rasmlardan `assets/brand/` fayllarini yasaydi. Rasm
  almashsa, qayta ishga tushirish kifoya: `python scripts/build-brand-art.py`.
  - Plitkalar kesiladi, burchaklari shaffof qilinadi va 512px'ga keltiriladi.
  - Stiker va empty_state rasmlarining foni olib tashlanadi.
  - reward va levelup rasmlarining krem foni Popo yuzi bilan bir xil rang, shuning uchun
    foni olinmaydi: butun rasm ramkada ko'rsatiladi.
  - Skript yana quyidagilarni yasaydi: app icon, favicon, Android adaptiv ikonkalari
    va splash, hamda `assets/icons/shell.png`.
  - `icon_board` plitkasi qalin chizilgan, shuning uchun uning chegarasi `TILE_FACES`da qo'lda berilgan.
- Palitra: `pink*` ranglari `apricot*`ga, `lav*` ranglari `mint*`ga, `teal*` ranglari `sky*`ga
  almashtirildi. Neytral ranglar iliq, matn rangi `#2A2E45`.
- Valyuta endi "shell" (chig'anoq). Kodda to'liq qayta nomlandi: `wallet.shells`,
  `spendShells`, `/store/shell`, `ShellBadge`/`ShellIcon`.
  Store persist versiyasi 2 ga ko'tarildi: migratsiya eski `acorns` balansini `shells`ga ko'chiradi.
- Maskot: SVG mushuk o'rniga Popo rasmlari qo'yildi (`BrandArt`, `Mascot`: `src/components/ui/mascot.tsx`),
  suzib turish animatsiyasi bilan.
  - Home: plitkalar va banner.
  - Kunlik sovg'a, level-up, bo'sh ekranlar.
  - Bedtime, Gifts, Diary muqovasi (har kartada rangli xatcho'p bor), avatar va qo'ng'iroq stikeri.
  - Chat foni endi chig'anoq va panjalardan iborat.
- O'chirildi: `CuteDuo`, mushuk va cho'chqa ikonkalari, mushukli Lottie'lar va `assets/expo.icon`.
- `tsc` toza o'tdi. Brauzerda Home, Store, Gifts, Diary, Bedtime, Chat, Us, Profile,
  Secret Note va Call History ekranlari tekshirildi.

## Qilingan ishlar (2026-09-29, 3-sessiya)
- Yangi `banner_home` va `currency_shell` ulandi (`python scripts/build-brand-art.py`).
  - `currency_shell` uchun alohida kesish usuli qo'shildi: `key_out_sky`. Chig'anoqning lilak
    tuslari ko'k fonga juda yaqin, shuning uchun fon yorqinlik bo'yicha emas, rang tusi bo'yicha ajratiladi.
  - Skript fayllarni avval `.part` nomi bilan yozib, keyin almashtiradi. Shunda Metro
    yarim yozilgan faylni ko'rmaydi va `TransformError: empty file` chiqmaydi.
- Lottie'lar qayta bo'yaldi (`scripts/recolor-lottie.js`):
  - `typing`: `ff3d7f` → `FF9F5A`.
  - `level-up`: pushti → o'rik, qizg'ish-pushti → `FF8A70`, ko'k → `6BB8FF`, binafsha → `3CCFB4`.
  - `love-letter`: lavanda → yalpiz (`138A75`, `3CCFB4`, `B5EDE2`, `9FE3D6`), pushti → o'rik.
  - `assets/lottie/README.md` shunga mos yangilandi.
- Brauzerda tekshirildi:
  - Level-up haqiqiy holatda chiqdi: Megumi chatida 6 ta xabar yuborildi, intimacy 18 → 30, Level 2.
  - Love-letter xat almashishda chiqdi (Secret Note).
  - Typing nuqtalari o'rik rangda.
  - Home, Store, Gifts va Chat ekranlari ham ko'rib chiqildi. Yangi tabda konsolda xato yo'q.
  - `tsc` toza o'tdi.
- Persist migratsiyasi tasdiqlandi: saqlangan holat `version: 2`, `shells` bor, `acorns` yo'q.

- Foydalanuvchi telefonda Expo Go orqali sinab ko'rdi: hammasi ishladi.

## Qilingan ishlar (2026-09-29, 5-sessiya): Rafti va original personajlar
- Ilova nomi **Rafti** bo'ldi: `app.json` (name, slug, scheme), `package.json`, i18n `app.name`,
  README. Maskot ham Rafti deb ataladi, `assets/brand/rafti-*` fayllari shunga moslab qayta nomlandi.
- `src/mock/characters.ts`: 16 ta original personaj, 4 ta dunyoda. Oppa va Luna qoldi.
  - **Seaside Academy:** Kai, Elio, Theo, Hana, Iris.
  - **Moonlit Realm:** Aurelian, Castor, Zarek, Seraphine.
  - **NEON TIDE:** Ezra, Seren, Kiro, Minu. "Noa" nomidan voz kechildi, chunki real
    qo'shiqchi Noa Kazama bor.
  - **Tidepool Café:** Adrian, Lucas, Sol.
- Kategoriyalar `school | fantasy | idol | daily | original` bo'ldi (Find, create-character, en.json).
- **Barcha personajlar kattalar (18+).** Seaside Academy universitet, Find'da "Campus" deb ko'rinadi.
  Romantik ilovada voyaga yetmagan personaj bo'lmasligi kerak (App Store qoidasi).
- Namuna ma'lumotlar yangi personajlarga o'tkazildi: gojo→theo, felix→seren, zhongli→castor, megumi→elio.
- Store'ning saqlash kaliti endi `rafti.store`. Eski `bimobimo.store` bir marta o'qiladi, keyin o'chiriladi.
  Persist versiyasi 3 ga ko'tarildi, `recastSeed` quyidagilarni qiladi:
  - eski litsenziyali personajlar va ularga tegishli ma'lumotlarni o'chiradi;
  - foydalanuvchi yaratgan personajlarni saqlab qoladi, kategoriyasini yangisiga moslaydi
    (kpop→idol, anime→school, game→fantasy);
  - kundalik sahifalarini qoldiradi, lekin o'chirilgan personajlar bilan ulashishni bekor qiladi.
  - Brauzerda qo'lda yaratilgan v2 holat bilan sinab ko'rildi.
- Eski DiceBear avatarlari o'chirildi, hozircha avatar o'rnida monogramma turibdi.
  - `build-brand-art.py` endi `avatar_<nom>.png/` papkalaridan `assets/avatars/c_<nom>.png` yasaydi
    va `registry.ts`ni avtomatik yozadi.

- Store `merge`: rasmiy personajlar har doim koddan olinadi. Shuning uchun seed matnidagi
  o'zgarish saqlangan qurilmalarga ham yetib boradi, foydalanuvchi yaratganlari esa saqlanib qoladi.
- Avatarlar: ✅ 16/16 tayyor (Campus, Moonlit Realm, NEON TIDE, Tidepool Café). Uslub namunalari:
  Campus va Ezra uchun avatar_kai, Moonlit uchun avatar_aurelian, qolgan NEON TIDE uchun avatar_ezra,
  Café uchun avatar_adrian. Oppa va Luna — "My Creations" misoli, monogramma bilan qoldi.

## Qilingan ishlar (2026-09-30): mobil UX auditi (/mobile-design)
- Chat: `MessageBubble` endi `memo` qilingan, `renderItem`/`onCallBack` barqaror.
  Faqat chat ochilgandan keyin kelgan xabarlar animatsiya bilan chiqadi.
- Accessibility: `PressableScale` standart `accessibilityRole="button"` oladi.
  Barcha ikonka-tugmalarga nom berildi (`a11y.*` kalitlari, en.json). `IconButton` endi
  `accessibilityLabel` qabul qiladi.
- Ichma-ich tugmalar ajratildi: chat sarlavhasidagi ShellBadge va Call History'dagi qo'ng'iroq tugmasi.
  Qoida: tugma ichiga tugma qo'yilmaydi (VoiceOver yetib bormaydi, vebda `<button>` ichida `<button>`).
- Tegish maydonlari ≥44pt (`hitSlop`): Chip, ShellBadge, Home profil tugmasi, Shell Store'dagi Free,
  Us'dagi reja o'chirish, qidiruvni tozalash, klipni o'chirish, diary tool.
- `src/app/_layout.tsx`: root `ErrorBoundary` ("Rafti tripped over a pebble" + Retry), sinab ko'rildi.
- Us → Moments sahifalab ko'rsatiladi (20 tadan, "Show N more"). Diary sana ro'yxati `FlatList`da.
- Tekshirildi: 23 ekranda nomsiz yoki ichma-ich tugma yo'q (DOM tekshiruvi), `tsc` toza.
- Eslatma: `git checkout` fayllarni vaqtincha o'chirsa, Metro fayl-xaritasi eskirib qoladi
  ("Unable to resolve module"). Yechim: dev serverni to'xtatish, `%TEMP%\metro-cache` va
  `%TEMP%\metro-file-map-*`ni o'chirish, qayta ishga tushirish.

## Qilingan ishlar (2026-10-05): store `merge` tuzatildi
- `merge` endi `user`, `wallet`, `daily`, `settings` obyektlarini standart qiymatlar
  bilan birlashtiradi. Keyin qo'shilgan yangi kalit (masalan, dark mode uchun `settings.theme`)
  eski saqlangan holati bor qurilmalarda `undefined` bo'lib qolmaydi. Bu redesign'dan oldin shart edi.
- Brauzerda sinaldi: `chatAnimation` va `spinsUsed` yo'q eski holat yuklanganda ular standart qiymat
  bilan to'ldi, foydalanuvchi tanlovi (`morningCall: false`) va balans saqlanib qoldi. `tsc` toza.
- Keyinga qoldirildi: `clearChat`dan keyin keladigan javob (backend ulanganda so'rovni bekor qilish
  bilan hal bo'ladi) va `app.json` (bundle ID, ruxsat matnlari, `supportsTablet`) — nashrdan oldin.

## 2026-10-05/06: pastki 4 tez tugma (Voice, Photo, Secret Note, Memory) — QAYTARILDI
- Qo'shilgan edi, foydalanuvchi telefonda ko'rdi va rad etdi: "UI UX dizaynni buzib turibdi".
  Hamma fayllar `HEAD` holatiga qaytarildi: `chat-quick-actions.tsx`, `voice.png` va `memory.png` o'chirildi,
  `ChatInput` yana "+", galereya, emoji va yuborish tugmalari bilan. Bu yo'nalishni qayta taklif qilma.
- Saqlab qolingan: `Sheet` animatsiyasiz (pastda) va store `merge` tuzatishi.
## Qilingan ishlar (2026-10-06): yozish paneli redesign — A varianti (ChatGPT uslubi)
- Foydalanuvchi ish tartibi: avval maket rasmi (`show_widget`), tasdiqlangach kod. A va B taklif qilindi,
  A tanlandi (B — Gemini uslubidagi ikki qavatli kartochka edi).
- `src/components/chat/chat-input.tsx` qayta yozildi:
  - To'liq kenglikdagi oq panel o'rniga chat foni ustida suzuvchi oq pill bo'ldi
    (`radius.xxl`, `colors.border`, `shadows.card`, chetlardan 12pt).
  - Ichida: "+" (`IconButton`, `surfaceAlt` fon), matn maydoni va bitta asosiy o'rik tugma.
    Bo'sh maydonda tugma `mic` (`onVoice` → VoiceSheet), matn yozilganda `arrow-up` (yuborish, haptic).
    Almashish animatsiyasiz.
  - Galereya va emoji tugmalari olib tashlandi: Photo "+" oynasida bor, emoji tugmasi hech narsa qilmasdi.
  - Matn maydoni bitta qatorda tugmalar bilan bir tekisda turadi, 5 qatorgacha o'sadi.
    Webda `rows: 1` (react-native-web aks holda 2 qatorli textarea chizadi).
- API: `ChatInput({ placeholder, onSend, onAttach, onVoice })`. Yozuv chat ekranidan
  `t('chat.inputPlaceholder', { name })` orqali beriladi: "Message {{name}}…".
- `IconButton`ga `haptic` prop qo'shildi.
- `en.json`: `a11y.gallery` va `a11y.emoji` o'chirildi, `a11y.voiceMessage` qo'shildi.
- Tekshirildi (375×812, `tsc` toza, konsolda xato yo'q):
  - Bo'sh holat: + / Message Seren… / mikrofon. Yozilganda "Send" tugmasi chiqdi.
  - Yuborilgan xabar ro'yxatga tushdi, Seren javob berdi, balans 128 → 127.
  - Mikrofon VoiceSheet'ni ochdi, "+" esa Voice, Photo, Secret Note, Date va Diary'ni ko'rsatdi.

## Qilingan ishlar (2026-10-05): oynalar endi sakramaydi
- Foydalanuvchi talabi: chatdagi va boshqa joylardagi "sakrab chiqadigan oyna" animatsiyasi
  olib tashlansin, oyna yengil va toza chiqsin.
- **Boshqa animatsiyalar QOLADI:** "yozyapti" nuqtalari, ovoz to'lqini, xabarlarning kirishi,
  tugma bosilishi, maskot va konfetti BIMOBIMO'dagidek qoladi, ularga tegilmasin.
  Avval hammasini o'chira boshlagandim, foydalanuvchi to'xtatdi: "faqat oynalar".
- `src/components/ui/sheet.tsx`: FadeIn, `SlideInDown.springify()`, FadeOut va SlideOutDown olib tashlandi.
  Modal `animationType="none"`: oyna darhol chiqadi va darhol yo'qoladi.
  Orqa fon endi qorong'i blur (native) va `colors.overlay` (web) o'rniga hamma platformada yengil `colors.scrim`.
  `colors.overlay` endi ishlatilmaydi.
- Ilovadagi barcha popup'lar (17 joy) shu bitta `Sheet` orqali ochiladi, shuning uchun hammasiga ta'sir qiladi.
  Ekranlar orasidagi o'tishlar (`_layout.tsx` dagi native stack) o'zgarmadi.
- Tekshirildi: `tsc` toza. Brauzerda Voice va "+" oynalari darhol joyida chiqdi (`getAnimations()` bo'sh),
  yopilganda darhol yo'qoldi.

## Redesign rejasi (2026-10-06, taklif — foydalanuvchi tasdig'ini kutmoqda)
- Maqsad: ilova "AI chizgan" emas, senior dizayner qilgandek ko'rinsin. Uslub ChatGPT kabi zamonaviy
  minimal, lekin Rafti'ning o'z dizayni (BIMOBIMO nusxasi emas).
- Hozirgi "AI belgilari": har narsa soyali kartochkada, gradientlar (Us, Store, tugmalar),
  3 xil ikonka uslubi (3D emoji, to'ldirilgan to'q sariq, chiziqli), o'rik rang hamma joyda,
  Home'da maskot 10 marta takrorlanadi.
- Dizayn tili:
  - Fon `gray50` #FCF9F5.
  - Ajratish soya bilan emas, ingichka chiziq (`gray200`) va bo'shliq bilan qilinadi.
  - O'rik rang faqat asosiy harakat va o'qilmagan xabarlar uchun.
  - Yalpiz rang faqat munosabat (level, progress) uchun.
  - Bitta chiziqli ikonka oilasi, rang ink.
  - Shriftlar: tizim shrifti va Fredoka. Fredoka faqat wordmark va katta raqamlarda.
  - Maskot faqat 3 joyda: logo, bo'sh ekranlar, bayram lahzalari.
- Bosqichlar:
  - 0 — umumiy komponentlar: ListRow, Section, SheetList, Button turlari, TabBar, Switch rangi.
  - 1 — Home ("Today"), Chats ro'yxati, personaj profili, chatdagi "+" menyusi.
    Prototip `show_widget` bilan ko'rsatilgan.
  - 2 — Find, Us, Profile/sozlamalar, Shell Store.
  - 3 — qolgan ekranlar: Diary, Secret Note, Gifts, Dating, Photo booth, Radio, Bedtime,
    qo'ng'iroqlar, Create character, Memories, Call history.
- Ish tartibi: har bosqichda avval prototip, tasdiqdan keyin kod, keyin `tsc`, brauzer va telefonda tekshirish.

## Qilingan ishlar (2026-10-06): redesign 0 va 1-bosqich — TAYYOR (telefonda ko'rib chiqish kutilmoqda)
- 0-bosqich, umumiy komponentlar (`src/components/ui`):
  - `ListRow`: left, `titleAccessory`, meta, trailing, chevron.
  - `IconTile`: chiziqli ikonka, iliq kulrang squircle ichida, `dot` bilan.
  - `Divider`, `SectionLabel`, `CountBadge`.
  - `Button`: primary endi gradientsiz, yaxlit o'rik rang, `radius.md`. Yangi `secondary` (oq, hairline) varianti qo'shildi.
    Bu o'zgarish hamma ekranlarga ta'sir qiladi.
  - Ranglar: `colors.bond` va `bondText` (yalpiz, faqat munosabat uchun). `tabActive` endi ink, `tabInactive` esa gray500.
  - Pastki tablar: yassi oq panel va hairline, ikonkalar chatbubble va compass. O'qilmagan xabarlar son bilan emas, bitta o'rik nuqta bilan.
    Tab nomi "Chats".
- 1-bosqich ekranlari (workflow: quruvchi agent, 2 tekshiruvchi — dizayn va to'g'rilik — keyin tuzatuvchi):
  - `(tabs)/index.tsx` — "Today" hubi:
    - Salomlashish soatga qarab o'zgaradi. Ostida kutayotganlar qatori.
    - Kartochkada o'qilmagan chatlar (bo'lmasa, oxirgi 2 ta chat).
    - Today bo'limi: bepul spin va tayyor secret note'lar.
    - Explore: 10 modul, 4 ustunli `IconTile` panjarasi.
    - Banner va otter plitkalari olib tashlandi. `TILES` endi faqat `gifts.tsx`da ishlatiladi,
      qolgan `assets/brand/tile-*.png` fayllari ishlatilmaydi (o'chirilmadi).
  - `(tabs)/chat.tsx`: katta "Chats" sarlavhasi, "New chat" tugmasi (Find'ga o'tadi) va qidiruv
    (ism yoki xabar matni bo'yicha, natija bo'lmasa xabar chiqadi). `ListRow` qatorlari: to'g'nag'ich, vaqt,
    `CountBadge`, muted ikonka.
  - `character/[id]/index.tsx`:
    - Blur va gradient olib tashlandi. Markazda 92pt avatar, "Voice ready" yalpiz rangda.
    - Tugmalar: primary "Message", secondary "Voice call" va "Secret note".
    - Level kartochkasi: yalpiz progress chizig'i.
    - Qatorlar: Memories (son faqat >0 bo'lsa ko'rinadi) va Chat settings.
  - `chat/[id].tsx`: "+" menyusi 3 ustunli panjara o'rniga ro'yxat bo'ldi: ikonka, nom va narx
    (a'zolar uchun voice va photo narxi ko'rsatilmaydi).
- `en.json`: yangi kalitlar qo'shildi (`home.greeting/*`, `home.todo/*`, `home.short/*`,
  `characterProfile.*`, `chat.shellCost`, `a11y.unreadTab`, `a11y.profile`). Ishlatilmay qolgan
  `home.greetingBanner*` va `chat.cost` o'chirildi.
- Tekshirildi:
  - `tsc` toza, konsolda xato yo'q.
  - 375×812 o'lchamda to'rttala ekran prototipga mos chiqdi. Qidiruvda "cas" yozilsa Castor va Lancaster topiladi,
    "zzz" yozilsa "Nothing matches" chiqadi.
  - "+" menyusi narxlarni to'g'ri ko'rsatadi.
- 0 va 1-bosqich `redesign` branch'iga commit qilindi (`77e07ae`), hali push qilinmagan.

## Qilingan ishlar (2026-10-06): redesign 2-bosqich — TAYYOR (commit qilinmagan)
- Bu safar workflow emas, o'zim yozdim (ultracode o'chiq edi).
- `ListRow`ga `right` slot qo'shildi (Switch yoki kichik tugma uchun).
- `Toggle` endi ink rangda, oq thumb bilan. U hamma joyda ishlatiladi.
- Yangi `type.figure`: 22pt Fredoka.
- `find.tsx`:
  - FAB olib tashlandi, uning o'rniga sarlavhada "+" turadi.
  - Kategoriyalar tagiga chizilgan tablar ko'rinishida.
  - Dunyo nomi ostida `ListRow` ro'yxati, yonida "Add" (`addFriend`, ekran o'zgarmaydi) yoki "✓ Friends".
  - "Add" qator tugmasining ICHIDA emas, YONIDA turadi (ichma-ich tugma bo'lmasligi uchun).
- `us.tsx`:
  - Gradient o'rniga outlined kartochka: kun soni Fredoka'da, yalpiz progress va 3 ta stat
    (intimacy, streak, first met "Apr 9").
  - "Coming up" bo'limida `DateTile`. "Moments" chiziqli ikonkali ro'yxat.
- `profile.tsx`:
  - Bo'limlar: Account, They reach out, Chat, About.
  - "Chat animations" QOLDI, chunki u xabarlar animatsiyasini haqiqatan boshqaradi. Prototipda xato
    "ishlamaydi" deb yozgandim, foydalanuvchiga aytildi.
- `store/shell.tsx` — halol "value framing", hamma narx ochiq:
  - Paketlar kattadan kichikka tartiblangan (langar). `popular` paket oldindan tanlangan va "Most popular" yorlig'iga ega.
  - "Best value" va tejash foizlari haqiqiy narxdan hisoblanadi (`buildOffers`). 100 chig'anoq narxi
    ko'rsatiladi, bonus yalpiz rangda "N free".
  - Pastda bitta "Get N shells · $X" tugmasi, platformaga qarab "paid through the App Store/Google Play".
  - `ShellPack.best` → `popular` deb qayta nomlandi, `amount` (son narx) qo'shildi.
- Tekshirildi:
  - `tsc` toza, konsolda xato yo'q.
  - Paket tanlanganda tugma o'zgaradi, `aria-checked` to'g'ri ishlaydi.
  - Xarid: balans +320. "Add" bosilganda Kai "Friends" bo'ldi.
  - Bu sinovlar vebdagi localStorage'ni o'zgartirdi, telefonga ta'sir qilmaydi.
- 2-bosqich commit qilindi (`e352a8e`).

## Qilingan ishlar (2026-10-06): redesign 3-bosqich — TAYYOR (commit qilinmagan)
- Diary:
  - Har sahifada takrorlangan otter muqovasi o'rniga sahifaning o'zi: katta sana (Fredoka), sarlavha,
    matndan parcha va "X wrote back".
  - Sahifalarni surish (pan gesture) saqlandi. FAB o'rniga "Write today's page" tugmasi.
- Secret note: markazda kunning savoli, muhrlangan xat yalpiz qulf bilan, pastda "Swap notes · 3".
- Gifts: 7 kunlik doiralar qatori, g'ildirak tinch ranglarda (jackpot yalpiz, "Spin" o'rik).
  Aylanish animatsiyasi qoldi. Video ko'rish pastki qator.
- Qo'ng'iroq: Mute, End va Speaker tugmalari, yozuvlari bir qatorda.
  Mute va Speaker hozircha faqat holatni ko'rsatadi (expo-audio yo'q). Theme'ga `onMedia*` tokenlari qo'shildi.
  Kiruvchi qo'ng'iroq va Bedtime ataylab o'zgartirilmadi (to'liq portret va tungi sahna).
- Ro'yxatga o'tganlar: Memories, Call history, Dating, Radio, personaj sozlamalari
  (bo'limlar: This chat, Character, Manage). Contacts, Board, Background, Search va Photo booth'da
  soyalar ingichka chiziqqa almashtirildi.
- Create character endi yorug': lokal `dark` palitra o'rniga `form` (theme tokenlari).
  Diary write'dagi daftar qog'ozi qoldi.
- **Muhim tuzatish, `PressableScale`:** Reanimated'ning animatsion uslubi `opacity`ni bosib ketardi, shuning uchun
  o'chirilgan tugmalar butun ilovada yoqilgandek ko'rinardi. Endi `disabled` holatda oddiy `Pressable`
  0.45 opacity bilan chiziladi. Natijada `onPress`siz `Chip` xira bo'lib qolardi, shuning uchun
  bunday Chip endi oddiy `View` bo'lib chiziladi.
- Matnlar sentence case'ga o'tkazildi ("ADD CHARACTER" → "New character", Settings va boshqalar).
  Mahsulot nomlari (Shell Store, Heartbeat Diary, Photo Booth, Bulletin Board) bosh harfda qoldi.
- Tekshirildi: `tsc` toza, 18 ta ekran xatosiz render bo'ldi (iframe orqali). Mute toggle'i ishlaydi.
  Bo'sh xatda Swap tugmasi 0.45, yozilgandan keyin 1.
- Konsoldagi "shadows is not defined" va "useEffect is not defined" xatolari ESKI: ular tahrir o'rtasidagi
  HMR'dan qolgan, hozirgi kodda yo'q.

## BIMOBIMO raqobat tahlili (2026-10-05, xulosa)
- BIMOBIMO: App Store (US) 4.9 / ~5.5K baho; kuchi — ovoz va "haqiqiyday" suhbat.
- Sharhlardagi asosiy shikoyatlar: xotira (unutadi), takroriy iboralar, acorn devori
  ("hamma narsa pullik"), rasmni tanimaydi, til xatolari, rus tili yo'q, widget/qo'ng'iroq buglari.
- Rafti'ning ajralib turish yo'li: (1) ko'rinadigan va boshqariladigan xotira (Memories ekrani bor),
  (2) adolatli iqtisod — qo'ng'iroqlar bepul, javob o'rtada kesilmaydi, (3) rus/o'zbek/turkiy tillar,
  (4) original "tirik dunyo" (voqealar, guruh chati — NEON TIDE), (5) rasmni tushunish,
  (6) xavfsizlik (yosh tekshiruvi, AI ekanini oshkor qilish, inqiroz yordami).
- Arxitektura xavflari: barcha xabarlar bitta AsyncStorage kalitida (Android ~2MB qator
  chegarasi) → `expo-sqlite`; hisob/sinxron yo'q; balans faqat qurilmada; push yo'q;
  store ~1000 qator monolit; test/analitika/Sentry yo'q; dark mode yo'q; faqat ingliz tili.

## Keyingi ishlar (tavsiya etilgan tartib)
1. ✅ `redesign` PR'i merge qilindi (#3).
2. ✅ Backend rejasi yozildi (`docs/backend-plan.md`). Keyingi qadam: 12-bo'limdagi savollarga
   javob olish, keyin B0 (poydevor).
3. Xabarlarni `expo-sqlite`ga ko'chirish + sahifalash.
4. Push bildirishnomalar (VoIP/CallKit qo'ng'iroqlar uchun), Sentry, analitika.
5. Xavfsizlik: yosh tekshiruvi, AI disclosure, moderatsiya, UGC shikoyat, ovoz klonlash roziligi.
6. Tillar: rus, o'zbek (i18n tayyor — har til bitta JSON).
7. Keyin: dark mode, widget, guruh chati, dunyo voqealari, rasmlarni WebP'ga o'tkazish.
8. Ixtiyoriy: Oppa va Luna portretlari. Nashrdan oldin "Rafti" tovar belgisi tekshiruvi.
