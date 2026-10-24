# Sigmazam design style ("calm cards")

The user chose this style on 2026-10-09 as **the one design method for the whole app**. Every new
screen, and every screen that is changed, follows it. The reference is the F17 plan screens:

- Store → Plans (`src/components/plans/plan-picker.tsx`)
- My plan (`src/app/my-plan.tsx`)
- Out of shells sheet (`src/components/paywall-sheet.tsx`)
- Call paywall and out-of-minutes sheets (`src/components/plans/`)
- In-call pill, chat system lines (`src/app/call/[id].tsx`, `src/components/chat/message-bubble.tsx`)
- Prototype: https://claude.ai/artifact/7efEmQx5jBq6YvhJF2dzpv

Goal: as simple as BIMOBIMO in flow, but modern and minimal in look. One idea per screen, one main
action, plain words, nothing decorative that does not carry meaning.

It uses the existing tokens (`src/theme`) and kit (`src/components/ui`). This file says how to use them.

## 1. Canvas and color

- **Aurora ground (owner's pick, 2026-10-21): the app's default ground from now on.** `Screen
  background="aurora"` paints `AuroraBackground` (`src/components/ui/aurora.tsx`): four soft colour
  fields drifting slowly (stopped under Reduce Motion), dawn colours in light mode, a northern
  light on near-black in dark mode (`aurora` in `src/theme/colors.ts`). Rules, from Apple's HIG:
  - Controls on it are glass (`AuroraGlass`, `SearchBar tone="aurora"`, `Segmented tone="aurora"`):
    real Liquid Glass on iOS 26+, a see-through fill with a bright rim elsewhere. Content (pictures,
    tiles, lists, text cards) is never glass (HIG Materials: "Don't use Liquid Glass in the content
    layer"); lists and cards on the aurora stay solid `colors.surface`.
  - Where it goes: hub and landing screens where content floats as tiles, cards and shelves: the
    tab roots (Today, Chats, Find, Us), Profile's root, onboarding, plans and paywalls, empty states.
  - Where it does not: screens with their own ground (the chat wallpaper, call portraits, the
    photo viewer, diary covers and paper, Bedtime navy) and dense reading or typing screens
    (settings forms, long lists) where plain grounds keep text easiest to read. Sheets keep the
    system sheet material.
  - Tab bar icons stay one colour over it (HIG Tab bars: no bright tint on a colourful layer).
  - Code must match the canvas: `AuroraBackground` copies the canvas circles (centre, radius, drift)
    and draws each as a blurred-disc gradient. When a screen looks paler or flatter than its
    prototype, compare against the canvas first.
- iOS grounds (owner's pick, 2026-10-16, toward Apple's own apps): `colors.bgPlain` is white
  (#FFFFFF) for plain lists, `colors.bg` the grouped grey (#F2F2F7) behind cards; dark mode is
  black (#000000) with #1C1C1E cards. Exceptions that keep their own canvas: the chat
  (wallpaper), the call screens (blurred portrait), the Today hero photo, diary covers and pages,
  Bedtime (`sleepColors`, navy).
- Tab bar: the system bar on iOS (Liquid Glass on iOS 26+, `(tabs)/_layout.ios.tsx`); on Android
  and web a floating frosted pill (Today, Chats, Us) with Find as a round button beside it
  (`(tabs)/_layout.tsx`). Bold labels; icons stay ink (HIG Tab bars: one colour over a colourful
  layer), the current tab is a brighter glass capsule; the bar is the aurora glass with a top rim.
- Content sits on white (`colors.surface`) cards or straight on the canvas. No gradient cards, no
  colored panels behind content (exception list above).
- Peach (`colors.primary`, the logo's apricot) is the app's one accent colour (owner's ask
  2026-10-24, HIG Branding: "use it intentionally for primary actions or status indicators, like
  badges for unread content or an icon for the selected tab"; HIG Color: "Avoid using the same
  color to mean different things"). Use it for: the primary button, selection (ticks, chosen day,
  selected tab on iOS), text buttons and links, unread dots and badges, offer badges, your own chat
  bubble, the brand, and the Store module (the brand's own shop, as the App Store wears Apple's
  blue). Never for decoration, non-interactive text or large backgrounds.
- Module colours (owner's ask 2026-10-24): every module has one hue and one glyph wherever it
  shows (`moduleColors` gradient for Today's tiles and widgets, `moduleFills` flat iOS system
  colour with dark variants for Settings-style row tiles, glyphs in `MODULE_GLYPH`; use
  `ModuleIcon` / `moduleTile` from `src/components/ui/module-icon.tsx`, never a new hex). Calls
  green, Diary brown, Date pink, Sleep indigo, Store apricot, Photos blue, Contacts grey, Gifts
  red, Radio purple, Board cyan, Bond mint, Secret note gold. No module but the Store wears orange;
  shell and chat-cost rows (Shell history, Plans, My plan) wear the Store's apricot too, as shells are
  its currency and the chat is the brand's own bubble. Tiles that are not a module (Profile rows,
  Radio sounds, ledger reasons) take an iOS hue from `systemColors`, never a new hex and never iOS
  orange, which is kept for warnings (a call's last minute).
- Mint (`colors.bondText`) only for the bond: "Voice ready", closeness, relationship.
- Ink (`colors.text`) marks selection: 2px ink border on a chosen card or chip.
- Grey fill (`colors.surfaceAlt`) for unselected chips, segmented track, icon tiles, locked inputs.
- Where colours live (palette pass 2, 2026-10-24): all of them in `src/theme/colors.ts`. `colors`
  for grounds, text, lines, `well` (an inset tray in a card), `track` (a progress bar's empty part),
  `successText` / `dangerText`; `aurora` for the aurora ground, its glass and `shadow` (the soft card
  shadow, black in dark mode); `systemColors` for every iOS system hue (red … gray, gray2, fill)
  with Apple's dark tones; `moduleColors` / `moduleFills` for modules; `storeColors` and
  `gradients.pro` for the Store; `sleepColors` for Bedtime. A new hex in a screen is a bug, except
  content art that is the same in both themes: paper notes (`board/stationery.tsx`), date tickets,
  Photo Booth frames and pictures, world and date-theme colours in `src/mock`, white on photos and
  scrims, the approved intro and onboarding art, and the alarm's sunrise.
- Dark mode (follows the phone, `isDark`): every colour comes from `colors`, never `palette` or a
  literal, except paper and photos. Text or an icon on an ink fill uses `colors.textOnInk`, not
  white. Text on light paper (diary page, polaroid, board note) uses paper ink, not `colors.text`.

## 2. Type

- Screen title in the header: `h3` (19 bold), left-aligned next to the back chevron.
- Optional intro at the top of a screen: headline `h2` (24 heavy) + one `body` line in
  `textSecondary`. Only on screens that sell or explain something (Plans, an empty first visit).
- Section titles: `h3`. Not `h1`/`h2`, not uppercase labels.
- Row titles `bodyStrong` or `title`; secondary lines `small`/`body` in `textSecondary`.
- Numbers that matter read as sentences: "42 of 60 min left", "32 left today", "Renews Nov 3".
- Fine print: `small` or `caption` in `textSecondary` / `textMuted`, under the thing it explains.

## 3. Layout

- 16px side gutter (`space.lg`). 12px between cards, 22–24px between sections.
- The four tab roots (Today, Chats, Us, Find) keep their large title instead of a back header.
- Header: back chevron + title left; at most one icon button on the right. No subtitle in the
  header (put it in the intro or nowhere). No centered titles.
- One scroll column. A screen whose goal is an action ends in a bottom **action bar**: white,
  hairline top border, full-width `Button size="lg"` (56px) and a one-line caption (price, terms,
  what happens next).

## 4. Components

| Need | Use | Notes |
| --- | --- | --- |
| 2–3 views of one screen | `Segmented` | Plans / Shells. Not chips. |
| Filters with many options | `Chip` | Find categories, styles. |
| Pick one of a few big options | Select card | White, radius 20, 1px `border`; chosen = 2px ink. Title `h3`, price line, check list (`checkmark` 16, ink). See `PlanCard`. |
| Pick one of a few small options | Option chips | `surfaceAlt` fill, radius 14, 52px; chosen = white + 2px ink. See billing periods. |
| Settings and links | `ListRow` | On the canvas. Leading icon: a line icon (Ionicons outline, 19px, ink) in a 36px `surfaceAlt` tile with radius 11, or nothing. |
| Usage | Meter | Row (tile + label + "x of y left") and an 8px bar: `border` track, ink fill. |
| A badge | Pill | Offer: `primarySofter` fill, `primarySoft` border, `brandText`. Neutral: `surfaceAlt`. |
| Choices in a sheet | Bordered box | One white box, radius 22, rows 64px with 36px art, title + one line, chevron; dividers between rows. All options look equal. |
| System line in chat | Centered pill | `caption`, `textSecondary`, max 86% wide. |
| Empty state | `EmptyState` | Mascot art, one title, one `secondary` button. |

3D art (`Icon3D`, `ClayIcon`) is for **one** focal point: a sheet's head (52px), a screen's head
(56px), the currency, an empty state, or the rows of a short "choose a way" box. Not for every row
of a settings list.

## 5. Buttons

- One primary (`variant="primary"`, orange) per screen or sheet.
- Second action: `variant="secondary"` (white, hairline border).
- Leave / dismiss: `variant="ghost"` ("Not now", "Done").
- The label says the outcome and the price when there is one: "Start 3 days free",
  "Add 10 min · 120 shells", "Get Basic — $79.99". Under it, the caption: "Then $9.99 a month.
  Cancel anytime."

## 6. Sheets

- Bottom sheet for decisions; centered card only for a celebration or a one-tap confirm.
- Head: 52px art + `h3` title + one status line (a balance pill or a short fact).
- Then one `body` line in `textSecondary`, then options or the button stack.
- Never block without a way out: every sheet has a ghost dismiss or closes on the scrim.

## 6b. Haptics

From HIG Playing haptics (read 2026-10-24). Always through `haptic` in `src/lib/haptics.ts`, never
`expo-haptics` directly, so the Profile → Haptics switch silences them all. Each keeps Apple's meaning:
`selection` when a wheel passes a value, `tap` for a small press (send, answer, call controls, the
mascot), `lift` when a long press opens a menu or edit mode, `success` when a task finishes (a
purchase, a trial, minutes added, a gift, a redeemed code, a level up), `error` when one fails, and
`toggle` for switches on Android (iOS's UISwitch plays its own). Nothing on tab taps, scrolling or
every button: Apple's own tab bars stay silent, and the HIG warns against overuse. The first-launch
intro keeps its own three taps (approved, timed to the motion).

## 7. Words

- English UI, sentence case, short. Say what happens and what it costs; no exclamation marks
  except a welcome.
- Same price, same words everywhere (`src/components/plans/copy.ts` holds the plan wording).
- No pressure: options shown side by side and equal, no fake timers, no hidden prices.

## 8. Do not

- Gradients, glows or heavy shadows on content (shadows: `card` at most).
- Several orange buttons on one screen.
- Header subtitles, centered titles, giant section titles.
- A 3D icon on every list row.
- Chips used as tabs.
- Removing an existing animation (AGENTS.md).

## 9. Applying it to older screens

Every screen on the map follows this style since 2026-10-24; `docs/design-audit.md` has the latest
review and what is still open. A screen the user approved is changed only when the user asks for
that change.
