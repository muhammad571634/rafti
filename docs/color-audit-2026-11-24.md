# Colour audit against Apple HIG (2026-11-24, Claude 1)

Owner's ask: "one brand colour, the soft peach; everything else by Apple's rules. Check it fully, I think
the palette got broken." Sources: HIG Color, Dark Mode, Accessibility (read from
`developer.apple.com/tutorials/data/design/human-interface-guidelines/<page>.json` today), the theme files
after Gemini's 0z331/0z334/0z335, a scan of all 273 screen and component files, and screenshots on the A51
(Today, Chats, Us, Find, a chat).

## HIG rules that apply

1. **Avoid using the same color to mean different things**, and don't use the interactive brand colour for
   non-interactive text (HIG Color, Best practices).
2. **Use system / semantic colours as intended**; don't hard-code values; foreground in four label levels
   (label, secondary, tertiary, quaternary) and backgrounds in primary / secondary / tertiary, with
   base vs elevated in Dark Mode (HIG Color, iOS; Dark Mode, iOS).
3. **Liquid Glass: colour sparingly**; colour the background of the one primary action, not of several
   controls; tab bars and toolbars monochrome over colourful content (HIG Color, Liquid Glass).
4. **Contrast** at least 4.5:1, aim for 7:1 for small custom text; supply increased-contrast variants and
   check Reduce Transparency (HIG Dark Mode; Color).
5. **App-only dark appearance** only "in rare cases" (HIG Dark Mode). Owner chose night only on 2026-11-15:
   kept, but light tokens must keep existing (they do).

## Findings, most important first

| # | What is wrong | Where (count) | HIG rule |
| --- | --- | --- | --- |
| 1 | **Two peaches and three more peach-like shades.** Brand `#EBAD84` (`ink.accent`, 135 uses) beside a second, brighter peach `#FFC497` (`colors.brandText` 39 + `palette.apricot300` 9 uses: plan sheets, quick replies, next chip, diary, family sheet, setup card, level-up), an orange `#F79E63` (`moduleFills.store` tiles), a two-stop CTA gradient `#F0BA95 → #E39E72` (`inkPeachGlass.ctaFill`, 25 uses; owner asked for one flat peach on 2026-11-18, `gradients.primary`), cream `#FFF3EA` / `#FCE2CE` | `src/theme/colors.ts`, `src/theme/ink.ts`, ~50 screens | 1 (one colour, one meaning) |
| 2 | **Brown where peach was meant.** The user's own chat bubble is `#5C3A28` (`bubbleSelf`, seen on the A51: dark brown, not peach); peach "soft" fills are brown hexes `#3B2A26` / `#2E2422` (`primarySoft` 8, `primarySofter` 11: "+ Plan" on Us, diary tools, noted chip, edit-profile add); translucent peach `rgba(235,173,132,0.14-0.34)` over obsidian (13 literals) reads muddy brown (Gemini measured `#53423C`, 0z335) | `colors.ts`, `message-bubble.tsx`, `us.tsx`, `diary/*`, `mind/noted-chip.tsx`, `character/kit.tsx` | 1, 3 |
| 3 | **"Unread" in three colours**: red count on the Chats tab and the Unread chip, peach count/dot in the rows and on Today ("1", "+6"), and a blue `ink.unread` `#0A84FF` token | `(tabs)/_layout.tsx`, `(tabs)/chat.tsx`, `(tabs)/index.tsx`, `ink.ts` | 1 |
| 4 | **Peach on text that is not tappable**: unread rows' dates ("Nov 22"), labels in plan / why / thread sheets, system-message emphasis, "Lv" pills, level-up accents, notification "Turn on" text vs real links in the same peach | `(tabs)/chat.tsx`, `chat/plan-detail-sheet.tsx`, `mind/*`, `chat/message-bubble.tsx`, `level-up/*` | 1 |
| 5 | **Red means both "destructive" and "a feature"**: `systemColors.red` is Delete, missed call, errors, and also Gifts' signature, the birthday row, a gifts notify tile and the Us plan icon | `colors.ts` `signature.gifts`, `edit-profile.tsx`, `gifts.tsx`, `(tabs)/us.tsx` | 1 |
| 6 | **Two grey families mixed**: blue-tinted custom grounds (`#09090D`, `#16161E`, `#1F1F2B`, `#24242E`, `#2A2A38`, `#0E0E14`) beside Apple's neutral greys (`#262628` bubble, `#2C2C2E` divider, `#38383A` border, `#3A3A3C` track, `#636366` thumb, `#1D1D23` glass); text grey at six levels (`text2` 0.62, `text3` 0.55, `#AEAEB2`, `#8E8E93`, `#8E8E9A`, quote 0.74 white) where Apple has four | `colors.ts` `nightColors`, `ink.ts` | 2 |
| 7 | **Too many palettes**: `colors` (legacy), `ink`, `inkPeachGlass`, `inkGlass`, `systemGround`, `storeColors`, `sleepColors`, `playful`, `aurora`, `signature`, `moduleFills`, `moduleTints`, `moduleGlass`, `friendHues`, `friendAccents`, `worldHue`, `inkTints`, `inkReaction`; and **756 colour literals** in 105 screen files (top: onboarding orbit 51, board stationery 46, date ticket 44, alarm ring 25; some are art, most are not) | everywhere | 2 ("avoid hard-coding") |
| 8 | **No accessibility variants**: nothing reads Reduce Transparency or Increase Contrast, so the drawn glass and 0.5-0.6 alpha greys never get a solid fallback | `src/theme/*` | 4 |
| 9 | **Churn**: four palette commits today (3-tier peach, elevated sheets, crystal glass, Store) each adding tokens instead of removing old ones; items 1-2 are what is left behind | git log 2026-11-24 | - |

What is right and stays: `#EBAD84` as the one brand colour with `#2B1305` on it (8-10:1); white label text;
elevated sheets one step above cards (0z334, HIG Dark Mode base vs elevated); system red / green / blue
values for meaning; friend accents in a friend's own space (owner rule 2026-11-08); a monochrome tab bar
with the current tab in a clear lens (HIG Liquid Glass) — its peach label is the app's tint, as iOS does.

## Proposed fix (one Apple-shaped system; needs the owner's yes, design freeze allows it as polish)

1. **One peach** `#EBAD84`, three roles only: the one prominent action per screen (solid fill, `#2B1305`
   text, flat, no gradient); the tint of tappable glyphs, links and the selected state; the user's own
   bubble (solid peach with `#2B1305` text, as iMessage colours your bubble with the accent — the brown
   goes). `brandText`, `apricot300/500` at night, `primarySoft/Softer`, `ctaFill` gradient, `textBright`
   retire; soft selected states use the neutral crystal fill + peach glyph (0z335's rule).
2. **Neutral ladder, one family**: ground `#09090D`, card `#16161E`, elevated `#1F1F2B`, elevated control
   `#2A2A38`, fill `rgba(118,118,128,0.24)`, separator `rgba(84,84,88,0.6)`; the Apple neutral greys map onto it.
3. **Four text levels**: label `#FFFFFF`, secondary `rgba(235,235,245,0.62)`, tertiary
   `rgba(235,235,245,0.55)` (our floor for the A51), placeholder `rgba(235,235,245,0.3)`; the hex greys map onto them.
4. **System colours only for meaning**: red = destructive, errors, missed, and count badges (as iOS app
   and tab badges); green = online / success; the in-row unread mark is the peach dot; dates and labels go
   neutral; blue `ink.unread` retires. Gifts' signature moves off red (owner picks: pink or orange).
5. **Reduce Transparency / Increase Contrast**: one hook in `src/theme`, glass and alpha greys swap to
   solid elevated tones and secondary text to 0.75.
6. **Codemod, then a guard**: screens read only `ink`; a test fails on new hex / rgba literals outside
   `src/theme` and an allow-list for art (orbit, stationery, ticket, mascot, posters).

Order: 1-2 (what the owner sees) → 3-4 → 5 → 6, each checked on the A51 in Russian.
