# Ink task 2: the four tabs and the tab bar

Rules: `docs/agent-tasks/ink-rules.md`. Plan: `docs/design-ink.md` §3. Needs task 0 and the
motion kit (`PulseRing`, `DiscStat`, `GrowInto`).

Files you own: `src/app/(tabs)/**`, `src/components/today/**`, `src/components/today-hero.tsx`
(type only), `src/components/us/**` except `bond-share-sheet.tsx` (a share poster),
`src/components/find/**`, `src/components/ui/tab-glyph.tsx`.

Do the tabs in this order, one commit each: Chats, Find, Us, Today, tab bar.

## Chats (`(tabs)/chat.tsx`)

Same list, filters, swipe actions, edit mode, search, compose. Ground `ink.ground`; large title
`InkTitle`; filter chips `InkChip`; a row is: face with a 2 px ring in `friendGlow(id).from`, name
17 semibold, last line 15 `ink.text2` (two lines as today), time 13, unread a white dot with the
count; hairline from the text's leading edge. Bond hearts and level stay as they are placed today.
A row opens the chat through `GrowInto` only if the motion kit offers it for that route; else the
normal push.

## Find (`(tabs)/find.tsx`)

Featured photo cards stay (picture, scrim, clear glass button, `portraitPosition`); names move to
serif. "Who do you miss?" seats stay, restyled as dashed `RoundIcon`s with labels. The four
circles ("Relationships") become four `Tile`s in a 2-column grid, each in its `worldHue`, name in
serif, the count of people under it; tapping one opens what it opens today. Search: `InkField`
look on the same `SearchBar` logic. The round + stays top right.

## Us (`(tabs)/us.tsx`, `components/us/*`)

Same sections and sheets. Title `InkTitle`; plan calendar as a month grid on black with each
friend's dot in their hue under the day; "Our moments" rows as `GlowCard`s in the friend's glow
(the day as the top-left note, the line bottom-left, their face trailing); a `DiscStat` block for
the share of talk per friend only if that number already exists in a selector (do not compute new
data: if it does not exist, leave the block out and say so). Plan and publish sheets: `InkSheet`.

## Today (`(tabs)/index.tsx`, `components/today/*`)

The photo hero is untouched except its name (serif) and field. Under it, one column, 12 pt gaps:
1. the day's ring row: `PulseRing` (64 pt) with the streak or check-in state the screen already
   has, the day's line beside it in serif;
2. everything that "waits" today (a sealed note, a missed call, a plan, a quiz) as `GlowCard`s
   in the friend's glow, the same taps as the widgets they replace;
3. shortcuts that are not waiting (Sleep, Radio, Store …) as one horizontally scrolling row of
   labelled `RoundIcon`s in their `moduleFills` colour.
Keep the order logic of `widget-models.ts` (what shows and when); change only how a model renders.

## Tab bar (`(tabs)/_layout.tsx`, Android and web only; `_layout.ios.tsx` stays)

A flat bar on `ink.ground` with a 24 pt fade above it: Today, Chats, Us, Find as four equal
tabs (Find joins the row; its route and behaviour stay), thin line glyphs 24 pt, 11 pt labels,
current one `ink.text`, others `ink.text3`. No pill, no blur.

## Worst cases

Chats with 60 rows and a 40-character name; Today with nothing waiting (ring row + shortcuts
only) and with eight things waiting; Find with one character in a circle; Us with no plans and no
moments (existing empty states, restyled).
