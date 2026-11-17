# "Tide": the look from the owner's Dribbble boards (proposal, waits for the owner's yes)

Status: **PROPOSAL, 2026-11-17 (Claude 1, Opus 5.5).** Nothing in `src/` is changed. Code starts only after
the owner approves the canvas (project rule: prototype first).

**Canvas (5 artboards, our own cast art): https://claude.ai/artifact/V8FohgqgTLfyZoAN3raPbZ**
Tokens sheet, Chats, Chat, Find, Profile.

## 1. The ask

The owner sent 7 Dribbble boards of dark AI-companion / dating apps and a brief: extract their design DNA
(obsidian-teal ground with an aurora glow, translucent glass cards with hairline rims, electric cyan + coral
accents, editorial mixed titles, persona header with trait pills, coral outgoing bubbles, cyan voice notes,
fanned photo stacks, full-bleed character cards, glass chat rows with swipe actions, a bento profile), keep
all logic and Supabase as they are, audit first, propose the design system and the migration order, and
wait for confirmation before the first screen. Structure and manner only: none of the boards' pictures,
names or words (AGENTS.md).

**Name: Tide.** The boards' palette read as the sea at night: the deep teal ground is the water, cyan is
bioluminescence, coral is the reef. It fits the brand (sea otter, shells).

## 2. Audit: where the app stands (A51 drive + code, 2026-11-17)

**Already like the boards** (Ink, `src/theme/ink.ts`, `src/components/ink/`):
- Night ground whatever the phone says (`#09090D`), cards a step above (`#16161E`) with the same
  `rgba(255,255,255,0.08)` rim the boards use.
- Serif titles with an italic emphasis (`inkEm`, Source Serif 4 600 / 600 Italic, Cyrillic + Vietnamese).
- Photo cards with a scrim and clear glass buttons (Today hero, Find's featured card, moment cards).
- Floating dark glass tab bar drawn without a live blur (owner's pick A, `inkGlass`).
- Side-lit record cards (`GlowCard`), coloured icon tiles on settings rows, Us's packed talk bubbles
  (our answer to the boards' metaball clusters).

**Different from the boards:**

| Area | Now | Boards / Tide |
|---|---|---|
| Ground | neutral obsidian `#09090D`, flat | teal obsidian `#070D11` + a static aurora at the top |
| Accents | white pill for the main action, peach for the user and money, blue unread | cyan for the main action and "chosen", coral for the user, unread and money |
| Chats rows | plain rows with hairlines (Apple Messages) | each row its own glass card (radius 20), ring avatar, coral unread, swipe for Delete / More |
| Chat header | avatar, name, "AI · mood", call | + official seal, one-line tagline, trait pills, "Online · mood" pill |
| Bubbles | grey them / peach me | slate `#132226` them / coral me (white words), cyan voice-note play |
| Find | featured photo card, Say hi glass pill | + relation badge, glass trait pills, round Save / Say hi, a 3-column "talked about" grid |
| Profile | settings list | completion ring, 3 stats, 2x2 bento with corner glow and a cyan arrow, shells card |
| Titles | serif, one word | mixed: first word serif italic, rest the system face |

**Kit state:** `GlowCard`, `InkScreen`, `InkSegmented`, `InkChip`, `InkText` / `InkEm`, `PillButton`,
`Tile`, `ReactionGlyph`. Screens still off the kit: the list in `docs/agent-tasks/design-audit-2026-11-15.md` §5.

**Dependencies:** everything Tide needs is already in preview APK 1.2.0: `expo-linear-gradient`,
`react-native-svg`, `@shopify/react-native-skia`, `react-native-reanimated` 4.7, `react-native-gesture-handler`
3.3, `expo-image`, `expo-blur` / `expo-glass-effect` (iOS). **All of Tide ships by OTA; no new build.**
Not added: `lucide-react-native` (owner rule: SF-Symbols-style icons; `expo-symbols`, Ionicons and Phosphor
are already there) and `@shopify/flash-list` (our lists are well under 200 rows; `FlatList` with a stable
`renderItem` and `windowSize` is enough until a measurement says otherwise).

## 3. Feasibility on a Galaxy A51 at 60 fps

**Full fidelity now:** tokens; the aurora (one static SVG radial gradient per screen in `InkScreen`, never a
blur); glass cards (translucent fill + hairline; a real backdrop blur only on iOS, drawn glass on Android);
cyan / coral gradients (`LinearGradient`); filter and trait pills; the persona header; bubble colours;
the voice-note bubble (colours only: the wave's motion stays, owner rule); the fanned photo stack (absolute
`expo-image`s with rotate transforms, only when a reply carries 2-3 pictures); bento cards with a corner glow
(SVG radial gradient); the completion ring on a rounded square (SVG `Rect rx` + `strokeDasharray`, filled by
Reanimated `animatedProps`); swipe-to-reveal rows (`ReanimatedSwipeable` from gesture-handler, one row open
at a time, a light haptic at the threshold); mixed titles.

**Simplified:**
- Metaball "goo" clusters -> our packed circles with rings (Us). A blur + threshold shader costs too much on the A51 GPU.
- Concave / notched card masks -> continuous-corner rectangles.
- Coloured glow shadows (CSS `box-shadow` in cyan) -> Android elevation cannot be coloured; a soft radial
  gradient sits behind the element instead.

**Not taken (product changes, the owner decides separately):** the swipe deck with ✕ on Find (a dating
mechanic), live "rooms" / top hosts, the gender / age picker onboarding (ours was just approved), a TTS badge
on bubbles (waits for friends' voice notes, paused by the owner), "verified" in the people sense (ours is a
Sigmazam-character seal only).

## 4. Tokens (proposed values; `src/theme/ink.ts` keeps its role names)

| Role | Now | Tide | Note |
|---|---|---|---|
| `ground` | `#09090D` | `#070D11` | teal obsidian |
| `aurora` (new) | – | radial `#0E4A5E` at 55-65 %, top centre, fading by 72 % | static, one per screen |
| `card` | `#16161E` | `rgba(255,255,255,0.05)` (solid fallback `#0F171C`) | glass on the ground |
| `edge` | `rgba(255,255,255,0.08)` | same | |
| `raised` | `rgba(118,118,128,0.24)` | `rgba(255,255,255,0.07)` | chips, fields, round buttons |
| `text2` | `rgba(235,235,245,0.62)` | `#93A3B5` | 7.6:1 on the ground |
| `text3` | `rgba(235,235,245,0.55)` | `#7C8C9E` | 5.7:1 |
| `cyan` / `cyanEnd` (new) | – | `#38E4FF` -> `#00B4D8` | main action, chosen pill, play, progress |
| `onCyan` (new) | – | `#032630` | words and glyphs on cyan (>10:1) |
| `coral` (new) | – | `#FF5E2B` | glows, dots, icons, the Say hi disc (no words on it) |
| `coralInk` (new) | – | `#CF4318` | any coral surface with words: badges, unread, "Get more" (white 4.7:1) |
| `bubbleMe` | peach | `#CF4318` -> `#B5320B`, white words | 4.7:1 or better |
| `bubbleThem` | grey | `#132226` + `edge` | |
| `online` | green | `#22C55E` | dot and "Online" pill |
| `pill` / `onPill` | white / black | cyan / `onCyan` | the one main action per screen |
| `accent` (peach) | user + money | stays only where the brand needs it (shell art) | coral takes its jobs |
| `unread` | `#0A84FF` | `coralInk` | |

**Type:** no new font. `EditorialTitle` (in `ink-text.tsx`) renders an i18n string with a `*word*` marker:
the marked word in Source Serif 4 SemiBold Italic, the rest in the system face 600, both on the `display`
role (34/41). A title with no marker and one word is all italic; CJK and Thai fall back to the system face.
The marked word is chosen per locale by whoever writes the string (14 locales).

**Radii:** chip 18, row card 20 (new `row`), field 20, card 28, tile 32, sheet 34, pill 999. Gutter 20.

**Glow presets:** `glowCorner(hue)` (radial, bottom-right, 30 %), `glowSide(hue)` (today's `GlowCard`), `aurora`.

## 5. Kit work (extend, never fork)

`InkScreen` gets the aurora (on by default) · `EditorialTitle` · `GlowCard` gains `glow="corner"` ·
`BentoCard` (icon tile, serif label, cyan arrow disc, corner glow) · `InkChip` kinds `filter` (cyan when on,
coral count) and `trait` (glass) · `CompanionCard` (Find's featured card + relation badge + trait pills +
round actions; face on the trailing side, owner rule) · bubble colours + `PhotoStack` + cyan send in the
composer · `SwipeableChatRow` (Delete, More) · `PillButton` primary -> cyan.

**Owner's canvas comments, 2026-11-17 (these override the tables above):** no new colours, Apple iOS rules
everywhere. Cyan and coral are dropped: the main action stays the white pill / white disc with black glyph,
the user's bubble and money stay peach (`#FFB37A`, dark words), delete is iOS red `#FF453A`, unread counts iOS
blue `#0A84FF`, the tab-bar badge red, online green; no gradient avatar rings, no coloured glows (a faint white
light at most). Filters keep today's look (Chats: the chosen pill outlined in white, the rest grey; Find:
the grey segmented control). Icons are white only, SF Symbols "hierarchical" style (a white line over a
20-25 % white fill), never a colour inside; the tab bar is iOS: current tab a filled white glyph in the clear
lens, the rest grey outlines, no glow. The chat's call button keeps today's plain handset. What stays from
Tide: the teal ground + faint aurora, glass cards, lit glass round buttons, the layouts (glass chat rows with
swipe, persona header, companion card, bento profile with the counts inside the cards).

**Icons, first pass (superseded by the comments above):** duotone
glyphs, a white line over a soft tone fill (cyan for actions, coral for love / the user, red for delete):
`phosphor-react-native` with `weight="duotone"`, `duotoneColor`, `duotoneOpacity` (already installed, Explore
uses it), or our own SVG paths drawn the same way. Containers: `RoundIcon` becomes a lit glass orb (top-to-bottom
white 17 % -> 4 % gradient, 14 % rim, a 1 pt highlight along the top, soft drop below); the one main action per
screen sits in a gradient disc (cyan, or coral for Say hi) with a faint ring and glow; settings tiles get a
two-stop gradient and an inner highlight. Tab bar: inactive glyphs duotone at 55 % white, the current tab a
filled cyan gradient glyph with a glow (on Android the glow is a radial gradient behind it, no shadow). Shapes stay
SF-Symbols-like (owner rule); no 3D clay icons.

**Profile (owner comment on the canvas):** no separate stats row; the counts live in the bento cards (Friends
with a stack of faces, Memories with a few glints); the message count is dropped.

## 6. Migration order (each step one commit, OTA, driven on the A51 worst case: Russian, long names, 12 friends, empty)

0. **Tokens + kit.** Every screen already on the kit turns Tide at once (ground, aurora, cyan, coral).
1. **Chats:** mixed title, filter pills, glass row cards, swipe actions.
2. **Chat:** persona header, trait pills, online pill, bubbles, voice-note colours, photo stack, composer.
3. **Find:** companion card, "talked about" grid.
4. **Profile:** completion ring, stats, bento, shells card.
5. **The rest** follow the tokens; screens still off the kit move in the 2026-11-15 audit's §5 order.

Shapes the owner approved stay as they are and only take the new colours: Heartbeat diary (paper stays
paper), onboarding gift, moment cards, Us bubbles, the tab bar, reactions.

## 7. Waits on the owner

One yes for the canvas covers: Tide's ground and aurora, cyan for the main button (replacing the white pill),
coral for the user's bubble and unread (replacing peach and blue), mixed titles, Chats rows as glass cards
with swipe actions, the persona header, Find's companion card and the bento profile.
