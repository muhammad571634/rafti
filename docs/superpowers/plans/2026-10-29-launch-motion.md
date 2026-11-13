# Launch Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Welcome back (mascot + last character's bubble over Today after 1 h away) and First hello (night lights gather into the shell, morning, mascot says hello) in the app.

**Architecture:** Pure decision logic in `src/lib/welcome-back.ts` (node tests); a small away-clock module records when the app went to background and whether a notification opened it; a `WelcomeBack` overlay on the Today screen; a `FirstHello` component replaces the onboarding `Intro`. Motion is Reanimated 4 shared values on the UI thread, art via expo-image, glows via react-native-svg.

**Tech Stack:** Expo SDK 57, expo-router, react-native-reanimated 4.7, expo-image, react-native-svg, expo-haptics, AsyncStorage, i18next, `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-29-launch-motion-design.md`. Timelines to mirror: `../sigmazam-motion/src/WelcomeBack.tsx`, `../sigmazam-motion/src/FirstHello.tsx`.

## Global Constraints

- Welcome back shows only after the app has been away for 1 hour or more; never during onboarding, never when a notification or deep link opened the app, never without a conversation.
- Who: the conversation with the newest `lastMessageAt`. Line: its `lastMessagePreview` when `unreadCount > 0`, else a welcome line from the locale files in `i18n.language`.
- All 14 locales get every new key (`npm run check:locales` passes). No language lists in code.
- No new dependency. Keep the design system (`src/theme`, `src/components/ui`). Repo text in English.
- Reduce Motion: fades only. No haptic for Welcome back; one light haptic at the First hello burst.
- `npx tsc --noEmit` (main checkout) and `npm test` pass before each commit.

## Review Focus

- A long line (de/ru/fr, or a long unread preview) must wrap to at most 2 lines inside the bubble and never push it off screen: `numberOfLines={2}`, `maxWidth` = screen width − 32 − mascot overlap.
- First launch after this update has no stored away time: treat as away (show) once, then store. Test `shouldWelcome` with `awayAt: null`.
- Clock moved backwards (awayAt in the future): do not show. Test with `now < awayAt`.
- The user taps the tab bar or scrolls while the bubble is up: the overlay must not block touches outside the bubble (`pointerEvents="box-none"` on the wrapper) and hides on scroll start.
- The conversation's character was deleted: `pickWelcome` skips conversations whose character is missing.

---

### Task 1: Welcome back decision logic

**Files:**
- Create: `src/lib/welcome-back.ts`
- Test: `src/lib/welcome-back.test.ts`

**Interfaces:**
- Produces:
  - `export const AWAY_MS = 60 * 60 * 1000;`
  - `export function shouldWelcome(input: { now: number; awayAt: number | null; onboarded: boolean; fromNotification: boolean; hasConversation: boolean }): boolean`
  - `export type Welcome = { conversationId: string; characterId: string; unreadLine: string | null }`
  - `export function pickWelcome(conversations: Conversation[], hasCharacter: (id: string) => boolean): Welcome | null`
  - `export const WELCOME_LINES = 4;` and `export function welcomeLineKey(now: number): string` → `welcomeBack.line1` … `welcomeBack.line4` (by `Math.floor(now / AWAY_MS) % WELCOME_LINES`, so the line changes between visits).

- [ ] **Step 1: Write the failing tests** in `src/lib/welcome-back.test.ts` (style of `src/economy/shells.test.ts`):
  - `shouldWelcome` true for `awayAt = now - AWAY_MS`, false for `now - AWAY_MS + 1`, true for `awayAt: null`, false when `now < awayAt`, false when `onboarded: false`, `fromNotification: true` or `hasConversation: false`.
  - `pickWelcome` picks the newest `lastMessageAt`; returns `unreadLine` = preview only when `unreadCount > 0` and preview is non-empty; skips a conversation whose character is gone; returns `null` for `[]`.
  - `welcomeLineKey` returns a key matching `/^welcomeBack\.line[1-4]$/` and differs for `now` and `now + AWAY_MS`.
- [ ] **Step 2:** `npm test` → the new tests fail (module not found).
- [ ] **Step 3:** Implement `src/lib/welcome-back.ts` (no React, no `@/` value imports; `import type { Conversation } from '@/types'`).
- [ ] **Step 4:** `npm test` → all pass.
- [ ] **Step 5:** Commit `feat(welcome): decide when and who welcomes the user back`.

### Task 2: Away clock + locale lines

**Files:**
- Create: `src/lib/away-clock.ts`
- Modify: `src/hooks/use-push-notifications.ts` (the `open` handler: call `markOpenedFromNotification()` first)
- Modify: `src/app/_layout.tsx` (call `startAwayClock()` once at module load, next to `SplashScreen.preventAutoHideAsync()`)
- Modify: all 14 `src/i18n/locales/*.json`: new block `"welcomeBack": { "line1"…"line4", "a11y": "{{name}}: {{line}}. Opens the chat." }`

**Interfaces:**
- Produces:
  - `export function startAwayClock(): void` — reads AsyncStorage key `sigmazam.awayAt` into memory once; on AppState `background` writes `Date.now()` to memory and storage; on `active` clears `fromNotification` after 5 s.
  - `export function awayAt(): Promise<number | null>` — the stored value, read once.
  - `export function markOpenedFromNotification(): void`, `export function openedFromNotification(): boolean`.
  - `export function markWelcomed(now: number): void` — writes `now` as `awayAt` so the same return never welcomes twice.

- [ ] **Step 1:** Write the module and the two call sites.
- [ ] **Step 2:** Add the locale lines. English: line1 "You're back! Missed you 💛", line2 "There you are! I was waiting 😊", line3 "Hey you! Got a minute to talk?", line4 "Welcome back! Tell me everything ✨". Every other locale: a natural, warm translation of the same four, gender-neutral where the language allows (ru: "Ты вернулся(ась)!" is not allowed; pick phrasing without gendered verbs, e.g. "Ты снова здесь! Скучала 💛").
- [ ] **Step 3:** `npm run check:locales` → passes; `npx tsc --noEmit` → 0 errors.
- [ ] **Step 4:** Commit `feat(welcome): away clock and welcome lines in 14 locales`.

### Task 3: WelcomeBack overlay on Today

**Files:**
- Create: `src/components/today/welcome-back.tsx`
- Modify: `src/app/(tabs)/index.tsx` (render `<WelcomeBack />` last, inside the screen root; pass an `onScroll` hide hook if the screen scrolls)

**Interfaces:**
- Consumes: Task 1 `shouldWelcome`, `pickWelcome`, `welcomeLineKey`; Task 2 `awayAt`, `openedFromNotification`, `markWelcomed`; `useAppStore` (`user.onboardedAt`, `conversations`, `characters`); `CharacterAvatar` / `characterImage` from `@/components/ui`; `BRAND.peek`; `TAB_BAR_HEIGHT`.
- Produces: `export function WelcomeBack(): JSX.Element | null`.

Behaviour (timeline from `../sigmazam-motion/src/WelcomeBack.tsx`, times from when the check passes):
- Check on mount and on AppState `active`, only while Today is focused (`useIsFocused`). On pass, `markWelcomed(now)` at once.
- 0.5 s: peek (118 × 87 pt, left 26) rises from behind the tab bar top with `withSpring({ damping: 11, stiffness: 170, mass: 0.8 })`, then a nod −6° → 4° → 0 over 0.5 s. It sits in a clipping view whose bottom edge is the tab bar top, so it comes out from behind the bar.
- 0.85 s: glass bubble (radius 22, `glassStyle` / `AuroraGlass` look, left 104, bottom = peek top + 6) springs from scale 0.55 at origin bottom-left (`damping: 13, stiffness: 210, mass: 0.7`): 38 pt avatar, name (Footnote 13/18 semibold, secondary), then typing dots for 0.6 s, then the line (Callout 16/21, `numberOfLines={2}`).
- 3.3 s: bubble shrinks to 0.65 and fades (0.25 s); 3.5 s: peek sinks (0.35 s, ease-in). Then unmount.
- Tap bubble → `router.push(\`/chat/${conversationId}\`)` and hide. Any other touch passes through; scrolling Today hides it.
- Reduce Motion: no rise, pop or nod; bubble and peek fade in/out in place.
- Accessibility: bubble is a button, label `t('welcomeBack.a11y', { name, line })`; `AccessibilityInfo.announceForAccessibility` on show.

- [ ] **Step 1:** Build the component and mount it.
- [ ] **Step 2:** `npx tsc --noEmit` → 0 errors; `npm test` → pass.
- [ ] **Step 3:** Device check on the A51 (EAS update, channel preview): set `sigmazam.awayAt` to 2 h ago via a dev shortcut or wait; cold launch twice; screenshot the bubble in ru and en; confirm a second launch within 1 h shows nothing; confirm a push tap shows nothing.
- [ ] **Step 4:** Commit `feat(welcome): the last character greets you on Today after an hour away`.

### Task 4: FirstHello replaces Intro

**Files:**
- Create: `src/components/onboarding/first-hello.tsx`
- Modify: `src/app/onboarding.tsx:40,121-125` (import and render `FirstHello` instead of `Intro`)
- Delete: `src/components/onboarding/intro.tsx` (its keyframe helpers `bezier`/`track` move into `first-hello.tsx`)
- Modify: 14 locales, `onboarding.helloBubble`: en "Hi! We've been waiting for you ✨"

**Interfaces:**
- Produces: `export function FirstHello({ onDone }: { onDone: () => void }): JSX.Element` (same contract as `Intro`).

Timeline (4.8 s, from `../sigmazam-motion/src/FirstHello.tsx`, same 390-wide stage scaled to the screen as `Intro`):
- Night ground `#05060F` with the dark aurora blobs at 0.55 and 34 faint twinkling stars.
- Lights: 9 seed character avatars (40 pt, warm radial glow 110 pt, green online dot), born at `0.25 + i * 0.12` s by spring, curved flight to the centre (195, 390) over `1.7 + i*0.025` → `2.25 + i*0.025` s, scale to 0.25, fade.
- Shell springs in at 2.18 s, wobbles, bursts 2.55–2.68 s; ring, glow, 8 sparks; warm flash 2.45 → 2.62 (1.0) → 3.25 s; one light haptic at 2.55 s.
- Morning: `AuroraBackground` fades in 2.58 → 3.0 s (follows dark mode).
- Mascot `BRAND.hop` jumps out with the existing hop keys shifted by +1.63 s, then breathes.
- Bubble under the mascot pops at 3.15 s, typing to 3.65 s, then `t('onboarding.helloBubble')`; `onDone` at 4.8 s.
- Tap anywhere: `onDone` at once. Reduce Motion: morning ground, mascot and bubble fade in, `onDone` after 1.5 s.

- [ ] **Step 1:** Build the component, swap it into onboarding, delete `intro.tsx`, add the locale key.
- [ ] **Step 2:** `npx tsc --noEmit`, `npm test`, `npm run check:locales` pass.
- [ ] **Step 3:** Device check: clear app data on the A51, launch, screen-record (`adb shell screenrecord`) the first hello; compare frames with `../sigmazam-motion/out/first-hello.mp4`; check ~60 fps (no visible stutter in the flight).
- [ ] **Step 4:** Commit `feat(onboarding): first hello replaces the shell-drop intro`.

### Task 5: Hand-off

- [ ] HANDOFF.md note, `docs/flows.md` line, push `local-work`, ff-pull the main checkout, `eas update` (preview, `--environment preview`).
