# Launch motion: "someone is waiting for you"

Status: design, waiting for the owner's approval of the preview videos.
Previews (Remotion, silent, A51 1080 x 2400): `../sigmazam-motion/out/welcome-back.mp4` (4.2 s),
`../sigmazam-motion/out/first-hello.mp4` (4.8 s). Sources: `../sigmazam-motion/src/WelcomeBack.tsx`, `FirstHello.tsx`.

## Intent

The owner (2026-10-29): opening the app should make a person feel they are not alone: someone was waiting,
someone wants to talk, the mood lifts. BIMOBIMO's cat rising on every open was the trigger, but we build our own
idea, not a copy (no BIMOBIMO art, text or timing).

## Apple HIG constraints (Launching, Onboarding)

- "Launch instantly", "Downplay the launch experience", the launch screen "isn't a branding opportunity".
  So nothing may stand between launch and a usable screen on later opens.
- A splash is allowed "at the beginning of your onboarding flow", "just long enough" and not delaying.
- Onboarding: "fast, fun, and optional"; the next step (redesigning the onboarding steps) is a separate spec.

## Design

### 1. Welcome back (every later open, never blocks)

Today renders at once (as now). 0.5 s after it shows, the mascot (`sigmazam-peek.png`) rises from behind the
tab bar with a spring and a small nod. At 0.85 s a glass chat bubble pops from it: avatar + name of the character
you talked to last, typing dots for ~0.6 s, then one short line ("You're back! Missed you 💛"). At ~3.3 s the bubble
shrinks into the mascot and the mascot sinks back. Total under 4 s, the screen stays fully usable under it.

- Tap the bubble: open that chat (`/chat/[id]`). Tap anywhere else or scroll: it leaves at once.
- When: a cold launch, or a return from background after 30 min or more. Not during onboarding, not when the app
  was opened from a notification or deep link, not when there is no conversation yet.
- The line: the newest unread AI message of that conversation if there is one (preview, one line); otherwise one
  of a few short welcome lines from the locale files (all 14 locales; no language lists in code).
- Reduce Motion: no rise or pop, the bubble fades in and out in place. VoiceOver: announced as
  "<name>: <line>", a button that opens the chat.
- No haptic on this one (it happens on every open; HIG Playing haptics: use sparingly).

### 2. First hello (first launch only, replaces the 2.5 s shell-drop `Intro`)

Night aurora with faint stars. Nine character avatars light up one by one as warm glowing points with a green
"online" dot: people awake for you. They swing in on curved paths to the center and merge into the Sigmazam shell;
the shell wobbles and bursts (ring, sparks, warm flash) and morning comes (the light aurora). The mascot
(`sigmazam-hop.png`) jumps out, waves and a glass bubble types "Hi! We've been waiting for you ✨". Then the
onboarding "hello" step follows as now.

- Tap anywhere skips to the end frame. One light haptic at the burst.
- Dark mode: the morning ends in the dark aurora, not the light one.
- Reduce Motion: a cross-fade from night to the mascot and bubble, no flying lights.

## Approaches (owner picked 1 on 2026-10-29)

1. **Live in-app motion (Reanimated 4 + react-native-svg + expo-image), picked.** Small, follows dark mode, the
   user's language and their own last character, reacts to taps. Cost: tune on device (A51) for 60 fps.
2. Rendered video (Remotion mp4 in the app): cinematic, but 1-3 MB per variant, the same for everyone, one file per
   language and theme. Used only for the previews.
3. Lottie: needs an After Effects author, we have none; least flexible.

## Constraints

- Keep the design system and "calm cards"; mascot art already in `assets/brand`. No new dependency (no Skia).
- Existing keyframes of `src/components/onboarding/intro.tsx` are shared with the canvas and Remotion; the new
  first-hello timeline lives in `../sigmazam-motion/src/FirstHello.tsx` and the app mirrors it.
- Popups appear instantly elsewhere in the app; this motion is the one place a mascot moves on open.

## Left to the builder

Component split, where the "last character" selector lives (conversations sorted by `lastMessageAt`), the
30-minute rule's storage, exact spring configs on device.
