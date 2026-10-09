# Design audit against `docs/design-style.md` (2026-10-09)

Every screen was opened on web at 375×812 and compared with the style. Verdicts:

- **fits**: already reads like the reference screens.
- **small**: shared fixes only (header, section titles, row icons, tabs, buttons). No new layout.
- **medium**: the layout changes; needs a prototype first.
- **approved**: the user approved this screen earlier; change it only when the user says so.

Most "small" fixes come from five shared patterns, so fixing the shared pieces once covers many
screens:

1. Header subtitles and centered titles → left title, no subtitle.
2. Giant section titles (`SectionLabel tone="title"` at h1/h2 size) → `h3`.
3. A 3D icon on every settings row → line icon in a 36px grey tile.
4. Chips used as tabs → `Segmented`.
5. Soft orange pill buttons in empty states and headers → `secondary` button / line icon button.

| Screen | Route | Verdict | What to change |
| --- | --- | --- | --- |
| Store, My plan, plan sheets | `/store/shell`, `/my-plan` | fits | Reference screens. |
| Chat room | `/chat/[id]` | fits | Long names truncate in the header next to the shell badge. |
| Character profile | `/character/[id]` | fits | — |
| Chat background | `/character/[id]/background` | fits | Already select cards with an ink border. |
| Call, incoming call, call history | `/call/*`, `/call-history` | fits | — |
| World | `/world/[series]` | fits | — |
| Chats tab | `/(tabs)/chat` | fits | Tab roots keep the large title. |
| Find tab | `/(tabs)/find` | fits | Done in step 1 (2026-10-09). |
| Daily check-in popup | — | fits | Step 1: redesigned as a Today-only sheet, then turned off at the owner's request; shells arrive quietly. |
| Character settings | `/character/[id]/settings` | fits | Done in step 1. |
| Memories | `/character/[id]/memories` | fits | Done in step 2 (2026-10-10). |
| Profile | `/profile` | fits | Done in step 1; invite card removed (offer on the Free gifts row). |
| Edit profile | `/edit-profile` | fits | Done in step 2: h3 sections, secondary "+" chip, ink meter and camera badge. |
| History (ledger) | `/store/ledger` | fits | Done in step 1. |
| Radio | `/radio` | fits | Done in step 1: selected track card and a time-left bar. |
| Secret note | `/secret-note/[id]` | fits | Done in step 2: no header avatar, h3 "Your note", action bar. |
| Message board | `/board` | fits | Done in step 2: line "+" icon button, plain canvas. |
| Our dates album | `/date/album` | fits | Done in step 2: plain canvas; empty-state button is `secondary` everywhere. |
| Contacts | `/contacts` | medium | Grid of shadowed cards with a dashed "Add one"; info icon. Move to a list or select-card grid in the style. |
| Create character | `/create-character` | medium | Long form: h3 sections, bottom action bar with the price, consistent field style. |
| Free gifts | `/gifts` | medium | Five blocks with mixed styles (check-in dots, wheel, invite, code, video); regroup into h3 sections, one primary button. Keep the wheel and its animation. |
| Photo Booth | `/photo-booth` | medium | Header subtitle, teal gradient card, mid-screen button; preview card on white, action bar with the price. |
| Bedtime | `/bedtime` | medium | Night canvas can stay (like the call screen); header subtitle out, timer as option chips, action bar. |
| Today (Home) | `/(tabs)/index` | approved | Section titles and the 3D tile grid differ from the style. |
| Us | `/(tabs)/us` | approved | — |
| Heartbeat diary, write, pages | `/diary/*` | approved | Centered title; paper style is its own world. |
| Onboarding | `/onboarding` | approved | Close already. |
| Notifications | `/notifications` | approved | 3D icon per row. |
| Dating map and date rounds | `/dating`, `/date/[placeId]` | approved | Playful map is its own world. |
| Couple quiz, truth or dare | `/quiz/[id]`, chat "+" | approved | Shadowed cards with pink tiles. |

## Suggested order

1. Shared pieces (one pass, many screens): header, section title size, row icon tile, `Segmented`
   for tabs, action bar component, empty-state button. Covers every "small" row.
2. Daily check-in as a sheet on Today (also a flow fix: it no longer interrupts other tabs).
3. "Medium" screens one by one, each with a prototype first: Free gifts → Create character →
   Contacts → Photo Booth → Bedtime.
4. Approved screens only if the user asks.
