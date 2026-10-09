# Rafti design style ("calm cards")

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

- App screens sit on `colors.bgPlain` (#FCF9F5). Exceptions that keep their own canvas: the chat
  (wallpaper), the call screens (blurred portrait), the Today hero photo, diary covers and pages.
- Content sits on white (`colors.surface`) cards or straight on the canvas. No gradient cards, no
  colored panels behind content (exception list above).
- Orange (`colors.primary`) only for: the one primary button, offer badges, the brand. Never for
  body text or decoration.
- Mint (`colors.bondText`) only for the bond: "Voice ready", closeness, relationship.
- Ink (`colors.text`) marks selection: 2px ink border on a chosen card or chip.
- Grey fill (`colors.surfaceAlt`) for unselected chips, segmented track, icon tiles, locked inputs.

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

Screens built before 2026-10-09 do not all follow this yet. `docs/design-audit.md` lists each one
and what it needs. Screens the user approved earlier (Diary, Onboarding, Home, Notifications, Us,
Dates, the chat "+" games) are restyled only after the user says so for that screen.
