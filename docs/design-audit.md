# Design audit (2026-10-24)

This replaces the audit of 2026-10-09, which graded screens against the first "calm cards" pass.
Since then every screen moved to the iOS look (owner's direction, 2026-10-16) and, where it fits,
onto the aurora ground (2026-10-21). Rules: `docs/design-style.md`, with Apple's HIG read first.

## Screens

All 54 screens on the screen map are done (flows.md D33 to D62). The map keeps each screen's status:
https://claude.ai/artifact/Mv1gJHu1TTxNS55aZjkkYw

## Review after the map was complete (owner's queue, 2026-10-24)

| # | Item | Result |
| --- | --- | --- |
| 1 | One colour and glyph per module on every screen | done, D60 |
| 2 | The last 3D UI icons | done, D61 |
| 3 | Couple quiz in the iOS look | done, D62 |
| 4 | Palette: the accent off plain text, iOS orange off non-warning tiles | done, D63 |
| 4 | Palette: hand-written colours into the theme, iOS dark tones | done, D64 |
| 5 | Haptics by their HIG meaning, with a switch | done, D65 |
| 6 | Cleanup: dead colour tokens, the unused character card, this file | done, D66 |

## Still open

- The largest text size (iOS Dynamic Type, Android font scale) on fixed-height cards (Today's
  widgets, inset rows) has not been checked on a phone.
- Phone checks not done yet: the intro and onboarding (D58), haptics (D65), Today's drag-to-swap
  (D31) and dark mode after D64.
- Content art keeps its own colours on purpose; the list is in `docs/design-style.md` §1.
