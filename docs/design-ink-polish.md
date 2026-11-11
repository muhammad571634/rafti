# Ink, the Apple HIG pass (amends `docs/design-ink.md`; read both, this file wins where they differ)

Owner, 2026-11-11, after looking at the 52-screen canvas: "the direction is right; now polish it deeper,
everything from Apple's own design foundations" (link: https://developer.apple.com/design/).
Source: the HIG pages read through `developer.apple.com/tutorials/data/design/human-interface-guidelines/<page>.json`
on 2026-11-11: typography, color, dark-mode, layout, buttons, tab-bars, lists-and-tables, accessibility,
sheets, motion, playing-haptics, loading, progress-indicators, segmented-controls, toggles, text-fields,
materials, onboarding, charts. Each rule below names its page.

Canvas (v14, polished): https://claude.ai/artifact/A3giYifq4CjLwTEqDPKMdp. Its `project/ink.css` is the
reference for every value below. Boards rewritten in this pass: Today, Chats, Find, Us, Friend, Profile,
Store, Calls, Contacts, Onboarding 4, Writing, Level up; new row 10 has Today, Chats and Profile in light.
The other boards changed only through the shared stylesheet.

## 1. Type: the iOS Dynamic Type "Large" steps (Typography)

"Consider using the built-in text styles"; "follow the recommended default and minimum sizes";
"minimize the number of typefaces". Two faces stay (serif says, system reads); every size is an iOS step.

| Ink variant | iOS style it sits on | Size / line | Face |
|---|---|---|---|
| `inkDisplay` | Large Title | 34 / 41 | serif, tracking -0.5 |
| `inkTitle` | Title 1 | 28 / 34 | serif, -0.4 |
| `inkCard` | Title 2 | 22 / 28 | serif, -0.25 |
| `inkCardSmall` (new) | Title 3 | 20 / 25 | serif, -0.2 |
| row title, value, field, button | Body / Headline | 17 / 22 (semibold for names and buttons) | system |
| chips, segments, secondary line | Subheadline | 15 / 20 | system |
| section label, field label, timestamps | Footnote | 13 / 18 | system |
| capsule, icon label | Caption 1 | 12 / 16 | system |
| tab label | Caption 2 | 10 (iOS tab bar) | system |

- The canvas had off-steps (27, 16, 14, 12.5): replaced. Values in rows are 17, not 15.
- Numerals use tabular lining figures (`fontVariant: ['tabular-nums', 'lining-nums']`).
- Dynamic Type (Typography, Accessibility): serif variants scale with the setting through
  `allowFontScaling` and a `maxFontSizeMultiplier` of 1.6 on display sizes only; at accessibility sizes a
  row puts its value under its title instead of truncating ("avoid truncating text in scrollable regions").
- Never Light or Thin weights (Typography): serif SemiBold, system Regular / Semibold only.

## 2. Colour (Color, Dark Mode, Accessibility)

- Labels: primary `#FFFFFF`; secondary `rgba(235,235,245,0.62)` (6.4:1 on black, 5.7:1 on the card);
  tertiary `rgba(235,235,245,0.55)`, the lowest allowed for any text (5.4:1 / 4.9:1). Apple's own tertiary
  (0.3) is for placeholders only. Light: `rgba(60,60,67,0.66)` and `0.62`.
- Card `#1C1C1E` and raised `rgba(118,118,128,0.24)` are Apple's secondarySystemBackground and fill
  (were `#111113` and white 10%). Hairline `rgba(84,84,88,0.6)` at 0.5 pt is Apple's separator.
- "Avoid using the same color to mean different things": white fill means only "the primary action".
  A chosen chip is a tinted fill with a 1.5 pt ring (its friend's hue when it belongs to a friend), never
  white. The unread dot is system blue, as in Mail and Messages.
- Tiles: white words on hue tiles failed (gold 2.7:1). Tiles are the flat hue with black words
  (worst case indigo 4.7:1). A key word in light mode is its hue mixed 55% with black (every hue ≥ 5:1).
- Module glyphs on light (Today's shortcut circles) use the same 55%-with-black mix as key words; the
  pastel hue alone is under 3:1 on the light fill.
- Destructive rows and missed calls use system red `#FF453A`, not the friend red.
- "Convey information with more than color alone": a picked card carries a check, an unread row is also
  bold in white, a chart has a legend with numbers.

## 3. Appearance: follow the phone (Dark Mode)

"Avoid offering an app-specific appearance setting"; "ensure that your app looks good in both modes";
"in rare cases, consider using only a dark appearance ... immersive media". Decision for the owner's
open question in `design-ink.md` §4.1: **follow the phone**. Dark is the reference look; every screen
also has the light set (`ink` light values in `design-ink.md` §2, corrected as in §2 here). Always dark,
whatever the phone says: incoming call, in call, alarm ring, bedtime, level-up, the writing wait, launch.
No appearance switch in Profile. The canvas row 10 shows Today, Chats and Profile in light.

## 4. Controls

- **Segmented control** (Segmented controls: "closely related choices that switch a view", nouns,
  equal widths, at most five): every filter row that picks one of 2-5 views: Chats (All / Unread /
  Groups), Find (Everyone / Him / Her), Calls, Contacts, Store (Shells / Plans), Inbox, Memories, Ledger.
  Capsule track `rgba(118,118,128,0.24)`, thumb `#636366` (light: white with a soft shadow), 36 pt.
  Chips stay for picks where several can be on (interests, traits, voice) and for friend pickers.
  Kit: new `InkSegment` (task 0).
- **Tab bar** (Tab bars, iOS: "floats above content", Liquid Glass, labels always, monochrome, badge for
  news): a floating capsule 64 pt high, 18 pt from the sides and 24 from the bottom, on glass; the
  current tab sits in a raised pill; Chats carries a red badge with the unread count. On iOS this is
  the system `NativeTabs` bar (it is Liquid Glass by itself); on Android the kit draws the same capsule
  with `expo-blur` off and a solid `rgba(28,28,30,0.92)` (the A51 cannot afford a live blur). Content
  scrolls under it; every tab screen ends with 104 pt of room.
- **Buttons** (Buttons: "always include a press state"; one primary role): one filled pill per screen;
  secondary actions are tinted pills (`raised` fill), never outlined white; a way out is quiet text.
  Press: scale 0.97 and opacity 0.8, a spring (damping 18, stiffness 320), on every custom button,
  row and tile. On a friend's page the Chat button is the filled one of the five.
- **Navigation**: back, close and more are 44 pt glass circles (iOS 26 toolbar items); on a photo the
  clear variant with a 28% dark layer ("if the underlying content is bright, add a dark dimming layer",
  Materials).
- **Switches** (Toggles: "use the switch only in a list row"; default green): 51 × 31, system green.
  A switch never stands outside a row; outside rows a toggle is a button with an on state.
- **Lists** (Lists and tables, iOS): separators start where the text starts (after an icon, a face) and
  none under the last row; 52 pt rows, 76 pt with a face and two lines; chevron in tertiary.
- **Settings rows** (and the owner's "colour, not just text", 2026-11-08): the iOS Settings tile again:
  a 30 pt rounded square (radius 8) in a system colour with a white glyph (blue `#0A84FF`, purple
  `#BF5AF2`, red `#FF453A`, green `#30D158`, orange `#FF9F0A`, indigo `#5E5CE6`, grey `#8E8E93`).
  This replaces the plan's coloured line glyphs in Profile, Notifications, Language, My plan. A friend's
  page keeps glyphs in the friend's hue (it is their space, not settings).
- **Sheets** (Sheets, iOS): grabber on every resizable sheet, swipe down closes, one sheet at a time,
  Cancel beside any Done. Card colour `#1C1C1E`, top radius 34.
- **Fields** (Text fields): placeholder says what goes in, the field's size matches the text expected.

## 5. Motion and haptics (Motion, Playing haptics, Loading, Progress indicators)

Rules: "add motion purposefully"; "make motion optional"; "aim for brevity and precision";
"avoid adding motion to UI interactions that occur frequently"; "let people cancel motion".
Amendments to the motion kit in `design-ink.md` §2:

| Part | Change |
|---|---|
| `LineIn` | Once per screen per app session, never on a tab revisit, never on a list's rows. 480 ms, 60 ms apart, 8 pt rise. |
| `PulseRing` | Breathes only while there is something to do (check-in not done today, call minutes running); otherwise still. Scale 1 → 1.04, 8.3 s. |
| `DotField` | Stays: it is the progress view of a wait, and "keep progress indicators moving". |
| `GrowInto` | Interruptible: a back swipe mid-way reverses it from where it is. |
| `CountIn` | A tap anywhere jumps to the end. |
| `BubbleField` | Picks fire a selection haptic; nothing else moves under the finger after a pick (the two-taps rule). |
| Reduce Motion | Every part renders its last frame; `GrowInto` becomes a cross-fade. |

Haptics, each with one meaning ("use haptics consistently", "avoid overusing"): selection (segment,
chip, bubble, picker) = `selectionAsync`; primary pill that completes something (buy, create, start a
date) = `notificationAsync(Success)` when it succeeds, not on the tap; level-up, streak = Success;
destructive confirm = `Warning`; nothing on scroll, on tab change or on ordinary rows. All of them obey
the existing haptics switch.

The writing wait (Loading, Progress indicators: "show something as soon as possible"; "use a
determinate indicator when you can"; "let people halt processing"; "avoid vague terms like loading"):
the dot field plus the three steps the model writes (past, habits, what they hide) ticking as each one
lands, and a close button that stops the request. Copy names the friend ("Writing Dan…").

## 6. Charts (Charts)

Us' discs keep their shape but carry no words inside overlaps; a legend under them gives the colour,
the name and the number, and the group has one accessibility label with all three shares.

## 7. Onboarding (Onboarding)

"Fast, fun, and optional"; "teach through interactivity"; "postpone nonessential setup"; a permission
asked in the flow says what it gives. Kept: five steps, the bubble pick, the friend pick (now with a
check on the picked card), the notifications step that names the friend who will text.
Every step but the friend pick can be skipped.

## 8. What changes for the Opus tasks

- Task 0 builds the kit from the canvas `ink.css` v14 (these values), adds `InkSegment`, `SettingsTile`
  (the 30 pt tile), the press spring in one shared `usePress` hook, the badge on the tab bar, and the
  light set from day one (the theme follows `useColorScheme`; the dark-only moments force dark).
- Tasks 1-5: filters become `InkSegment`; settings-like rows use `SettingsTile`; tab screens end with the
  tab bar's room; nothing else in their file lists changes.
- `design-ink.md` §4 item 1 is answered: follow the phone (owner may still overrule).

## 9. Fixed on the canvas in this pass

- The stylesheet used one class `on` for both "words over a picture" (absolutely placed) and the chosen
  state of chips, radios and switches, so every chosen chip, radio and switch was thrown to the bottom of
  its screen. The overlay is now `.pic > .on` only.
- Nested back and close buttons on photos drew a circle inside a circle.
- The button reset (`.s button { background: none }`) out-ranked every class on a button, so tiles,
  glow cards, chips, round buttons and picture cards that were buttons lost their fill (onboarding's
  friend cards showed no picture). The reset is now `:where(.s button)`, zero specificity. In the app
  the same trap is a base `Pressable` style spread after a variant style: the kit spreads variants last.
